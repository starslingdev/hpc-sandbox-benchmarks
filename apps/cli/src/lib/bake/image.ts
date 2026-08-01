// Build the toolchain images and push the *candidate* base to GHCR. daytona (snapshot source) and
// modal (Image.fromRegistry) boot the base image by ref, and e2b/novita build remotely from its
// digest-pinned registry ref, so the candidate base must be pushed before any provider bake.
// The public `:v1` is never pushed here — that is promote's job.
import { join } from "node:path";
import { config } from "@sandbox-benchmarks/providers";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import type { templateProviders } from "@sandbox-benchmarks/templates";
import type { Log } from "./types.ts";

// Anchored to this file (not cwd): the `bake` package script runs from apps/cli, where a
// repo-relative path would resolve to the non-existent apps/cli/packages/... and fail in bash.
const BUILD_SH = join(import.meta.dir, "../../../../../packages/templates/images/build.sh");

async function run(cmd: string[], log: Log, extraEnv: Record<string, string> = {}): Promise<void> {
	log(`$ ${cmd.join(" ")}`);
	const proc = Bun.spawn(cmd, {
		stdout: "inherit",
		stderr: "inherit",
		env: { ...process.env, ...extraEnv },
	});
	const code = await proc.exited;
	if (code !== 0) throw new Error(`${cmd[0]} exited ${code}`);
}

/** One provider variant that is PUSHED to a registry (see {@link PUBLISHED_VARIANTS}). */
interface PublishedVariant {
	/** The build.sh variant name — its directory under packages/templates/images. Typed against the
	 *  templates registry so a typo is a compile error here, not an "unknown variant" at release time. */
	variant: (typeof templateProviders)[number];
	/** The provider whose bake cell consumes it — how the release scopes the visibility guard. */
	provider: ProviderId;
	version: string;
	candidate: string;
}

/**
 * The provider variants that are PUSHED to a registry, and so have candidate/version tags of their
 * own. Every other variant build.sh produces is consumed locally or rebuilt remotely (e2b builds its
 * template on E2B's builder FROM the base digest; daytona/modal boot the base itself), so it has no
 * registry copy to stage. Today only Vercel needs one: VCR is a separate registry the sandbox pulls
 * from, so the variant has to exist in GHCR first for the bake cell to mirror it across.
 */
export const PUBLISHED_VARIANTS: readonly PublishedVariant[] = [
	{
		variant: "vercel",
		provider: "vercel",
		version: config.vercelSourceImageVersion,
		candidate: config.vercelSourceImageCandidate,
	},
];

/**
 * The variants this release is allowed to stage: those whose provider is in `scope` (omitted → every
 * one, the unscoped default). A scoped release must not rewrite an out-of-scope provider's candidate
 * tag — that is a mutation outside what the dispatch asked for, on an image the plan has deliberately
 * dropped from the public-package guard, so nothing would even check it is still pullable.
 */
function variantsInScope(scope?: readonly ProviderId[]): readonly PublishedVariant[] {
	if (!scope) return PUBLISHED_VARIANTS;
	return PUBLISHED_VARIANTS.filter((entry) => scope.includes(entry.provider));
}

/** Retag a freshly built variant to its mutable candidate tag and push it (normalized, as below),
 *  returning the pushed candidate's digest-pinned ref. */
async function stagePublishedVariant(entry: PublishedVariant, log: Log): Promise<string> {
	await run(["docker", "tag", entry.version, entry.candidate], log);
	await run(["docker", "push", entry.candidate], log);
	await run(imagetoolsNormalizeCmd(entry.candidate), log);
	return resolveImageDigestRef(entry.candidate);
}

/** What a build phase staged: the digest-pinned base it pins, plus each registry-served variant
 *  candidate it pushed (empty when no in-scope provider has one). */
export interface StagedCandidates {
	/** The base ref every downstream phase pins — the candidate base for a full build, the published
	 *  version base for a variants-only build (which does not touch the candidate base at all). */
	base: string;
	/** Digest-pinned refs of the variant candidates this run actually pushed. */
	variants: string[];
}

/** build.sh (base + variants, tagged `:dev` and `:v1`) → retag base `:v1`→`:v1-candidate` → push the
 *  candidate. Idempotent: the candidate tag is mutable and simply overwritten each run. `scope`
 *  restricts which registry-served variants are staged (see {@link variantsInScope}).
 *
 *  A plain `docker push` publishes a bare image manifest, while the public version is a one-platform
 *  image index produced by `imagetools create`. Daytona's registry importer rejects the bare
 *  candidate with an opaque inspection error even when its total compressed size is below the
 *  accepted public image. Normalize the mutable candidate to the same envelope before providers
 *  consume it; the config and layers stay byte-identical. */
export async function buildAndPushCandidate(
	log: Log,
	scope?: readonly ProviderId[],
): Promise<StagedCandidates> {
	await run(["bash", BUILD_SH], log);
	await run(["docker", "tag", config.toolchainImageVersion, config.toolchainImageCandidate], log);
	await run(["docker", "push", config.toolchainImageCandidate], log);
	await run(imagetoolsNormalizeCmd(config.toolchainImageCandidate), log);
	// The thin Vercel variant is staged in GHCR so the separate Vercel matrix cell can mirror the
	// exact bytes into VCR after obtaining its short-lived OIDC registry login.
	const variants: string[] = [];
	for (const entry of variantsInScope(scope))
		variants.push(await stagePublishedVariant(entry, log));
	return { base: await resolveImageDigestRef(config.toolchainImageCandidate), variants };
}

/**
 * Variants-only rebuild: restage the registry-served provider variants FROM an already-published base,
 * without rebuilding the base or touching its candidate tag. `scope` restricts which variants are
 * staged (see {@link variantsInScope}).
 *
 * This is the build phase of a scoped backfill — adding a provider to a version the rest of the fleet
 * already runs. The alternative (a full rebuild) would take an hour AND produce different base bytes:
 * the toolchain build is not reproducible (apt/mise resolve at build time), so the new provider would
 * end up benchmarking a different `:vN` than everyone else, which is precisely the confound the pinned
 * toolchain exists to remove. Composing the thin variant layer on the PUBLISHED base keeps the
 * comparison honest — and the base is pinned by digest, so "the published base" can't drift mid-build.
 */
export async function buildAndPushVariantCandidates(
	log: Log,
	scope?: readonly ProviderId[],
): Promise<StagedCandidates> {
	const staged = variantsInScope(scope);
	// This mode has one hard prerequisite — the published base it composes on. The plan refuses the
	// combination up front when it can see the version is absent, but that probe is best-effort, so this
	// is the authoritative check. It is spelled out here rather than left to `resolveImageDigestRef`
	// because that would surface as a raw `imagetools inspect exited 1`, which reads like a registry
	// outage rather than "you asked for the wrong build mode".
	if (!(await imageExistsInRegistry(config.toolchainImageVersion))) {
		throw new Error(
			`${config.toolchainImageVersion} is not published, so there is no base to rebuild the variants on — ` +
				"`build: variants` adds a provider to a version that already shipped; use `build: full` to cut it first",
		);
	}
	const pinnedBase = await resolveImageDigestRef(config.toolchainImageVersion);
	if (staged.length === 0) {
		// Nothing to do rather than a no-op build.sh run: with no registry-served variant in scope there
		// is no image for this phase to stage — `build: variants` on such a scope is a dispatch mistake.
		log(`>>> no registry-served variant is in scope — nothing to stage on ${pinnedBase}`);
		return { base: pinnedBase, variants: [] };
	}
	log(`>>> rebuilding variants on the published base ${pinnedBase} (no base build)`);
	await run(["bash", BUILD_SH], log, {
		BASE_IMAGE: pinnedBase,
		VARIANTS: staged.map((entry) => entry.variant).join(","),
	});
	const variants: string[] = [];
	for (const entry of staged) variants.push(await stagePublishedVariant(entry, log));
	return { base: pinnedBase, variants };
}

/** Pure: the buildx command that retags one pushed image ref to another registry-side (no pull). */
export function imagetoolsRetagCmd(from: string, to: string): string[] {
	return ["docker", "buildx", "imagetools", "create", "-t", to, from];
}

/** Wrap one pushed image manifest in a one-platform image-index envelope. Source and target
 * intentionally name the same mutable candidate tag. */
export function imagetoolsNormalizeCmd(ref: string): string[] {
	return imagetoolsRetagCmd(ref, ref);
}

/** Pin a mutable registry ref to the digest returned by `imagetools inspect`. Remote template
 * builders cache FROM/fromImage by the literal tag, so reusing `:v1-candidate` can silently rebuild
 * from yesterday's bytes. The outer image-index digest is the immutable identity providers resolve. */
export function digestPinnedRef(ref: string, inspectJson: string): string {
	let parsed: { manifest?: { digest?: unknown } };
	try {
		parsed = JSON.parse(inspectJson);
	} catch (err) {
		throw new Error(`invalid imagetools inspect JSON for ${ref}`, { cause: err });
	}
	const digest = parsed.manifest?.digest;
	if (typeof digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(digest)) {
		throw new Error(`imagetools inspect returned no valid manifest digest for ${ref}`);
	}
	const withoutDigest = ref.split("@", 1)[0] ?? ref;
	const lastSlash = withoutDigest.lastIndexOf("/");
	const lastColon = withoutDigest.lastIndexOf(":");
	const repository = lastColon > lastSlash ? withoutDigest.slice(0, lastColon) : withoutDigest;
	return `${repository}@${digest}`;
}

/** Resolve a registry ref to its immutable outer-manifest digest for remote provider builders. */
export async function resolveImageDigestRef(ref: string): Promise<string> {
	// Callers pass the once-resolved digest through several provider-specific helpers. Preserve that
	// identity instead of inspecting the registry again: a second lookup is unnecessary and could
	// accidentally select a platform manifest rather than the outer index on a CLI behavior change.
	if (/@sha256:[a-f0-9]{64}$/.test(ref)) return ref;

	const proc = Bun.spawn(
		["docker", "buildx", "imagetools", "inspect", ref, "--format", "{{json .}}"],
		{ stdout: "pipe", stderr: "pipe", env: process.env },
	);
	const [code, stdout, stderr] = await Promise.all([
		proc.exited,
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	if (code !== 0) {
		throw new Error(
			`docker buildx imagetools inspect ${ref} exited ${code}: ${stderr.trim() || "unknown error"}`,
		);
	}
	return digestPinnedRef(ref, stdout);
}

/** Whether Docker's registry response specifically says the manifest is absent. Keep this narrower
 * than a generic "not found": credential helpers and executables can also be "not found", and
 * treating those failures as an absent image would bypass the immutable-version guard. */
export function registryManifestAbsent(stderr: string): boolean {
	return /no such manifest|manifest unknown|name[_ ]unknown/i.test(stderr);
}

/**
 * The repository part of an image ref — `ghcr.io/org/image:v1` → `ghcr.io/org/image`.
 *
 * NOT `ref.split(":")[0]`: a registry host may carry a PORT (`localhost:5001/org/image:tag`), and
 * splitting on the first colon would truncate the repo to the bare host. A colon is only a tag
 * separator when it comes after the last `/`; anywhere earlier it belongs to the host:port. A digest
 * (`repo@sha256:…`) is stripped first, so the function is total over every ref shape we build.
 */
export function imageRepo(ref: string): string {
	const withoutDigest = ref.split("@")[0] ?? ref;
	const lastColon = withoutDigest.lastIndexOf(":");
	const lastSlash = withoutDigest.lastIndexOf("/");
	return lastColon > lastSlash ? withoutDigest.slice(0, lastColon) : withoutDigest;
}

/** The bare package name of an image ref — `ghcr.io/org/image:v1` → `image`. This is the identifier
 *  the GHCR package API (and so the public-package guard) addresses a package by. Built on
 *  {@link imageRepo} so ref parsing stays in this one module rather than being re-derived by a caller. */
export function imageName(ref: string): string {
	const repo = imageRepo(ref);
	return repo.split("/").pop() ?? repo;
}

/** The digest of an already-pinned ref — `repo@sha256:…` → `sha256:…`; empty when `ref` carries no
 *  digest. The inverse of {@link digestPinnedRef}, for callers holding a ref that was pinned earlier
 *  and needing the bare digest back without a second registry lookup. */
export function imageDigest(ref: string): string {
	const at = ref.lastIndexOf("@");
	return at === -1 ? "" : ref.slice(at + 1);
}

/** Resolve a pushed `ref` to its immutable registry digest (`sha256:…`) via a registry-side inspect —
 *  no pull. The release records this so every phase pins/records the exact bytes the candidate push
 *  produced (provenance); the TOCTOU guard proper is promote's re-validation of the mutable candidate. */
export async function resolveImageDigest(ref: string): Promise<string> {
	// Parse the `Digest:` line from the default `imagetools inspect` output rather than a
	// `--format '{{.Manifest.Digest}}'` template: on the runner's buildx that template prints the whole
	// default descriptor block, so parsing the labelled line is the portable read. The first match is
	// the top-level manifest/index digest (the ref's digest); per-platform sub-digests, if any, follow.
	const proc = Bun.spawn(["docker", "buildx", "imagetools", "inspect", ref], {
		stdout: "pipe",
		stderr: "pipe",
		env: process.env,
	});
	const [code, stdout, stderr] = await Promise.all([
		proc.exited,
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	const match = stdout.match(/\bDigest:\s*(sha256:[0-9a-f]{64})\b/);
	// Distinguish the two failure modes: the inspect itself failed (non-zero exit — auth, network, no
	// such ref) vs. it SUCCEEDED but printed no digest we recognize (exit 0, no match), which means the
	// `imagetools inspect` output format changed under us. Same throw, but the message says which, so a
	// future format change isn't misread as a registry outage.
	if (code !== 0) {
		throw new Error(
			`could not resolve digest for ${ref}: imagetools inspect failed (exit ${code}): ${stderr.trim() || stdout.trim() || "no output"}`,
		);
	}
	if (!match) {
		throw new Error(
			`could not resolve digest for ${ref}: imagetools inspect succeeded but printed no 'Digest: sha256:…' line — the output format may have changed. Output: ${stdout.trim() || "(empty)"}`,
		);
	}
	return match[1] as string;
}

/** Whether `ref` already exists in the registry — a successful `docker manifest inspect`. Queries the
 *  registry (not local images), so a locally-built `:v1` tag never reads as published. promote uses
 *  this to REFUSE overwriting the immutable public version.
 *
 *  Only a genuine "manifest not found" reads as absent. An auth, rate-limit, or network failure also
 *  exits non-zero, but must NOT be mistaken for "not published" — that would bypass the immutability
 *  guard and let promote overwrite an existing `:v1`. So those throw, and the caller refuses to publish
 *  on an uncertain check rather than risk clobbering. */
export async function imageExistsInRegistry(ref: string): Promise<boolean> {
	const proc = Bun.spawn(["docker", "manifest", "inspect", ref], {
		stdout: "ignore",
		stderr: "pipe",
		env: process.env,
	});
	const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
	if (code === 0) return true;
	if (registryManifestAbsent(stderr)) return false;
	throw new Error(
		`docker manifest inspect ${ref} failed (exit ${code}): ${stderr.trim() || "unknown error"}`,
	);
}

/** Publish the validated candidate base as the immutable public version — a registry-side retag of
 *  the exact validated bytes, so `:v1` is the same image the candidate validate booted. */
export async function promoteImage(
	log: Log,
	source: string = config.toolchainImageCandidate,
	target: string = config.toolchainImageVersion,
): Promise<void> {
	await run(imagetoolsRetagCmd(source, target), log);
}
