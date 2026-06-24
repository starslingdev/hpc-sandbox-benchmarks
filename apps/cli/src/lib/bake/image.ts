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
