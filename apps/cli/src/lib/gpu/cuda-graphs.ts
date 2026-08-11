export function cudaGraphEvidenceFromLog(log: string) {
	return {
		requestedMode: "FULL_AND_PIECEWISE" as const,
		runtimeModeObserved: log.includes("CUDAGraphMode.FULL_AND_PIECEWISE"),
		eagerDisabled: log.includes("enforce_eager=False"),
		captureCompleted: /Graph capturing finished in \d+(?:\.\d+)? secs/.test(log),
	};
}

export type CudaGraphEvidence = ReturnType<typeof cudaGraphEvidenceFromLog>;

export function cudaGraphEvidencePassed(evidence: CudaGraphEvidence): boolean {
	return evidence.runtimeModeObserved && evidence.eagerDisabled && evidence.captureCompleted;
}
