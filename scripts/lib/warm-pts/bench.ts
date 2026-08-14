/**
 * Thin Bun wrappers around `lib/bench.sh` PTS helpers so warm staging stays one implementation
 * (bash) rather than re-coding pts_user_dir / install / seed paths in TypeScript.
 */
import { log } from "./log.ts";

export type SpawnResult = { code: number; stdout: string; stderr: string };

export async function spawnCmd(
	cmd: string[],
	opts: {
		cwd: string;
		env?: Record<string, string>;
		inherit?: boolean;
	},
): Promise<SpawnResult> {
	log.debug(`spawn: ${cmd.map((c) => JSON.stringify(c)).join(" ")}`);
	const proc = Bun.spawn(cmd, {
		cwd: opts.cwd,
		env: opts.env ? { ...process.env, ...opts.env } : process.env,
		stdout: opts.inherit ? "inherit" : "pipe",
		stderr: opts.inherit ? "inherit" : "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		opts.inherit ? Promise.resolve("") : new Response(proc.stdout).text(),
		opts.inherit ? Promise.resolve("") : new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { code, stdout, stderr };
}

function shellQuote(value: string): string {
	return JSON.stringify(value);
}

/** `source lib/bench.sh` then run one helper with string args (SUDO honored for ensure_pts). */
export async function runBenchHelper(
	root: string,
	helper: string,
	args: readonly string[],
	opts: { inherit?: boolean; env?: Record<string, string> } = {},
): Promise<SpawnResult> {
	const sudo = process.env.SUDO ?? "";
	const assigns = helper === "ensure_pts" && sudo ? `SUDO=${shellQuote(sudo)} ` : "";
	const argv = args.map(shellQuote).join(" ");
	const script = [
		`cd ${shellQuote(root)}`,
		"source lib/bench.sh",
		`${assigns}${helper}${argv ? ` ${argv}` : ""}`,
	].join(" && ");
	return spawnCmd(["bash", "-c", script], {
		cwd: root,
		inherit: opts.inherit,
		env: opts.env,
	});
}

export async function ensurePts(root: string): Promise<void> {
	const { code } = await runBenchHelper(root, "ensure_pts", [], { inherit: true });
	if (code !== 0) {
		throw new Error(
			"ensure_pts could not make phoronix-test-suite available (re-run with SUDO=sudo)",
		);
	}
}

export async function seedPtsDownloadCache(
	root: string,
	filename: string,
	sha256: string,
	urls: readonly string[],
): Promise<void> {
	const { code, stderr } = await runBenchHelper(
		root,
		"seed_pts_download_cache",
		[filename, sha256, ...urls],
		{ inherit: true },
	);
	// bench.sh never fatals on seed failure (PTS downloader is the fallback) — still surface non-zero.
	if (code !== 0) {
		log.warn(`seed_pts_download_cache exited ${code}${stderr ? `: ${stderr.trim()}` : ""}`);
	}
}

export async function installLocalPtsProfile(root: string, name: string): Promise<void> {
	const { code, stderr } = await runBenchHelper(root, "install_local_pts_profile", [name], {
		inherit: true,
	});
	if (code !== 0) {
		throw new Error(`install_local_pts_profile ${name} failed: ${stderr.trim() || `exit ${code}`}`);
	}
}

export async function installVendoredPtsProfile(root: string, name: string): Promise<void> {
	const { code, stderr } = await runBenchHelper(root, "install_vendored_pts_profile", [name], {
		inherit: true,
	});
	if (code !== 0) {
		throw new Error(
			`install_vendored_pts_profile ${name} failed: ${stderr.trim() || `exit ${code}`}`,
		);
	}
}

export async function listInstalledTests(root: string): Promise<Set<string>> {
	const { code, stdout } = await spawnCmd(["phoronix-test-suite", "list-installed-tests"], {
		cwd: root,
	});
	if (code !== 0) return new Set();
	const ids = new Set<string>();
	for (const line of stdout.split("\n")) {
		const id = line.trim().split(/\s+/)[0];
		if (id?.includes("/")) ids.add(id);
	}
	return ids;
}

export async function batchInstall(
	root: string,
	targets: readonly string[],
	env: Record<string, string>,
): Promise<void> {
	if (targets.length === 0) return;
	log.info(`batch-install: ${targets.join(" ")}`);
	const { code } = await spawnCmd(["phoronix-test-suite", "batch-install", ...targets], {
		cwd: root,
		inherit: true,
		env,
	});
	if (code !== 0) {
		throw new Error(`phoronix-test-suite batch-install failed (exit ${code})`);
	}
}
