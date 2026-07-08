// Bake a daytona snapshot directly from a pushed toolchain image, via the raw Daytona SDK (the
// @computesdk/daytona wrapper only snapshots a running sandbox). Idempotent: delete an existing
// snapshot of that name, then recreate. The API key + runner target come from config.daytona
// (single-region: DAYTONA_API_KEY + DAYTONA_TARGET, e.g. us-west-2).
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
 *  organization". Page count is read up front so the paginated read is stable within one call. */
async function listSnapshotsByName(
	daytona: Daytona,
	name: string,
): Promise<Awaited<ReturnType<Daytona["snapshot"]["list"]>>["items"]> {
	const LIMIT = 100;
	const first = await daytona.snapshot.list(1, LIMIT);
	const matches = first.items.filter((s) => s.name === name);
	const pages = Math.ceil(first.total / LIMIT);
	for (let page = 2; page <= pages; page++) {
		const { items } = await daytona.snapshot.list(page, LIMIT);
		matches.push(...items.filter((s) => s.name === name));
	}
	return matches;
}

/** Delete every existing snapshot named `name` and WAIT until it's fully gone. `snapshot.delete` is
 *  asynchronous (active → `removing` → gone), and `create` rejects the name while ANY snapshot of it
 *  still exists — so returning right after issuing the delete races the not-yet-completed removal
 *  ("already exists for this organization"). Poll `list()` until no match remains, bounded by a
 *  deadline so a stuck removal fails loudly instead of hanging. */
async function deleteExistingSnapshots(daytona: Daytona, name: string, log: Log): Promise<void> {
	const matches = await listSnapshotsByName(daytona, name);
	for (const snap of matches) {
		log(`deleting existing snapshot ${name} (state ${snap.state})`);
		try {
			await daytona.snapshot.delete(snap);
		} catch (err) {
			// A snapshot already gone (concurrent delete) is fine; rethrow auth/network/in-use so the
			// real failure isn't masked by a downstream "already exists" from create.
			if (!isNotFound(err)) throw err;
		}
	}
	if (matches.length === 0) return;

	const DEADLINE_MS = 180_000;
	const POLL_MS = 3_000;
	const start = performance.now();
	for (;;) {
		const remaining = await listSnapshotsByName(daytona, name);
		if (remaining.length === 0) return;
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

/** Create the daytona snapshot `name` from `image` (candidate while iterating, version on promote).
 *  Idempotent: delete any existing snapshot of that name first. */
export async function bakeDaytonaSnapshot(name: string, image: string, log: Log): Promise<void> {
	const { daytona: daytonaCfg, targetSpec } = config;
	const daytona = new Daytona({
		apiKey: daytonaCfg.apiKey,
		...(daytonaCfg.target ? { target: daytonaCfg.target } : {}),
	});

	await deleteExistingSnapshots(daytona, name, log);

	log(`creating snapshot ${name} from ${image} (target ${daytonaCfg.target ?? "default"})`);
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
}
