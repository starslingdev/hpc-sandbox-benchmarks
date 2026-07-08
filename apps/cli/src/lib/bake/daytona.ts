// Bake a daytona snapshot directly from a pushed toolchain image, via the raw Daytona SDK (the
// @computesdk/daytona wrapper only snapshots a running sandbox). Idempotent: delete an existing
// snapshot of that name, then recreate. Region-aware: the active region's API key + target come from
// config.daytonaRegion (ZEN5 supported).
//
// Iteration surface: a snapshot's region must match where sandboxes boot. We pass the region's
// `target` to the client; if a beta region (ZEN5) also needs an explicit snapshot `regionId`, add it
// to CreateSnapshotParams here.
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

/** Delete every existing snapshot named `name`, in any state. We sweep `list()` rather than
 *  `get(name)`: a snapshot stuck in a failed/error state — a prior bake that died mid-create — is NOT
 *  returned by `get`, yet still makes `create` reject the name as "already exists for this
 *  organization". Page count is read up front so the paginated read is stable before any delete
 *  shifts it; deletes run after. */
async function deleteExistingSnapshots(daytona: Daytona, name: string, log: Log): Promise<void> {
	const LIMIT = 100;
	const first = await daytona.snapshot.list(1, LIMIT);
	const matches = first.items.filter((s) => s.name === name);
	const pages = Math.ceil(first.total / LIMIT);
	for (let page = 2; page <= pages; page++) {
		const { items } = await daytona.snapshot.list(page, LIMIT);
		matches.push(...items.filter((s) => s.name === name));
	}
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
}

/** Create the daytona snapshot `name` from `image` (candidate while iterating, version on promote),
 *  in the active region. Idempotent: delete any existing snapshot of that name first. */
export async function bakeDaytonaSnapshot(name: string, image: string, log: Log): Promise<void> {
	const { daytonaRegion, targetSpec } = config;
	const daytona = new Daytona({
		apiKey: daytonaRegion.apiKey,
		...(daytonaRegion.target ? { target: daytonaRegion.target } : {}),
	});

	await deleteExistingSnapshots(daytona, name, log);

	log(`creating snapshot ${name} from ${image} (target ${daytonaRegion.target ?? "default"})`);
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
