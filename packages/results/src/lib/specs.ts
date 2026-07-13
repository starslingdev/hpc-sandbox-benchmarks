/**
 * Observed specs per ProviderRun: the harness pins a target spec at create() and records
 * what the sandbox actually delivered into `observed-specs.json`. That file is primary; when it is
 * absent — or omits a field — the in-sandbox jc probe files the producer writes (lscpu/free/uname/df)
 * backfill the EFFECTIVE side (vcpus/memoryGb/diskGb/cpuModel/kernel/virtualization).
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

/**
 * Derive the EFFECTIVE specs from the individual jc probe files (the producer's `*--lscpu.json` /
 * `*--free.json` / `*--uname.json` / `*--df.json`). Each file is independent and optional — anything
 * missing or malformed is simply left unset. Only the in-sandbox effective fields are filled here; the
 * host-side fingerprint comes from the PTS `<System>` block.
 */
function fromProbeFiles(readJson: JsonReader): ObservedSpecs {
	const specs: ObservedSpecs = {};

	// jc lscpu: { lscpu: [{ field, data }, …] }. `CPU(s):` is the effective vCPU count inside the sandbox.
	const lscpu = readJson("cpu-info--lscpu.json") as
		| { lscpu?: Array<{ field?: string; data?: string }> }
		| undefined;
	if (Array.isArray(lscpu?.lscpu)) {
		const field = (name: string) => lscpu.lscpu?.find((e) => e?.field === name)?.data;
		const vcpus = Number(field("CPU(s):"));
		if (Number.isFinite(vcpus) && vcpus > 0) specs.vcpus = vcpus;
		const model = str(field("Model name:"));
		if (model) specs.cpuModel = model;
		const hypervisor = str(field("Hypervisor vendor:"));
		if (hypervisor) specs.virtualization = hypervisor;
	}

	// jc free: array of rows; the "Mem" row's `total` is bytes → GiB.
	const free = readJson("memory-info--free.json");
	if (Array.isArray(free)) {
		const mem = free.find(
			(e) => e && typeof e === "object" && (e as { type?: unknown }).type === "Mem",
		) as { total?: unknown } | undefined;
		const total = num(mem?.total);
		if (total !== undefined) specs.memoryGb = total / 1024 ** 3;
	}

	// jc uname: { kernel_release }.
	const uname = readJson("system-os--uname.json") as { kernel_release?: unknown } | undefined;
	const kernel = str(uname?.kernel_release);
	if (kernel) specs.kernel = kernel;

	// jc df: array; the root filesystem's size in bytes (`size`, modern jc) or KiB (`1k_blocks`, legacy) → GiB.
	const df = readJson("disk-layout--df.json");
	if (Array.isArray(df)) {
		const root = df.find(
			(e) => e && typeof e === "object" && (e as { mounted_on?: unknown }).mounted_on === "/",
		) as Record<string, unknown> | undefined;
		const bytes = num(root?.size);
		const kib = num(root?.["1k_blocks"]);
		if (bytes !== undefined) specs.diskGb = bytes / 1024 ** 3;
		else if (kib !== undefined) specs.diskGb = (kib * 1024) / 1024 ** 3;
	}

	return specs;
}

/**
 * Read the harness-written observed-specs.json (primary), backfilling any field it omits from the jc
 * probe files. observed-specs.json always wins on overlap; with no usable observed-specs.json the probes
 * stand alone. Tolerates everything being absent (returns `{}`). Signature is stable for normalize-tree.
 */
export function readObservedSpecs(readJson: JsonReader): ObservedSpecs {
	const probes = fromProbeFiles(readJson);
	const direct = readJson("observed-specs.json");
	if (direct && typeof direct === "object" && !Array.isArray(direct)) {
		return { ...probes, ...fromObservedSpecsFile(direct as Record<string, unknown>) };
	}
	return probes;
}

/**
 * Did the sandbox honor the pinned target spec? vCPUs must match exactly; memory within ±10%
 * (kernels reserve some). Undefined when either observation is missing — we refuse to judge on
 * partial evidence.
 *
 * Deliberately covers the COMPARABILITY dimensions only — the two that decide whether two providers'
 * numbers may be put side by side. {@link TARGET_SPEC}.diskGb is excluded even though it is part of
 * the spec: disk is a gate on whether a suite can run at all, not an axis anyone is ranked on (it is
 * excluded from `hourlyCostAtTargetSpec` for the same reason), and providers that cannot express disk
 * would otherwise all report `specMatched: false` for a dimension that never touched their results.
 * A disk shortfall is not silently absorbed here — it surfaces as a skip with an "Insufficient disk"
 * reason and is rendered as an explicit leaderboard coverage gap.
 */
export function computeSpecMatched(specs: ObservedSpecs): boolean | undefined {
	if (specs.vcpus === undefined || specs.memoryGb === undefined) return undefined;
	const memoryOk = Math.abs(specs.memoryGb - TARGET_SPEC.memoryGb) <= TARGET_SPEC.memoryGb * 0.1;
	return specs.vcpus === TARGET_SPEC.vcpus && memoryOk;
}
