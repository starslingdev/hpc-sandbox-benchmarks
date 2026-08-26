import { describe, expect, test } from "bun:test";
import type { ExecOptions, SandboxSession } from "@sandbox-benchmarks/driver";
import { REGISTRY, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { driverTransport, resolveDriverArtifact, sessionHandle } from "./driver-run.ts";

/** A session with only the three required members; `files` and `launch` are deliberately absent. */
function bareSession(
	exec: (
		command: string,
		options?: ExecOptions,
	) => Promise<Awaited<ReturnType<SandboxSession["exec"]>>>,
	overrides: Partial<SandboxSession> = {},
): SandboxSession {
	return {
		sandboxRef: { provider: "e2b", id: "isandbox" },
		artifact: { kind: "baked", ref: "template" },
		native: undefined,
		exec,
		destroy: async () => {},
		...overrides,
	};
}

const okResult = (stdout = "", stderr = "") => ({
	exit: { kind: "exited", code: 0 } as const,
	stdout,
	stderr,
	durationMs: 1,
	truncated: false,
});

describe("resolveDriverArtifact", () => {
	test("derives a baked provider's ref from the registry, per phase", () => {
		const version = resolveDriverArtifact("e2b");
		const candidate = resolveDriverArtifact("e2b", { phase: "candidate" });
		expect(version).toEqual({
			kind: "baked",
			ref: `sandbox-benchmarks-toolchain-${TOOLCHAIN_VERSION}`,
		});
		expect(candidate.kind).toBe("baked");
		expect("ref" in candidate && candidate.ref.endsWith("-candidate")).toBe(true);
	});

	test("derives an image provider's ref from the toolchain leaf", () => {
		const resolved = resolveDriverArtifact("tama");
		expect(resolved).toEqual({
			kind: "image",
			ref: `ghcr.io/starslingdev/sandbox-benchmarks-toolchain:${TOOLCHAIN_VERSION}`,
		});
	});

	test("an explicit ref overrides the derived default", () => {
		expect(resolveDriverArtifact("e2b", { ref: "my-template" })).toEqual({
			kind: "baked",
			ref: "my-template",
		});
	});

	test("rejects a ref for a provider that boots stock", () => {
		const stock = Object.keys(REGISTRY).find(
			(id) => REGISTRY[id as keyof typeof REGISTRY].artifact.kind === "none",
		);
		expect(stock).toBeDefined();
		expect(() =>
			resolveDriverArtifact(stock as Parameters<typeof resolveDriverArtifact>[0], { ref: "x" }),
		).toThrow(/cannot boot ref/);
	});

	test("a mirrored artifact cannot be resolved without an explicit ref", () => {
		expect(() => resolveDriverArtifact("vercel")).toThrow(/pass an explicit ref/);
		expect(resolveDriverArtifact("vercel", { ref: "vcr/image:v8" })).toEqual({
			kind: "mirror",
			ref: "vcr/image:v8",
		});
	});
});

describe("driverTransport", () => {
	test("a declared durable route becomes detachedPoll, and the cap crosses unchanged", () => {
		expect(driverTransport({ syncCapMs: 60_000, durable: "native-launch" })).toEqual({
			streaming: false,
			syncCapMs: 60_000,
			detachedPoll: true,
		});
		expect(driverTransport({ syncCapMs: 60_000, durable: "shell-detach" }).detachedPoll).toBe(true);
	});

	test("durable none is the only shape that disables the detached transport", () => {
		expect(driverTransport({ syncCapMs: null, durable: "none" })).toEqual({
			streaming: false,
			syncCapMs: null,
			detachedPoll: false,
		});
	});
});

describe("sessionHandle", () => {
	test("omits filesystem entirely when the session exposes none", () => {
		const handle = sessionHandle(bareSession(async () => okResult()));
		// Capability-by-presence: the detached poll must see `undefined`, never a throwing stub.
		expect(handle.filesystem).toBeUndefined();
		expect("filesystem" in handle).toBe(false);
	});

	test("exposes filesystem when the session has a working one", async () => {
		const handle = sessionHandle(
			bareSession(async () => okResult(), {
				files: {
					readFile: async () => "contents",
					exists: async () => true,
					writeText: async () => {},
				},
			}),
		);
		expect(await handle.filesystem?.readFile("/tmp/x")).toBe("contents");
		expect(await handle.filesystem?.exists("/tmp/x")).toBe(true);
	});

	test("carries the guest's real exit code through", async () => {
		const handle = sessionHandle(
			bareSession(async () => ({ ...okResult("out", "err"), exit: { kind: "exited", code: 7 } })),
		);
		expect(await handle.runCommand("sh -c 'exit 7'")).toEqual({
			stdout: "out",
			stderr: "err",
			exitCode: 7,
		});
	});

	test("preserves a withheld exit code as evidence rather than a bare 1", async () => {
		const handle = sessionHandle(
			bareSession(async () => ({
				...okResult(),
				exit: { kind: "unknown", detail: "vendor omitted status" },
			})),
		);
		const result = await handle.runCommand("sh -c true");
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("vendor omitted status");
	});

	test("maps a signalled outcome onto a failure that names the signal", async () => {
		const handle = sessionHandle(
			bareSession(async () => ({ ...okResult(), exit: { kind: "signalled", signal: "SIGKILL" } })),
		);
		const result = await handle.runCommand("sh -c 'kill -9 $$'");
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("SIGKILL");
	});

	test("a background request uses the session's native launch when present", async () => {
		const launched: string[] = [];
		const handle = sessionHandle(
			bareSession(
				async () => {
					throw new Error("exec must not run a background command");
				},
				{
					launch: async (command) => {
						launched.push(command);
					},
				},
			),
		);
		expect(await handle.runCommand("long-job", { background: true })).toEqual({
			stdout: "",
			stderr: "",
			exitCode: 0,
		});
		expect(launched).toEqual(["long-job"]);
	});

	test("a background request falls back to the kit's detach when launch is absent", async () => {
		const commands: string[] = [];
		const handle = sessionHandle(
			bareSession(async (command) => {
				commands.push(command);
				return okResult();
			}),
		);
		await handle.runCommand("long-job", { background: true });
		expect(commands).toHaveLength(1);
		expect(commands[0]).toContain("nohup");
		expect(commands[0]).toContain("long-job");
	});
});
