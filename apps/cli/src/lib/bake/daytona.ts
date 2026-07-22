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
// Dual-class: this bakes BOTH isolation variants. Snapshot registration pins the class explicitly
// (`DaytonaBakeOptions.sandboxClass`) rather than relying on the transient-push API's container
// default — daytona-vm bakes SandboxClass.LINUX_VM in us-west-2, daytona-container bakes
// SandboxClass.CONTAINER in the same region. The class is a property of the snapshot, so the two variants
// are necessarily separate snapshots.
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

/** A verbose one-line description of a Daytona SDK error for diagnostics — pulls status codes, any
 *  response body, an error code, and the `cause` chain out of the opaque object the SDK throws, so a
 *  bake log records more than the bare `.message`. Pure and defensive (never throws), so it is safe on
 *  an error path and unit-testable without the SDK. */
export function describeDaytonaError(err: unknown): string {
	if (typeof err !== "object" || err === null) return `non-object error: ${String(err)}`;
	const e = err as {
		name?: unknown;
		message?: unknown;
		statusCode?: number;
		status?: number;
		code?: string | number;
		response?: { status?: number; data?: unknown };
		cause?: unknown;
	};
	const parts: string[] = [];
	if (typeof e.name === "string") parts.push(`name=${e.name}`);
	// Include the error's OWN message. The current caller (logCreateFailure) logs it on a separate line,
	// but this function is exported: a caller that doesn't know to log `.message` separately would
	// otherwise get `name=Error` and lose the entire diagnostic for a plain `new Error("…")`.
	if (typeof e.message === "string" && e.message.length > 0) parts.push(`message=${e.message}`);
	const status = e.statusCode ?? e.status ?? e.response?.status;
	if (status !== undefined) parts.push(`status=${status}`);
	if (e.code !== undefined) parts.push(`code=${String(e.code)}`);
	if (e.response?.data !== undefined) {
		let body: string;
		try {
			body =
				typeof e.response.data === "string"
					? e.response.data
					: (JSON.stringify(e.response.data) ?? String(e.response.data));
		} catch {
			body = String(e.response.data);
		}
		parts.push(`response=${body.slice(0, 500)}`);
	}
	if (e.cause !== undefined && e.cause !== null) {
		const cause = e.cause as { message?: unknown };
		const causeText =
			typeof cause.message === "string" ? cause.message : String(e.cause).slice(0, 300);
		parts.push(`cause=${causeText}`);
	}
	return parts.length > 0 ? parts.join(" ") : "no structured detail";
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

/** Create attempts — a small resilient retry that self-heals a transient registry-inspect blip; a
 *  persistent failure is characterized across every attempt by {@link logCreateFailure}. */
const CREATE_ATTEMPTS = 5;

/** Log the diagnostics for a failed create attempt: the structured SDK error, plus where the snapshot
 *  landed — "absent" vs an `error`-state snapshot (with its richer `errorReason`) distinguishes a failed
 *  registry inspect from a failed build. Best-effort: never throws (it runs on an error path). */
async function logCreateFailure(
	daytona: Daytona,
	name: string,
	err: unknown,
	log: Log,
): Promise<void> {
	log(`    message: ${err instanceof Error ? err.message : String(err)}`);
	log(`    detail:  ${describeDaytonaError(err)}`);
	try {
		const landed = await listSnapshotsByName(daytona, name);
		if (landed.length === 0) {
			log(`    post-failure: no snapshot named ${name} exists (create never landed one)`);
		}
		for (const snap of landed) {
			const errorReason = (snap as { errorReason?: unknown }).errorReason;
			log(
				`    post-failure snapshot: state=${snap.state}${errorReason ? ` errorReason=${String(errorReason)}` : ""}`,
			);
		}
	} catch (listErr) {
		log(
			`    post-failure: could not list ${name} — ${listErr instanceof Error ? listErr.message : String(listErr)}`,
		);
	}
}

/** The per-variant knobs a Daytona bake needs beyond the shared toolchain image: the account key, the
 *  region to bake in, and the sandbox class the snapshot pins. `daytona-vm` bakes LINUX_VM in us-west-2;
 *  `daytona-container` bakes CONTAINER in us-west-2. Both come from the config gatekeeper's per-variant
 *  {@link DaytonaConfig} plus the variant's fixed class — never read here from process.env. */
export interface DaytonaBakeOptions {
	apiKey?: string;
	/** Runner target/region (us-west-2 for both variants). */
	target?: string;
	/** Sandbox class baked into the snapshot — determines which runners can host it. */
	sandboxClass: SandboxClass;
}

/** Create the daytona snapshot `name` from `image` (candidate while iterating, version on promote),
 *  pinning the `sandboxClass` and region in `opts`. Idempotent: delete any existing snapshot of that
 *  name first.
 *
 *  If the create fails AFTER a pre-existing snapshot was deleted, the thrown error says so — `name`
 *  now resolves to nothing, and for a published name (promote `--force`) that is a public artifact
 *  the caller must report as destroyed rather than merely "not written". A create that fails with
 *  nothing deleted, or a delete that fails outright, leaves the prior snapshot intact and rethrows
 *  unchanged. */
export async function bakeDaytonaSnapshot(
	name: string,
	image: string,
	log: Log,
	opts: DaytonaBakeOptions,
): Promise<void> {
	const { targetSpec } = config;
	const apiKey = opts.apiKey;
	if (!apiKey) throw new Error("DAYTONA_API_KEY is required to bake a Daytona snapshot");
	const daytona = new Daytona({
		apiKey,
		...(opts.target ? { target: opts.target } : {}),
	});

	// The buildx publish lane does not load the pushed image into the runner's Docker daemon. Pull the
	// immutable digest explicitly before tagging it for Daytona's transient registry.
	// Upload fully before the destructive delete. A registry/auth/network failure therefore leaves an
	// existing published snapshot intact and the delete→create outage is as short as the API permits.
	const access = await transientPushAccess(apiKey, opts.target);
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

	const params = {
		name,
		image: transientRef,
		resources: { cpu: targetSpec.vcpus, memory: targetSpec.memoryGb, disk: targetSpec.diskGb },
		...(opts.target ? { regionId: opts.target } : {}),
		// Pin the snapshot's sandbox class explicitly (never rely on the transient-push API's `container`
		// default): daytona-vm bakes LINUX_VM, daytona-container bakes CONTAINER.
		sandboxClass: opts.sandboxClass,
	};

	// Daytona's create inspects `image` in the registry on a build runner, and that inspect can fail with
	// an opaque, often-transient "internal error" (a different runner/registry blip each time). Retry with
	// backoff — self-healing when it's genuinely transient — and on every failed attempt capture rich
	// diagnostics (see logCreateFailure) so a PERSISTENT failure is precisely characterized rather than
	// reported once and lost.
	let lastErr: unknown;
	// Set only when a pre-retry cleanup failed and stopped the loop early. Kept SEPARATE from `lastErr`:
	// the create failure is what failed the bake and carries the real diagnostic, while this explains why
	// we stopped retrying. Folding the cleanup error into `lastErr` would overwrite (and misattribute)
	// the create error in the message below.
	let cleanupErr: unknown;
	for (let attempt = 1; attempt <= CREATE_ATTEMPTS; attempt++) {
		// A failed create can leave the name held by an error-state snapshot; sweep it before retrying so
		// the next attempt isn't rejected with "already exists". (The initial `deleted` count above is
		// what the destroyed-message reports — these are our own failed remnants, not a pre-existing one.)
		if (attempt > 1) {
			try {
				await deleteExistingSnapshots(daytona, name, log);
			} catch (err) {
				// STOP retrying. deleteExistingSnapshots already absorbs transient blips itself — it polls
				// for a 3-minute deadline before throwing — so a throw here is a PERSISTENT failure to free
				// the name, not a blip. The name is still held, every remaining create would just fail
				// "already exists" after burning another 3-minute pre-clean, and the real blocker (the
				// undeletable snapshot) would be buried under a generic create error. Fail fast on it.
				log(
					`!!! attempt ${attempt}: could not free ${name} — ${err instanceof Error ? err.message : String(err)}`,
				);
				log("    the name is still held, so further create attempts cannot succeed; giving up.");
				cleanupErr = err;
				break;
			}
		}
		log(
			`>>> daytona snapshot create attempt ${attempt}/${CREATE_ATTEMPTS}: ${name} from ${transientRef} (target ${opts.target ?? "default"}, class ${opts.sandboxClass})`,
		);
		const startMs = performance.now();
		try {
			await daytona.snapshot.create(params, { onLogs: log });
			log(
				`<<< daytona snapshot create succeeded on attempt ${attempt}/${CREATE_ATTEMPTS} (${(performance.now() - startMs).toFixed(0)}ms)`,
			);
			return;
		} catch (err) {
			lastErr = err;
			log(
				`!!! daytona create attempt ${attempt}/${CREATE_ATTEMPTS} failed after ${(performance.now() - startMs).toFixed(0)}ms`,
			);
			await logCreateFailure(daytona, name, err, log);
			if (attempt < CREATE_ATTEMPTS) {
				const backoffMs = Math.min(attempt * 5000, 20000);
				log(`    backing off ${backoffMs}ms before retry…`);
				await new Promise((resolve) => setTimeout(resolve, backoffMs));
			}
		}
	}

	// Every attempt failed (or a failed pre-clean stopped them early). Report BOTH causes when there are
	// two: the create failure is what actually failed the bake, and the cleanup failure is why we stopped
	// retrying it. `lastErr` stays the create error, so the `cause` chain still points at the real thing.
	const createReason = lastErr instanceof Error ? lastErr.message : String(lastErr);
	const reason =
		cleanupErr === undefined
			? createReason
			: `${createReason}; retries stopped because ${name} could not be freed for another attempt: ${
					cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
				}`;

	// Nothing was deleted → the name was already free, so the prior state (none) is intact: rethrow
	// verbatim rather than dress up an ordinary create failure as a destroyed artifact.
	if (deleted === 0) {
		if (cleanupErr === undefined) throw lastErr;
		throw new Error(`daytona snapshot ${name} create failed — ${reason}`, { cause: lastErr });
	}
	throw new Error(snapshotDestroyedMessage(name, deleted, reason), { cause: lastErr });
}

/** Bake the daytona-vm snapshot `name`: LINUX_VM class in the daytona-vm region (us-west-2). Binds the
 *  variant's config + class so callers (bake/promote) don't import SandboxClass. */
export function bakeDaytonaVmSnapshot(name: string, image: string, log: Log): Promise<void> {
	return bakeDaytonaSnapshot(name, image, log, {
		apiKey: config.daytonaVm.apiKey,
		target: config.daytonaVm.target,
		sandboxClass: SandboxClass.LINUX_VM,
	});
}

/** Bake the daytona-container snapshot `name`: CONTAINER class in the daytona-container region (us-west-2). */
export function bakeDaytonaContainerSnapshot(name: string, image: string, log: Log): Promise<void> {
	return bakeDaytonaSnapshot(name, image, log, {
		apiKey: config.daytonaContainer.apiKey,
		target: config.daytonaContainer.target,
		sandboxClass: SandboxClass.CONTAINER,
	});
}
