import { describe, expect, test } from "bun:test";
import type { SandboxRef } from "./port.ts";
import { parseCreateRequest, sandboxRef, sandboxRefSchema, succeeded } from "./port.ts";

// Minimal type-level assertion helpers.
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

describe("sandboxRef", () => {
	test("accepts each provider's id in its own format", () => {
		expect(sandboxRef("modal-gvisor", "sb-abc123")).toEqual({ provider: "modal-gvisor", id: "sb-abc123" });
		expect(sandboxRef("daytona-vm", "8f14e45f-ceea-4b16-a2b8-3c1e5f2a9d01").id).toBe(
			"8f14e45f-ceea-4b16-a2b8-3c1e5f2a9d01",
		);
		expect(sandboxRef("e2b", "i2f3k4abc").id).toBe("i2f3k4abc");
		expect(sandboxRef("runloop", "dbx_9f8e7d").id).toBe("dbx_9f8e7d");
		expect(sandboxRef("vercel", "sbx_1a2b3c").id).toBe("sbx_1a2b3c");
		expect(sandboxRef("tama", "m-1").id).toBe("m-1");
	});

	test("rejects an id in the wrong format for the provider, naming the pattern", () => {
		expect(() => sandboxRef("modal-gvisor", "vm-abc123")).toThrow(
			/invalid sandbox ref: id must be matched by \^sb-\\w\+\$ \(was "vm-abc123"\)/,
		);
		expect(() => sandboxRef("e2b", "sb-abc123")).toThrow(/id must be matched by \^i\[a-z0-9\]\+\$/);
		expect(() => sandboxRef("daytona-vm", "not-a-uuid")).toThrow(/id must be matched by/);
		expect(() => sandboxRef("tama", "")).toThrow(/invalid sandbox ref/);
		expect(() => sandboxRef("tama", "has spaces")).toThrow(/invalid sandbox ref/);
	});

	test("the schema rejects an unregistered provider outright", () => {
		const parsed = sandboxRefSchema({ provider: "not-a-provider", id: "x" });
		expect(String(parsed)).toContain("provider must be");
	});

	test("the id types are narrowed per provider, statically", () => {
		// arkregex parses the pattern at the type level: Modal ids ARE `sb-${string}`.
		type _modal = Expect<Equal<SandboxRef<"modal-gvisor">["id"], `sb-${string}`>>;
		type _runloop = Expect<Equal<SandboxRef<"runloop">["id"], `dbx_${string}`>>;
		type _provider = Expect<Equal<SandboxRef<"tama">["provider"], "tama">>;
		const modal = sandboxRef("modal-gvisor", "sb-abc");
		// @ts-expect-error — a modal ref's id is `sb-${string}`, not any string
		const wrong: SandboxRef<"modal-gvisor">["id"] = "vm-abc";
		void wrong;
		const ok: `sb-${string}` = modal.id;
		void ok;
		expect(true).toBe(true); // the assertions above are compile-time; typecheck is the oracle
	});
});

describe("parseCreateRequest", () => {
	const valid = {
		spec: { vcpus: 4, memoryGb: 8 },
		artifactRef: "im-abc123",
		deadlineMs: 60_000,
		gpu: { model: "H100", count: 1 },
	};

	test("returns the parsed request (registry-unit spec reused, not re-declared)", () => {
		const request = parseCreateRequest(valid);
		expect(request.spec.memoryGb).toBe(8);
		expect(request.gpu?.model).toBe("H100");
	});

	test("rejects DEEP undeclared keys — nested misspellings included", () => {
		expect(() =>
			parseCreateRequest({ ...valid, spec: { vcpus: 4, memroyGb: 8 } }),
		).toThrow(/spec\.memroyGb must be removed/);
		expect(() =>
			parseCreateRequest({ ...valid, gpu: { model: "H100", count: 1, cout: 2 } }),
		).toThrow(/gpu\.cout must be removed/);
		expect(() => parseCreateRequest({ ...valid, deadlienMs: 1 })).toThrow(/deadlienMs must be removed/);
	});

	test("rejects non-positive and malformed values with path-bearing messages", () => {
		expect(() => parseCreateRequest({ ...valid, spec: { vcpus: -1, memoryGb: 8 } })).toThrow(
			/spec\.vcpus must be/,
		);
		expect(() => parseCreateRequest({ ...valid, artifactRef: "" })).toThrow(/artifactRef/);
		expect(() => parseCreateRequest({ ...valid, deadlineMs: 0 })).toThrow(/deadlineMs/);
		expect(() => parseCreateRequest({ ...valid, gpu: { model: "", count: 1 } })).toThrow(/gpu\.model/);
	});

	test("gpu and env are genuinely optional", () => {
		const request = parseCreateRequest({
			spec: { vcpus: 2, memoryGb: 4, diskGb: 40 },
			artifactRef: "registry.example/toolchain:1",
			deadlineMs: 1_000,
		});
		expect(request.gpu).toBeUndefined();
		expect(request.spec.diskGb).toBe(40);
	});
});

describe("succeeded", () => {
	test("only a zero exited code succeeds", () => {
		expect(succeeded({ kind: "exited", code: 0 })).toBe(true);
		expect(succeeded({ kind: "exited", code: 7 })).toBe(false);
		expect(succeeded({ kind: "signalled", signal: "KILL" })).toBe(false);
		expect(succeeded({ kind: "unknown", detail: "no code" })).toBe(false);
	});
});
