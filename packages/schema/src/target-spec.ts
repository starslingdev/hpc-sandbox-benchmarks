/** Vendor-neutral resource request used by the registry, drivers, and persisted Runs. */
export interface TargetSpec {
	readonly vcpus: number;
	readonly memoryGb: number;
	readonly diskGb?: number;
}

/**
 * The pinned size every provider is asked to match.
 *
 * Kept in this dependency-free leaf so templates and drivers do not import the Run schema graph.
 */
export const TARGET_SPEC = {
	vcpus: 4,
	memoryGb: 8,
	diskGb: 40,
} as const satisfies TargetSpec;

/**
 * The resource bounds every burst variant (`daytona-vm-*-burst`, `modal-vm-burst`) is created with, so
 * bursts compare like for like: CPU and memory may each rise from the floor to the ceiling.
 */
export const BURST_BOUNDS = {
	vcpusMin: 2,
	vcpusMax: 8,
	memoryGbMin: TARGET_SPEC.memoryGb,
	memoryGbMax: 16,
} as const;
