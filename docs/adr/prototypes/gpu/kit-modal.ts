/**
 * Prototype B — the GPU benchmark on the sandbox driver kit (ADR-0007), native Modal SDK.
 *
 * Same seven steps as computesdk-modal.ts. The KIT section is written once for the whole fleet
 * (it is the ADR-0007 §2 port, excerpted); the AUTHOR section is what the GPU driver adds.
 * ⛔/⚠ markers flag the port gaps this prototype exposes — they are the point of the exercise.
 * Typecheck: see computesdk-modal.ts header.
 */
import type { App, Image, ModalClient, ModalReadStream, Sandbox, Volume } from "modal";

/* =============================================================================================
 * KIT (written once, ADR-0007 §2 — excerpt sufficient for this driver)
 * =========================================================================================== */

export type SandboxId = string & { readonly brand: unique symbol };
export const sandboxId = (raw: string): SandboxId => {
	if (raw.length === 0) throw new Error("sandboxId must be non-empty");
	return raw as SandboxId;
};

export type Exit =
	| { kind: "exited"; code: number }
	| { kind: "signalled"; signal: string }
	| { kind: "unknown"; detail: string };

export interface ExecResult {
	readonly exit: Exit;
	readonly stdout: string;
	readonly stderr: string;
	readonly durationMs: number;
}

/** ⛔ B1: the port's CreateRequest is CPU-shaped — no GPU field. This prototype widens it
 *  locally; the port needs either an optional `gpu` axis or a driver-level create extension. */
export interface GpuCreateRequest {
	readonly gpu: string;
	readonly cpu: number;
	readonly cpuLimit: number;
	readonly memoryMiB: number;
	readonly memoryLimitMiB: number;
	readonly timeoutMs: number;
	readonly env: Readonly<Record<string, string>>;
}

export interface MethodTable<Handle, Ctx> {
	create(ctx: Ctx, request: GpuCreateRequest): Promise<{ handle: Handle; sandboxId: SandboxId }>;
	exec(ctx: Ctx, handle: Handle, command: string): Promise<ExecResult>;
	destroy(ctx: Ctx, handle: Handle): Promise<void>;
	/** ⚠ B2: the port's FileReads is read-only; GPU staging WRITES. This table adds an optional
	 *  write capability — a gap ADR-0007 should absorb (modal, e2b, daytona all support it). */
	readonly files?: {
		readFile(ctx: Ctx, handle: Handle, path: string): Promise<string>;
		writeText(ctx: Ctx, handle: Handle, path: string, text: string): Promise<void>;
	};
}

export interface SandboxSession<Handle> {
	readonly sandboxId: SandboxId;
	readonly native: Handle;
	exec(command: string): Promise<ExecResult>;
	destroy(): Promise<void>;
	readonly files?: {
		readFile(path: string): Promise<string>;
		writeText(path: string, text: string): Promise<void>;
	};
}

export function assembleSession<Handle, Ctx>(
	table: MethodTable<Handle, Ctx>,
	ctx: Ctx,
	handle: Handle,
	id: SandboxId,
): SandboxSession<Handle> {
	return {
		sandboxId: id,
		native: handle,
		exec: (command) => table.exec(ctx, handle, command),
		destroy: () => table.destroy(ctx, handle),
		...(table.files
			? {
					files: {
						readFile: (path: string) => table.files!.readFile(ctx, handle, path),
						writeText: (path: string, text: string) => table.files!.writeText(ctx, handle, path, text),
					},
				}
			: {}),
	};
}

/* =============================================================================================
 * AUTHOR (the GPU driver — everything below is what a driver author writes)
 * =========================================================================================== */

const MODEL_MOUNT = "/vol/models";
const REMOTE_ROOT = "/bench";

/** ⚠ B3: the pre-create plumbing (app, BUILT image, kernel-snapshot cache, model volume) has no
 *  port home — and should not: it is release-artifact resolution, like the bake lane. In the kit
 *  it becomes the driver's typed, explicit Ctx, built once by the CLI. (Under computesdk it needs
 *  a second hidden-client workaround; on main it is closure state.) The remaining gap is the
 *  REGISTRY model: `artifact` assumes a resolvable ref, while this image is built in-process —
 *  a "built" artifact kind or a GPU lane exception is needed (ADR-0006). */
export interface ModalGpuCtx {
	readonly client: ModalClient;
	readonly app: App;
	readonly kernelImage: Image;
	readonly modelVolume: Volume;
}

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

async function stillListed(client: ModalClient, id: string): Promise<boolean> {
	for await (const candidate of client.sandboxes.list()) {
		if (candidate.sandboxId === id) return true;
	}
	return false;
}

/** The whole driver: a flat table of pure functions over the native Modal Sandbox.
 *  Every member is unit-testable with a literal ctx/handle — no create round-trip needed. */
export const modalGpuTable = {
	async create(ctx: ModalGpuCtx, request: GpuCreateRequest) {
		const handle = await ctx.client.sandboxes.create(ctx.app, ctx.kernelImage, {
			// ✓ Fully typed against the native SDK: a typo'd `gup` or `memroyMiB` fails compile —
			// the exact property the computesdk passthrough gives up (its marker A3).
			gpu: request.gpu,
			cpu: request.cpu,
			cpuLimit: request.cpuLimit,
			memoryMiB: request.memoryMiB,
			memoryLimitMiB: request.memoryLimitMiB,
			timeoutMs: request.timeoutMs,
			blockNetwork: true,
			env: { ...request.env },
			volumes: { [MODEL_MOUNT]: ctx.modelVolume.withMountOptions({ readOnly: true }) },
		});
		return { handle, sandboxId: sandboxId(handle.sandboxId) };
	},

	async exec(_ctx: ModalGpuCtx, handle: Sandbox, command: string): Promise<ExecResult> {
		const started = Date.now();
		const process = await handle.exec(["bash", "-lc", command], {
			mode: "text",
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, code] = await Promise.all([
			drain(process.stdout),
			drain(process.stderr),
			process.wait(),
		]);
		return {
			// ✓ No forged codes: Modal reports a number; if a vendor ever withholds one, the
			// `unknown` arm is representable instead of `?? 1`.
			exit: { kind: "exited", code },
			stdout,
			stderr,
			durationMs: Date.now() - started,
		};
	},

	/** Verified teardown — main's terminateAndVerify, now a PURE, directly testable function,
	 *  and a candidate ADR-0008 spec clause: destroy MUST NOT return while still listed. */
	async destroy(ctx: ModalGpuCtx, handle: Sandbox): Promise<void> {
		let lastError: unknown;
		for (let terminateAttempt = 0; terminateAttempt < 3; terminateAttempt++) {
			try {
				await handle.terminate({ wait: true });
			} catch (error) {
				lastError = error;
			}
			for (let listAttempt = 0; listAttempt < 5; listAttempt++) {
				try {
					if (!(await stillListed(ctx.client, handle.sandboxId))) return;
				} catch (error) {
					lastError = error;
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}
		const reason = lastError instanceof Error ? `: ${lastError.message}` : "";
		throw new Error(`Modal sandbox ${handle.sandboxId} is still listed after termination${reason}`);
	},

	files: {
		readFile: (_ctx: ModalGpuCtx, handle: Sandbox, path: string) =>
			handle.filesystem.readText(path),
		writeText: (_ctx: ModalGpuCtx, handle: Sandbox, path: string, text: string) =>
			handle.filesystem.writeText(text, path),
	},
} satisfies MethodTable<Sandbox, ModalGpuCtx>;

/* ------------------------------- The seven steps, kit-style ------------------------------- */

export async function createGpuReplicate(ctx: ModalGpuCtx, request: GpuCreateRequest) {
	const { handle, sandboxId: id } = await modalGpuTable.create(ctx, request);
	return assembleSession(modalGpuTable, ctx, handle, id);
}

export async function tagReplicate(session: SandboxSession<Sandbox>, index: number) {
	// ✓ The typed native handle is the sanctioned escape hatch: setTags is one hop, fully typed.
	await session.native.setTags({ "gpu-benchmark-replicate": String(index) });
}

export async function stageProducer(
	session: SandboxSession<Sandbox>,
	files: ReadonlyArray<{ path: string; text: string }>,
): Promise<void> {
	if (!session.files) throw new Error("modal driver declares files; conformance verifies it");
	await Promise.all(
		files.map((file) => session.files!.writeText(`${REMOTE_ROOT}/${file.path}`, file.text)),
	);
	await session.exec(`git init -q ${REMOTE_ROOT}`);
}

export async function runBenchmark(session: SandboxSession<Sandbox>, task: string) {
	const result = await session.exec(`cd ${REMOTE_ROOT} && bash ${task}`);
	return result; // Exit union — succeeded(result.exit) etc., no `exitCode ?? 1` anywhere
}

export async function observeGpu(session: SandboxSession<Sandbox>): Promise<string> {
	const smi = await session.exec(
		"nvidia-smi --query-gpu=name,driver_version,memory.total,compute_cap --format=csv,noheader,nounits",
	);
	return smi.stdout.trim();
}

export const destroyVerified = (session: SandboxSession<Sandbox>) => session.destroy();

/* Proof for the ✓ in create: the same typo is a compile error against the native SDK. */
export async function typoFailsHere(ctx: ModalGpuCtx) {
	return ctx.client.sandboxes.create(ctx.app, ctx.kernelImage, {
		// @ts-expect-error — 'gup' does not exist in SandboxCreateParams
		gup: "H100!",
	});
}
