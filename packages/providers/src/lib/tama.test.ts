import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import type { CliInvokeOptions, CliResult, TamaComputeOptions, TamaMachine } from "./tama.ts";
import {
	execCommandLine,
	newArgs,
	redactArgs,
	sandboxMethods,
	TAMA_CREATE_CEILING_MS,
} from "./tama.ts";

/** A `tama --json` machine record with only the fields the adapter reads. */
function machine(overrides: Partial<TamaMachine> = {}): TamaMachine {
	return {
		id: "m-test",
		name: "sandbox-benchmarks-test",
		status: "ready",
		cpu_millicores: 4_000,
		memory_mb: 8_192,
		image: "ghcr.io/starslingdev/toolchain:test",
		...overrides,
	};
}

function ok(stdout = ""): CliResult {
	return { stdout, stderr: "", exitCode: 0 };
}

/**
 * Drive the adapter with a scripted CLI: every spawn is recorded, and each subcommand answers from a
 * handler. Nothing here touches a real binary, a real clock or a real credential — `sleep` and `now`
 * are injected so a retry loop resolves instantly instead of holding the test for its real backoff.
 */
function harness(
	handlers: Partial<Record<string, (args: string[]) => Promise<CliResult>>>,
	options: TamaComputeOptions = {},
) {
	const calls: string[][] = [];
	const cli = async (args: string[], _invoke?: CliInvokeOptions): Promise<CliResult> => {
		calls.push(args);
		const handler = handlers[args[0] ?? ""];
		if (!handler) throw new Error(`unscripted tama call: ${args.join(" ")}`);
		return handler(args);
	};
	const methods = sandboxMethods({
		cli,
		token: () => "tok-test",
		sleep: async () => {},
		reconcileRetryMs: 0,
		cleanupRetryMs: 0,
		readyPollMs: 0,
		...options,
	});
	return { calls, methods, removed: () => calls.filter((c) => c[0] === "rm").length };
}

describe("tama CLI adapter", () => {
	it("creates with the pinned spec, a recovery name, and no idle expiry", async () => {
		const args = newArgs("sandbox-benchmarks-abc", {
			image: "ghcr.io/starslingdev/toolchain:test",
			cpu: 4,
			memory: 8192,
		});
		expect(args).toEqual([
			"new",
			"sandbox-benchmarks-abc",
			"--ttl",
			"0",
			"--json",
			"--image",
			"ghcr.io/starslingdev/toolchain:test",
			"--cpu",
			"4",
			"--memory",
			"8192",
		]);
	});

	// The leak this adapter exists to prevent: `new` exits 0 only once a machine is READY, so a zero
	// exit with an unusable record still means a billable machine — reconcile by the pre-chosen name and
	// adopt it rather than throwing away the handle.
	it("adopts the machine by name when a successful create returns no usable record", async () => {
		const created = machine({ name: "" });
		const { methods, calls } = harness({
			new: async (args) => {
				created.name = args[1] ?? "";
				return ok("{}"); // parses, carries no id/name
			},
			list: async () => ok(JSON.stringify([created])),
		});

		const result = await methods.create({} as never, { name: "sandbox-benchmarks" });
		expect(result.sandboxId).toBe("m-test");
		expect(calls.some((c) => c[0] === "list")).toBe(true);
		expect(created.name).toMatch(/^sandbox-benchmarks-/);
	});

	it("names the machine to look for when a no-record create cannot be reconciled", async () => {
		const { methods } = harness({
			new: async () => ok("[]"),
			list: async () => {
				throw new Error("control plane unavailable");
			},
			// The probe that precedes create fails too, so the adapter adopts the token first; the
			// reconciliation lookups are what stay unanswerable.
			login: async () => ok(),
		});
		await expect(methods.create({} as never, {})).rejects.toThrow(
			/unknown whether a machine was created; if one was it carries the name sandbox-benchmarks-/,
		);
	});

	it("reports an ANSWERED absence as nothing created", async () => {
		const { methods, removed } = harness({
			new: async () => ok("{}"),
			list: async () => ok("[]"),
		});
		await expect(methods.create({} as never, {})).rejects.toThrow(/so none was created/);
		expect(removed()).toBe(0);
	});

	it("removes a machine that never reaches ready, and retries an ambiguous rm", async () => {
		let rmCalls = 0;
		const stuck = machine({ status: "creating" });
		// A clock that ADVANCES: the readiness loop is bounded by wall time, so a frozen `now` would
		// spin forever against an injected sleep that returns instantly.
		let clock = 0;
		const { methods } = harness(
			{
				new: async () => ok(JSON.stringify(stuck)),
				list: async () => ok(JSON.stringify([stuck])),
				rm: async () => {
					rmCalls++;
					if (rmCalls === 1) return { stdout: "", stderr: "gateway timeout", exitCode: 1 };
					return ok();
				},
			},
			{
				readyTimeoutMs: 30_000,
				now: () => {
					clock += 10_000;
					return clock;
				},
			},
		);
		await expect(methods.create({} as never, {})).rejects.toThrow(/not ready/);
		// The first rm was ambiguous, so teardown re-asked instead of assuming the machine was gone.
		expect(rmCalls).toBe(2);
	});

	it("surfaces an unremovable machine rather than dropping it silently", async () => {
		let clock = 0;
		const stuck = machine({ status: "creating" });
		const { methods, removed } = harness(
			{
				new: async () => ok(JSON.stringify(stuck)),
				list: async () => ok(JSON.stringify([stuck])),
				rm: async () => ({ stdout: "", stderr: "gateway timeout", exitCode: 1 }),
			},
			{
				readyTimeoutMs: 30_000,
				cleanupAttempts: 3,
				now: () => {
					clock += 10_000;
					return clock;
				},
			},
		);
		await expect(methods.create({} as never, {})).rejects.toThrow(/manual cleanup may be required/);
		expect(removed()).toBe(3);
	});

	// The credential must not reach a message: these travel into gap markers, annotations, the job
	// summary and the retained Run document.
	it("redacts a token from any diagnostic that quotes the argument vector", async () => {
		expect(redactArgs(["login", "--token", "secret-value"])).toBe("login --token <redacted>");

		const { methods } = harness({
			list: async () => {
				throw new Error("not logged in");
			},
			login: async () => ({ stdout: "", stderr: "invalid token", exitCode: 1 }),
		});
		const error = await methods.create({} as never, {}).catch((e: unknown) => e);
		expect(String(error)).toContain("<redacted>");
		expect(String(error)).not.toContain("tok-test");
	});

	it("exports env vars for the whole command line, builtins and chained steps included", () => {
		expect(execCommandLine("cd /repo && make", { env: { FOO: "a b" } })).toBe(
			"export FOO='a b'; cd /repo && make",
		);
		expect(execCommandLine("echo hi")).toBe("echo hi");
		expect(() => execCommandLine("echo hi", { env: { "BAD;rm -rf /": "x" } })).toThrow(
			/not a valid environment variable name/,
		);
	});

	it("declares a create ceiling that covers every bounded call on the longest path", () => {
		// 20m create + 5 reconcile lookups (+waits) + a 5m readiness window whose last lookup can start
		// just inside it + 5 cleanup attempts of two calls each (+waits).
		const controlPlane = 60_000;
		expect(TAMA_CREATE_CEILING_MS).toBe(
			20 * 60_000 +
				5 * controlPlane +
				4 * 2_000 +
				5 * 60_000 +
				3_000 +
				controlPlane +
				5 * 2 * controlPlane +
				4 * 2_000,
		);
		// It is the retry loop's reservation against a 60-minute budget: an attempt plus a 2-minute
		// backoff has to still fit, or the cell could never retry a transient capacity failure.
		expect(TAMA_CREATE_CEILING_MS + 2 * 60_000).toBeLessThan(60 * 60_000);
	});
});

// `config` freezes the binary at module load, so these run the resolution in a FRESH subprocess per
// case — the same shape as the VCR namespace probes next door, and the only way to reproduce what CI
// actually does: `TAMA_CLI: ${{ … || '' }}` exports the key SET AND EMPTY when no override is
// configured. A `??` fallback accepts that empty string, and `spawn("")` is a TypeError thrown before
// the first control-plane call — every tama cell of matrix run 33712242440 died there.
describe.concurrent("tama binary resolution", () => {
	const CONFIG_PATH = join(import.meta.dir, "..", "config.ts");
	const PROBE = `const { config } = await import(${JSON.stringify(CONFIG_PATH)});
console.log(JSON.stringify({ tamaCli: config.tamaCli }));`;

	/** Load config in a clean subprocess. `null` unsets the key rather than blanking it. */
	async function resolveBinary(value: string | null): Promise<string | undefined> {
		// Drop the ambient key so a developer who exports it can't decide these cases.
		const { TAMA_CLI: _ambient, ...env } = process.env;
		if (value !== null) env.TAMA_CLI = value;
		const proc = Bun.spawn(["bun", "-e", PROBE], { env, stdout: "pipe", stderr: "pipe" });
		const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
		return exitCode === 0 ? (JSON.parse(stdout) as { tamaCli: string }).tamaCli : undefined;
	}

	it("falls back to the PATH-resolved name when the override is unset", async () => {
		expect(await resolveBinary(null)).toBe("tama");
	});

	it("treats a set-but-empty override as unset rather than spawning nothing", async () => {
		expect(await resolveBinary("")).toBe("tama");
	});

	it("honors an explicit override", async () => {
		expect(await resolveBinary("/opt/tama/bin/tama")).toBe("/opt/tama/bin/tama");
	});
});
