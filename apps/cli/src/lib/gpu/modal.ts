import { join } from "node:path";
import { createOwnedSandbox, StepRunner, withOwnedSandbox } from "@sandbox-benchmarks/harness";
import type { ModalClient, ModalReadStream, Sandbox, SandboxCreateParams } from "modal";
import type { GpuArgs } from "./args.ts";
import {
	GPU_BENCHMARK,
	KERNEL_CACHE_ENV,
	MODAL_GPU_ENV,
	MODEL_OFFLINE_ENV,
	PYTHON_ENVIRONMENT_COMMAND,
	readSource,
} from "./config.ts";

const MODAL_TRANSPORT = {
	streaming: true,
	syncCapMs: null,
	detachedPoll: false,
} as const;

async function drain(stream: ModalReadStream<string>): Promise<string> {
	const reader = stream.getReader();
	const chunks: string[] = [];
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) return chunks.join("");
			chunks.push(typeof value === "string" ? value : new TextDecoder().decode(value));
		}
	} finally {
		reader.releaseLock();
	}
}

async function exec(sandbox: Sandbox, command: string) {
	const process = await sandbox.exec(["bash", "-lc", command], {
		mode: "text",
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		drain(process.stdout),
		drain(process.stderr),
		process.wait(),
	]);
	return { stdout, stderr, exitCode };
}

async function stillListed(client: ModalClient, sandboxId: string): Promise<boolean> {
	for await (const candidate of client.sandboxes.list()) {
		if (candidate.sandboxId === sandboxId) return true;
	}
	return false;
}

async function terminateAndVerify(client: ModalClient, sandbox: Sandbox): Promise<void> {
	let lastError: unknown;
	for (let terminateAttempt = 0; terminateAttempt < 3; terminateAttempt++) {
		try {
			await sandbox.terminate({ wait: true });
		} catch (error) {
			lastError = error;
		}
		for (let listAttempt = 0; listAttempt < 5; listAttempt++) {
			try {
				if (!(await stillListed(client, sandbox.sandboxId))) return;
			} catch (error) {
				lastError = error;
				break;
			}
			await Bun.sleep(1000);
		}
	}
	const reason = lastError instanceof Error ? `: ${lastError.message}` : "";
	throw new Error(`Modal sandbox ${sandbox.sandboxId} is still listed after termination${reason}`);
}

function adaptGpuSandbox(client: ModalClient, sdk: Sandbox) {
	const adapted = {
		sandboxId: sdk.sandboxId,
		sdk,
		runCommand: (command: string) => exec(sdk, command),
		destroy: () => terminateAndVerify(client, sdk),
	};
	return {
		...adapted,
		// One PTS pass per independent sandbox; fleet replication supplies machine-level variance.
		runner: new StepRunner(adapted, MODAL_TRANSPORT, undefined, { mode: "fixed", times: 1 }),
	};
}

async function createAdaptedGpuSandbox(client: ModalClient, create: () => Promise<Sandbox>) {
	return adaptGpuSandbox(client, await create());
}

export async function createGpuSandbox(client: ModalClient, create: () => Promise<Sandbox>) {
	return createOwnedSandbox(() => createAdaptedGpuSandbox(client, create));
}

export type GpuSandbox = Awaited<ReturnType<typeof createGpuSandbox>>;

/** The shared lifecycle scope for short-lived GPU preparation and validation sandboxes. */
export function withGpuSandbox<T>(
	client: ModalClient,
	create: () => Promise<Sandbox>,
	fn: (sandbox: GpuSandbox) => Promise<T>,
): Promise<T> {
	return withOwnedSandbox(() => createAdaptedGpuSandbox(client, create), fn, "Modal GPU sandbox");
}

/** Resource and lifetime policy shared by the kernel seed and measured benchmark allocations. */
export function gpuSandboxResources(args: GpuArgs) {
	return {
		gpu: args.gpu,
		cpu: args.cpuRequested,
		cpuLimit: args.cpuLimit,
		memoryMiB: args.memoryRequestedMiB,
		memoryLimitMiB: args.memoryLimitMiB,
		timeoutMs: args.timeoutMinutes * 60_000,
		blockNetwork: true,
	} satisfies SandboxCreateParams;
}

/** vLLM runtime policy shared by cache seeding and measured runs. */
export function vllmEnvironment(args: GpuArgs) {
	if (args.operation === "models") {
		throw new Error("model preparation does not use the vLLM runtime environment");
	}
	const kernelSeed = args.operation === "kernels";
	return {
		...MODEL_OFFLINE_ENV,
		...KERNEL_CACHE_ENV,
		...MODAL_GPU_ENV,
		...(kernelSeed ? { BENCH_VLLM_PREPARE_KERNELS_ONLY: "1" } : { BENCH_VLLM_MODE: args.mode }),
		BENCH_VLLM_FLASHINFER_AUTOTUNE: args.flashinferAutotune,
		BENCH_VLLM_MAX_JOBS: String(kernelSeed ? args.cudaBuildJobs : 1),
		BENCH_VLLM_NVCC_THREADS: String(kernelSeed ? args.nvccThreads : 1),
		BENCH_VLLM_READY_TIMEOUT_SECONDS: String(
			GPU_BENCHMARK.deadlines[kernelSeed ? "kernelServerReadyMinutes" : "serverReadyMinutes"] * 60,
		),
		BENCH_VLLM_CLIENT_TIMEOUT_SECONDS: String(kernelSeed ? 60 : args.clientTimeoutMinutes * 60),
		BENCH_VLLM_BIN: `${GPU_BENCHMARK.paths.vllmEnvironment}/bin/vllm`,
		BENCH_VLLM_NATIVE_RESULTS_DIR: `${GPU_BENCHMARK.paths.remoteRoot}/benchmark-results/vllm-native`,
	};
}

export async function stageGpuProducer(sandbox: GpuSandbox): Promise<void> {
	const files = [
		"lib/bench.sh",
		GPU_BENCHMARK.task,
		...[
			".catalog-ignore",
			"install.sh",
			"results-definition.xml",
			"runner.sh",
			"test-definition.xml",
		].map((file) => `${GPU_BENCHMARK.profile.directory}/${file}`),
	];
	await Promise.all(
		files.map((relative) =>
			sandbox.sdk.filesystem.writeText(
				readSource(relative),
				join(GPU_BENCHMARK.paths.remoteRoot, relative),
			),
		),
	);
	await sandbox.runner.run(
		"initialize staged benchmark",
		`git init -q ${GPU_BENCHMARK.paths.remoteRoot}`,
		30_000,
	);
}

export async function stageCollectedEvidence(sandbox: GpuSandbox): Promise<void> {
	const results = join(GPU_BENCHMARK.paths.remoteRoot, "benchmark-results");
	await sandbox.runner.run(
		"stage reproducibility evidence",
		[
			`mkdir -p ${results}`,
			`cp ${GPU_BENCHMARK.paths.modelMount}/benchmark-assets.json ${results}/benchmark-assets.json`,
			`${PYTHON_ENVIRONMENT_COMMAND} > ${results}/python-environment.txt`,
		].join("\n"),
		60_000,
	);
}

function numberFrom(raw: string): number | undefined {
	const trimmed = raw.trim();
	if (!trimmed) return undefined;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export async function observeGpuSandbox(sandbox: GpuSandbox) {
	const gpu = await sandbox.runner.run(
		"capture GPU metadata",
		"nvidia-smi --query-gpu=name,driver_version,memory.total,compute_cap --format=csv,noheader,nounits",
		30_000,
	);
	const gpuOutput = (gpu.stdout ?? "").trim();
	const gpuRows = gpuOutput
		? gpuOutput.split("\n").map((line) => line.split(",").map((value) => value.trim()))
		: [];
	const system = await sandbox.runner.run(
		"capture software metadata",
		[
			"printf 'visible_cpus=%s\\n' \"$(nproc)\"",
			"printf 'memory_bytes='; if [ -r /sys/fs/cgroup/memory.max ] && [ \"$(cat /sys/fs/cgroup/memory.max)\" != max ]; then cat /sys/fs/cgroup/memory.max; else awk '/MemTotal:/ { print $2 * 1024 }' /proc/meminfo; fi",
			"printf 'pts_version=%s\\n' \"$(phoronix-test-suite version | sed -n 's/^Phoronix Test Suite v//p')\"",
			`${GPU_BENCHMARK.paths.vllmEnvironment}/bin/python - <<'PY'`,
			"import importlib.metadata, json, platform, subprocess, torch, transformers, vllm",
			"def version(name):",
			"    try: return importlib.metadata.version(name)",
			"    except importlib.metadata.PackageNotFoundError: return None",
			"available = torch.cuda.is_available()",
			"if not available: raise RuntimeError('torch.cuda.is_available() is false')",
			"smoke = float((torch.ones(256, device='cuda') * 2).sum().item())",
			"nvcc = subprocess.run(['nvcc', '--version'], check=True, capture_output=True, text=True).stdout.strip().splitlines()[-1]",
			"print(json.dumps({'python': platform.python_version(), 'torch': torch.__version__, 'torchaudio': version('torchaudio'), 'transformers': transformers.__version__, 'triton': version('triton'), 'flashinfer': version('flashinfer-python'), 'cutlass_dsl': version('nvidia-cutlass-dsl'), 'cuda': torch.version.cuda, 'nvcc': nvcc, 'cuda_available': available, 'cuda_smoke': smoke, 'vllm': vllm.__version__}))",
			"PY",
		].join("\n"),
		60_000,
	);
	const lines = (system.stdout ?? "").trim().split("\n");
	const versions = JSON.parse(lines.at(-1) ?? "{}") as Record<string, unknown>;
	const tagged = (name: string) =>
		lines.find((line) => line.startsWith(`${name}=`))?.slice(name.length + 1);
	const strings = (index: number) => [
		...new Set(gpuRows.map((row) => row[index]).filter((value): value is string => Boolean(value))),
	];
	const value = (name: string) => (typeof versions[name] === "string" ? versions[name] : undefined);
	const memoryBytes = numberFrom(tagged("memory_bytes") ?? "");
	return {
		gpuName: strings(0).length > 1 ? strings(0).join(", ") : strings(0)[0],
		gpuCount: gpuRows.length || undefined,
		driverVersion: strings(1).join(", "),
		gpuMemoryMiB: gpuRows.reduce((total, row) => total + (numberFrom(row[2] ?? "") ?? 0), 0),
		computeCapability: strings(3).join(", "),
		visibleCpus: numberFrom(tagged("visible_cpus") ?? ""),
		memoryLimitMiB: memoryBytes === undefined ? undefined : Math.round(memoryBytes / 1024 / 1024),
		ptsVersion: tagged("pts_version") || undefined,
		pythonVersion: value("python"),
		torchVersion: value("torch"),
		torchaudioVersion: value("torchaudio"),
		transformersVersion: value("transformers"),
		tritonVersion: value("triton"),
		flashinferVersion: value("flashinfer"),
		cutlassDslVersion: value("cutlass_dsl"),
		cudaVersion: value("cuda"),
		nvccVersion: value("nvcc"),
		cudaAvailable: versions.cuda_available === true,
		cudaSmoke: typeof versions.cuda_smoke === "number" ? String(versions.cuda_smoke) : undefined,
		vllmVersion: value("vllm"),
	};
}
