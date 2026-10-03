// The release lane's preparation of a native-snapshot build sandbox (ADR-0021, ADR-0023 §2). The
// builder derived from the provider's driver boots the sandbox, captures it and destroys it; this
// module supplies what happens in between, so a provider package never imports harness or
// templates code: on a candidate build, the shared toolchain recipe, the smoke spec and the recorded
// provenance; on a version build, verification that the revalidated candidate came from this
// source tree's recipe, then the same smoke.

import { createHash } from "node:crypto";
import type { SandboxSession } from "@sandbox-benchmarks/driver";
import { shellQuote, writeTextFile } from "@sandbox-benchmarks/driver";
import type { SnapshotPreparation } from "@sandbox-benchmarks/driver/artifact";
import { verifyDriverReadiness } from "@sandbox-benchmarks/driver/conformance";
import { loadDriverModule } from "@sandbox-benchmarks/drivers";
import { SessionStepRunner } from "@sandbox-benchmarks/harness";
import type { ArtifactPhase, NativeSnapshotProviderId, Suite } from "@sandbox-benchmarks/schema";
import { REGISTRY, SUITES, TARGET_SPEC } from "@sandbox-benchmarks/schema";
import { freestyleSetupScript } from "@sandbox-benchmarks/templates/freestyle";
import { runSmoke } from "@sandbox-benchmarks/templates/smoke";
import { type } from "arktype";

/** The install recipe each native-snapshot provider's candidate runs in its booted base. */
const NATIVE_SNAPSHOT_RECIPES = {
	freestyle: freestyleSetupScript,
} as const satisfies Record<NativeSnapshotProviderId, () => string>;

const provenanceRecord = type({ recipeSha256: "string" });

/** Where a native snapshot records how it was built, so a version build can verify its candidate. */
export function nativeSnapshotPaths(id: NativeSnapshotProviderId) {
	return {
		stagedRecipe: `/tmp/sandbox-benchmarks-${id}-setup.sh`,
		recipe: `/${id}-snapshot-setup.sh`,
		provenance: `/${id}-snapshot-build.json`,
	};
}

/** The recipe a candidate installs and the digest its provenance records. */
export function nativeSnapshotRecipe(id: NativeSnapshotProviderId): {
	readonly recipe: string;
	readonly recipeSha256: string;
} {
	const recipe = NATIVE_SNAPSHOT_RECIPES[id]();
	return { recipe, recipeSha256: createHash("sha256").update(recipe).digest("hex") };
}

/**
 * The `prepare` seam of a native-snapshot build of `name`: install (candidate) or verify (version),
 * smoke, prove disk headroom, record provenance, and quiesce processes a snapshot would retain.
 */
export function nativeSnapshotPreparation(
	id: NativeSnapshotProviderId,
	phase: ArtifactPhase,
	name: string,
): (session: SandboxSession, preparation: SnapshotPreparation) => Promise<void> {
	const label = REGISTRY[id].displayName;
	const paths = nativeSnapshotPaths(id);
	return async (session, { signal, base }) => {
		const launch = session.launch?.bind(session);
		const active: SandboxSession = {
			sandboxRef: session.sandboxRef,
			artifact: session.artifact,
			native: session.native,
			destroy: (options) => session.destroy(options),
			exec: (command, options) => session.exec(command, { ...options, signal }),
			...(session.files && { files: session.files }),
			...(launch && { launch: (command, options) => launch(command, { ...options, signal }) }),
		};
		const module = await loadDriverModule(id);
		const readiness = await verifyDriverReadiness(module, session as never, { signal });
		if (readiness.status !== "pass")
			throw new Error(`Driver readiness verification failed: ${readiness.detail}`);
		const runner = new SessionStepRunner(active, module.execution);
		const { recipe, recipeSha256 } = nativeSnapshotRecipe(id);
		if (phase === "candidate") {
			await writeTextFile(active, paths.stagedRecipe, recipe);
			await runner.step(
				`install native ${label} toolchain`,
				`sudo -H bash --noprofile --norc ${shellQuote(paths.stagedRecipe)}`,
				90 * 60_000,
			);
		} else {
			const result = await active.exec(`cat ${shellQuote(paths.provenance)}`);
			if (result.exit.kind !== "exited" || result.exit.code !== 0)
				throw new Error(`${label} candidate recipe provenance is missing`);
			const provenance = provenanceRecord.assert(JSON.parse(result.stdout));
			if (provenance.recipeSha256 !== recipeSha256)
				throw new Error(
					`${label} candidate recipe differs from this source tree; bake it again before promotion`,
				);
		}
		const checks = await runSmoke(async (command) => {
			const result = await active.exec(command);
			return {
				stdout: result.stdout,
				stderr: result.stderr,
				exitCode: result.exit.kind === "exited" ? result.exit.code : 1,
			};
		});
		const failed = checks.filter((check) => !check.ok);
		if (failed.length)
			throw new Error(
				`${label} toolchain smoke failed: ${failed.map((check) => `${check.name}: ${check.output}`).join("; ")}`,
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
		if (phase === "candidate") {
			const provenance = JSON.stringify(
				{ baseSnapshotId: base, recipeSha256, targetSpec: TARGET_SPEC, name },
				null,
				2,
			);
			const staged = `/tmp/${id}-snapshot-build.json`;
			await writeTextFile(active, staged, provenance);
			await runner.step(
				"record snapshot recipe",
				`sudo mv ${shellQuote(staged)} ${shellQuote(paths.provenance)} && sudo mv ${shellQuote(paths.stagedRecipe)} ${shellQuote(paths.recipe)}`,
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
	};
}
