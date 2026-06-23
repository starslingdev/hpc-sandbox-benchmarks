/**
 * Observed specs per ProviderRun: the harness pins a target spec at create() and records
 * what the sandbox actually delivered into `observed-specs.json`. This slice reads that file; the jc
 * probe-file fallback (lscpu/free/uname/df) lands with the lifecycle path.
 */
import type { ObservedSpecs } from "@sandbox-benchmarks/schema";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";

/** Reads a named JSON file from a provider's raw directory, or undefined when absent/unparseable. */
export type JsonReader = (name: string) => unknown;

const num = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined;
const str = (value: unknown): string | undefined =>
	typeof value === "string" && value.length > 0 ? value : undefined;

const NUMERIC_FIELDS = [
	"vcpus",
	"memoryGb",
	"diskGb",
	"hostVcpus",
	"hostMemoryGb",
	"cpuMhz",
] as const;
const STRING_FIELDS = ["cpuModel", "kernel", "os", "virtualization", "user"] as const;

function fromObservedSpecsFile(raw: Record<string, unknown>): ObservedSpecs {
	const specs: ObservedSpecs = {};
	for (const key of NUMERIC_FIELDS) {
		const value = num(raw[key]);
		if (value !== undefined) specs[key] = value;
	}
	for (const key of STRING_FIELDS) {
		const value = str(raw[key]);
		if (value !== undefined) specs[key] = value;
	}
	return specs;
}

/** Read the harness-written observed-specs.json, tolerating its absence (returns `{}`). */
export function readObservedSpecs(readJson: JsonReader): ObservedSpecs {
	const direct = readJson("observed-specs.json");
	if (direct && typeof direct === "object" && !Array.isArray(direct)) {
		return fromObservedSpecsFile(direct as Record<string, unknown>);
	}
	return {};
}

/**
 * Did the sandbox honor the pinned target spec? vCPUs must match exactly; memory within ±10%
 * (kernels reserve some). Undefined when either observation is missing — we refuse to judge on
 * partial evidence.
 */
export function computeSpecMatched(specs: ObservedSpecs): boolean | undefined {
	if (specs.vcpus === undefined || specs.memoryGb === undefined) return undefined;
	const memoryOk = Math.abs(specs.memoryGb - TARGET_SPEC.memoryGb) <= TARGET_SPEC.memoryGb * 0.1;
	return specs.vcpus === TARGET_SPEC.vcpus && memoryOk;
}
