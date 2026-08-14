/**
 * Prototype A — the GPU benchmark driven through `@computesdk/modal`.
 *
 * Same seven steps as kit-modal.ts: plumbing → create → tag → stage → benchmark → observe →
 * verified teardown. Every ⛔/⚠ marker is a place the wrapper cannot express the real GPU
 * benchmark (⛔) or can only express it untyped (⚠). Typecheck (from this directory):
 *
 *   ln -sfn ../../../../node_modules node_modules
 *   ./node_modules/.bin/tsc --strict --exactOptionalPropertyTypes --noEmit --skipLibCheck \
 *     --module esnext --moduleResolution bundler --target es2022 --allowImportingTsExtensions \
 *     computesdk-modal.ts kit-modal.ts
 */
import { modal } from "@computesdk/modal";
import type { App, Image, ModalClient, Sandbox as NativeSandbox, Volume } from "modal";

const GPU_APP_NAME = "sandbox-benchmarks-gpu";
const MODEL_MOUNT = "/vol/models";
const REMOTE_ROOT = "/bench";

export interface GpuRunSpec {
	readonly gpu: string; // e.g. "H100!"
	readonly cpu: number;
	readonly cpuLimit: number;
	readonly memoryMiB: number;
	readonly memoryLimitMiB: number;
	readonly timeoutMs: number;
	readonly env: Readonly<Record<string, string>>;
}

/* ---------------------------------------------------------------------------------------------
 * Step 1 — plumbing: app, BUILT image (dockerfileCommands over a CUDA base, then the kernel-
 * snapshot cache), model volume.
 *
 * ⛔ A1: the wrapper owns its ModalClient privately (`ModalInternalConfig._client`), so none of
 * this is reachable through it. The benchmark must run a SECOND, parallel native client purely
 * for resources, then smuggle the results into create() (step 2). Two clients, two auth paths,
 * one of them invisible to the wrapper's app/image cache.
 * ------------------------------------------------------------------------------------------- */
export async function gpuPlumbing(nativeClient: ModalClient, cudaImageRef: string) {
	const app: App = await nativeClient.apps.fromName(GPU_APP_NAME, { createIfMissing: true });
	const kernelImage: Image = await nativeClient.images
		.fromRegistry(cudaImageRef)
		.dockerfileCommands(["RUN echo vllm-layers-elided"])
		.build(app);
	const modelVolume: Volume = await nativeClient.volumes.fromName("gpu-models", {
		createIfMissing: false,
	});
	return { app, kernelImage, modelVolume };
}

/* ---------------------------------------------------------------------------------------------
 * Step 2 — create. The wrapper's typed surface is ModalConfig (tokens, appName, ports…) plus
 * CreateSandboxOptions. Neither knows GPUs, volumes, or built images.
 * ------------------------------------------------------------------------------------------- */
export async function createGpuReplicate(
	plumbing: Awaited<ReturnType<typeof gpuPlumbing>>,
	spec: GpuRunSpec,
) {
	const provider = modal({ appName: GPU_APP_NAME });
	const sandbox = await provider.sandbox.create({
		// ⛔ A2: the benchmark boots the image BUILT in step 1. `templateId` means
		// `images.fromRegistry(ref)` and `snapshotId` means `images.fromId(id)` — the built
		// Image OBJECT (and the app it was built into, with its layer cache) has no channel.
		// Passing `kernelImage.imageId` through snapshotId re-resolves by id and abandons the
		// wrapper's own image cache; whether the wrapper's internal app matches the app the
		// image was built in is undocumented.
		snapshotId: plumbing.kernelImage.imageId,
		// ⚠ A3: everything below rides `[key: string]: any` — the spread-to-experimentalCreate
		// passthrough. It typechecks; so would `gup: spec.gpu` or `memroyMiB`. The GPU request,
		// the resource caps, and the volume mount — the parameters this benchmark exists to
		// pin — are exactly the ones the types stop checking.
		gpu: spec.gpu,
		cpu: spec.cpu,
		cpuLimit: spec.cpuLimit,
		memoryMiB: spec.memoryMiB,
		memoryLimitMiB: spec.memoryLimitMiB,
		blockNetwork: true,
		volumes: { [MODEL_MOUNT]: plumbing.modelVolume.withMountOptions({ readOnly: true }) },
		envs: { ...spec.env },
		timeout: spec.timeoutMs,
	});
	return sandbox;
}

type WrappedSandbox = Awaited<ReturnType<typeof createGpuReplicate>>;

/* ---------------------------------------------------------------------------------------------
 * Step 3 — tag the sandbox for dashboard attribution.
 * ⛔ A4: not in the seven mandatory methods; only reachable by unwrapping to the native object —
 * and the unwrap is NOMINALLY BROKEN. The wrapper vendors its own copy of the modal SDK
 * (`@computesdk/modal/node_modules/modal`), so `getInstance()`'s Sandbox is a DIFFERENT class
 * (private-field mismatch) than the benchmark's own `modal` dependency: tsc rejects the direct
 * cast, an `as unknown as` double-cast is required, and two copies of the modal SDK run in one
 * process. (The repo has met this class of problem before: the vercel wrapper pinning Sandbox
 * v1 is why vercel.ts went native.)
 * ------------------------------------------------------------------------------------------- */
export async function tagReplicate(sandbox: WrappedSandbox, index: number): Promise<void> {
	const native = sandbox.getInstance() as unknown as { sandbox: NativeSandbox; sandboxId: string };
	await native.sandbox.setTags({ "gpu-benchmark-replicate": String(index) });
}

/* ---------------------------------------------------------------------------------------------
 * Step 4 — stage the benchmark producer files.
 * ✓ This is where the wrapper genuinely helps: filesystem.writeFile exists and works on Modal
 * (native file API first, cat fallback second). No marker.
 * ------------------------------------------------------------------------------------------- */
export async function stageProducer(
	sandbox: WrappedSandbox,
	files: ReadonlyArray<{ path: string; text: string }>,
): Promise<void> {
	await Promise.all(
		files.map((file) => sandbox.filesystem.writeFile(`${REMOTE_ROOT}/${file.path}`, file.text)),
	);
	await sandbox.runCommand(`git init -q ${REMOTE_ROOT}`);
}

/* ---------------------------------------------------------------------------------------------
 * Steps 5+6 — run the benchmark and observe the GPU.
 * ⚠ A5: CommandResult forces `exitCode: number`; Modal's wait() can only produce a number here,
 * but stdout/stderr stream draining, the bash -lc wrapping, and any timeout policy are the
 * wrapper's fixed choices — the benchmark cannot pick `mode: "text"` vs binary, and a stream
 * the wrapper fails to drain is invisible. Exit fidelity survives; transport control does not.
 * ------------------------------------------------------------------------------------------- */
export async function runBenchmark(sandbox: WrappedSandbox, task: string) {
	const result = await sandbox.runCommand(`cd ${REMOTE_ROOT} && bash ${task}`);
	return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

export async function observeGpu(sandbox: WrappedSandbox): Promise<string> {
	const smi = await sandbox.runCommand(
		"nvidia-smi --query-gpu=name,driver_version,memory.total,compute_cap --format=csv,noheader,nounits",
	);
	return smi.stdout.trim();
}

/* ---------------------------------------------------------------------------------------------
 * Step 7 — VERIFIED teardown: terminate, then poll until the control plane no longer lists it.
 * ⚠ A6: destroy(sandboxId) is fire-and-forget. The verification loop is expressible only
 * against the wrapper's list() — which returns fully wrapped sandboxes (a create-grade object
 * per row) just to compare ids — and destroy-by-bare-id is genuinely convenient (no session
 * needed). Mixed result: the loop works, at the cost of heavyweight listing, and the wrapper's
 * hidden client means we verify against a DIFFERENT client than the one that terminated.
 * ------------------------------------------------------------------------------------------- */
export async function destroyVerified(sandbox: WrappedSandbox): Promise<void> {
	const provider = modal({ appName: GPU_APP_NAME });
	await provider.sandbox.destroy(sandbox.sandboxId);
	for (let attempt = 0; attempt < 5; attempt++) {
		const listed = await provider.sandbox.list();
		if (!listed.some((candidate) => candidate.sandboxId === sandbox.sandboxId)) return;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	throw new Error(`Modal sandbox ${sandbox.sandboxId} is still listed after termination`);
}

/* Proof for marker A3: a typo'd GPU key COMPILES — the passthrough accepts any key, so the
 * benchmark's most important parameter is uncheckable. (This function typechecks today.) */
export async function typoCompilesHere(plumbing: Awaited<ReturnType<typeof gpuPlumbing>>) {
	const provider = modal({ appName: GPU_APP_NAME });
	return provider.sandbox.create({ snapshotId: plumbing.kernelImage.imageId, gup: "H100!" });
}
