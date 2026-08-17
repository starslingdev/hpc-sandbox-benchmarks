// The ComputeSDK bridge (ADR-0007 §6): computesdk keeps all its real value — maintained vendor
// translations — as ONE driver among several, and stops being the substrate every provider
// must impersonate.
//
// The bridge is a MethodTable, not a hand-assembled driver, so it flows through the same
// assembly layer as every other driver (table.ts) and inherits its session invariants for free:
// central output capping, the use-after-destroy guard, and artifact reconciliation. It is also
// deliberately STRUCTURAL: this private bridge declares the shape it consumes instead of importing
// computesdk itself. Two rules from ADR-0007 are load-bearing:
//
//   - `hasWorkingFilesystem` is EXPLICIT, because computesdk's UnsupportedFileSystem is a
//     truthy stub whose every method throws — the sentinel that killed a namespace step. The
//     stub is filtered here and never reaches a consumer.
//   - `native` is the WRAPPER's getInstance() value, typed by the wrapper's own vendored SDK —
//     never cast to this repo's copy of a vendor SDK. Wrappers vendor their own builds; the
//     classes are nominally different. Code that needs the repo's SDK types is code that
//     should be a native driver.

import type {
	CreateBudget,
	CreateRequest,
	DriverContext,
	DriverErrorCode,
	DriverModule,
	DriverOperationOptions,
	MethodTable,
	ProviderId,
	ResolvedArtifact,
	SandboxObservation,
	SandboxRef,
	SandboxSession,
} from "@sandbox-benchmarks/driver";
import {
	DriverError,
	defineDriver,
	driverFromTable,
	FailedCreateCleanupError,
	isDriverError,
	isFailedCreateCleanupError,
	sandboxRef,
} from "@sandbox-benchmarks/driver";
import { sensitiveEnvValuesFor } from "@sandbox-benchmarks/driver/env";
import type { Out, Type } from "arktype";
import { type } from "arktype";

/** The structural slice of a computesdk provider instance this bridge consumes. */
export interface ComputeSdkLike<TSandbox extends ComputeSdkSandboxLike = ComputeSdkSandboxLike> {
	readonly sandbox: {
		create(options?: Record<string, unknown>): Promise<TSandbox>;
		list?(): Promise<unknown>;
	};
}

export interface ComputeSdkSandboxLike<TNative = unknown> {
	readonly sandboxId?: string;
	/** The wrapper's vendored native SDK instance; this becomes SandboxSession.native. */
	getInstance(): TNative;
	runCommand(
		command: string,
		options?: { readonly background?: boolean },
	): Promise<{ readonly exitCode?: number; readonly stdout?: string; readonly stderr?: string }>;
	destroy(): Promise<unknown>;
	readonly filesystem?: {
		readFile(path: string): Promise<string>;
		exists(path: string): Promise<boolean>;
		writeFile(path: string, content: string): Promise<void>;
	};
}

export type ComputeSdkNativeOf<TSandbox extends ComputeSdkSandboxLike> = ReturnType<
	TSandbox["getInstance"]
>;

export type ComputeSdkSandboxOf<TCompute extends ComputeSdkLike> = Awaited<
	ReturnType<TCompute["sandbox"]["create"]>
>;

type ComputeSdkSandboxIdParser = Type<string> | Type<(In: string) => Out<string>>;

/**
 * A simple provider id schema is inherently stable because its input and output are the same
 * string grammar. Providers that decode a vendor id into a different canonical form must declare
 * both boundaries: the raw wrapper parser and the grammar accepted everywhere after create.
 */
export type ComputeSdkSandboxIdSchema =
	| Type<string>
	| {
			readonly fromVendor: ComputeSdkSandboxIdParser;
			readonly canonical: Type<string>;
	  };

interface ComputeSdkSandboxIdBoundary {
	readonly fromVendor: ComputeSdkSandboxIdParser;
	readonly canonical: Type<string>;
	readonly transformed: boolean;
}

type ComputeSdkTargetAxisDisposition = "mapped" | "artifact" | "unsupported";
type ComputeSdkOptionalAxisDisposition = "mapped" | "unsupported";

/**
 * Compile-time proof that a provider author considered every canonical request axis. TargetSpec
 * fields are listed individually, so adding (for example) a disk or accelerator field breaks every
 * mapper until the provider declares whether it maps, artifact-pins, or cannot control that axis.
 * Artifact selection and attempt deadline are kit/composition concerns, but remain explicit here
 * so adding any top-level CreateRequest field is also a compiler-forced review event.
 */
export type ComputeSdkCreateRequestCoverage = {
	readonly spec: {
		readonly [Axis in keyof CreateRequest["spec"]]-?: ComputeSdkTargetAxisDisposition;
	};
	/** Resolved once by the composition root; never reinterpreted as a wrapper timeout/lifetime. */
	readonly artifact: "context";
	/** The harness owns this attempt budget; wrappers must not confuse it with sandbox lifetime. */
	readonly deadlineMs: "harness";
	readonly gpu: {
		readonly [Axis in keyof NonNullable<CreateRequest["gpu"]>]-?: ComputeSdkOptionalAxisDisposition;
	};
} & {
	readonly [Axis in Exclude<
		keyof CreateRequest,
		"spec" | "artifact" | "deadlineMs" | "gpu"
	>]-?: ComputeSdkOptionalAxisDisposition;
};

export interface ComputeSdkCreateRequestMapper {
	readonly coverage: ComputeSdkCreateRequestCoverage;
	readonly map: (
		request: CreateRequest,
		unsupported: (detail: string) => never,
	) => Readonly<Record<string, unknown>>;
}

export interface ComputeSdkDriverSpec<TCompute extends ComputeSdkLike> {
	/** Construct the wrapper lazily from this provider module's exact env/artifact context. */
	readonly compute: TCompute;
	/** Module-owned trust boundary for the wrapper's vendor-specific sandbox id. */
	readonly sandboxId: ComputeSdkSandboxIdSchema;
	/**
	 * Declare the disposition of every canonical request axis, then validate and translate the
	 * request into wrapper options (including the `snapshotId`/`templateId` conventions the bake
	 * path relies on). The returned options stay open because the port does not model every vendor's
	 * create surface, while `coverage` makes additions to CreateRequest a compile-time review event.
	 * Call `unsupported(detail)` for cross-field combinations this provider cannot honor.
	 *
	 * Artifact refs are resolved in DriverContext before this spec is built; provider files never
	 * read ambient process configuration or decide candidate-versus-version lanes.
	 */
	readonly createOptions: ComputeSdkCreateRequestMapper;
	/**
	 * Whether the wrapper's filesystem actually works. Explicit, because the wrapper cannot be
	 * asked: UnsupportedFileSystem is truthy and throws. ADR-0008's smoke conformance verifies
	 * the answer against the live vendor.
	 */
	readonly hasWorkingFilesystem: boolean;
	/** Honest lifecycle probes supplied only when this wrapper/provider can implement them. */
	readonly probes?: {
		observe(compute: TCompute, ref: SandboxRef): Promise<SandboxObservation>;
		list?(compute: TCompute): Promise<unknown>;
		describe?(compute: TCompute, ref: SandboxRef): Promise<unknown>;
	};
	/** Honest snapshot projection; omission records an unsupported capability instead of a stub. */
	readonly snapshots?: {
		create(
			compute: TCompute,
			session: SandboxSession<ComputeSdkNativeOf<ComputeSdkSandboxOf<TCompute>>>,
		): Promise<{ readonly snapshotId: string }>;
		delete(compute: TCompute, snapshotId: string): Promise<void>;
	};
}

/**
 * Preserve the installed wrapper's complete type while contextually typing capability callbacks.
 * TypeScript cannot infer one object property's type and use it to type a sibling callback in the
 * same literal, so the compute value is deliberately the first argument to this tiny authoring
 * helper rather than being widened to the bridge's structural minimum.
 */
export function computeSdkSpec<TCompute extends ComputeSdkLike>(
	compute: TCompute,
	spec: Omit<ComputeSdkDriverSpec<TCompute>, "compute">,
): ComputeSdkDriverSpec<TCompute> {
	return { ...spec, compute };
}

/** One registry-joined ComputeSDK provider module. The id exists only in defineComputeSdkDriver. */
export interface ComputeSdkDriverModuleSpec<P extends ProviderId, TCompute extends ComputeSdkLike> {
	/** ComputeSDK exposes no cancellable hard ceiling, so only the harness may own this budget. */
	readonly createBudget?: Extract<CreateBudget, { readonly owner: "harness" }>;
	/** Builds the wrapper binding from exactly this provider's resolved input slice. */
	readonly spec: (context: DriverContext<P>) => ComputeSdkDriverSpec<TCompute>;
}

type BoundComputeSdkDriverSpec<TCompute extends ComputeSdkLike> = Omit<
	ComputeSdkDriverSpec<TCompute>,
	"compute"
> & {
	readonly resolvedArtifact: ResolvedArtifact;
	/** Registry-resolved provider inputs are credentials until proven otherwise. */
	readonly sensitiveValues: readonly string[];
};

/** A private brand lets bridge-authored contract errors survive without trusting vendor codes. */
class ComputeSdkContractError extends DriverError {}

function vendorContractFailure(
	provider: ProviderId,
	operation: string,
	caught: unknown,
	sensitiveValues: readonly string[],
	ref?: SandboxRef,
): ComputeSdkContractError {
	const detail = redactKnownDiagnostic(
		caught instanceof Error ? caught.message : String(caught),
		sensitiveValues,
	);
	return new ComputeSdkContractError(
		"vendor-contract-violation",
		`computesdk ${operation} violated its wrapper contract: ${detail}`,
		{
			provider,
			...(ref === undefined ? {} : { ref }),
			cause: new Error(detail),
		},
	);
}

function wrapperFailure(
	code: Extract<
		DriverErrorCode,
		| "create-failed"
		| "exec-failed"
		| "destroy-failed"
		| "filesystem-failed"
		| "probe-failed"
		| "snapshot-failed"
	>,
	provider: ProviderId,
	operation: string,
	caught: unknown,
	ref?: SandboxRef,
	sensitiveValues: readonly string[] = [],
): DriverError | FailedCreateCleanupError {
	if (isFailedCreateCleanupError(caught)) return caught;
	if (caught instanceof ComputeSdkContractError) return caught;
	const redact = (detail: string) => redactKnownDiagnostic(detail, sensitiveValues);
	if (isDriverError(caught)) {
		return new DriverError(code, redact(caught.message), {
			provider,
			...(ref ? { ref } : {}),
			...(caught.vendorMessage === undefined
				? {}
				: { vendorMessage: redact(caught.vendorMessage) }),
			...(caught.vendorExitCode === undefined ? {} : { vendorExitCode: caught.vendorExitCode }),
			cause: new Error(redact(caught.message)),
		});
	}
	const detail = redact(caught instanceof Error ? caught.message : String(caught));
	return new DriverError(code, `computesdk ${operation} failed: ${detail}`, {
		provider,
		vendorMessage: detail,
		cause: new Error(detail),
		...(ref ? { ref } : {}),
	});
}

async function wrapperCapability<T>(
	code: Extract<DriverErrorCode, "filesystem-failed" | "probe-failed" | "snapshot-failed">,
	provider: ProviderId,
	operation: string,
	sensitiveValues: readonly string[],
	run: () => Promise<T>,
	ref?: SandboxRef,
): Promise<T> {
	try {
		return await run();
	} catch (caught) {
		throw wrapperFailure(code, provider, operation, caught, ref, sensitiveValues);
	}
}

/** Compile a computesdk provider instance to a method table. */
function computeSdkMethodTable<TCompute extends ComputeSdkLike>(
	provider: ProviderId,
	options: BoundComputeSdkDriverSpec<TCompute>,
): MethodTable<
	ComputeSdkSandboxOf<TCompute>,
	TCompute,
	ComputeSdkNativeOf<ComputeSdkSandboxOf<TCompute>>
> {
	const wantsFiles = options.hasWorkingFilesystem;
	const probes = options.probes;
	const probeList = probes?.list;
	const probeDescribe = probes?.describe;
	const snapshots = options.snapshots;
	const sandboxIds = sandboxIdBoundary(options.sandboxId);
	const handleSensitiveValues = new WeakMap<object, readonly string[]>();
	const handleRefIds = new WeakMap<object, string>();
	const refSensitiveValues = new Map<string, readonly string[]>();
	const sensitiveFor = (sandbox: ComputeSdkSandboxOf<TCompute>): readonly string[] =>
		handleSensitiveValues.get(sandbox) ?? options.sensitiveValues;
	const sensitiveForRef = (ref: SandboxRef): readonly string[] =>
		refSensitiveValues.get(ref.id) ?? options.sensitiveValues;
	const refFor = (sandbox: ComputeSdkSandboxOf<TCompute>): SandboxRef | undefined => {
		const id = handleRefIds.get(sandbox);
		return id === undefined ? undefined : sandboxRef(provider, id);
	};
	return {
		async create(compute, request: CreateRequest, operationOptions?: DriverOperationOptions) {
			if (operationOptions?.signal?.aborted) {
				throw wrapperAborted(provider, operationOptions.signal.reason);
			}
			const sensitiveValues = options.sensitiveValues;
			const createOptions = mapCreateRequest(
				provider,
				options.createOptions,
				request,
				sensitiveValues,
			);
			let created: ComputeSdkSandboxOf<TCompute>;
			try {
				created = (await compute.sandbox.create(createOptions)) as ComputeSdkSandboxOf<TCompute>;
			} catch (caught) {
				throw wrapperFailure(
					"create-failed",
					provider,
					"create",
					caught,
					undefined,
					sensitiveValues,
				);
			}
			if ((typeof created !== "object" && typeof created !== "function") || created === null) {
				throw new DriverError(
					"vendor-contract-violation",
					"computesdk wrapper returned a non-object sandbox handle",
					{ provider },
				);
			}
			handleSensitiveValues.set(created, sensitiveValues);

			let parsedId: string | undefined;
			try {
				if (operationOptions?.signal?.aborted) {
					throw wrapperAborted(provider, operationOptions.signal.reason);
				}
				const id = readSandboxId(created, provider, sensitiveValues);
				if (typeof id !== "string" || id.length === 0) {
					throw vendorContractFailure(
						provider,
						"sandbox identity",
						new Error("wrapper returned a sandbox without a nonempty string sandboxId"),
						sensitiveValues,
					);
				}
				parsedId = parseVendorSandboxId(provider, sandboxIds, id, sensitiveValues);
				const ref = sandboxRef(provider, parsedId);
				handleRefIds.set(created, parsedId);
				refSensitiveValues.set(parsedId, sensitiveValues);
				if (wantsFiles) requireFilesystem(created, provider, sensitiveValues, ref);
				let native: ComputeSdkNativeOf<ComputeSdkSandboxOf<TCompute>>;
				try {
					native = created.getInstance() as ComputeSdkNativeOf<ComputeSdkSandboxOf<TCompute>>;
				} catch (caught) {
					const detail = redactKnownDiagnostic(
						caught instanceof Error ? caught.message : String(caught),
						sensitiveValues,
					);
					throw new DriverError(
						"vendor-contract-violation",
						`computesdk getInstance failed: ${detail}`,
						{ provider, ref, cause: new Error(detail) },
					);
				}
				return {
					handle: created,
					native,
					sandboxRef: ref,
					artifact: options.resolvedArtifact,
				};
			} catch (primary) {
				const retryCleanup = async (cleanupOptions?: DriverOperationOptions) => {
					if (cleanupOptions?.signal?.aborted) {
						throw wrapperAborted(
							provider,
							cleanupOptions.signal.reason,
							"failed-create cleanup",
							"destroy-failed",
						);
					}
					try {
						await created.destroy();
						handleSensitiveValues.delete(created);
						handleRefIds.delete(created);
						if (parsedId !== undefined) refSensitiveValues.delete(parsedId);
					} catch (caught) {
						throw wrapperFailure(
							"destroy-failed",
							provider,
							"failed-create cleanup",
							caught,
							undefined,
							sensitiveValues,
						);
					}
				};
				try {
					await retryCleanup();
				} catch (cleanupError) {
					throw new FailedCreateCleanupError(cleanupError, primary, {
						provider,
						locator:
							parsedId === undefined ? { kind: "native-handle" } : { kind: "id", value: parsedId },
						cleanup: retryCleanup,
					});
				}
				throw primary;
			}
		},
		async exec(_compute, sandbox, command) {
			const started = Date.now();
			let result: NormalizedComputeSdkCommandResult;
			try {
				result = normalizeCommandResult(
					provider,
					"exec",
					await sandbox.runCommand(command),
					sensitiveFor(sandbox),
					refFor(sandbox),
				);
			} catch (caught) {
				throw wrapperFailure(
					"exec-failed",
					provider,
					"exec",
					caught,
					refFor(sandbox),
					sensitiveFor(sandbox),
				);
			}
			return {
				// No forged `?? 1`: a wrapper that withholds the exit code yields the representable
				// `unknown` arm instead of a fake failure.
				exit:
					result.exitCode === undefined
						? { kind: "unknown" as const, detail: "computesdk adapter reported no exit code" }
						: { kind: "exited" as const, code: result.exitCode },
				stdout: result.stdout ?? "",
				stderr: result.stderr ?? "",
				durationMs: Date.now() - started,
				truncated: false, // the kit applies caps centrally (table.ts / output.ts)
			};
		},
		async destroy(_compute, sandbox, operationOptions) {
			if (operationOptions?.signal?.aborted) {
				throw wrapperAborted(provider, operationOptions.signal.reason, "destroy", "destroy-failed");
			}
			try {
				await sandbox.destroy();
			} catch (caught) {
				throw wrapperFailure(
					"destroy-failed",
					provider,
					"destroy",
					caught,
					undefined,
					sensitiveFor(sandbox),
				);
			}
			handleSensitiveValues.delete(sandbox);
			const refId = handleRefIds.get(sandbox);
			handleRefIds.delete(sandbox);
			if (refId !== undefined) refSensitiveValues.delete(refId);
		},
		async launch(_compute, sandbox, command) {
			let result: NormalizedComputeSdkCommandResult;
			try {
				result = normalizeCommandResult(
					provider,
					"background launch",
					await sandbox.runCommand(command, { background: true }),
					sensitiveFor(sandbox),
					refFor(sandbox),
				);
			} catch (caught) {
				throw wrapperFailure(
					"exec-failed",
					provider,
					"background launch",
					caught,
					refFor(sandbox),
					sensitiveFor(sandbox),
				);
			}
			const diagnostic =
				result.stderr?.trim() ||
				result.stdout?.trim() ||
				(result.exitCode === undefined
					? "missing exit status"
					: `exit ${result.exitCode} with no diagnostic`);
			if (result.exitCode === undefined) {
				throw new DriverError(
					"exec-failed",
					"computesdk background launch returned no acceptance status",
					{
						provider,
						vendorMessage: redactKnownDiagnostic(diagnostic, sensitiveFor(sandbox)),
					},
				);
			}
			if (result.exitCode !== 0) {
				throw new DriverError(
					"exec-failed",
					`computesdk background launch exited with code ${result.exitCode}`,
					{
						provider,
						vendorExitCode: result.exitCode,
						vendorMessage: redactKnownDiagnostic(diagnostic, sensitiveFor(sandbox)),
					},
				);
			}
		},
		// The stub never escapes: create verifies that a declared filesystem is present, and the
		// per-operation guards catch a wrapper that later withdraws the capability.
		...(wantsFiles
			? {
					files: {
						readFile: (_compute, sandbox, path) => {
							const filesystem = requireFilesystem(
								sandbox,
								provider,
								sensitiveFor(sandbox),
								refFor(sandbox),
							);
							return wrapperCapability(
								"filesystem-failed",
								provider,
								"filesystem read",
								sensitiveFor(sandbox),
								() => filesystem.readFile(path),
								refFor(sandbox),
							);
						},
						exists: (_compute, sandbox, path) => {
							const filesystem = requireFilesystem(
								sandbox,
								provider,
								sensitiveFor(sandbox),
								refFor(sandbox),
							);
							return wrapperCapability(
								"filesystem-failed",
								provider,
								"filesystem exists",
								sensitiveFor(sandbox),
								() => filesystem.exists(path),
								refFor(sandbox),
							);
						},
						writeText: (_compute, sandbox, path, text) => {
							const filesystem = requireFilesystem(
								sandbox,
								provider,
								sensitiveFor(sandbox),
								refFor(sandbox),
							);
							return wrapperCapability(
								"filesystem-failed",
								provider,
								"filesystem write",
								sensitiveFor(sandbox),
								() => filesystem.writeFile(path, text),
								refFor(sandbox),
							);
						},
					},
				}
			: {}),
		...(probes === undefined
			? {}
			: {
					probes: {
						observe: (compute, ref) => {
							const canonical = validateRef(
								provider,
								sandboxIds.canonical,
								ref,
								sensitiveForRef(ref),
							);
							return wrapperCapability(
								"probe-failed",
								provider,
								"probe observe",
								sensitiveForRef(canonical),
								() => probes.observe(compute, canonical),
								canonical,
							);
						},
						...(probeList === undefined
							? {}
							: {
									list: (compute: TCompute) =>
										wrapperCapability(
											"probe-failed",
											provider,
											"probe list",
											options.sensitiveValues,
											() => probeList(compute),
										),
								}),
						...(probeDescribe === undefined
							? {}
							: {
									describe: (compute: TCompute, ref: SandboxRef) => {
										const canonical = validateRef(
											provider,
											sandboxIds.canonical,
											ref,
											sensitiveForRef(ref),
										);
										return wrapperCapability(
											"probe-failed",
											provider,
											"probe describe",
											sensitiveForRef(canonical),
											() => probeDescribe(compute, canonical),
											canonical,
										);
									},
								}),
					},
				}),
		...(snapshots === undefined
			? {}
			: {
					snapshots: {
						create: (
							compute: TCompute,
							session: SandboxSession<ComputeSdkNativeOf<ComputeSdkSandboxOf<TCompute>>>,
						) => {
							const canonical = validateRef(
								provider,
								sandboxIds.canonical,
								session.sandboxRef,
								sensitiveForRef(session.sandboxRef),
							);
							return wrapperCapability(
								"snapshot-failed",
								provider,
								"snapshot create",
								sensitiveForRef(canonical),
								() => snapshots.create(compute, { ...session, sandboxRef: canonical }),
								canonical,
							);
						},
						delete: (compute: TCompute, snapshotId: string) =>
							wrapperCapability(
								"snapshot-failed",
								provider,
								"snapshot delete",
								options.sensitiveValues,
								() => snapshots.delete(compute, snapshotId),
							),
					},
				}),
	};
}

function mapCreateRequest(
	provider: ProviderId,
	mapper: ComputeSdkCreateRequestMapper,
	request: CreateRequest,
	sensitiveValues: readonly string[],
): Readonly<Record<string, unknown>> {
	const redact = (detail: string) => redactKnownDiagnostic(detail, sensitiveValues);
	let mapped: Readonly<Record<string, unknown>>;
	try {
		for (const [axis, disposition] of Object.entries(mapper.coverage.spec)) {
			const value = request.spec[axis as keyof CreateRequest["spec"]];
			if (disposition === "unsupported" && value !== undefined) {
				throw new UnsupportedComputeSdkRequest(`target axis ${axis} is unsupported`);
			}
		}
		if (request.gpu !== undefined) {
			const gpu = request.gpu as unknown as Readonly<Record<string, unknown>>;
			for (const [axis, disposition] of Object.entries(mapper.coverage.gpu)) {
				if (disposition === "unsupported" && gpu[axis] !== undefined) {
					throw new UnsupportedComputeSdkRequest(
						`GPU ${request.gpu.model} x${request.gpu.count} is unsupported (axis ${axis})`,
					);
				}
			}
		}
		const requestRecord = request as unknown as Readonly<Record<string, unknown>>;
		for (const [axis, disposition] of Object.entries(mapper.coverage)) {
			if (axis === "spec" || axis === "artifact" || axis === "deadlineMs" || axis === "gpu") {
				continue;
			}
			const value = requestRecord[axis];
			const emptyEnvironment =
				axis === "env" &&
				value !== null &&
				typeof value === "object" &&
				Object.keys(value).length === 0;
			if (disposition === "unsupported" && value !== undefined && !emptyEnvironment) {
				throw new UnsupportedComputeSdkRequest(
					axis === "env"
						? "guest environment injection is unsupported"
						: `request axis ${axis} is unsupported`,
				);
			}
		}
		mapped = mapper.map(request, (detail) => {
			throw new UnsupportedComputeSdkRequest(detail);
		});
	} catch (caught) {
		if (caught instanceof UnsupportedComputeSdkRequest) {
			throw new DriverError(
				"invalid-create-request",
				`${provider} cannot honor the requested sandbox shape: ${redact(caught.message)}`,
				{ provider },
			);
		}
		if (isDriverError(caught) && caught.code === "invalid-create-request") {
			const detail = redact(caught.message);
			throw new DriverError("invalid-create-request", detail, {
				provider,
				cause: new Error(detail),
			});
		}
		const detail = redact(caught instanceof Error ? caught.message : String(caught));
		throw new DriverError(
			"vendor-contract-violation",
			`${provider} create-request mapper failed: ${detail}`,
			{ provider, cause: new Error(detail) },
		);
	}
	if (mapped === null || typeof mapped !== "object" || Array.isArray(mapped)) {
		throw new DriverError(
			"vendor-contract-violation",
			`${provider} create-request mapper must return an options object`,
			{ provider },
		);
	}
	return mapped;
}

function redactKnownDiagnostic(detail: string, sensitiveValues: readonly string[]): string {
	let redacted = detail;
	const unique = [...new Set(sensitiveValues.filter((value) => value.length > 0))].sort(
		(left, right) => right.length - left.length,
	);
	for (const value of unique) redacted = redacted.replaceAll(value, "[REDACTED]");
	return redacted;
}

class UnsupportedComputeSdkRequest extends Error {
	constructor(detail: string) {
		super(detail);
		this.name = "UnsupportedComputeSdkRequest";
	}
}

function sandboxIdBoundary(schema: ComputeSdkSandboxIdSchema): ComputeSdkSandboxIdBoundary {
	return typeof schema === "function"
		? { fromVendor: schema, canonical: schema, transformed: false }
		: { ...schema, transformed: true };
}

function parseSandboxId(
	provider: ProviderId,
	schema: ComputeSdkSandboxIdParser,
	value: string,
	sensitiveValues: readonly string[],
	boundary: "wrapper" | "canonical",
): string {
	const redact = (detail: string) => redactKnownDiagnostic(detail, sensitiveValues);
	let parsed: string | type.errors;
	try {
		parsed = schema(value);
	} catch (caught) {
		const detail = redact(caught instanceof Error ? caught.message : String(caught));
		throw new DriverError(
			"vendor-contract-violation",
			`${provider} ${boundary} sandbox-id validator failed: ${detail}`,
			{ provider, cause: new Error(detail) },
		);
	}
	if (parsed instanceof type.errors) {
		const detail = redact(parsed.summary);
		throw new DriverError("invalid-sandbox-ref", `${provider} sandbox id ${detail}`, {
			provider,
			cause: new Error(detail),
		});
	}
	if (parsed.length === 0) {
		throw new DriverError(
			"invalid-sandbox-ref",
			`${provider} ${boundary} sandbox-id validator returned an empty canonical id`,
			{ provider },
		);
	}
	return parsed;
}

function parseVendorSandboxId(
	provider: ProviderId,
	boundary: ComputeSdkSandboxIdBoundary,
	rawId: string,
	sensitiveValues: readonly string[],
): string {
	const decoded = parseSandboxId(provider, boundary.fromVendor, rawId, sensitiveValues, "wrapper");
	return boundary.transformed
		? parseSandboxId(provider, boundary.canonical, decoded, sensitiveValues, "canonical")
		: decoded;
}

function validateRef(
	provider: ProviderId,
	schema: Type<string>,
	ref: SandboxRef,
	sensitiveValues: readonly string[],
): SandboxRef {
	if (ref.provider !== provider) {
		throw new DriverError(
			"invalid-sandbox-ref",
			`expected ${provider} sandbox ref, received ${ref.provider}`,
			{ provider },
		);
	}
	const parsed = parseSandboxId(provider, schema, ref.id, sensitiveValues, "canonical");
	return sandboxRef(provider, parsed);
}

function wrapperAborted(
	provider: ProviderId,
	reason: unknown,
	operation = "create",
	code: Extract<DriverErrorCode, "create-failed" | "destroy-failed"> = "create-failed",
): DriverError {
	return new DriverError(code, `computesdk ${operation} for ${provider} was aborted`, {
		provider,
		cause: reason,
	});
}

interface NormalizedComputeSdkCommandResult {
	readonly exitCode?: number;
	readonly stdout: string;
	readonly stderr: string;
}

function normalizeCommandResult(
	provider: ProviderId,
	operation: string,
	result: unknown,
	sensitiveValues: readonly string[],
	ref?: SandboxRef,
): NormalizedComputeSdkCommandResult {
	if (result === null || typeof result !== "object" || Array.isArray(result)) {
		throw vendorContractFailure(
			provider,
			operation,
			new Error("wrapper returned a non-object command result"),
			sensitiveValues,
			ref,
		);
	}
	const candidate = result as Readonly<Record<string, unknown>>;
	const exitCode = candidate.exitCode;
	const stdout = candidate.stdout;
	const stderr = candidate.stderr;
	if (
		(exitCode !== undefined &&
			(typeof exitCode !== "number" ||
				!Number.isInteger(exitCode) ||
				!Number.isFinite(exitCode))) ||
		(stdout !== undefined && typeof stdout !== "string") ||
		(stderr !== undefined && typeof stderr !== "string")
	) {
		throw vendorContractFailure(
			provider,
			operation,
			new Error("wrapper returned an invalid command-result field"),
			sensitiveValues,
			ref,
		);
	}
	return {
		...(exitCode === undefined ? {} : { exitCode }),
		stdout: stdout ?? "",
		stderr: stderr ?? "",
	};
}

function readSandboxId(
	sandbox: ComputeSdkSandboxLike,
	provider: ProviderId,
	sensitiveValues: readonly string[],
): unknown {
	try {
		return (sandbox as unknown as { readonly sandboxId?: unknown }).sandboxId;
	} catch (caught) {
		throw vendorContractFailure(provider, "sandbox identity", caught, sensitiveValues);
	}
}

function requireFilesystem<TSandbox extends ComputeSdkSandboxLike>(
	sandbox: TSandbox,
	provider: ProviderId,
	sensitiveValues: readonly string[],
	ref?: SandboxRef,
): NonNullable<TSandbox["filesystem"]> {
	let filesystem: TSandbox["filesystem"];
	let readFile: unknown;
	let exists: unknown;
	let writeFile: unknown;
	try {
		filesystem = sandbox.filesystem;
		readFile = filesystem?.readFile;
		exists = filesystem?.exists;
		writeFile = filesystem?.writeFile;
	} catch (caught) {
		throw vendorContractFailure(provider, "filesystem accessor", caught, sensitiveValues, ref);
	}
	if (
		!filesystem ||
		typeof readFile !== "function" ||
		typeof exists !== "function" ||
		typeof writeFile !== "function"
	) {
		throw vendorContractFailure(
			provider,
			"filesystem accessor",
			new Error("wrapper declared a filesystem without every required callable method"),
			sensitiveValues,
			ref,
		);
	}
	return filesystem;
}

/**
 * Define a ComputeSDK-backed provider from one registry id.
 *
 * The raw bridge is intentionally private: exposing a separate `provider` option would let a copied
 * module compile with two disagreeing ids. This joined helper is the only authoring surface.
 */
export function defineComputeSdkDriver<P extends ProviderId, TCompute extends ComputeSdkLike>(
	id: P,
	module: ComputeSdkDriverModuleSpec<NoInfer<P>, TCompute>,
): DriverModule<P, ComputeSdkNativeOf<ComputeSdkSandboxOf<TCompute>>> {
	if (module.createBudget?.owner !== undefined && module.createBudget.owner !== "harness") {
		throw new DriverError(
			"vendor-contract-violation",
			"ComputeSDK create budgets must be owned by the harness",
			{ provider: id },
		);
	}
	return defineDriver(id, {
		...(module.createBudget === undefined ? {} : { createBudget: module.createBudget }),
		driver: (context) => {
			const sensitiveValues = sensitiveEnvValuesFor(id, context.env);
			try {
				const { compute, ...spec } = module.spec(context);
				return driverFromTable(
					computeSdkMethodTable<TCompute>(id, {
						...spec,
						resolvedArtifact: context.resolvedArtifact,
						sensitiveValues,
					}),
					() => Promise.resolve(compute),
				);
			} catch (caught) {
				throw vendorContractFailure(id, "driver construction", caught, sensitiveValues);
			}
		},
	});
}
