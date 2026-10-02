// The Microsandbox Cloud DriverModule: the kit's driver over the Microsandbox adapter, bound to the
// real SDK here and nowhere else. Tests lower the same module over a stub SDK through `vendorDriver`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { Sandbox, withDefaultBackend } from "microsandbox";
import { MICROSANDBOX_CLOUD_PROVENANCE } from "./provenance.ts";
import { MICROSANDBOX_NAME, MICROSANDBOX_SANDBOX_ID, microsandboxVendor } from "./vendor.ts";

export { MICROSANDBOX_CLOUD_PROVENANCE, MICROSANDBOX_SANDBOX_ID };

/**
 * `create` does not return until the sandbox is RUNNING, so the toolchain image pull (~1.5 GiB
 * compressed, cold on every CI runner) happens inside it. The harness's default five-minute attempt
 * budget loses to that pull and a create timeout is not a capacity refusal, so it would not retry.
 */
export const MICROSANDBOX_CREATE_TIMEOUT_MS = 20 * 60_000;

export default defineVendorDriver("microsandbox-cloud", {
	provenance: MICROSANDBOX_CLOUD_PROVENANCE,
	sandboxId: MICROSANDBOX_SANDBOX_ID,
	// The create maps every axis and the guest environment; the allocation's own config proves them.
	coverage: coverage({ vcpus: "mapped", memoryGb: "mapped", diskGb: "mapped" }, { env: "mapped" }),
	unsupported: ({ spec }) =>
		spec.diskGb === undefined
			? "Microsandbox Cloud requires an explicit managed root disk size"
			: undefined,
	// The SDK exposes no streaming callbacks. Benchmark-length steps detach and poll the done file so
	// a long-lived remote WebSocket is not the durability boundary.
	execution: { syncCapMs: 60_000, durable: "shell-detach" },
	createBudget: { owner: "harness", timeoutMs: MICROSANDBOX_CREATE_TIMEOUT_MS },
	// The attempt's UUID travels in the sandbox name, so a create whose response was lost is found
	// by it.
	markerKey: "name",
	markerSpelling: MICROSANDBOX_NAME,
	recovery: { lookup: MICROSANDBOX_NAME },
	vendor: (context) => microsandboxVendor({ Sandbox, withDefaultBackend }, context),
});
