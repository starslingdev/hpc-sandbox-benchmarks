import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatedPins } from "@sandbox-benchmarks/templates/pins";

const pins = validatedPins();
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
export const readSource = (relative: string): string =>
	readFileSync(resolve(REPO_ROOT, relative), "utf8");

const task = ".mise/tasks/benchmark/gpu/pts/vllm";
const taskDefinition = readSource(task);
const taskValue = (name: string): string => {
	const value = taskDefinition.match(new RegExp(`^${name}="([^"]+)"$`, "m"))?.[1];
	if (!value) throw new Error(`GPU benchmark task ${task} is missing ${name}`);
	return value;
};

const profileName = taskValue("profile");
const profile = {
	id: `local/${profileName}`,
	name: profileName,
	directory: `packages/schema/src/pts-profiles/local/${profileName}`,
	resultPrefix: taskValue("prefix"),
} as const;
const definition = readSource(`${profile.directory}/test-definition.xml`);
const profileValue = (pattern: RegExp, field: string): string => {
	const value = definition.match(pattern)?.[1];
	if (!value) throw new Error(`GPU PTS profile is missing ${field}`);
	return value;
};
const profileInteger = (pattern: RegExp, field: string): number => {
	const value = Number(profileValue(pattern, field));
	if (!Number.isSafeInteger(value) || value < 1) {
		throw new Error(`GPU PTS profile has an invalid ${field}`);
	}
	return value;
};
const workload = {
	label: profileValue(/<Name>([^<]+)<\/Name>\s*<Value>speed-bench /, "the workload name"),
	vllmVersion: profileValue(/<AppVersion>([^<]+)<\/AppVersion>/, "AppVersion"),
	model: {
		repoId: profileValue(/--model ([^ ]+)/, "--model"),
		revision: profileValue(/--revision ([0-9a-f]{40})/, "--revision"),
	},
} as const;

export const GPU_BENCHMARK = {
	appName: "sandbox-benchmarks-gpu",
	task,
	profile,
	workload,
	assets: {
		speedBench: {
			codingSamples: profileInteger(
				/<Name>Full \([^<]+<\/Name>\s*<Value>[^<]*--num-prompts ([0-9]+)/,
				"full run --num-prompts",
			),
			// The dataset repository itself, pinned to an immutable commit. `prepare` below only pins
			// the upstream *script*, which loads the dataset from its default branch — a branch can
			// serve different rows on every run, so prepare-models.py rewrites that call to this
			// commit before executing it (CWE-494). Refreshing this pin re-derives the dataset: keep
			// `codingSamples` (the profile's --num-prompts) in step with the revision's coding rows,
			// and re-check that those rows still cite only commit-pinned external sources.
			dataset: {
				repoId: "nvidia/SPEED-Bench",
				revision: "487aa718444e816458d1a0a52bfce7a454285cf4",
			},
			prepare: {
				revision: "e06c9b900177be3f60d6a3f99135bb5de9af9bed",
				url: "https://raw.githubusercontent.com/NVIDIA-NeMo/Skills/e06c9b900177be3f60d6a3f99135bb5de9af9bed/nemo_skills/dataset/speed-bench/prepare.py",
				sha256: "a551be4df541474e54e21b480022b0cbb66c2da068fda61b2a64bd3223bbbed2",
			},
		},
	},
	software: {
		python: pins.pythonVersion,
		pts: pins.ptsVersion,
		ptsDebSha256: pins.ptsDebSha256,
		vllm: workload.vllmVersion,
		uv: "0.12.3",
		hfXet: "1.5.2",
		cudaImage:
			"nvidia/cuda:13.3.1-devel-ubuntu24.04@sha256:03c372fd9c65fe7739279f8c65473b315dc61efaaffab03e1e65bc7be7aee61e",
	},
	paths: {
		remoteRoot: "/root/sandbox-benchmarks",
		modelMount: "/models",
		modelCache: "/models/huggingface",
		speedBench: "/models/speed-bench",
		kernelRegistryMount: "/kernel-snapshot-registry",
		kernelCache: "/var/cache/sandbox-benchmarks/vllm",
		vllmEnvironment: "/opt/vllm",
		uvEnvironment: "/opt/uv",
		cudaHome: "/usr/local/cuda",
	},
	volumes: {
		models: "sandbox-benchmarks-qwen3-coder-assets-v1",
		kernelRegistry: "sandbox-benchmarks-qwen3-coder-kernel-snapshot-registry-v1",
	},
	defaults: {
		gpu: "RTX-PRO-6000",
		mode: "qualification",
		outputDirectory: "benchmark-results/modal-vllm",
		cpu: 4,
		memoryMiB: 512,
		memoryLimitMiB: 8192,
		minimumReplicates: 20,
		relativeCiHalfWidth: 0.005,
		// Whole-lifecycle ceiling: sandbox creation, image pull, model load, CUDA-graph capture, the
		// timed client, and artifact collection. Measured across the first full 20-replicate fleet at
		// 352-422s (median 358s), of which the client window was only ~59s — 300 was unreachable for
		// every replicate, not just a slow tail.
		maxReplicateDurationSeconds: 600,
	},
	modelPreparation: {
		memoryMiB: 1024,
		memoryLimitMiB: 16_384,
	},
	modes: {
		qualification: { timeoutMinutes: 45, clientTimeoutMinutes: 10 },
		full: { timeoutMinutes: 240, clientTimeoutMinutes: 180 },
	},
	deadlines: {
		serverReadyMinutes: 5,
		kernelServerReadyMinutes: 30,
		artifactReserveMinutes: 5,
	},
	kernelSnapshotTtlDays: 30,
} as const;

export type GpuBenchmarkMode = keyof typeof GPU_BENCHMARK.modes;
export const FLASHINFER_AUTOTUNE_MODES = ["disabled", "enabled"] as const;
export type FlashInferAutotuneMode = (typeof FLASHINFER_AUTOTUNE_MODES)[number];

export const MODEL_CACHE_ENV = {
	HF_HOME: GPU_BENCHMARK.paths.modelCache,
	HF_HUB_CACHE: `${GPU_BENCHMARK.paths.modelCache}/hub`,
	HF_DATASETS_CACHE: `${GPU_BENCHMARK.paths.modelCache}/datasets`,
	HF_XET_CACHE: `${GPU_BENCHMARK.paths.modelCache}/xet`,
	HF_HUB_DISABLE_TELEMETRY: "1",
	HF_XET_HIGH_PERFORMANCE: "1",
	HF_XET_NUM_CONCURRENT_RANGE_GETS: "8",
	HF_XET_RECONSTRUCT_WRITE_SEQUENTIALLY: "1",
} as const;

export const MODEL_OFFLINE_ENV = {
	...MODEL_CACHE_ENV,
	SPEED_BENCH_DATASET_DIR: GPU_BENCHMARK.paths.speedBench,
	HF_HUB_OFFLINE: "1",
	TRANSFORMERS_OFFLINE: "1",
	HF_MODULES_CACHE: "/tmp/huggingface/modules",
	HF_ASSETS_CACHE: "/tmp/huggingface/assets",
} as const;

export const KERNEL_CACHE_ENV = {
	BENCH_VLLM_KERNEL_CACHE_DIR: GPU_BENCHMARK.paths.kernelCache,
} as const;

export const MODAL_GPU_ENV = {
	GLOO_SOCKET_IFNAME: "lo",
	NCCL_P2P_DISABLE: "1",
	NCCL_SHM_DISABLE: "1",
	NCCL_SOCKET_IFNAME: "lo",
	VLLM_HOST_IP: "127.0.0.1",
} as const;

export const PYTHON_ENVIRONMENT_COMMAND =
	`${GPU_BENCHMARK.paths.uvEnvironment}/bin/uv pip freeze ` +
	`--python ${GPU_BENCHMARK.paths.vllmEnvironment}/bin/python`;

export const VLLM_IMAGE_COMMANDS = [
	`ENV CUDA_HOME=${GPU_BENCHMARK.paths.cudaHome}`,
	`ENV CUDACXX=${GPU_BENCHMARK.paths.cudaHome}/bin/nvcc`,
	"ENV UV_PYTHON_INSTALL_DIR=/opt/uv-python",
	"RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git php-cli php-xml python3 python3-dev python3-pip python3-venv && rm -rf /var/lib/apt/lists/*",
	`RUN curl -fsSL --retry 5 --retry-all-errors -o /tmp/pts.deb https://github.com/phoronix-test-suite/phoronix-test-suite/releases/download/v${GPU_BENCHMARK.software.pts}/phoronix-test-suite_${GPU_BENCHMARK.software.pts}_all.deb && echo '${GPU_BENCHMARK.software.ptsDebSha256}  /tmp/pts.deb' | sha256sum -c - && (dpkg -i /tmp/pts.deb || (apt-get update && apt-get install -y --no-install-recommends -f)) && rm -rf /tmp/pts.deb /var/lib/apt/lists/* && printf 'y\\nn\\nn\\nn\\nn\\nn\\ny\\n' | phoronix-test-suite batch-setup && chmod -R a+rwX /var/lib/phoronix-test-suite`,
	`RUN python3 -m venv ${GPU_BENCHMARK.paths.uvEnvironment}`,
	`RUN ${GPU_BENCHMARK.paths.uvEnvironment}/bin/python -m pip install --disable-pip-version-check --no-cache-dir uv==${GPU_BENCHMARK.software.uv}`,
	`RUN ${GPU_BENCHMARK.paths.uvEnvironment}/bin/uv python install ${GPU_BENCHMARK.software.python}`,
	`RUN ${GPU_BENCHMARK.paths.uvEnvironment}/bin/uv venv ${GPU_BENCHMARK.paths.vllmEnvironment} --python ${GPU_BENCHMARK.software.python}`,
	`RUN ${GPU_BENCHMARK.paths.uvEnvironment}/bin/uv pip install --python ${GPU_BENCHMARK.paths.vllmEnvironment}/bin/python 'vllm[bench]==${GPU_BENCHMARK.software.vllm}'`,
] as const;

// Keep transfer/runtime glue in the final cached layer so changes do not reinstall vLLM and Torch.
export const GPU_RUNTIME_IMAGE_COMMANDS = [
	`RUN ${GPU_BENCHMARK.paths.uvEnvironment}/bin/uv pip install --python ${GPU_BENCHMARK.paths.vllmEnvironment}/bin/python 'hf-xet==${GPU_BENCHMARK.software.hfXet}'`,
	"RUN config=/etc/phoronix-test-suite.xml && test -f \"$config\" && sed -i -e 's#<NoInternetCommunication>[^<]*</NoInternetCommunication>#<NoInternetCommunication>TRUE</NoInternetCommunication>#' -e 's#<NoNetworkCommunication>[^<]*</NoNetworkCommunication>#<NoNetworkCommunication>TRUE</NoNetworkCommunication>#' \"$config\" && grep -q '<NoInternetCommunication>TRUE</NoInternetCommunication>' \"$config\" && grep -q '<NoNetworkCommunication>TRUE</NoNetworkCommunication>' \"$config\"",
	`ENV PATH="${GPU_BENCHMARK.paths.vllmEnvironment}/bin:${GPU_BENCHMARK.paths.cudaHome}/bin:$PATH"`,
] as const;
