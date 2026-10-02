// The boat DriverModule: the kit's driver over boat's adapter, bound to the real SDK here and
// nowhere else. Tests lower the same module over a fake client through `specFor`.

import { BoatApi, Configuration } from "@boatdev/sdk";
import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { BOAT_PROVENANCE } from "./provenance.ts";
import {
	BOAT_CONTROL_TIMEOUT_MS,
	BOAT_CREATE_ATTEMPTS,
	BOAT_CREATE_RATE_LIMIT_RETRY_MS,
	BOAT_EGRESS_TIMEOUT_MS,
	BOAT_NAME,
	BOAT_SANDBOX_ID,
	boatVendor,
} from "./vendor.ts";

export { BOAT_PROVENANCE, BOAT_SANDBOX_ID };

export const BOAT_API_BASE = "https://boat.dev/api/v1";
export const BOAT_READY_TIMEOUT_MS = 8 * 60_000;
/**
 * A delete that conflicts with a snapshot is asked again at every read, then the sandbox is watched
 * to its 404: six bounded requests with 5s between them, then a minute.
 */
export const BOAT_DELETE_TIMEOUT_MS = 6 * BOAT_CONTROL_TIMEOUT_MS + 5 * 5_000 + 60_000;
/** Every bound one create can spend: the retried create, readiness, egress, rename, disk probe, teardown. */
export const BOAT_CREATE_CEILING_MS =
	BOAT_CREATE_ATTEMPTS * BOAT_CONTROL_TIMEOUT_MS +
	(BOAT_CREATE_ATTEMPTS - 1) * BOAT_CREATE_RATE_LIMIT_RETRY_MS +
	BOAT_CONTROL_TIMEOUT_MS +
	BOAT_READY_TIMEOUT_MS +
	2_000 +
	BOAT_EGRESS_TIMEOUT_MS +
	2 * BOAT_CONTROL_TIMEOUT_MS +
	BOAT_DELETE_TIMEOUT_MS;

export default defineVendorDriver("boat", {
	provenance: BOAT_PROVENANCE,
	sandboxId: BOAT_SANDBOX_ID,
	// The default SKU is the target size and its user disk at least the target's; boat boots its own
	// stock Ubuntu, never an artifact. The disk is still proven after boot.
	coverage: coverage({
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: { capacityAtLeast: TARGET_SPEC.diskGb },
	}),
	unsupported: ({ spec }) =>
		spec.vcpus === TARGET_SPEC.vcpus && spec.memoryGb === TARGET_SPEC.memoryGb
			? undefined
			: `boat's default SKU is ${TARGET_SPEC.vcpus} vCPU / ${TARGET_SPEC.memoryGb} GiB; ${spec.vcpus} vCPU / ${spec.memoryGb} GiB is a different size`,
	diskProof: {},
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	createBudget: { owner: "harness", timeoutMs: BOAT_CREATE_CEILING_MS },
	// Readiness reads every 2s; removal is read every second until the deleted sandbox 404s.
	timing: {
		pollMs: 2_000,
		deletePollMs: 1_000,
		readyTimeoutMs: BOAT_READY_TIMEOUT_MS,
		deleteTimeoutMs: BOAT_DELETE_TIMEOUT_MS,
		controlTimeoutMs: BOAT_CONTROL_TIMEOUT_MS,
	},
	pageCap: 1_000,
	markerKey: "name",
	markerSpelling: BOAT_NAME,
	// The marker is a sandbox name set after create, so no lookup can see an allocation whose
	// create response was lost.
	recovery: { provesAbsence: false },
	// Constructing the SDK performs no I/O; every request is bounded by the control-plane timeout.
	vendor: ({ env }) =>
		boatVendor(
			new BoatApi(
				new Configuration({
					basePath: env.BOAT_BASE_URL ?? BOAT_API_BASE,
					accessToken: env.BOAT_API_KEY,
					fetchApi: Object.assign(
						(...[input, init]: Parameters<typeof fetch>) =>
							fetch(input, {
								...init,
								signal: AbortSignal.any([
									AbortSignal.timeout(BOAT_CONTROL_TIMEOUT_MS),
									...(init?.signal ? [init.signal] : []),
								]),
							}),
						{ preconnect: fetch.preconnect },
					),
				}),
			),
		),
});
