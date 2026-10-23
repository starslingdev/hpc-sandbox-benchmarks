// The CreateOS DriverModule: the kit's driver over CreateOS's adapter, bound to the real SDK here
// and nowhere else. Tests lower the same module over a fake transport through `vendorDriver`.

import { CreateosSandboxClient } from "@nodeops-createos/sandbox";
import { defineVendorDriver, mapped } from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { type } from "arktype";
import { CREATEOS_PROVENANCE } from "./provenance.ts";
import {
	CREATEOS_MARKER,
	CREATEOS_ROOTFS,
	CREATEOS_SHAPE,
	createosTransport,
	createosVendor,
} from "./vendor.ts";

export { CREATEOS_PROVENANCE };
/**
 * CreateOS ids are `sb-` (the docs' own examples also show `sb_`) followed by a ULID. Kept
 * permissive on purpose: a wrong id schema would reject every created sandbox.
 */
export const CREATEOS_SANDBOX_ID = type(/^sb[-_][A-Za-z0-9]+$/);

/** Poll cadence for readiness and for a delete settling. */
const CREATEOS_POLL_MS = 1_000;
/**
 * A create returns only once the sandbox is `running`, so readiness is answered by the create
 * itself; this window only covers a re-read that races a teardown.
 */
const CREATEOS_READY_TIMEOUT_MS = 3 * 60_000;
/** A destroy releases the VM and its overlay; the host reports `destroying` until that settles. */
const CREATEOS_DELETE_TIMEOUT_MS = 5 * 60_000;
/** One control read; also the bound on a teardown's confirmation reads. */
const CREATEOS_CONTROL_TIMEOUT_MS = 30_000;
/** Cold boots of devbox:1 plus the guest agent's readiness check. */
const CREATEOS_BOOT_TIMEOUT_MS = 10 * 60_000;
/** The provider-local python preflight after boot. */
const CREATEOS_PREPARE_TIMEOUT_MS = 2 * 60_000;

/**
 * Worst-case wall time one create can spend: the blocking create POST, the readiness re-read, the
 * preflight and disk proof, and removing an allocation that failed preparation. A ceiling, not an
 * expectation (the observed create is seconds): every internal bound settles inside it, so the
 * harness race never abandons a teardown mid-flight.
 */
export const CREATEOS_CREATE_CEILING_MS =
	CREATEOS_BOOT_TIMEOUT_MS +
	CREATEOS_CONTROL_TIMEOUT_MS +
	CREATEOS_PREPARE_TIMEOUT_MS +
	CREATEOS_READY_TIMEOUT_MS +
	CREATEOS_CONTROL_TIMEOUT_MS +
	CREATEOS_DELETE_TIMEOUT_MS;

export default defineVendorDriver("createos", {
	provenance: CREATEOS_PROVENANCE,
	sandboxId: CREATEOS_SANDBOX_ID,
	// One fixed shape (4 vCPU / 8 GiB) with a create-time overlay size, so every axis maps onto the
	// request; `prepare` proves what the allocation reports and the kit proves the overlay after boot.
	coverage: mapped(),
	unsupported: ({ spec }) =>
		spec.vcpus === TARGET_SPEC.vcpus &&
		spec.memoryGb === TARGET_SPEC.memoryGb &&
		spec.diskGb === TARGET_SPEC.diskGb
			? undefined
			: `CreateOS is pinned to the ${CREATEOS_SHAPE} shape (${TARGET_SPEC.vcpus} vCPU / ${TARGET_SPEC.memoryGb} GiB) with a ${TARGET_SPEC.diskGb} GiB overlay, asked for ${spec.vcpus} vCPU / ${spec.memoryGb} GiB / ${spec.diskGb === undefined ? "no disk" : `${spec.diskGb} GiB`}`,
	// A 40 GiB overlay's filesystem reports the device minus its own metadata, so the proof allows 3%.
	diskProof: { allowanceRatio: 0.03 },
	// Long steps detach and are polled; `bash -lc` is the only way CreateOS runs a script.
	execution: { syncCapMs: 60_000, durable: "shell-detach" },
	createBudget: { owner: "harness", timeoutMs: CREATEOS_CREATE_CEILING_MS },
	timing: {
		pollMs: CREATEOS_POLL_MS,
		readyTimeoutMs: CREATEOS_READY_TIMEOUT_MS,
		deleteTimeoutMs: CREATEOS_DELETE_TIMEOUT_MS,
		controlTimeoutMs: CREATEOS_CONTROL_TIMEOUT_MS,
	},
	// The marker is an environment key: a name cannot carry an attempt UUID, and env keys are the
	// one create field the control plane echoes back on every view.
	markerKey: "envs",
	markerSpelling: CREATEOS_MARKER,
	// A timed-out POST can land after every bounded lookup: empty lookups cannot prove it absent.
	recovery: { provesAbsence: false },
	// Lazy: the client is built only when a driver is bound, never on import.
	vendor: ({ env }) => {
		const baseUrl = env.CREATEOS_SANDBOX_BASE_URL;
		return createosVendor(
			createosTransport(
				new CreateosSandboxClient({
					apiKey: env.CREATEOS_API_KEY,
					...(baseUrl === undefined ? {} : { baseUrl }),
				}),
			),
		);
	},
});

/** The image this driver boots; exported for catalog and docs checks. */
export { CREATEOS_ROOTFS };
