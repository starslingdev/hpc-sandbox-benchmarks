// Bake a daytona snapshot directly from a pushed toolchain image, via the raw Daytona SDK (the
// @computesdk/daytona wrapper only snapshots a running sandbox). Idempotent: delete an existing
// snapshot of that name, then recreate. The API key + runner target come from config.daytona
// (single-region: DAYTONA_API_KEY + DAYTONA_TARGET, e.g. us-west-2).
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
// microVM-only: the fleet is Firecracker microVMs, never containers. We pin the snapshot's
// `sandboxClass` to LINUX_VM so its create — and every sandbox booted from it — routes to microVM
// runners. Without it Daytona defaults to the `container` class, which fails on a region that only has
// microVM runners with "No runners are configured … for sandbox class 'container'". (Needs
// @daytona/sdk ≥ 0.192, which first exposed the selector.)
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
	const daytona = new Daytona({
		apiKey: daytonaCfg.apiKey,
		...(daytonaCfg.target ? { target: daytonaCfg.target } : {}),
	});

	const deleted = await deleteExistingSnapshots(daytona, name, log);

	log(`creating snapshot ${name} from ${image} (target ${daytonaCfg.target ?? "default"})`);
	try {
		await daytona.snapshot.create(
			{
				name,
				image,
				resources: { cpu: targetSpec.vcpus, memory: targetSpec.memoryGb, disk: targetSpec.diskGb },
				// Pin to microVM runners (never the `container` default) — the fleet's hard constraint.
				sandboxClass: SandboxClass.LINUX_VM,
			},
			{ onLogs: log },
		);
	} catch (err) {
		// Nothing was deleted → the name was already free, so the prior state (none) is intact: rethrow
		// verbatim rather than dress up an ordinary create failure as a destroyed artifact.
		if (deleted === 0) throw err;
		const reason = err instanceof Error ? err.message : String(err);
		throw new Error(snapshotDestroyedMessage(name, deleted, reason), { cause: err });
	}
}
