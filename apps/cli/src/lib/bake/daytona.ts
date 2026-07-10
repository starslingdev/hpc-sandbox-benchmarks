// Bake a daytona snapshot directly from a pushed toolchain image, via the raw Daytona SDK (the
// @computesdk/daytona wrapper only snapshots a running sandbox). Idempotent: delete an existing
// snapshot of that name, then recreate. The API key + runner target come from config.daytona
// (single-region: DAYTONA_API_KEY + DAYTONA_TARGET, e.g. us-west-2).
//
// Iteration surface: a snapshot's region must match where sandboxes boot. We pass the client `target`;
// if the target also needs an explicit snapshot `regionId`, add it to CreateSnapshotParams here.
import { Daytona } from "@daytona/sdk";
import { config } from "@sandbox-benchmarks/providers";
import type { Log } from "./types.ts";

/** Whether a snapshot.get/delete error is a genuine "no such snapshot" (so the idempotent path may
 *  swallow it) — as opposed to auth/network/in-use failures, which must surface their root cause
 *  instead of being masked into a confusing create-time error. */
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

/** Create the daytona snapshot `name` from `image` (candidate while iterating, version on promote),
 *  in the active region. Idempotent: delete an existing snapshot of that name first. */
export async function bakeDaytonaSnapshot(name: string, image: string, log: Log): Promise<void> {
	const { daytona: daytonaCfg, targetSpec } = config;
	const daytona = new Daytona({
		apiKey: daytonaCfg.apiKey,
		...(daytonaCfg.target ? { target: daytonaCfg.target } : {}),
	});

	try {
		const existing = await daytona.snapshot.get(name);
		log(`deleting existing snapshot ${name}`);
		await daytona.snapshot.delete(existing);
	} catch (err) {
		// Only "no such snapshot" is expected here; rethrow auth/network/in-use so the real failure
		// isn't masked by a downstream "already exists"/permission error from create.
		if (!isNotFound(err)) throw err;
	}

	log(`creating snapshot ${name} from ${image} (target ${daytonaCfg.target ?? "default"})`);
	await daytona.snapshot.create(
		{
			name,
			image,
			resources: { cpu: targetSpec.vcpus, memory: targetSpec.memoryGb, disk: targetSpec.diskGb },
		},
		{ onLogs: log },
	);
}
