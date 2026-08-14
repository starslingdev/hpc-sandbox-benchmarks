/**
 * Prototype B′ — the GPU benchmark on the GAP-CLOSED driver kit (ADR-0006/0007/0008 as amended).
 *
 * Same seven steps as computesdk-modal.ts. The first prototype's ⛔/⚠ markers are now ✓ G1–G6,
 * one per closed gap:
 *   G1 CreateRequest carries a typed `gpu` axis            (ADR-0007 §2)
 *   G2 `files` reads AND writes, or is absent              (ADR-0007 §2, conformance round-trip)
 *   G3 artifact kind "built" joins the GPU lane to the registry (ADR-0006 §1)
 *   G4 bridge natives keep wrapper types (rule; native drivers like this one are unaffected)
 *   G5 destroy is convergent — a spec clause, not folklore (ADR-0008 §1)
 *   G6 destroyById: bare-id reaping without a session      (ADR-0007 §2)
 *
 * Typecheck: see computesdk-modal.ts header.
 */
import type { App, Image, ModalClient, ModalReadStream, Sandbox, Volume } from "modal";

/* =============================================================================================
 * KIT (written once — the ADR-0007 port as amended, excerpted)
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

export interface TargetSpec {
	readonly vcpus: number;
	readonly memoryMib: number;
	readonly diskGib: number;
}

/** ✓ G1: the GPU axis is part of the port's request — typed, vendor-neutral. */
export interface GpuSpec {
	readonly model: string; // "H100", "A100-80GB" — vendor syntax mapping is the driver's job
	readonly count: number;
}

export interface CreateRequest {
	readonly spec: TargetSpec;
	/** For registry artifacts this is the resolved ref; for kind "built" (G3), the id the
	 *  driver's Ctx factory produced — recorded in the run document either way. */
	readonly artifactRef: string;
	readonly deadlineMs: number;
	readonly gpu?: GpuSpec;
	readonly env?: Readonly<Record<string, string>>;
}

/** ✓ G2: a working filesystem API does both directions, or the key is absent. */
export interface SandboxFiles {
	readFile(path: string): Promise<string>;
	exists(path: string): Promise<boolean>;
	writeText(path: string, text: string): Promise<void>;
}

export interface SandboxSession<Handle = unknown> {
	readonly sandboxId: SandboxId;
	readonly native: Handle;
	exec(command: string): Promise<ExecResult>;
	destroy(): Promise<void>;
	readonly files?: SandboxFiles;
}

export interface SandboxDriver<Handle = unknown> {
	create(request: CreateRequest): Promise<SandboxSession<Handle>>;
	/** ✓ G6: bare-id destroy for reaper lanes — no session required. Bound by the same
	 *  idempotency clauses as destroy (ADR-0008). */
	destroyById?(id: SandboxId): Promise<void>;
}

export interface MethodTable<Handle, Ctx> {
	create(ctx: Ctx, request: CreateRequest): Promise<{ handle: Handle; sandboxId: SandboxId }>;
	exec(ctx: Ctx, handle: Handle, command: string): Promise<ExecResult>;
	destroy(ctx: Ctx, handle: Handle): Promise<void>;
	destroyById?(ctx: Ctx, id: SandboxId): Promise<void>;
	readonly files?: {
		readFile(ctx: Ctx, handle: Handle, path: string): Promise<string>;
		exists(ctx: Ctx, handle: Handle, path: string): Promise<boolean>;
		writeText(ctx: Ctx, handle: Handle, path: string, text: string): Promise<void>;
	};
}

/** Ctx arrives lazily: vendor plumbing (G3's build recipe) is async and runs once, on demand. */
export function driverFromTable<Handle, Ctx>(
	table: MethodTable<Handle, Ctx>,
	loadCtx: () => Promise<Ctx>,
): SandboxDriver<Handle> {
	let memo: Promise<Ctx> | undefined;
	const ctx = () => (memo ??= loadCtx());
	const files = table.files;
	return {
		async create(request) {
			const resolved = await ctx();
			const { handle, sandboxId: id } = await table.create(resolved, request);
			return {
				sandboxId: id,
				native: handle,
				exec: (command) => table.exec(resolved, handle, command),
				destroy: () => table.destroy(resolved, handle),
				...(files
					? {
							files: {
								readFile: (path: string) => files.readFile(resolved, handle, path),
								exists: (path: string) => files.exists(resolved, handle, path),
								writeText: (path: string, text: string) => files.writeText(resolved, handle, path, text),
							},
						}
					: {}),
			};
		},
		...(table.destroyById
			? { destroyById: async (id: SandboxId) => table.destroyById!(await ctx(), id) }
			: {}),
	};
}

/* --------------------- Registry excerpt (Tier 1, schema) + typed join --------------------- */

type CredentialDecl = { readonly name: string; readonly optional?: true };
type ArtifactDecl =
	| { readonly kind: "image"; readonly optionKey: "templateId" | "image" }
	| { readonly kind: "built"; readonly recipe: string };
type TransportDecl = {
	readonly streaming: boolean;
	readonly syncCapMs: number | null;
	readonly detachedPoll: boolean;
};

const REGISTRY = {
	// ✓ G3: the GPU lane is a registry row like any other — its transport claims now live where
	// ADR-0008's conformance gate can reach them, instead of a hand-carried const.
	"modal-gpu": {
		credentials: [{ name: "MODAL_TOKEN_ID" }, { name: "MODAL_TOKEN_SECRET" }],
		artifact: { kind: "built", recipe: "gpu-vllm-kernels" },
		transport: { streaming: true, syncCapMs: null, detachedPoll: false },
	},
	tama: {
		credentials: [{ name: "TAMA_TOKEN" }, { name: "TAMA_CLI", optional: true }],
		artifact: { kind: "image", optionKey: "image" },
		transport: { streaming: false, syncCapMs: 300_000, detachedPoll: true },
	},
} as const satisfies Record<
	string,
	{
		readonly credentials: readonly CredentialDecl[];
		readonly artifact: ArtifactDecl;
		readonly transport: TransportDecl;
	}
>;
export type ProviderId = keyof typeof REGISTRY;

type Prettify<T> = { [K in keyof T]: T[K] } & {};
type Creds<P extends ProviderId> = (typeof REGISTRY)[P]["credentials"][number];
export type EnvOf<P extends ProviderId> = Prettify<
	{ readonly [C in Extract<Creds<P>, { optional: true }> as C["name"]]?: string } & {
		readonly [C in Exclude<Creds<P>, { optional: true }> as C["name"]]: string;
	}
>;
export type ArtifactOf<P extends ProviderId> = (typeof REGISTRY)[P]["artifact"];

export interface DriverContext<P extends ProviderId> {
	readonly env: EnvOf<P>;
	readonly artifact: ArtifactOf<P>;
}
export interface DriverSpec<P extends ProviderId, Handle = unknown> {
	readonly driver: (context: DriverContext<P>) => SandboxDriver<Handle>;
}
export function defineDriver<P extends ProviderId, Handle = unknown>(
	id: P,
	spec: DriverSpec<NoInfer<P>, Handle>,
): DriverSpec<P, Handle> & { readonly id: P } {
	return { ...spec, id };
}

/** StepRunner reads transport from the registry through the same join — no local const. */
export const transportOf = <P extends ProviderId>(id: P): (typeof REGISTRY)[P]["transport"] =>
	REGISTRY[id].transport;

/* =============================================================================================
 * AUTHOR (the modal-gpu driver — everything below is what the driver file contains)
 * =========================================================================================== */

const GPU_APP_NAME = "sandbox-benchmarks-gpu";
const MODEL_MOUNT = "/vol/models";
const REMOTE_ROOT = "/bench";

/** The typed home for vendor plumbing (was ⚠ B3): one client, the app, the RECIPE-built kernel
 *  image, the model volume. Built once by the lazy Ctx factory below — this IS G3's "resolver
 *  runs at create time, in the driver's Ctx factory". */
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

/** ✓ G5: convergent teardown, shared by destroy and destroyById — the ADR-0008 clause
 *  ("MUST NOT resolve while still listed"), implemented once, unit-testable directly. */
async function terminateConverged(
	client: ModalClient,
	id: string,
	terminate: () => Promise<unknown>,
): Promise<void> {
	let lastError: unknown;
	for (let terminateAttempt = 0; terminateAttempt < 3; terminateAttempt++) {
		try {
			await terminate();
		} catch (error) {
			lastError = error;
		}
		for (let listAttempt = 0; listAttempt < 5; listAttempt++) {
			try {
				if (!(await stillListed(client, id))) return;
			} catch (error) {
				lastError = error;
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}
	const reason = lastError instanceof Error ? `: ${lastError.message}` : "";
	throw new Error(`Modal sandbox ${id} is still listed after termination${reason}`);
}

/** ✓ G1: {model, count} → Modal's syntax; the request stays vendor-neutral. */
const modalGpuSyntax = (gpu: GpuSpec): string =>
	gpu.count === 1 ? gpu.model : `${gpu.model}:${gpu.count}`;

export const modalGpuTable = {
	async create(ctx: ModalGpuCtx, request: CreateRequest) {
		if (!request.gpu) throw new Error("modal-gpu benchmarks require a gpu axis (ADR-0008: no silent CPU runs)");
		const handle = await ctx.client.sandboxes.create(ctx.app, ctx.kernelImage, {
			gpu: modalGpuSyntax(request.gpu), // fully typed end to end — no passthrough
			cpu: request.spec.vcpus,
			cpuLimit: request.spec.vcpus,
			memoryMiB: request.spec.memoryMib,
			memoryLimitMiB: request.spec.memoryMib,
			timeoutMs: request.deadlineMs,
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
		return { exit: { kind: "exited", code }, stdout, stderr, durationMs: Date.now() - started };
	},

	destroy: (ctx: ModalGpuCtx, handle: Sandbox) =>
		terminateConverged(ctx.client, handle.sandboxId, () => handle.terminate({ wait: true })),

	/* ✓ G6: reap by bare id — fromId then the same convergence loop; missing id converges
	 * immediately (already unlisted), satisfying destroy-of-missing MUST succeed. */
	destroyById: async (ctx: ModalGpuCtx, id: SandboxId) => {
		const handle = await ctx.client.sandboxes.fromId(id);
		await terminateConverged(ctx.client, id, () => handle.terminate({ wait: true }));
	},

	/* ✓ G2: both directions, natively. */
	files: {
		readFile: (_ctx: ModalGpuCtx, handle: Sandbox, path: string) =>
			handle.filesystem.readText(path),
		exists: async (_ctx: ModalGpuCtx, handle: Sandbox, path: string) => {
			const probe = await handle.exec(["test", "-e", path]);
			return (await probe.wait()) === 0;
		},
		writeText: (_ctx: ModalGpuCtx, handle: Sandbox, path: string, text: string) =>
			handle.filesystem.writeText(text, path),
	},
} satisfies MethodTable<Sandbox, ModalGpuCtx>;

/* ------------------------------ The driver file's default export ------------------------------ */

declare function buildGpuPlumbing(env: EnvOf<"modal-gpu">, recipe: string): Promise<ModalGpuCtx>;

export default defineDriver("modal-gpu", {
	driver: ({ env, artifact }) => {
		// ✓ G3: the registry narrows artifact to { kind: "built"; recipe: "gpu-vllm-kernels" } —
		// the recipe drives the Ctx factory; no hand-carried refs, no registry bypass.
		const kind: "built" = artifact.kind;
		void kind;
		return driverFromTable(modalGpuTable, () => buildGpuPlumbing(env, artifact.recipe));
	},
});

/* --------------------------------- The seven steps, gap-closed --------------------------------- */

export async function runReplicate(
	driver: SandboxDriver<Sandbox>,
	request: CreateRequest,
	files: ReadonlyArray<{ path: string; text: string }>,
	index: number,
) {
	const session = await driver.create(request);
	try {
		await session.native.setTags({ "gpu-benchmark-replicate": String(index) }); // typed, one hop
		if (!session.files) throw new Error("modal-gpu declares files; conformance verifies it");
		await Promise.all(
			files.map((file) => session.files!.writeText(`${REMOTE_ROOT}/${file.path}`, file.text)),
		);
		await session.exec(`git init -q ${REMOTE_ROOT}`);
		const benchmark = await session.exec(`cd ${REMOTE_ROOT} && bash gpu/task.sh`);
		const smi = await session.exec(
			"nvidia-smi --query-gpu=name,driver_version,memory.total,compute_cap --format=csv,noheader,nounits",
		);
		return { benchmark, gpu: smi.stdout.trim() };
	} finally {
		await session.destroy(); // convergent by spec (G5)
	}
}

/* --------------------------------------- Type proofs --------------------------------------- */

export async function proofs(ctx: ModalGpuCtx) {
	// GPU typo still fails compile against the native SDK:
	// @ts-expect-error — 'gup' does not exist in SandboxCreateParams
	void ctx.client.sandboxes.create(ctx.app, ctx.kernelImage, { gup: "H100!" });
}

// @ts-expect-error — unregistered id: the registry is still the namespace
export const unregistered = defineDriver("modal-gup", { driver: () => ({ async create() { throw new Error("x"); } }) });

export const wrongKind = defineDriver("tama", {
	driver: ({ artifact }) => {
		// @ts-expect-error — tama's artifact is narrowed to kind "image"; there is no recipe
		void artifact.recipe;
		return { async create(): Promise<SandboxSession> { throw new Error("proof only"); } };
	},
});
