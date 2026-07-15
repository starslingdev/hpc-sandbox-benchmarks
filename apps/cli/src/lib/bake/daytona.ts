// Bake a Daytona Linux-VM snapshot by uploading the already-built local Docker image to Daytona's
// transient registry, then registering that private image through the SDK. Both public-GHCR paths are
// broken for this valid image: the direct importer returns an opaque inspection error, while the
// declarative builder cannot authenticate its FROM pull. Daytona's CLI local-image path successfully
// uploads the same layers, but hardcodes the `container` sandbox class; our active region is Linux VM
// only. This implements the same documented transient-registry push and explicitly registers
// `SandboxClass.LINUX_VM`. Idempotent: upload first, then delete an existing snapshot of that name and
// recreate it. The API key + runner target come from config.daytona (single-region:
// DAYTONA_API_KEY + DAYTONA_TARGET, e.g. us-west-2).
//
// Delete-then-create is idempotent but NOT atomic: the SDK exposes no snapshot rename or overwrite,
// so the name is unavoidably ABSENT between the delete and a successful create. Reruns converge, but
// a create that fails leaves no snapshot of that name at all. That is harmless for the candidate
// (nothing consumes it) and destructive for a name already in public use — see `promote --force`,
// which is the only caller that hands us a published name. `bakeDaytonaSnapshot` therefore reports
// which side of the delete it failed on, so callers never have to guess whether the name survived.
//
// Iteration surface: a snapshot's region must match where sandboxes boot. We pass the client `target`;
// if the target also needs an explicit snapshot `regionId`, add it to CreateSnapshotParams here.
//
// microVM-only: the fleet is Linux VMs. Snapshot registration pins that class rather than relying on
// the transient-push API's container default.
import type { RegistryPushAccessDto } from "@daytona/api-client";
import { Configuration, DockerRegistryApi } from "@daytona/api-client";
import { Daytona, SandboxClass } from "@daytona/sdk";
import { config } from "@sandbox-benchmarks/providers";
import type { Log } from "./types.ts";

/** Whether a snapshot delete error is a genuine "no such snapshot" (so the idempotent path may
 *  swallow it — e.g. a snapshot deleted out from under us between the list and the delete) — as
 *  opposed to auth/network/in-use failures, which must surface their root cause. */
function isNotFound(err: unknown): boolean {
	if (typeof err !== "object" || err === null) return false;
	const e = err as {
		statusCode?: number;
		status?: number;
		response?: { status?: number };
		message?: string;
	};
	const status = e.statusCode ?? e.status ?? e.response?.status;
	if (status === 404) return true;
	return typeof e.message === "string" && /not found|does not exist|404/i.test(e.message);
}

/** Every snapshot named `name`, in any state, across all pages. We sweep `list()` rather than
 *  `get(name)`: a snapshot stuck in a failed/error state — a prior bake that died mid-create — is NOT
 *  returned by `get`, yet still makes `create` reject the name as "already exists for this
 *  organization". Pagination advances on a short page rather than on a page count derived from
 *  `total`: an absent or mid-iteration-changed `total` would make `Math.ceil(total / LIMIT)` NaN, and
 *  the loop would silently scan only the first page — the exact failure this sweep exists to avoid. */
async function listSnapshotsByName(
	daytona: Daytona,
	name: string,
): Promise<Awaited<ReturnType<Daytona["snapshot"]["list"]>>["items"]> {
	const LIMIT = 100;
	const matches: Awaited<ReturnType<Daytona["snapshot"]["list"]>>["items"] = [];
	for (let page = 1; ; page++) {
		const { items } = await daytona.snapshot.list(page, LIMIT);
		matches.push(...items.filter((s) => s.name === name));
		if (items.length < LIMIT) return matches;
	}
}

/** Delete every existing snapshot named `name` and WAIT until it's fully gone. `snapshot.delete` is
 *  asynchronous (active → `removing` → gone), and `create` rejects the name while ANY snapshot of it
 *  still exists — so returning right after issuing the delete races the not-yet-completed removal
 *  ("already exists for this organization"). Poll `list()` until no match remains, bounded by a
 *  deadline so a stuck removal fails loudly instead of hanging.
 *
 *  Returns how many snapshots it removed. A non-zero return means the name is now free BECAUSE we
 *  destroyed what held it: from here to a successful `create`, `name` does not resolve. Callers use
 *  this to distinguish "create failed, nothing was there anyway" from "create failed and the
 *  pre-existing snapshot is gone". Throwing leaves the name intact (the delete never completed). */
async function deleteExistingSnapshots(daytona: Daytona, name: string, log: Log): Promise<number> {
	const matches = await listSnapshotsByName(daytona, name);
	for (const snap of matches) {
		// A snapshot already mid-removal (a cancelled or concurrent bake) needs no second delete, and
		// issuing one can reject with a state-transition conflict — which `isNotFound` would NOT swallow,
		// failing the bake over a snapshot that was on its way out anyway. Let the poll below wait it out.
		if (snap.state === "removing") {
			log(`snapshot ${name} is already being deleted (state ${snap.state})`);
			continue;
		}
		log(`deleting existing snapshot ${name} (state ${snap.state})`);
		try {
			await daytona.snapshot.delete(snap);
		} catch (err) {
			// A snapshot already gone (concurrent delete) is fine; rethrow auth/network/in-use so the
			// real failure isn't masked by a downstream "already exists" from create.
			if (!isNotFound(err)) throw err;
		}
	}
	if (matches.length === 0) return 0;

	const DEADLINE_MS = 180_000;
	const POLL_MS = 3_000;
	const start = performance.now();
	for (;;) {
		// A transient network/API blip over a 3-minute window must not abort the bake. Retry until the
		// deadline; only then surface the error, so a genuinely unreachable API still fails loudly.
		let remaining: Awaited<ReturnType<typeof listSnapshotsByName>>;
		try {
			remaining = await listSnapshotsByName(daytona, name);
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			if (performance.now() - start > DEADLINE_MS) {
				throw new Error(
					`daytona snapshot ${name}: deletion poll failed after ${DEADLINE_MS}ms — ${reason}`,
				);
			}
			log(`transient error listing snapshots while waiting for ${name} deletion — ${reason}`);
			await new Promise((resolve) => setTimeout(resolve, POLL_MS));
			continue;
		}

		if (remaining.length === 0) return matches.length;
		if (performance.now() - start > DEADLINE_MS) {
			throw new Error(
				`daytona snapshot ${name} still present after ${DEADLINE_MS}ms (states: ${remaining
					.map((s) => s.state)
					.join(", ")}) — deletion did not complete`,
			);
		}
		log(
			`waiting for snapshot ${name} deletion (states: ${remaining.map((s) => s.state).join(", ")})…`,
		);
		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
	}
}

/** The message for a create that failed after `deleted` (> 0) pre-existing snapshots of `name` were
 *  removed to free the name: `name` now resolves to nothing. Stated plainly because the caller that
 *  passes a published name (promote `--force`) surfaces this as the report's `reason`, where "failed"
 *  otherwise reads as "nothing changed". Pure (strings in, string out) so it is unit-testable without
 *  standing up the SDK. */
export function snapshotDestroyedMessage(name: string, deleted: number, reason: string): string {
	return (
		`daytona snapshot ${name}: create failed after deleting ${deleted} pre-existing snapshot(s) of ` +
		`that name — no snapshot named ${name} now exists; rerun the bake to recreate it: ${reason}`
	);
}

/** Daytona's transient registry preserves the source repository path and replaces its source tag or
 *  digest with a unique upload tag. Pure so the security-sensitive path construction is unit-testable. */
export function daytonaTransientRef(
	access: Pick<RegistryPushAccessDto, "registryUrl" | "project">,
	image: string,
	tag: string,
): string {
	const registry = access.registryUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
	const project = access.project.replace(/^\/+|\/+$/g, "");
	const digest = image.indexOf("@");
	const imageWithoutDigest = digest === -1 ? image : image.slice(0, digest);
	const lastSlash = imageWithoutDigest.lastIndexOf("/");
	const lastColon = imageWithoutDigest.lastIndexOf(":");
	const repository =
		lastColon > lastSlash ? imageWithoutDigest.slice(0, lastColon) : imageWithoutDigest;
	if (!(registry && project && repository && tag)) {
		throw new Error("Daytona transient registry returned an incomplete upload destination");
	}
	return `${registry}/${project}/${repository}:${tag}`;
}

/** Commands required to copy a buildx-pushed source into Daytona's transient registry. The explicit
 *  pull is required because `docker buildx build --push` does not load the image into the daemon. */
export function daytonaTransientPushCommands(image: string, transientRef: string): string[][] {
	return [
		["docker", "pull", image],
		["docker", "tag", image, transientRef],
		["docker", "push", transientRef],
	];
}

/** Run a non-secret Docker command and fail with the exact executable/exit status. */
async function runDocker(cmd: string[], log: Log): Promise<void> {
	log(`$ ${cmd.join(" ")}`);
	const proc = Bun.spawn(cmd, { stdout: "inherit", stderr: "inherit", env: process.env });
	const code = await proc.exited;
	if (code !== 0) throw new Error(`${cmd.slice(0, 2).join(" ")} exited ${code}`);
}

/** Authenticate Docker to Daytona's short-lived registry without putting the secret in argv/logs. */
async function dockerLogin(access: RegistryPushAccessDto, log: Log): Promise<string> {
	const registry = access.registryUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
	log(`authenticating Docker to Daytona transient registry ${registry}`);
	const proc = Bun.spawn(
		["docker", "login", registry, "--username", access.username, "--password-stdin"],
		{ stdin: "pipe", stdout: "inherit", stderr: "inherit", env: process.env },
	);
	proc.stdin.write(access.secret);
	// Bun's FileSink.end() returns a Promise; await it so the write-end of the pipe is closed before we
	// wait on exit, otherwise `docker login --password-stdin` can block on an unflushed EOF.
	await proc.stdin.end();
	const code = await proc.exited;
	if (code !== 0) throw new Error(`docker login ${registry} exited ${code}`);
	return registry;
}

/** Run cleanup after an operation without letting a cleanup failure hide the primary failure. */
export async function withCleanupPreservingPrimaryError<T>(
	operation: () => Promise<T>,
	cleanup: () => Promise<void>,
	onSuppressedCleanupError: (err: unknown) => void,
): Promise<T> {
	let outcome: { ok: true; value: T } | { ok: false; error: unknown };
	try {
		outcome = { ok: true, value: await operation() };
	} catch (error) {
		outcome = { ok: false, error };
	}

	try {
		await cleanup();
	} catch (cleanupError) {
		if (outcome.ok) throw cleanupError;
		onSuppressedCleanupError(cleanupError);
	}

	if (!outcome.ok) throw outcome.error;
	return outcome.value;
}

/** Remove the short-lived registry credential and fail if Docker did not remove it. */
async function dockerLogout(registry: string, log: Log): Promise<void> {
	log(`removing Docker credentials for Daytona transient registry ${registry}`);
	const proc = Bun.spawn(["docker", "logout", registry], {
		stdout: "inherit",
		stderr: "inherit",
		env: process.env,
	});
	const code = await proc.exited;
	if (code !== 0) throw new Error(`docker logout ${registry} exited ${code}`);
}

async function transientPushAccess(
	apiKey: string,
	region?: string,
): Promise<RegistryPushAccessDto> {
	const registryApi = new DockerRegistryApi(
		new Configuration({
			accessToken: apiKey,
			basePath: "https://app.daytona.io/api",
			baseOptions: { headers: { "X-Daytona-Source": "sandbox-benchmarks" } },
		}),
	);
	return (await registryApi.getTransientPushAccess(undefined, region)).data;
}

/** Create the daytona snapshot `name` from `image` (candidate while iterating, version on promote).
 *  Idempotent: delete any existing snapshot of that name first.
 *
 *  If the create fails AFTER a pre-existing snapshot was deleted, the thrown error says so — `name`
 *  now resolves to nothing, and for a published name (promote `--force`) that is a public artifact
 *  the caller must report as destroyed rather than merely "not written". A create that fails with
 *  nothing deleted, or a delete that fails outright, leaves the prior snapshot intact and rethrows
 *  unchanged. */
export async function bakeDaytonaSnapshot(name: string, image: string, log: Log): Promise<void> {
	const { daytona: daytonaCfg, targetSpec } = config;
	const apiKey = daytonaCfg.apiKey;
	if (!apiKey) throw new Error("DAYTONA_API_KEY is required to bake a Daytona snapshot");
	const daytona = new Daytona({
		apiKey,
		...(daytonaCfg.target ? { target: daytonaCfg.target } : {}),
	});

	// The buildx publish lane does not load the pushed image into the runner's Docker daemon. Pull the
	// immutable digest explicitly before tagging it for Daytona's transient registry.
	// Upload fully before the destructive delete. A registry/auth/network failure therefore leaves an
	// existing published snapshot intact and the delete→create outage is as short as the API permits.
	const access = await transientPushAccess(apiKey, daytonaCfg.target);
	const registry = await dockerLogin(access, log);
	const transientRef = await withCleanupPreservingPrimaryError(
		async () => {
			// Construct the destination only after login so every post-login failure is inside the cleanup
			// boundary. In particular, malformed registry metadata must not leave credentials behind.
			const tag = new Date().toISOString().replace(/\D/g, "");
			const destination = daytonaTransientRef(access, image, tag);
			for (const command of daytonaTransientPushCommands(image, destination)) {
				await runDocker(command, log);
			}
			return destination;
		},
		() => dockerLogout(registry, log),
		(cleanupError) => {
			log(
				`warning: could not remove Daytona transient registry credentials after upload failure — ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
			);
		},
	);

	const deleted = await deleteExistingSnapshots(daytona, name, log);
	log(
		`creating Linux-VM snapshot ${name} from uploaded image (target ${daytonaCfg.target ?? "default"})`,
	);
	try {
		await daytona.snapshot.create(
			{
				name,
				image: transientRef,
				resources: {
					cpu: targetSpec.vcpus,
					memory: targetSpec.memoryGb,
					disk: targetSpec.diskGb,
				},
				...(daytonaCfg.target ? { regionId: daytonaCfg.target } : {}),
				sandboxClass: SandboxClass.LINUX_VM,
			},
			{ onLogs: (chunk) => log(chunk) },
		);
	} catch (err) {
		// Nothing was deleted → the name was already free, so the prior state (none) is intact: rethrow
		// verbatim rather than dress up an ordinary create failure as a destroyed artifact.
		if (deleted === 0) throw err;
		const reason = err instanceof Error ? err.message : String(err);
		throw new Error(snapshotDestroyedMessage(name, deleted, reason), { cause: err });
	}
}
