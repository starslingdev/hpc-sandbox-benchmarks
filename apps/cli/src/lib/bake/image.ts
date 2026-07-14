// Build the toolchain images and push the *candidate* base to GHCR. daytona (snapshot source) and
// modal (Image.fromRegistry) boot the base image by ref, so the candidate base must be pushed;
// e2b builds its template from the local `:dev` base that build.sh produces, so it needs no push.
// The public `:v1` is never pushed here — that is promote's job.
import { join } from "node:path";
import { config } from "@sandbox-benchmarks/providers";
import type { Log } from "./types.ts";

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
 *  candidate. Idempotent: the candidate tag is mutable and simply overwritten each run. */
export async function buildAndPushCandidate(log: Log): Promise<void> {
	await run(["bash", BUILD_SH], log);
	await run(["docker", "tag", config.toolchainImageVersion, config.toolchainImageCandidate], log);
	await run(["docker", "push", config.toolchainImageCandidate], log);
}

/** Pure: the buildx command that retags one pushed image ref to another registry-side (no pull). */
export function imagetoolsRetagCmd(from: string, to: string): string[] {
	return ["docker", "buildx", "imagetools", "create", "-t", to, from];
}

/** Resolve a pushed `ref` to its immutable registry digest (`sha256:…`) via a registry-side inspect —
 *  no pull. The release records this so every phase pins/records the exact bytes the candidate push
 *  produced (provenance); the TOCTOU guard proper is promote's re-validation of the mutable candidate. */
export async function resolveImageDigest(ref: string): Promise<string> {
	const proc = Bun.spawn(
		["docker", "buildx", "imagetools", "inspect", ref, "--format", "{{.Manifest.Digest}}"],
		{ stdout: "pipe", stderr: "pipe", env: process.env },
	);
	const [code, stdout, stderr] = await Promise.all([
		proc.exited,
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	const digest = stdout.trim();
	if (code !== 0 || !/^sha256:[0-9a-f]{64}$/.test(digest)) {
		throw new Error(
			`could not resolve digest for ${ref} (exit ${code}): ${digest || stderr.trim() || "no digest"}`,
		);
	}
	return digest;
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
	if (/no such manifest|manifest unknown|not found/i.test(stderr)) return false;
	throw new Error(
		`docker manifest inspect ${ref} failed (exit ${code}): ${stderr.trim() || "unknown error"}`,
	);
}

/** Publish the validated candidate base as the immutable public version — a registry-side retag of
 *  the exact validated bytes, so `:v1` is the same image the candidate validate booted. */
export async function promoteImage(log: Log): Promise<void> {
	await run(imagetoolsRetagCmd(config.toolchainImageCandidate, config.toolchainImageVersion), log);
}
