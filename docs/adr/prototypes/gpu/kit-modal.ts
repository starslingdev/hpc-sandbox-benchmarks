/**
 * Prototype B″ — the GPU benchmark on the polished driver kit, after adversarial review of a
 * 24-item refinement list. Markers: ✓ G1–G6 (gap closures, prior round) and ✓ P1–P8 (this
 * round's accepted/adapted polish items — each notes what the review REJECTED and why):
 *
 *   P1 CreateRequest parsed ONCE at the plan→request seam by an arktype schema that would live
 *      in packages/schema — deep undeclared-key rejection ("+": "reject" proven SHALLOW; nested
 *      misspellings need .onDeepUndeclaredKey), positive-value narrows, drift-pinned to the
 *      kit's plain readonly interfaces (mutual-extends Assert). The kit itself stays
 *      arktype-free: per ADR-0006's own finding, dragging a 288 ms import into the module every
 *      driver file loads is the exact regression the repo already fought once.
 *      [REJECTED from the list: arktype .brand() for SandboxId — works, but buys zero checks
 *      over the 3-line constructor at that import cost; branded BenchPaths — the staged list is
 *      a committed Tier-1 constant inside a disposable vendor-isolated sandbox.]
 *   P2 Units reconciled with the repo's targetSpecSchema (vcpus / memoryGb / diskGb?) — the
 *      review caught this prototype minting a THIRD spec shape with clashing units; the MiB
 *      conversion now lives in exactly one audited place (the modal driver).
 *   P3 diskGb is optional; present-and-unmappable fails create loudly (Modal exposes no disk
 *      knob) — matching the fleet's existing skip-and-disclose doctrine rather than blanket
 *      rejection.
 *   P4 create returns the artifactRef the driver actually booted (ctx.kernelImage.imageId);
 *      request-vs-reported mismatch fails loudly; the session records the reported ref.
 *   P5 Teardown preserves the primary error (SuppressedError — native in Bun, lib esnext);
 *      staged writes settle before teardown and aggregate their failures.
 *   P6 The lazy Ctx memo clears on failure — a transient plumbing error no longer bricks the
 *      driver for the process lifetime (bricking was reproduced in review).
 *   P7 One streaming TextDecoder per drain (split-UTF-8 corruption reproduced in review), and
 *      output capping is a PER-CALL opt-in (maxOutputBytes) — a kit-wide cap would truncate the
 *      repo's multi-MB base64-tar-over-stdout results transport (collect.ts) into a retry loop
 *      that can never succeed.
 *   P8 destroyById treats only Modal's typed NotFoundError as convergence — already-gone ids
 *      succeed; every other failure still surfaces.
 *
 * Typecheck (from this directory; lib esnext is required for SuppressedError):
 *
 *   ln -sfn ../../../../node_modules node_modules
 *   ./node_modules/.bin/tsc --ignoreConfig --strict --exactOptionalPropertyTypes --noEmit \
 *     --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --lib esnext \
 *     --allowImportingTsExtensions computesdk-modal.ts kit-modal.ts verify.ts
 *
 * Runtime proofs: `bun run verify.ts` exercises P1, P5, P6, P7 without any Modal credentials.
 */
import { type } from "arktype";
import type { App, Image, ModalClient, ModalReadStream, Sandbox, Volume } from "modal";
import { NotFoundError } from "modal";

/* =============================================================================================
 * SCHEMA (would live in packages/schema — the Tier-2 seam where a plan becomes a request)
 * =========================================================================================== */

/** ✓ P1+P2: one schema, aligned with the repo's targetSpecSchema units (vcpus/memoryGb/diskGb?),
 *  deep undeclared-key rejection, positive-value narrows. Parsed ONCE, where CLI/config input
 *  is assembled into a request — never re-validated inside the driver. */
export const createRequestSchema = type({
	spec: { vcpus: "number > 0", memoryGb: "number > 0", "diskGb?": "number > 0" },
	artifactRef: "string >= 1",
	deadlineMs: "number.integer > 0",
	"gpu?": { model: "string >= 1", count: "number.integer > 0" },
	"env?": "Record<string, string>",
}).onDeepUndeclaredKey("reject"); // "+": "reject" is SHALLOW — proven: spec.memroyGb passes it

export function parseCreateRequest(input: unknown): CreateRequest {
	const parsed = createRequestSchema(input);
	if (parsed instanceof type.errors) {
		throw new Error(`invalid CreateRequest: ${parsed.summary}`);
	}
	return parsed; // mutable → readonly widening; no cast
}

/* Drift pins: the schema and the kit's interfaces cannot diverge without a compile error. */
type Assert<T extends true> = T;
export type _requestPinOut = Assert<
	typeof createRequestSchema.infer extends CreateRequest ? true : false
>;
export type _requestPinIn = Assert<
	CreateRequest extends typeof createRequestSchema.infer ? true : false
>;

/* =============================================================================================
 * KIT (written once — plain readonly TypeScript; deliberately arktype-free)
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
	/** True when a per-call maxOutputBytes cap cut a stream (✓ P7: opt-in only, never default). */
	readonly truncated: boolean;
}

export interface ExecOptions {
	/** Opt-in output cap for probes/queries. NEVER a kit default: results collection is a
	 *  multi-MB base64 tar over stdout, and a blanket cap turns it into a permanent retry loop. */
	readonly maxOutputBytes?: number;
}

export interface TargetSpec {
	readonly vcpus: number;
	readonly memoryGb: number;
	readonly diskGb?: number; // ✓ P3: optional — a spec axis a vendor may not expose
}

export interface GpuSpec {
	readonly model: string;
	readonly count: number;
}

export interface CreateRequest {
	readonly spec: TargetSpec;
	readonly artifactRef: string;
	readonly deadlineMs: number;
	readonly gpu?: GpuSpec;
	readonly env?: Readonly<Record<string, string>>;
}

export interface SandboxFiles {
	readFile(path: string): Promise<string>;
	exists(path: string): Promise<boolean>;
	writeText(path: string, text: string): Promise<void>;
}

export interface SandboxSession<Handle = unknown> {
	readonly sandboxId: SandboxId;
	/** ✓ P4: the ref the driver reports it actually booted (falls back to the request's). */
	readonly artifactRef: string;
	readonly native: Handle;
	exec(command: string, options?: ExecOptions): Promise<ExecResult>;
	destroy(): Promise<void>;
	readonly files?: SandboxFiles;
}

export interface SandboxDriver<Handle = unknown> {
	create(request: CreateRequest): Promise<SandboxSession<Handle>>;
	destroyById?(id: SandboxId): Promise<void>;
}

export interface MethodTable<Handle, Ctx> {
	create(
		ctx: Ctx,
		request: CreateRequest,
	): Promise<{ handle: Handle; sandboxId: SandboxId; artifactRef?: string }>;
	exec(ctx: Ctx, handle: Handle, command: string, options?: ExecOptions): Promise<ExecResult>;
	destroy(ctx: Ctx, handle: Handle): Promise<void>;
	destroyById?(ctx: Ctx, id: SandboxId): Promise<void>;
	readonly files?: {
		readFile(ctx: Ctx, handle: Handle, path: string): Promise<string>;
		exists(ctx: Ctx, handle: Handle, path: string): Promise<boolean>;
		writeText(ctx: Ctx, handle: Handle, path: string, text: string): Promise<void>;
	};
}

export function driverFromTable<Handle, Ctx>(
	table: MethodTable<Handle, Ctx>,
	loadCtx: () => Promise<Ctx>,
): SandboxDriver<Handle> {
	let memo: Promise<Ctx> | undefined;
	// ✓ P6: a failed load clears the memo, so the next create retries instead of replaying the
	// memoized rejection forever. Concurrent callers still share one in-flight attempt.
	const ctx = () =>
		(memo ??= loadCtx().then(
			(value) => value,
			(error: unknown) => {
				memo = undefined;
				throw error;
			},
		));
	const files = table.files;
	return {
		async create(request) {
			const resolved = await ctx();
			const created = await table.create(resolved, request);
			// ✓ P4: reconcile recorded vs booted. The driver's report wins; a contradiction is a
			// wiring bug that must fail before a single measurement is attributed to the wrong ref.
			if (created.artifactRef !== undefined && created.artifactRef !== request.artifactRef) {
				await table.destroy(resolved, created.handle);
				throw new Error(
					`artifact mismatch: request says ${request.artifactRef}, driver booted ${created.artifactRef}`,
				);
			}
			const { handle, sandboxId: id } = created;
			return {
				sandboxId: id,
				artifactRef: created.artifactRef ?? request.artifactRef,
				native: handle,
				exec: (command, options) => table.exec(resolved, handle, command, options),
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

/** ✓ P5: run work against a session and tear down without losing either error. */
export async function withSessionTeardown<Handle, T>(
	session: SandboxSession<Handle>,
	work: (session: SandboxSession<Handle>) => Promise<T>,
): Promise<T> {
	let primary: unknown;
	let failed = false;
	try {
		return await work(session);
	} catch (error) {
		primary = error;
		failed = true;
		throw error;
	} finally {
		try {
			await session.destroy();
		} catch (teardown) {
			// Same shape `using` produces: the teardown error carries the primary as `suppressed`.
			if (failed) throw new SuppressedError(teardown, primary, "teardown failed after primary error");
			throw teardown;
		}
	}
}

/* --------------------- Registry excerpt (Tier 1, schema) + typed join --------------------- */

type CredentialDecl = { readonly name: string; readonly optional?: true };
type ArtifactDecl =
	| { readonly kind: "image"; readonly optionKey: "templateId" | "image" }
	| { readonly kind: "built"; readonly recipe: string };

const REGISTRY = {
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
		readonly transport: {
			readonly streaming: boolean;
			readonly syncCapMs: number | null;
			readonly detachedPoll: boolean;
		};
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

export const transportOf = <P extends ProviderId>(id: P): (typeof REGISTRY)[P]["transport"] =>
	REGISTRY[id].transport;

/* =============================================================================================
 * AUTHOR (the modal-gpu driver)
 * =========================================================================================== */

const MODEL_MOUNT = "/vol/models";
const REMOTE_ROOT = "/bench";

export interface ModalGpuCtx {
	readonly client: ModalClient;
	readonly app: App;
	readonly kernelImage: Image;
	readonly modelVolume: Volume;
}

/** ✓ P7: one streaming decoder per stream (split UTF-8 stays intact), opt-in byte cap. */
export async function drain(
	stream: ModalReadStream<string>,
	maxOutputBytes?: number,
): Promise<{ text: string; truncated: boolean }> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	const chunks: string[] = [];
	let bytes = 0;
	let truncated = false;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			const text = typeof value === "string" ? value : decoder.decode(value, { stream: true });
			bytes += text.length;
			if (maxOutputBytes !== undefined && bytes > maxOutputBytes) {
				chunks.push(text.slice(0, Math.max(0, text.length - (bytes - maxOutputBytes))));
				truncated = true;
				break;
			}
			chunks.push(text);
		}
		const tail = decoder.decode();
		if (tail && !truncated) chunks.push(tail);
		return { text: chunks.join(""), truncated };
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

const modalGpuSyntax = (gpu: GpuSpec): string =>
	gpu.count === 1 ? gpu.model : `${gpu.model}:${gpu.count}`;

export const modalGpuTable = {
	async create(ctx: ModalGpuCtx, request: CreateRequest) {
		if (!request.gpu) {
			throw new Error("modal-gpu requires a gpu axis (ADR-0008: no silent CPU runs)");
		}
		// ✓ P3: Modal exposes no disk knob (SandboxCreateParams has none); a present diskGb is a
		// requirement this driver cannot honor — fail create, matching the fleet's disclose doctrine.
		if (request.spec.diskGb !== undefined) {
			throw new Error(
				`modal-gpu cannot honor spec.diskGb=${request.spec.diskGb}: Modal exposes no disk knob — omit it (rootfs is Modal-managed)`,
			);
		}
		// ✓ P2: the Gb→MiB conversion lives here, once, next to the vendor that wants MiB.
		const memoryMiB = Math.round(request.spec.memoryGb * 1024);
		const handle = await ctx.client.sandboxes.create(ctx.app, ctx.kernelImage, {
			gpu: modalGpuSyntax(request.gpu),
			cpu: request.spec.vcpus,
			cpuLimit: request.spec.vcpus,
			memoryMiB,
			memoryLimitMiB: memoryMiB,
			timeoutMs: request.deadlineMs,
			blockNetwork: true,
			env: { ...request.env },
			volumes: { [MODEL_MOUNT]: ctx.modelVolume.withMountOptions({ readOnly: true }) },
		});
		// ✓ P4: report what was actually booted — the recorder must never guess.
		return { handle, sandboxId: sandboxId(handle.sandboxId), artifactRef: ctx.kernelImage.imageId };
	},

	async exec(
		_ctx: ModalGpuCtx,
		handle: Sandbox,
		command: string,
		options?: ExecOptions,
	): Promise<ExecResult> {
		const started = Date.now();
		const process = await handle.exec(["bash", "-lc", command], {
			mode: "text",
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, code] = await Promise.all([
			drain(process.stdout, options?.maxOutputBytes),
			drain(process.stderr, options?.maxOutputBytes),
			process.wait(),
		]);
		return {
			exit: { kind: "exited", code },
			stdout: stdout.text,
			stderr: stderr.text,
			durationMs: Date.now() - started,
			truncated: stdout.truncated || stderr.truncated,
		};
	},

	destroy: (ctx: ModalGpuCtx, handle: Sandbox) =>
		terminateConverged(ctx.client, handle.sandboxId, () => handle.terminate({ wait: true })),

	/** ✓ P8: only Modal's typed NotFoundError means "already converged"; anything else surfaces. */
	destroyById: async (ctx: ModalGpuCtx, id: SandboxId) => {
		let handle: Sandbox;
		try {
			handle = await ctx.client.sandboxes.fromId(id);
		} catch (error) {
			if (error instanceof NotFoundError) return; // destroy-of-missing MUST succeed (ADR-0008)
			throw error;
		}
		await terminateConverged(ctx.client, id, () => handle.terminate({ wait: true }));
	},

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
		const kind: "built" = artifact.kind;
		void kind;
		return driverFromTable(modalGpuTable, () => buildGpuPlumbing(env, artifact.recipe));
	},
});

/* --------------------------------- The seven steps, polished --------------------------------- */

export async function runReplicate(
	driver: SandboxDriver<Sandbox>,
	request: CreateRequest,
	files: ReadonlyArray<{ path: string; text: string }>,
	index: number,
) {
	const session = await driver.create(request);
	return withSessionTeardown(session, async () => {
		await session.native.setTags({ "gpu-benchmark-replicate": String(index) });
		if (!session.files) throw new Error("modal-gpu declares files; conformance verifies it");
		// Establish the staging root before any write — the prior revision never created it.
		await session.exec(`mkdir -p ${REMOTE_ROOT}`);
		// ✓ P5: every write settles before anything else happens; failures aggregate.
		const writes = await Promise.allSettled(
			files.map((file) => session.files!.writeText(`${REMOTE_ROOT}/${file.path}`, file.text)),
		);
		const writeFailures = writes.flatMap((w) => (w.status === "rejected" ? [w.reason] : []));
		if (writeFailures.length > 0) {
			throw new AggregateError(writeFailures, `${writeFailures.length}/${files.length} staged writes failed`);
		}
		await session.exec(`git init -q ${REMOTE_ROOT}`);
		const benchmark = await session.exec(`cd ${REMOTE_ROOT} && bash gpu/task.sh`);
		const smi = await session.exec(
			"nvidia-smi --query-gpu=name,driver_version,memory.total,compute_cap --format=csv,noheader,nounits",
			{ maxOutputBytes: 64 * 1024 }, // ✓ P7: probes opt in to caps; benchmark output never capped
		);
		return { artifactRef: session.artifactRef, benchmark, gpu: smi.stdout.trim() };
	});
}

/* --------------------------------------- Type proofs --------------------------------------- */

export async function proofs(ctx: ModalGpuCtx) {
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
