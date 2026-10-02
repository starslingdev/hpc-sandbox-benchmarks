// The post-teardown cost-evidence hook contract the harness invokes for a provider.
import type {
	ProviderCostCell,
	ProviderCostEvidence,
	ProviderId,
	SdkProvenance,
} from "@sandbox-benchmarks/schema";

export interface SandboxTeardownResult {
	completed: boolean;
	attemptedAt: string;
	completedAt?: string;
}

export interface CostEvidenceCaptureInput {
	cell: ProviderCostCell;
	providerId: ProviderId;
	sandboxId: string;
	teardown: SandboxTeardownResult;
}

export interface ProviderCostEvidenceCapability {
	sdk: SdkProvenance;
	captureAfterTeardown(input: CostEvidenceCaptureInput): Promise<ProviderCostEvidence>;
}
