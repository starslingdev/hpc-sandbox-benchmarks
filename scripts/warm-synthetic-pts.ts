#!/usr/bin/env bun
/**
 * Pre-install Phoronix Test Suite profiles used by the synthetic host suites so
 * `mise run benchmark:{cpu:node,disk:all,network:suite,memory:all,system:all}` spend wall time on
 * measurement, not download/compile.
 *
 * Bun-native orchestration (fetch/hash/fs + `Bun.spawn` for PTS). Calls into `lib/bench.sh` only for
 * `ensure_pts` (apt + batch-setup), which is inherently shell. Idempotent: already-installed
 * profiles are skipped. Needs sudo for the first-time PTS apt path.
 *
 * Intentionally NOT part of the Cursor Cloud startup update script — a cold warm can take many
 * minutes (git ~450 MB, fio/iperf/stream compiles). Run once when building the cloud VM snapshot:
 *
 *   SUDO=sudo bun scripts/warm-synthetic-pts.ts
 *   # or: bun run warm:synthetic-pts
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const REPO_ROOT = `${import.meta.dir}/..`;

/** Profiles the synthetic suite leaves batch-run (version-pinned to the mise tasks). */
const PTS_TARGETS = [
	"pts/pybench-1.1.3",
	"pts/sqlite-speedtest-1.0.1",
	"pts/fio-2.1.0",
	"pts/network-loopback-1.0.3",
	"pts/iperf-1.2.0",
	"pts/stream-1.3.4",
	"pts/node-web-tooling-1.0.1",
	"pts/fast-cli-1.0.0",
	"pts/git-1.1.0",
	"local/hardlink-1.0.0",
	"local/iperf-wan-1.0.0",
] as const;

const VENDORED_OVERRIDES = ["iperf-1.2.0", "network-loopback-1.0.3", "fast-cli-1.0.0"] as const;
const LOCAL_PROFILES = ["hardlink-1.0.0", "iperf-wan-1.0.0"] as const;
const REQUIRED_BINS = ["stress-ng", "nc", "jq", "php"] as const;

const IPERF_SEED = {
	filename: "iperf-3.14.tar.gz",
	sha256: "723fcc430a027bc6952628fa2a3ac77584a1d0bd328275e573fc9b206c155004",
	urls: [
		"https://downloads.es.net/pub/iperf/iperf-3.14.tar.gz",
		"https://sources.buildroot.net/iperf3/iperf-3.14.tar.gz",
	],
} as const;

/** OpenBenchmarking pins brick.kernel.dk (often down); Ubuntu orig tarball is byte-identical. */
const FIO_SEED = {
	filename: "fio-3.36.tar.gz",
	sha256: "0a07354876ca4d23518f8aa88682f23866455bbd2ff2d0f055d6e4b72f156553",
	urls: [
		"http://archive.ubuntu.com/ubuntu/pool/universe/f/fio/fio_3.36.orig.tar.gz",
		"https://launchpad.net/ubuntu/+archive/primary/+sourcefiles/fio/3.36-1/fio_3.36.orig.tar.gz",
		"https://web.archive.org/web/2020/http://brick.kernel.dk/snaps/fio-3.36.tar.gz",
	],
} as const;

const STREAM_ARRAY_SIZE = 150_000_000;

function have(bin: string): boolean {
	return Bun.which(bin) !== null;
}

async function run(
	cmd: string[],
	opts: { cwd?: string; env?: Record<string, string>; inherit?: boolean } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn(cmd, {
		cwd: opts.cwd ?? REPO_ROOT,
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

async function ensurePts(): Promise<void> {
	const sudo = process.env.SUDO ?? "";
	const script = [
		`cd ${JSON.stringify(REPO_ROOT)}`,
		"source lib/bench.sh",
		sudo ? `SUDO=${JSON.stringify(sudo)} ensure_pts` : "ensure_pts",
	].join(" && ");
	const { code } = await run(["bash", "-c", script], { inherit: true });
	if (code !== 0) {
		throw new Error("ensure_pts could not make phoronix-test-suite available");
	}
}

/** Mirrors `pts_init` + `pts_user_dir` from lib/bench.sh for the current process user. */
async function ptsUserDir(): Promise<string> {
	await run(["phoronix-test-suite", "system-info"]);
	const home = process.env.HOME ?? homedir();
	const override = process.env.PTS_USER_PATH_OVERRIDE;
	const candidates = [
		override,
		join(home, ".phoronix-test-suite"),
		"/var/lib/phoronix-test-suite",
		"/root/.phoronix-test-suite",
	].filter((p): p is string => Boolean(p));
	for (const cand of candidates) {
		const marker = join(cand, "core.pt2so");
		if (await Bun.file(marker).exists()) {
			return cand.replace(/\/$/, "");
		}
	}
	return (override || join(home, ".phoronix-test-suite")).replace(/\/$/, "");
}

function ptsInstallRoot(userDir: string): string {
	const fromEnv = process.env.PTS_TEST_INSTALL_ROOT_PATH;
	if (fromEnv) return fromEnv.replace(/\/$/, "");
	return join(userDir, "installed-tests");
}

async function listInstalledTests(): Promise<Set<string>> {
	const { code, stdout } = await run(["phoronix-test-suite", "list-installed-tests"]);
	if (code !== 0) return new Set();
	const ids = new Set<string>();
	for (const line of stdout.split("\n")) {
		const id = line.trim().split(/\s+/)[0];
		if (id?.includes("/")) ids.add(id);
	}
	return ids;
}

function isSafeProfileName(name: string): boolean {
	return /^[a-z0-9][a-z0-9._-]*$/.test(name);
}

async function sha256File(path: string): Promise<string> {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(await Bun.file(path).arrayBuffer());
	return hasher.digest("hex");
}

async function seedDownloadCache(
	userDir: string,
	filename: string,
	sha256: string,
	urls: readonly string[],
): Promise<void> {
	const cache = join(userDir, "download-cache");
	mkdirSync(cache, { recursive: true });
	const dest = join(cache, filename);
	if (existsSync(dest) && (await sha256File(dest)) === sha256) {
		console.log(`PTS download cache already holds ${filename} (sha256 verified)`);
		return;
	}
	const tmp = join(cache, `.${filename}.part`);
	for (const url of urls) {
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			await Bun.write(tmp, res);
			if ((await sha256File(tmp)) !== sha256) {
				rmSync(tmp, { force: true });
				console.warn(`WARNING: checksum mismatch for ${filename} from ${url}`);
				continue;
			}
			rmSync(dest, { force: true });
			const moved = await run(["mv", tmp, dest]);
			if (moved.code !== 0) throw new Error(moved.stderr || "mv failed");
			console.log(`Seeded PTS download cache: ${filename} <- ${url}`);
			return;
		} catch (err) {
			rmSync(tmp, { force: true });
			console.warn(
				`WARNING: could not seed ${filename} from ${url} (${err instanceof Error ? err.message : String(err)}; trying next source, else PTS's own downloader)`,
			);
		}
	}
}

async function installLocalProfile(userDir: string, name: string): Promise<void> {
	if (!isSafeProfileName(name)) throw new Error(`invalid local profile name: ${name}`);
	const src = join(REPO_ROOT, "packages/schema/src/pts-profiles/local", name);
	if (!existsSync(src)) throw new Error(`local profile not found: ${src}`);
	const dst = join(userDir, "test-profiles/local", name);
	mkdirSync(dirname(dst), { recursive: true });
	rmSync(dst, { recursive: true, force: true });
	cpSync(src, dst, { recursive: true });
	console.log(`Installed local PTS profile: ${dst} (PTS data dir: ${userDir})`);
}

async function installVendoredProfile(
	userDir: string,
	installRoot: string,
	name: string,
): Promise<void> {
	if (!isSafeProfileName(name)) throw new Error(`invalid vendored profile name: ${name}`);
	const src = join(REPO_ROOT, "packages/schema/src/pts-profiles", name);
	if (!existsSync(src)) throw new Error(`vendored profile not found: ${src}`);
	const profileDst = join(userDir, "test-profiles/pts", name);
	const installedDst = join(installRoot, "pts", name);
	mkdirSync(dirname(profileDst), { recursive: true });
	rmSync(profileDst, { recursive: true, force: true });
	cpSync(src, profileDst, { recursive: true });
	rmSync(installedDst, { recursive: true, force: true });
	if (existsSync(installedDst)) {
		throw new Error(`vendored restage left installed tree at ${installedDst}`);
	}
	console.log(`Staged vendored PTS override: ${profileDst} (removed ${installedDst})`);
}

function streamCflagsOverride(): string {
	const version = (() => {
		try {
			return readFileSync("/proc/version", "utf8");
		} catch {
			return "";
		}
	})();
	const march = /gvisor/i.test(version) ? "x86-64-v3" : "native";
	return `-O3 -march=${march} -DSTREAM_ARRAY_SIZE=${STREAM_ARRAY_SIZE}`;
}

function stampPath(): string {
	return join(homedir(), ".cache/sandbox-benchmarks/synthetic-pts-warm.stamp");
}

async function main(): Promise<void> {
	console.log("========================================");
	console.log("  Warm synthetic PTS profiles (host VM)");
	console.log("========================================");

	await ensurePts();

	const missing = REQUIRED_BINS.filter((b) => !have(b));
	if (missing.length > 0) {
		throw new Error(
			`missing required tools: ${missing.join(" ")} — ensure_pts should have installed these; re-run with SUDO=sudo`,
		);
	}

	const userDir = await ptsUserDir();
	const installRoot = ptsInstallRoot(userDir);

	await seedDownloadCache(userDir, IPERF_SEED.filename, IPERF_SEED.sha256, IPERF_SEED.urls);
	await seedDownloadCache(userDir, FIO_SEED.filename, FIO_SEED.sha256, FIO_SEED.urls);

	for (const name of LOCAL_PROFILES) {
		await installLocalProfile(userDir, name);
	}

	let installed = await listInstalledTests();
	for (const name of VENDORED_OVERRIDES) {
		const id = `pts/${name}`;
		if (installed.has(id)) {
			console.log(`already installed: ${id} (skip vendored restage)`);
		} else {
			await installVendoredProfile(userDir, installRoot, name);
		}
	}

	const cflags = streamCflagsOverride();
	const toInstall: string[] = [];
	installed = await listInstalledTests();
	for (const t of PTS_TARGETS) {
		if (installed.has(t)) {
			console.log(`already installed: ${t}`);
			continue;
		}
		// INSTALL_FAILED tombstones confuse retries — discard incomplete trees first.
		if (t.startsWith("pts/")) {
			rmSync(join(installRoot, "pts", t.slice(4)), { recursive: true, force: true });
		} else if (t.startsWith("local/")) {
			rmSync(join(installRoot, "local", t.slice(6)), { recursive: true, force: true });
		}
		toInstall.push(t);
	}

	if (toInstall.length === 0) {
		console.log("All synthetic PTS profiles already installed.");
	} else {
		console.log(`batch-install: ${toInstall.join(" ")}`);
		await run(["phoronix-test-suite", "batch-install", ...toInstall], {
			inherit: true,
			env: { CFLAGS_OVERRIDE: cflags },
		});
	}

	installed = await listInstalledTests();
	const failed: string[] = [];
	for (const t of PTS_TARGETS) {
		if (installed.has(t)) {
			console.log(`OK  ${t}`);
		} else {
			console.error(`MISSING  ${t}`);
			failed.push(t);
		}
	}
	if (failed.length > 0) {
		throw new Error(`warm incomplete — missing: ${failed.join(" ")}`);
	}

	const stamp = stampPath();
	mkdirSync(dirname(stamp), { recursive: true });
	writeFileSync(stamp, `${new Date().toISOString()}\n`);

	console.log("");
	console.log("Warm complete. Synthetic suite entrypoints:");
	console.log("  mise run benchmark:cpu:node");
	console.log("  mise run benchmark:disk:all");
	console.log("  mise run benchmark:network:suite");
	console.log("  mise run benchmark:memory:all");
	console.log("  mise run benchmark:system:all");
	console.log("");
	await run(["phoronix-test-suite", "list-installed-tests"], { inherit: true });
}

if (import.meta.main) {
	try {
		await main();
	} catch (err) {
		console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(1);
	}
}
