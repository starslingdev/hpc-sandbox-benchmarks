// Build the toolchain images and push the *candidate* base to GHCR. daytona (snapshot source) and
// modal (Image.fromRegistry) boot the base image by ref, and e2b/novita build remotely from its
// digest-pinned registry ref, so the candidate base must be pushed before any provider bake.
// The public `:v1` is never pushed here — that is promote's job.
import { join } from "node:path";
import { config } from "@sandbox-benchmarks/providers";
import type { Log } from "./types.ts";
import type { CandidateRefs } from "./validate.ts";

// Anchored to this file (not cwd): the `bake` package script runs from apps/cli, where a
// repo-relative path would resolve to the non-existent apps/cli/packages/... and fail in bash.
const BUILD_SH = join(import.meta.dir, "../../../../../packages/templates/images/build.sh");

async function run(cmd: string[], log: Log): Promise<void> {
	log(`$ ${cmd.join(" ")}`);
	const proc = Bun.spawn(cmd, { stdout: "inherit", stderr: "inherit", env: process.env });
	const code = await proc.exited;
	if (code !== 0) throw new Error(`${cmd[0]} exited ${code}`);
}

/** build.sh (base + variants, tagged `:dev` and `:v1`) → retag base `:v1`→`:v1-candidate` → push the
 *  candidate. Idempotent: the candidate tag is mutable and simply overwritten each run.
 *
 *  A plain `docker push` publishes a bare image manifest, while the public version is a one-platform
 *  image index produced by `imagetools create`. Daytona's registry importer rejects the bare
 *  candidate with an opaque inspection error even when its total compressed size is below the
 *  accepted public image. Normalize the mutable candidate to the same envelope before providers
 *  consume it; the config and layers stay byte-identical. */
export async function buildAndPushCandidate(log: Log): Promise<void> {
	await run(["bash", BUILD_SH], log);
	await run(["docker", "tag", config.toolchainImageVersion, config.toolchainImageCandidate], log);
	await run(["docker", "push", config.toolchainImageCandidate], log);
	await run(imagetoolsNormalizeCmd(config.toolchainImageCandidate), log);
}

/** The full {@link CandidateRefs} bundle for `pinnedCandidateImage` (the base's digest-pinned
 *  candidate ref) — every provider's candidate-artifact identity, resolved from config. Shared by
 *  bake.ts (validate right after baking) and promote.ts (re-validate right before publish) so the
 *  two call sites can't drift out of sync with each other or with a newly added provider ref. */
export function buildCandidateRefs(pinnedCandidateImage: string): CandidateRefs {
	return {
		e2bTemplateCandidate: config.e2bTemplateCandidate,
		daytonaSnapshotCandidate: config.daytonaSnapshotCandidate,
		novitaTemplateCandidate: config.novitaTemplateCandidate,
		toolchainImageCandidate: pinnedCandidateImage,
		toolchainImageBlaxelCandidate: config.toolchainImageBlaxelCandidate,
		daytonaTarget: config.daytona.target,
	};
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
): Promise<void> {
	await run(imagetoolsRetagCmd(source, config.toolchainImageVersion), log);
}
