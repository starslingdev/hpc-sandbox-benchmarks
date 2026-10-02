// The Daytona snapshot builder both isolation variants export as `./<variant>/artifact`.
//
// It uploads the digest-pinned toolchain base to Daytona's transient registry, then registers that
// private image as a snapshot through the SDK. Both public-GHCR paths are broken for this valid
// image: the direct importer returns an opaque inspection error, while the declarative builder
// cannot authenticate its FROM pull. Daytona's CLI local-image path uploads the same layers but
// hardcodes the `container` sandbox class, so this performs the documented transient-registry push
// itself and pins the variant's class explicitly: daytona-vm bakes LINUX_VM, daytona-container bakes
// CONTAINER, in the region its target names. The class is a property of the snapshot, so the two
// variants are necessarily separate snapshots.
//
// Delete-then-create is idempotent but NOT atomic: the SDK exposes no snapshot rename or overwrite,
// so the name is unavoidably ABSENT between the delete and a successful create, and a create that
// fails leaves no snapshot of that name at all. The result reports such a replacement as
// `destructive`, and an error after the delete says plainly that the name no longer resolves.

import type { RegistryPushAccessDto } from "@daytona/api-client";
import { Configuration, DockerRegistryApi } from "@daytona/api-client";
import type { DaytonaConfig, SandboxClass } from "@daytona/sdk";
import { Daytona } from "@daytona/sdk";
import type { EnvOf } from "@sandbox-benchmarks/driver";
import type { BuildCommandRunner, OciArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";
import { defineArtifactBuilder, runBuildCommand } from "@sandbox-benchmarks/driver/artifact";
import type { DaytonaId } from "./shared.ts";

type Log = (line: string) => void;
type SnapshotClient = Pick<Daytona, "snapshot">;
type SnapshotRecord = Awaited<ReturnType<SnapshotClient["snapshot"]["list"]>>["items"][number];

/** Everything the builder reaches outside the process, injectable so its translation is testable. */
export interface DaytonaBuildTransport {
	readonly client: (config: Pick<DaytonaConfig, "apiKey" | "target">) => SnapshotClient;
	readonly pushAccess: (apiKey: string, region: string) => Promise<RegistryPushAccessDto>;
	readonly run: BuildCommandRunner;
	readonly sleep: (ms: number) => Promise<void>;
}

const realTransport: DaytonaBuildTransport = {
	client: (config) => new Daytona(config),
	pushAccess: async (apiKey, region) => {
		const registryApi = new DockerRegistryApi(
			new Configuration({
				accessToken: apiKey,
				basePath: "https://app.daytona.io/api",
				baseOptions: { headers: { "X-Daytona-Source": "sandbox-benchmarks" } },
			}),
		);
		return (await registryApi.getTransientPushAccess(undefined, region)).data;
	},
	run: runBuildCommand,
	sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
	daytona: SnapshotClient,
	name: string,
): Promise<SnapshotRecord[]> {
	const LIMIT = 100;
	const matches: SnapshotRecord[] = [];
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
 *  destroyed what held it: from here to a successful `create`, `name` does not resolve. Throwing
 *  leaves the name intact (the delete never completed). With `replace: "forbidden"` an existing
 *  snapshot is refused before anything is deleted. */
async function deleteExistingSnapshots(
	daytona: SnapshotClient,
	name: string,
	replace: "allowed" | "forbidden",
	sleep: (ms: number) => Promise<void>,
	log: Log,
): Promise<number> {
	const matches = await listSnapshotsByName(daytona, name);
	if (matches.length > 0 && replace === "forbidden")
		throw new Error(
			`daytona snapshot ${name} already exists and may not be replaced; Daytona can only delete it, then recreate it`,
		);
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
		let remaining: SnapshotRecord[];
		try {
			remaining = await listSnapshotsByName(daytona, name);
		} catch (err) {
			if (performance.now() - start > DEADLINE_MS) {
				throw new Error(
					`daytona snapshot ${name}: deletion poll failed after ${DEADLINE_MS}ms — ${message(err)}`,
				);
			}
			log(`transient error listing snapshots while waiting for ${name} deletion — ${message(err)}`);
			await sleep(POLL_MS);
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
		await sleep(POLL_MS);
	}
}

/** A verbose one-line description of a Daytona SDK error for diagnostics — pulls status codes, any
 *  response body, an error code, and the `cause` chain out of the opaque object the SDK throws, so a
 *  bake log records more than the bare `.message`. Pure and defensive (never throws), so it is safe on
 *  an error path. */
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
	// Include the error's OWN message, so a plain `new Error("…")` keeps its whole diagnostic.
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
 *  removed to free the name: `name` now resolves to nothing. Stated plainly because a release lane
 *  that passed a published name (a forced republish) surfaces this as the report's `reason`, where
 *  "failed" otherwise reads as "nothing changed". */
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
export function daytonaTransientPushCommands(
	image: string,
	transientRef: string,
): [string, ...string[]][] {
	return [
		["docker", "pull", image],
		["docker", "tag", image, transientRef],
		["docker", "push", transientRef],
	];
}

/** Create attempts — a small resilient retry that self-heals a transient registry-inspect blip; a
 *  persistent failure is characterized across every attempt by {@link logCreateFailure}. */
const CREATE_ATTEMPTS = 5;

/** Log the diagnostics for a failed create attempt: the structured SDK error, plus where the snapshot
 *  landed — "absent" vs an `error`-state snapshot (with its richer `errorReason`) distinguishes a failed
 *  registry inspect from a failed build. Best-effort: never throws (it runs on an error path). */
async function logCreateFailure(
	daytona: SnapshotClient,
	name: string,
	err: unknown,
	log: Log,
): Promise<void> {
	log(`    message: ${message(err)}`);
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
		log(`    post-failure: could not list ${name} — ${message(listErr)}`);
	}
}

/**
 * The snapshot builder for one Daytona variant: its sandbox class, and how its parsed inputs name
 * the region. The variant entries bind the real transport.
 */
export function daytonaArtifactBuilder<P extends DaytonaId>(
	provider: P,
	variant: {
		readonly sandboxClass: SandboxClass;
		readonly target: (env: EnvOf<P>) => string;
	},
	transport: DaytonaBuildTransport = realTransport,
): OciArtifactBuilder<P> {
	const { run, sleep } = transport;
	const docker = async (argv: [string, ...string[]], log: Log): Promise<void> => {
		log(`$ ${argv.join(" ")}`);
		const exit = await run(argv);
		if (exit !== 0) throw new Error(`${argv.slice(0, 2).join(" ")} exited ${exit}`);
	};
	return defineArtifactBuilder<P, EnvOf<P>>(provider, async (request) => {
		const { name, base, spec, env, log } = request;
		const image = base.digestRef;
		const target = variant.target(env);
		// Both variants share the account credential; only the region input differs.
		const apiKey = (env as EnvOf<DaytonaId>).DAYTONA_API_KEY;
		const daytona = transport.client({ apiKey, target });

		// The buildx publish lane does not load the pushed image into the runner's Docker daemon, so
		// the digest is pulled explicitly before it is tagged for Daytona's transient registry. The
		// upload completes before the destructive delete: a registry/auth/network failure leaves an
		// existing snapshot intact, and the delete→create outage is as short as the API permits.
		const access = await transport.pushAccess(apiKey, target);
		const registry = access.registryUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
		log(`authenticating Docker to Daytona transient registry ${registry}`);
		// The short-lived secret travels on stdin, never in argv or logs.
		const login = await run(
			["docker", "login", registry, "--username", access.username, "--password-stdin"],
			{ stdin: access.secret },
		);
		if (login !== 0) throw new Error(`docker login ${registry} exited ${login}`);
		const logout = async () => {
			log(`removing Docker credentials for Daytona transient registry ${registry}`);
			const exit = await run(["docker", "logout", registry]);
			if (exit !== 0) throw new Error(`docker logout ${registry} exited ${exit}`);
		};
		let transientRef: string;
		try {
			// The destination is built after login so every post-login failure is inside the logout
			// boundary: malformed registry metadata must not leave credentials behind.
			const tag = new Date().toISOString().replace(/\D/g, "");
			transientRef = daytonaTransientRef(access, image, tag);
			for (const command of daytonaTransientPushCommands(image, transientRef))
				await docker(command, log);
		} catch (error) {
			// The upload failure is the outcome; a logout failure on top of it is only reported.
			await logout().catch((cleanupError: unknown) =>
				log(
					`warning: could not remove Daytona transient registry credentials after upload failure — ${message(cleanupError)}`,
				),
			);
			throw error;
		}
		await logout();
		request.signal.throwIfAborted();

		const deleted = await deleteExistingSnapshots(daytona, name, request.replace, sleep, log);
		const params = {
			name,
			image: transientRef,
			resources: { cpu: spec.vcpus, memory: spec.memoryGb, disk: spec.diskGb },
			regionId: target,
			// Pinned explicitly, never the transient-push API's `container` default.
			sandboxClass: variant.sandboxClass,
		};

		// Daytona's create inspects `image` in the registry on a build runner, and that inspect can
		// fail with an opaque, often-transient "internal error". Retry with backoff, capturing rich
		// diagnostics on every failed attempt so a PERSISTENT failure is precisely characterized.
		let lastErr: unknown;
		// Set only when a pre-retry cleanup failed and stopped the loop early. Kept SEPARATE from
		// `lastErr`: the create failure carries the real diagnostic, while this explains why retrying
		// stopped.
		let cleanupErr: unknown;
		for (let attempt = 1; attempt <= CREATE_ATTEMPTS; attempt++) {
			// A failed create can leave the name held by an error-state snapshot; sweep it before
			// retrying. (`deleted` above is what the destroyed-message reports — these are our own
			// failed remnants, not a pre-existing snapshot.)
			if (attempt > 1) {
				try {
					await deleteExistingSnapshots(daytona, name, "allowed", sleep, log);
				} catch (err) {
					// STOP retrying: the sweep already absorbs transient blips for its 3-minute deadline,
					// so a throw here is a PERSISTENT failure to free the name, and every remaining create
					// would fail "already exists" while burying the real blocker.
					log(`!!! attempt ${attempt}: could not free ${name} — ${message(err)}`);
					log("    the name is still held, so further create attempts cannot succeed; giving up.");
					cleanupErr = err;
					break;
				}
			}
			log(
				`>>> daytona snapshot create attempt ${attempt}/${CREATE_ATTEMPTS}: ${name} from ${transientRef} (target ${target}, class ${variant.sandboxClass})`,
			);
			const startMs = performance.now();
			try {
				await daytona.snapshot.create(params, { onLogs: log });
				log(
					`<<< daytona snapshot create succeeded on attempt ${attempt}/${CREATE_ATTEMPTS} (${(performance.now() - startMs).toFixed(0)}ms)`,
				);
				return { ref: name, replaced: deleted > 0 ? "destructive" : "none" };
			} catch (err) {
				lastErr = err;
				log(
					`!!! daytona create attempt ${attempt}/${CREATE_ATTEMPTS} failed after ${(performance.now() - startMs).toFixed(0)}ms`,
				);
				await logCreateFailure(daytona, name, err, log);
				if (attempt < CREATE_ATTEMPTS) {
					const backoffMs = Math.min(attempt * 5000, 20000);
					log(`    backing off ${backoffMs}ms before retry…`);
					await sleep(backoffMs);
				}
			}
		}

		// Every attempt failed (or a failed pre-clean stopped them early). Report BOTH causes when
		// there are two; `lastErr` stays the create error, so the `cause` chain points at it.
		const createReason = message(lastErr);
		const reason =
			cleanupErr === undefined
				? createReason
				: `${createReason}; retries stopped because ${name} could not be freed for another attempt: ${message(cleanupErr)}`;
		// Nothing was deleted → the name was already free and the prior state (none) is intact:
		// rethrow rather than dress an ordinary create failure up as a destroyed artifact.
		if (deleted === 0) {
			if (cleanupErr === undefined) throw lastErr;
			throw new Error(`daytona snapshot ${name} create failed — ${reason}`, { cause: lastErr });
		}
		throw new Error(snapshotDestroyedMessage(name, deleted, reason), { cause: lastErr });
	});
}
