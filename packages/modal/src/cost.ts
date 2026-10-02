// Modal's cost-evidence passthrough: both isolation variants have exactly one public cost
// capability, and it records why no sandbox-scoped billed usage was observed.

import type { ProviderCostEvidenceCapability } from "@sandbox-benchmarks/driver";
import { MODAL_PROVENANCE } from "./provenance.ts";
import { MODAL_APP_NAME } from "./vendor.ts";

/**
 * Native Modal SDK identity for cost-evidence records: the package provenance, typed for the hook.
 *
 * This package imports `modal` directly for its control plane, so the SDK whose public surface was
 * searched for a sandbox-scoped usage endpoint is the catalog-pinned copy this package resolves.
 * Generated from that same pin so the recorded version cannot drift from the installed one;
 * `index.test.ts` asserts it against the resolved package.
 */
export const MODAL_COST_SDK_PROVENANCE =
	MODAL_PROVENANCE satisfies ProviderCostEvidenceCapability["sdk"];

/** The hook does not invoke the private SandboxGetResourceUsage RPC. */
export const modalCostEvidence: ProviderCostEvidenceCapability<"modal-gvisor" | "modal-vm"> = {
	sdk: MODAL_COST_SDK_PROVENANCE,
	captureAfterTeardown: async (input) => ({
		kind: "missing",
		cell: input.cell,
		subject: { kind: "sandbox", sandboxId: input.sandboxId, appName: MODAL_APP_NAME },
		capturedAt: new Date().toISOString(),
		sdk: MODAL_COST_SDK_PROVENANCE,
		...(input.teardown.completed
			? {
					reason: "unsupported_public_api",
					detail:
						"The generated SandboxGetResourceUsage RPC is private and was not invoked; the installed public Modal SDK exposes no trustworthy sandbox-scoped billed usage endpoint.",
				}
			: {
					reason: "sandbox_teardown_unconfirmed",
					detail: "Sandbox teardown was not confirmed; no provider usage was considered.",
				}),
	}),
};
