// Public surface of @sandbox-benchmarks/provider-modal — the modal ProviderAdapter, bound to the
// schema's `modal` id by the aggregator (@sandbox-benchmarks/providers).
//
// Boots the toolchain image directly from the registry with the target spec pinned in Modal's own
// units. Credentials come from MODAL_TOKEN_ID/MODAL_TOKEN_SECRET (the SDK's env fallback; the
// schema meta's requiredEnvVars gate skips without them).
import { modal } from "@computesdk/modal";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { toolchainImage } from "@sandbox-benchmarks/provider-core";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";

/**
 * Modal provisions and prices in physical CPU cores, where 1 physical core = 2 vCPU ("Note that
 * this value corresponds to physical cores, not vCPUs" — modal.com/docs/guide/resources). The one
 * source of that factor: the adapter divides the pinned vCPU spec by it to reserve the matching
 * number of cores, and the schema's modal pricing entry normalizes its per-physical-core rate to
 * per-vCPU by the same factor (as prose — the vetted rate there is a literal).
 */
export const VCPUS_PER_PHYSICAL_CORE = 2;

// This project's dedicated Modal app — the namespace all sandbox-benchmarks sandboxes boot under.
const MODAL_APP_NAME = "sandbox-benchmarks";

export const modalAdapter: ProviderAdapter = {
	// Boot sandboxes under this project's own Modal app (auto-created via apps.fromName on first
	// create), not the wrapper's generic `computesdk-modal` default — so this project's sandboxes
	// are namespaced/attributable in the Modal dashboard, separate from any other computesdk usage.
	createCompute: () => modal({ scalableSandboxes: true, appName: MODAL_APP_NAME }),
	createOptions: {
		templateId: toolchainImage,
		// Passing TARGET_SPEC.vcpus straight through would reserve 2 physical cores = 4 vCPUs —
		// double every other provider, not parity with them.
		cpu: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
		cpuLimit: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
		// `memoryMiB` is only a RESERVATION — on its own the guest still sees the host's RAM (a live
		// sandbox reported 464 GB), and PTS sizes STREAM's arrays from that, so the memory suite never
		// converged. `memoryLimitMiB` is the hard cap that makes /proc/meminfo report the target spec.
		memoryMiB: TARGET_SPEC.memoryGb * 1024,
		memoryLimitMiB: TARGET_SPEC.memoryGb * 1024,
	},
};
