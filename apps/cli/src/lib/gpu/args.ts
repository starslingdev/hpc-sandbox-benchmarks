import { lastFlagValue, parseReplicatesFlag, resolveMaxConcurrency } from "../replicates.ts";
import type { GpuBenchmarkMode } from "./config.ts";
import { FLASHINFER_AUTOTUNE_MODES, GPU_BENCHMARK } from "./config.ts";

const PREPARATIONS = ["models", "kernels"] as const;
const VALUE_FLAGS = new Set([
	"--client-timeout-minutes",
	"--cpu",
	"--cpu-limit",
	"--cuda-build-jobs",
	"--flashinfer-autotune",
	"--gpu",
	"--kernel-snapshot-registry-volume",
	"--max-concurrency",
	"--max-replicate-duration-seconds",
	"--memory-limit-mib",
	"--memory-mib",
	"--mode",
	"--model-volume",
	"--nvcc-threads",
	"--output-dir",
	"--prepare",
	"--relative-ci-half-width",
	"--replicates",
	"--timeout-minutes",
]);
const SWITCH_FLAGS = new Set(["--require-duration", "--require-precision"]);

function validateArguments(argv: readonly string[]): void {
	for (let index = 0; index < argv.length; index++) {
		const argument = argv[index] ?? "";
		if (SWITCH_FLAGS.has(argument)) continue;
		const flag = argument.split("=", 1)[0] ?? "";
		if (!VALUE_FLAGS.has(flag)) throw new Error(`unknown argument: ${argument}`);
		if (argument === flag) index++;
	}
}

function value(argv: readonly string[], flag: string, fallback: string): string {
	const resolved = lastFlagValue(argv, flag, "a value");
	if (resolved === undefined) return fallback;
	if (resolved === "" || resolved.startsWith("-")) throw new Error(`--${flag} requires a value`);
	return resolved;
}

function positive(
	argv: readonly string[],
	flag: string,
	fallback: number,
	integer = false,
): number {
	const raw = lastFlagValue(argv, flag, "a positive number") ?? String(fallback);
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0 || (integer && !Number.isInteger(parsed))) {
		throw new Error(`--${flag} must be a positive ${integer ? "integer" : "number"}`);
	}
	return parsed;
}

function oneOf<T extends string>(raw: string, allowed: readonly T[], flag: string): T {
	if ((allowed as readonly string[]).includes(raw)) return raw as T;
	throw new Error(`--${flag} must be ${allowed.join(" or ")}`);
}

export function parseGpuArgs(argv: readonly string[]) {
	validateArguments(argv);
	const preparation = lastFlagValue(argv, "prepare", "models or kernels");
	const operation =
		preparation !== undefined
			? oneOf(preparation, PREPARATIONS, "prepare")
			: ("benchmark" as const);
	const requestedReplicates = parseReplicatesFlag(argv);
	const mode = oneOf(
		value(argv, "mode", GPU_BENCHMARK.defaults.mode),
		Object.keys(GPU_BENCHMARK.modes) as GpuBenchmarkMode[],
		"mode",
	);
	const flashinferAutotune = oneOf(
		value(argv, "flashinfer-autotune", "disabled"),
		FLASHINFER_AUTOTUNE_MODES,
		"flashinfer-autotune",
	);
	const requirePrecision = argv.includes("--require-precision");
	const defaultTimeout =
		operation === "models"
			? 240
			: operation === "kernels"
				? 90
				: GPU_BENCHMARK.modes[mode].timeoutMinutes;
	const args = {
		operation,
		modelVolume: value(argv, "model-volume", GPU_BENCHMARK.volumes.models),
		kernelSnapshotRegistryVolume: value(
			argv,
			"kernel-snapshot-registry-volume",
			GPU_BENCHMARK.volumes.kernelRegistry,
		),
		gpu: value(argv, "gpu", GPU_BENCHMARK.defaults.gpu),
		cpuRequested: positive(argv, "cpu", GPU_BENCHMARK.defaults.cpu),
		cpuLimit: positive(argv, "cpu-limit", GPU_BENCHMARK.defaults.cpu),
		memoryRequestedMiB: positive(argv, "memory-mib", GPU_BENCHMARK.defaults.memoryMiB, true),
		memoryLimitMiB: positive(argv, "memory-limit-mib", GPU_BENCHMARK.defaults.memoryLimitMiB, true),
		mode,
		timeoutMinutes: positive(argv, "timeout-minutes", defaultTimeout, true),
		clientTimeoutMinutes: positive(
			argv,
			"client-timeout-minutes",
			GPU_BENCHMARK.modes[mode].clientTimeoutMinutes,
			true,
		),
		flashinferAutotune,
		cudaBuildJobs: positive(argv, "cuda-build-jobs", operation === "kernels" ? 8 : 1, true),
		nvccThreads: positive(argv, "nvcc-threads", operation === "kernels" ? 4 : 1, true),
		outputDirectory: value(argv, "output-dir", GPU_BENCHMARK.defaults.outputDirectory),
		replicateIndices:
			operation === "benchmark"
				? (requestedReplicates ??
					(requirePrecision
						? Array.from({ length: GPU_BENCHMARK.defaults.minimumReplicates }, (_, index) => index)
						: [0]))
				: undefined,
		maxConcurrency: resolveMaxConcurrency(argv),
		requirePrecision,
		precisionTarget: positive(
			argv,
			"relative-ci-half-width",
			GPU_BENCHMARK.defaults.relativeCiHalfWidth,
		),
		requireDuration: argv.includes("--require-duration"),
		durationTargetSeconds: positive(
			argv,
			"max-replicate-duration-seconds",
			GPU_BENCHMARK.defaults.maxReplicateDurationSeconds,
		),
	};
	if (args.cpuRequested > args.cpuLimit) throw new Error("--cpu cannot exceed --cpu-limit");
	if (args.memoryRequestedMiB > args.memoryLimitMiB) {
		throw new Error("--memory-mib cannot exceed --memory-limit-mib");
	}
	if (operation !== "benchmark" && requestedReplicates !== undefined) {
		throw new Error("--replicates is supported only for benchmark execution");
	}
	if (operation !== "benchmark" && (args.requirePrecision || args.requireDuration)) {
		throw new Error("benchmark gates cannot be combined with --prepare");
	}
	if (
		args.requirePrecision &&
		(args.replicateIndices?.length ?? 0) < GPU_BENCHMARK.defaults.minimumReplicates
	) {
		throw new Error(
			`--require-precision requires at least ${GPU_BENCHMARK.defaults.minimumReplicates} independent replicates`,
		);
	}
	const minimumTimeout =
		(operation === "kernels"
			? GPU_BENCHMARK.deadlines.kernelServerReadyMinutes
			: GPU_BENCHMARK.deadlines.serverReadyMinutes +
				(operation === "benchmark" ? args.clientTimeoutMinutes : 0)) +
		GPU_BENCHMARK.deadlines.artifactReserveMinutes;
	if (operation !== "models" && args.timeoutMinutes < minimumTimeout) {
		throw new Error(`--timeout-minutes must be at least ${minimumTimeout}`);
	}
	return args;
}

export type GpuArgs = ReturnType<typeof parseGpuArgs>;
