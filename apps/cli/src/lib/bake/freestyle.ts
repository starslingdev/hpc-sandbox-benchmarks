import { createHash } from "node:crypto";
import type { DriverModule, ProviderId } from "@sandbox-benchmarks/driver";
import { shellQuote, writeTextFile } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { parseDriverEnv } from "@sandbox-benchmarks/driver/env";
import freestyleModule, { freestyleSpec } from "@sandbox-benchmarks/freestyle";
import { freestyleFetch } from "@sandbox-benchmarks/freestyle/transport";
import { withSandboxWork } from "@sandbox-benchmarks/harness";
import { config } from "@sandbox-benchmarks/providers/config";
import type { Suite } from "@sandbox-benchmarks/schema";
import { SUITES } from "@sandbox-benchmarks/schema";
import { bakedArtifactName } from "@sandbox-benchmarks/schema/providers";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { freestyleSetupScript } from "@sandbox-benchmarks/templates/freestyle";
import { runSmoke } from "@sandbox-benchmarks/templates/smoke";
import { type } from "arktype";
import { Freestyle, FreestyleApiError } from "freestyle";
import { openDriver } from "../driver-run.ts";
import type { Log } from "./types.ts";

const sdk = () => new Freestyle({ fetch: freestyleFetch(fetch, 300_000) });
export async function resolveFreestyleSnapshotId(
	ref: string,
	api: Freestyle = sdk(),
): Promise<string> {
	const snapshot = await api.vms.snapshots.get(ref);
	if (!/^sh-[A-Za-z0-9_-]+$/.test(snapshot.id)) throw new Error("Invalid Freestyle snapshot ID");
	return snapshot.id;
}

export interface FreestyleBakeOptions {
	readonly api?: Freestyle;
	readonly baseSnapshotRef?: string;
	/** Runs the native install/smoke/capture operation; injectable for publication failure tests. */
	readonly build?: (input: {
		baseSnapshotRef: string;
		recipe: string;
		recipeSha256: string;
		candidate: boolean;
	}) => Promise<string>;
}

/** Native snapshot bake: shared recipes and pins, with Ubuntu's own OS/kernel and no nested container. */
export async function bakeFreestyleSnapshot(
	name: string,
	_baseImage: string,
	log: Log,
	options: FreestyleBakeOptions = {},
): Promise<string> {
	const api = options.api ?? sdk();
	let predecessor: string | undefined;
	try {
		predecessor = (await api.vms.snapshots.get(name)).id;
	} catch (error) {
		if (!(error instanceof FreestyleApiError && error.status === 404)) throw error;
	}
	if (predecessor && !name.endsWith("-candidate"))
		throw new Error(
			`Freestyle version snapshot ${name} already exists; keep its immutable ID or bump the toolchain version`,
		);
	const candidate = name.endsWith("-candidate");
	// Promote the candidate bytes; never rebuild a version on a possibly newer stock base.
	const baseRef = candidate
		? (options.baseSnapshotRef ?? config.freestyleBaseSnapshotId ?? "freestyle/ubuntu")
		: /^sh-[A-Za-z0-9_-]+$/.test(_baseImage)
			? _baseImage
			: bakedArtifactName("freestyle", "candidate");
	const baseSnapshotId =
		baseRef === "freestyle/ubuntu" ? baseRef : await resolveFreestyleSnapshotId(baseRef, api);
	const recipe = freestyleSetupScript();
	const recipeSha256 = createHash("sha256").update(recipe).digest("hex");
	log(`freestyle native bake ${name}: base ${baseSnapshotId}, recipe sha256:${recipeSha256}`);
	const snapshotId = await (
		options.build ?? ((input) => buildNativeSnapshot(input, api, name, log))
	)({
		baseSnapshotRef: baseSnapshotId,
		recipe,
		recipeSha256,
		candidate,
	});
	if (!/^sh-[A-Za-z0-9_-]+$/.test(snapshotId))
		throw new Error("Freestyle bake did not return an immutable snapshot ID");
	// Keep the predecessor's immutable ID alive; advance only the mutable candidate alias.
	try {
		if (predecessor) await api.vms.snapshots.update(predecessor, { slug: "" });
		await api.vms.snapshots.update(snapshotId, { slug: name });
	} catch (error) {
		if (predecessor)
			await api.vms.snapshots
				.update(predecessor, { slug: name })
				.catch((restoreError: unknown) =>
					log(`Freestyle alias restore failed for ${predecessor}: ${String(restoreError)}`),
				);
		await api.vms.snapshots
			.delete(snapshotId)
			.catch((cleanupError: unknown) =>
				log(`Freestyle snapshot cleanup failed for ${snapshotId}: ${String(cleanupError)}`),
			);
		throw error;
	}
	log(`freestyle snapshot built: ${snapshotId}; pin FREESTYLE_SNAPSHOT_ID=${snapshotId}`);
	return snapshotId;
}

async function buildNativeSnapshot(
	input: { baseSnapshotRef: string; recipe: string; recipeSha256: string; candidate: boolean },
	api: Freestyle,
	name: string,
	log: Log,
): Promise<string> {
	const { baseSnapshotRef: baseSnapshotId, recipe, recipeSha256, candidate } = input;
	const artifact = { kind: "baked", ref: baseSnapshotId } as const;
	const stockContext = {
		env: parseDriverEnv("freestyle", process.env),
		artifact: { kind: "baked", source: "native-snapshot" },
		resolvedArtifact: artifact,
	} as const;
	const opened =
		baseSnapshotId === "freestyle/ubuntu"
			? {
					// Same handle erasure as openDriver: this lane consumes only port operations.
					module: freestyleModule as DriverModule<ProviderId>,
					driver: driverFromComputeSpec(
						"freestyle",
						freestyleSpec(stockContext, { allowStockBaseForBake: true }),
						artifact,
						[stockContext.env.FREESTYLE_API_KEY],
					),
					artifact,
				}
			: await openDriver("freestyle", { artifact: { ref: baseSnapshotId } });
	let snapshotId: string | undefined;
	try {
		await withSandboxWork(
			{
				module: opened.module,
				driver: opened.driver,
				request: { spec: TARGET_SPEC, artifact: opened.artifact },
			},
			async ({ session, runner }) => {
				const source = await api.vms.get(session.sandboxRef.id);
				if (!source.snapshotId || !/^sh-[A-Za-z0-9_-]+$/.test(source.snapshotId))
					throw new Error("Freestyle did not report the immutable base snapshot ID");
				const path = "/tmp/sandbox-benchmarks-freestyle-setup.sh";
				if (candidate) {
					await writeTextFile(session, path, recipe);
					await runner.step(
						"install native Freestyle toolchain",
						`sudo -H bash --noprofile --norc ${shellQuote(path)}`,
						90 * 60_000,
					);
				} else {
					const result = await session.exec("cat /freestyle-snapshot-build.json");
					if (result.exit.kind !== "exited" || result.exit.code !== 0)
						throw new Error("Freestyle candidate recipe provenance is missing");
					const provenance = type({ recipeSha256: "string" }).assert(JSON.parse(result.stdout));
					if (provenance.recipeSha256 !== recipeSha256)
						throw new Error(
							"Freestyle candidate recipe differs from this source tree; bake it again before promotion",
						);
				}
				const checks = await runSmoke(async (command) => {
					const result = await session.exec(command);
					return {
						stdout: result.stdout,
						stderr: result.stderr,
						exitCode: result.exit.kind === "exited" ? result.exit.code : 1,
					};
				});
				const failed = checks.filter((check) => !check.ok);
				if (failed.length)
					throw new Error(
						`Freestyle toolchain smoke failed: ${failed.map((check) => `${check.name}: ${check.output}`).join("; ")}`,
					);
				const requiredFreeGb = Math.max(
					...Object.values<Suite>(SUITES).map((suite) => suite.minDiskGb ?? 0),
				);
				await runner.step(
					"verify clean PATH and benchmark disk headroom",
					"! command -v typescript-language-server >/dev/null 2>&1 && " +
						`df -Pk /var/lib/phoronix-test-suite | awk 'NR==2 { printf "free disk: %.1f GiB\\n", $4/1048576; exit !($4 >= ${requiredFreeGb}*1048576) }'`,
					60_000,
				);
				if (candidate) {
					const provenance = JSON.stringify(
						{ baseSnapshotId: source.snapshotId, recipeSha256, targetSpec: TARGET_SPEC, name },
						null,
						2,
					);
					await writeTextFile(session, "/tmp/freestyle-snapshot-build.json", provenance);
					await runner.step(
						"record snapshot recipe",
						"sudo mv /tmp/freestyle-snapshot-build.json /freestyle-snapshot-build.json && sudo mv /tmp/sandbox-benchmarks-freestyle-setup.sh /freestyle-snapshot-setup.sh",
						60_000,
					);
				}
				// Native snapshots retain processes, unlike OCI layers. Do not bake PTS's transient
				// development result servers into every benchmark VM; smoke itself can start them.
				await runner.step(
					"quiesce PTS result servers before capture",
					"sudo pkill -f '^php -S localhost:[0-9]+ -t /usr/share/phoronix-test-suite/pts-core/static/dynamic-result-viewer/' || true; " +
						"if pgrep -f '^php -S localhost:[0-9]+ -t /usr/share/phoronix-test-suite/pts-core/static/dynamic-result-viewer/' >/dev/null; then exit 1; fi",
					60_000,
				);
				// Persistent release artifact: the driver's lifecycle snapshot has a ten-minute test TTL.
				const created = await api.vms
					.ref(session.sandboxRef.id)
					.snapshot({ autoDeleteSeconds: -1 });
				snapshotId = created.snapshotId;
				if (
					(created.snapshot.ttlSeconds ?? -1) > 0 ||
					(created.snapshot.autoDeleteSeconds ?? -1) > 0
				)
					throw new Error(
						"Freestyle plan applies snapshot expiry; a durable benchmark artifact requires a plan without automatic snapshot deletion",
					);
			},
		);
	} catch (error) {
		if (snapshotId)
			await api.vms.snapshots
				.delete(snapshotId)
				.catch((cleanupError: unknown) =>
					log(`Freestyle snapshot cleanup failed for ${snapshotId}: ${String(cleanupError)}`),
				);
		throw error;
	}
	if (!snapshotId || !/^sh-[A-Za-z0-9_-]+$/.test(snapshotId))
		throw new Error("Freestyle bake did not return an immutable snapshot ID");
	return snapshotId;
}
