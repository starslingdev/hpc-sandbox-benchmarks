// The Namespace DriverModule: the kit's driver over Namespace's adapter, bound to the generated
// clients and the explicit CI token file here and nowhere else. Tests lower the same module over a
// Connect router transport through `vendorDriver`.

import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { NAMESPACE_PROVENANCE } from "./provenance.ts";
import {
	NAMESPACE_CONTROL_TIMEOUT_MS,
	NAMESPACE_INSTANCE_ID,
	NAMESPACE_PURPOSE,
	namespaceClient,
	namespaceVendor,
} from "./vendor.ts";

export { NAMESPACE_INSTANCE_ID, NAMESPACE_PROVENANCE };

/** Readiness can take a cold image pull; it is observed inside create, within the harness budget. */
const NAMESPACE_READY_WAIT_MS = 15 * 60_000;
/**
 * RunCommandSync awaits the full response. It was once treated as uncapped until run 30314097333
 * lost `mise run benchmark:system:all` at 4m18.8s to a bare "The operation timed out." after two of
 * the suite's three PTS profiles had completed. 120s, not the ~259s observed: one data point, and
 * the bare message cannot distinguish a vendor cap from a client fetch timeout. Detaching makes the
 * distinction moot, because every exec, including each done-file poll, becomes short.
 */
const NAMESPACE_EXECUTION = { syncCapMs: 120_000, durable: "shell-detach" } as const;

export default defineVendorDriver("namespace", {
	provenance: NAMESPACE_PROVENANCE,
	sandboxId: NAMESPACE_INSTANCE_ID,
	// The create maps shape and guest environment; disk has no create-time knob and is proven.
	coverage: coverage(
		{ vcpus: "mapped", memoryGb: "mapped", diskGb: "runtime-verified" },
		{ env: "mapped" },
	),
	execution: NAMESPACE_EXECUTION,
	createBudget: { owner: "harness", timeoutMs: NAMESPACE_READY_WAIT_MS + 5 * 60_000 },
	timing: {
		pollMs: 2_000,
		readyTimeoutMs: NAMESPACE_READY_WAIT_MS,
		deleteTimeoutMs: 3 * 60_000,
		controlTimeoutMs: NAMESPACE_CONTROL_TIMEOUT_MS,
	},
	// The attempt's UUID travels in the instance's documented purpose.
	markerKey: "documented_purpose",
	markerSpelling: NAMESPACE_PURPOSE,
	// A lost RPC can allocate later; an initially empty listing proves no final verdict.
	recovery: { provesAbsence: false },
	// Listings include completed runs (see the adapter's `page`), and the server-side filter that
	// would leave them out also hides ERROR instances that still hold resources. Their history
	// accumulates, so the whole account is drained under this cap (100,000 records), not the kit's
	// default 100 pages.
	pageCap: 1_000,
	vendor: (context) => namespaceVendor(context, namespaceClient(context.env.NSC_TOKEN_FILE)),
});
