// @sandbox-benchmarks/driver/artifact — the seam through which the release lane builds a provider
// artifact without knowing the vendor (ADR-0023 §2). Arktype-free: types, one freeze, and one
// builder derived from a driver's snapshot capability.
//
// Providers bake in one of two ways, and the request says which:
//
// - An OCI baker turns the digest-pinned toolchain base into a vendor image or template (an SDK
//   call, or a remote Docker build through a pinned vendor CLI). Its provider package exports a
//   `defineArtifactBuilder` as `./artifact`.
// - A native-snapshot baker has no OCI base: it boots a sandbox, has the release lane prepare it
//   (install recipe and smoke, injected so a provider package never imports harness or templates
//   code) and captures it. `snapshotArtifactBuilder` derives that from the driver's own snapshot
//   capability, so such a provider needs no `./artifact` of its own. The release lane also injects
//   process ownership of the build sandbox, so an interrupt during the build destroys it.
//
// Either way the builder returns exactly the ref its driver boots. Nothing else crosses the seam.

import type {
	ArtifactOf,
	DriverModule,
	DriverOperationOptions,
	EnvOf,
	ProviderId,
	ResolvedArtifactOf,
	SandboxSession,
	TargetSpec,
} from "@sandbox-benchmarks/driver";

interface ArtifactBuildCommon<Env> {
	/** The registry-derived artifact name (`bakedArtifactName(id, phase)`); deterministic per version. */
	readonly name: string;
	/** The target the artifact is sized for, where the vendor's build API takes resources. */
	readonly spec: TargetSpec;
	/** The provider's declared inputs, already parsed. */
	readonly env: Env;
	/**
	 * Whether an existing artifact of this name may be replaced. `forbidden` obliges a builder that
	 * can only replace destructively (delete, then create) to refuse before it deletes; a builder
	 * whose vendor publishes over a name atomically leaves the predecessor standing either way.
	 */
	readonly replace: "allowed" | "forbidden";
	readonly log: (line: string) => void;
	/** Aborted when the release lane stops: its process-signal drain has begun. */
	readonly signal: AbortSignal;
}

/** A build from the OCI toolchain base. */
export interface OciArtifactBuildRequest<Env> extends ArtifactBuildCommon<Env> {
	readonly bakes: "oci";
	/** Always pinned by the caller; a builder never resolves a mutable tag. */
	readonly base: { readonly digestRef: string };
	/**
	 * The toolchain images directory (`packages/templates/images`). Builders that upload a Docker
	 * context to a remote builder through a vendor CLI (e2b, Blaxel) assemble it from here; the
	 * release lane resolves the path so a provider package never locates another package's files
	 * relative to its own source.
	 */
	readonly imagesDir: string;
	/**
	 * The Docker client configuration directory holding the release lane's registry logins, for a
	 * builder whose remote builder must pull the base with them (Blaxel). Resolved by the release
	 * lane for the same reason as `imagesDir`.
	 */
	readonly dockerConfig: string;
}

/**
 * The release lane's process ownership of a build sandbox. It registers the create before invoking
 * it, so a signal drain destroys the sandbox whether it is pending or live and reclaims a create
 * that lands late; the returned session's destroy is the owner's idempotent one. `create` receives
 * the owner's cancellation, which a drain aborts. Injected so a provider package never imports the
 * harness.
 */
export type OwnBuildSandbox = <S extends SandboxSession>(
	create: (signal: AbortSignal) => Promise<S>,
) => Promise<S>;

/** What the release lane's preparation of a native-snapshot build sandbox is told. */
export interface SnapshotPreparation extends DriverOperationOptions {
	/** The build's own signal: aborted when the release lane stops. */
	readonly signal: AbortSignal;
	/**
	 * The immutable identity the build sandbox booted: the candidate on a version build, else the
	 * stock base as the vendor resolved it. The recipe's provenance records it.
	 */
	readonly base: string;
}

/** A native snapshot captured from a prepared sandbox. */
export interface SnapshotArtifactBuildRequest<P extends ProviderId>
	extends ArtifactBuildCommon<EnvOf<P>> {
	readonly bakes: "native-snapshot";
	/** The provider's registry artifact descriptor, as the driver context carries it. */
	readonly artifact: ArtifactOf<P>;
	/**
	 * On a version build, the immutable ref of the candidate the release lane has just revalidated.
	 * The builder boots those bytes rather than a possibly newer stock base. Absent on a candidate
	 * build, which boots the provider's stock base.
	 */
	readonly candidate?: { readonly ref: string };
	/**
	 * The release lane's preparation of the booted sandbox: the install recipe and smoke on a
	 * candidate build, provenance verification on a version build. Rejecting fails the build.
	 */
	readonly prepare: (session: SandboxSession, preparation: SnapshotPreparation) => Promise<void>;
	/** Boots the build sandbox under the release lane's process ownership. */
	readonly own: OwnBuildSandbox;
}

export type ArtifactBuildRequest<P extends ProviderId> =
	| OciArtifactBuildRequest<EnvOf<P>>
	| SnapshotArtifactBuildRequest<P>;

export interface ArtifactBuildResult {
	/** Exactly what the candidate boot passes as `ResolvedArtifact.ref` (a name or an immutable id). */
	readonly ref: string;
	/**
	 * How a previous artifact of the same name was replaced, so the release lane can say what a
	 * forced republish cost. `destructive`: the vendor has no overwrite, so the name was deleted
	 * and then recreated (Daytona); between the two it resolved to nothing. A builder that fails
	 * after such a delete must say in its error that the name no longer resolves. A native
	 * snapshot is a new immutable id and replaces nothing.
	 */
	readonly replaced: "none" | "atomic" | "destructive";
}

export interface OciArtifactBuilder<P extends ProviderId, Env = EnvOf<P>> {
	readonly provider: P;
	readonly bakes: "oci";
	build(request: OciArtifactBuildRequest<Env>): Promise<ArtifactBuildResult>;
}

export interface SnapshotArtifactBuilder<P extends ProviderId> {
	readonly provider: P;
	readonly bakes: "native-snapshot";
	build(request: SnapshotArtifactBuildRequest<P>): Promise<ArtifactBuildResult>;
}

export type ArtifactBuilder<P extends ProviderId> =
	| OciArtifactBuilder<P>
	| SnapshotArtifactBuilder<P>;

export interface BuildCommandOptions {
	readonly cwd?: string;
	/** Added to the inherited environment, so a builder passes its credential explicitly. */
	readonly env?: Readonly<Record<string, string>>;
	/** Written to the command's stdin and closed: for a secret that must stay out of argv. */
	readonly stdin?: string;
}

/**
 * Runs one build command (a pinned vendor CLI, or Docker) and resolves its exit code. The build
 * log streams to the release lane's own stdio. OCI builders take it as an injectable transport so
 * their translation is testable without the binary.
 */
export type BuildCommandRunner = (
	argv: readonly [string, ...string[]],
	options?: BuildCommandOptions,
) => Promise<number>;

/** The real {@link BuildCommandRunner}: the release lane's environment plus `options.env`. */
export const runBuildCommand: BuildCommandRunner = async (argv, options = {}) => {
	const proc = Bun.spawn([...argv], {
		...(options.cwd === undefined ? {} : { cwd: options.cwd }),
		...(options.env === undefined ? {} : { env: { ...process.env, ...options.env } }),
		...(options.stdin === undefined ? {} : { stdin: "pipe" as const }),
		stdout: "inherit",
		stderr: "inherit",
	});
	if (options.stdin !== undefined && proc.stdin) {
		proc.stdin.write(options.stdin);
		// Close the pipe before waiting, so a command reading stdin to EOF cannot block on it.
		await proc.stdin.end();
	}
	return proc.exited;
};

/** Define an OCI baker: its provider package's `./artifact` export. */
export function defineArtifactBuilder<P extends ProviderId, Env = EnvOf<P>>(
	provider: P,
	build: (request: OciArtifactBuildRequest<Env>) => Promise<ArtifactBuildResult>,
): OciArtifactBuilder<P, Env> {
	return Object.freeze({ provider, bakes: "oci", build });
}

/** The create budget for the build sandbox; the release lane's signal can end it sooner. */
const SNAPSHOT_BUILD_CREATE_DEADLINE_MS = 15 * 60_000;

/** Destroy, retrying once: a build sandbox must not outlive the build (nor, owned, the process). */
async function converge(session: SandboxSession): Promise<void> {
	try {
		await session.destroy();
	} catch {
		await session.destroy();
	}
}

/**
 * What a native-snapshot provider package tells {@link snapshotArtifactBuilder} about its vendor;
 * the package exports it beside its driver as `snapshotBuild`.
 */
export interface SnapshotBuildOptions<P extends ProviderId, Handle> {
	/**
	 * The stock snapshot a candidate build boots, from the provider's own inputs. A build context is
	 * the only one whose resolved artifact may be this ref; the driver accepts it there alone.
	 */
	readonly stockBase: (env: EnvOf<P>) => string;
	/**
	 * The immutable identity the booted build sandbox reports. Omitted when every ref the build
	 * boots is already immutable, in which case the booted ref is the identity.
	 */
	readonly bootedBase?: (
		session: SandboxSession<Handle>,
		options: DriverOperationOptions,
	) => Promise<string>;
}

/**
 * Derive a native-snapshot baker from a driver module's snapshot capability: boot the stock base
 * (or the revalidated candidate), let the release lane prepare it, capture a durable snapshot, and
 * destroy the sandbox with cleanup confirmation whatever happened. A snapshot captured by a build
 * that then fails is deleted.
 */
export function snapshotArtifactBuilder<P extends ProviderId, Handle>(
	module: DriverModule<P, Handle>,
	options: SnapshotBuildOptions<P, Handle>,
): SnapshotArtifactBuilder<P> {
	const provider = module.id;
	const build = async (request: SnapshotArtifactBuildRequest<P>): Promise<ArtifactBuildResult> => {
		const ref = request.candidate?.ref ?? options.stockBase(request.env);
		const resolvedArtifact = {
			kind: request.artifact.kind,
			ref,
		} as unknown as ResolvedArtifactOf<P>;
		const driver = module.driver({
			env: request.env,
			artifact: request.artifact,
			resolvedArtifact,
		});
		const snapshots = driver.snapshots;
		if (snapshots === undefined)
			throw new Error(`${provider} exposes no snapshot capability to build ${request.name} with`);
		request.log(`${provider} native snapshot ${request.name}: booting ${ref}`);
		request.signal.throwIfAborted();
		const session = await request.own((owner) =>
			driver.create(
				{
					spec: request.spec,
					artifact: resolvedArtifact,
					deadlineMs: SNAPSHOT_BUILD_CREATE_DEADLINE_MS,
				},
				{ signal: AbortSignal.any([owner, request.signal]) },
			),
		);
		let snapshotId: string | undefined;
		let failure: { readonly error: unknown } | undefined;
		try {
			request.signal.throwIfAborted();
			const base =
				options.bootedBase === undefined
					? ref
					: await options.bootedBase(session, { signal: request.signal });
			await request.prepare(session as SandboxSession, { signal: request.signal, base });
			request.signal.throwIfAborted();
			snapshotId = (await snapshots.create(session, { retention: "durable" })).snapshotId;
		} catch (error) {
			failure = { error };
		}
		try {
			await converge(session);
		} catch (destroyError) {
			failure = {
				error:
					failure === undefined
						? destroyError
						: new SuppressedError(destroyError, failure.error, `${provider} build sandbox leaked`),
			};
		}
		if (failure !== undefined) {
			if (snapshotId !== undefined)
				await snapshots
					.delete(snapshotId)
					.catch((error: unknown) =>
						request.log(`${provider} snapshot ${snapshotId} cleanup failed: ${String(error)}`),
					);
			throw failure.error;
		}
		if (snapshotId === undefined) throw new Error(`${provider} snapshot capture returned no id`);
		request.log(`${provider} native snapshot ${request.name}: captured ${snapshotId}`);
		return { ref: snapshotId, replaced: "none" };
	};
	return Object.freeze({ provider, bakes: "native-snapshot", build });
}
