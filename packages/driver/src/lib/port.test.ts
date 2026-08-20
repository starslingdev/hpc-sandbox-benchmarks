import { describe, expect, test } from "bun:test";
import { DriverError } from "./errors.ts";
import type { SandboxRef } from "./port.ts";
import { parseCreateRequest, sandboxRef, sandboxRefSchema, succeeded } from "./port.ts";

// Minimal type-level assertion helpers.
type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

describe("sandboxRef", () => {
	test("accepts each provider's id in its own format", () => {
		const valid = [
			["e2b", "i2f3k4abc"],
			["daytona-vm", "8f14e45f-ceea-4b16-a2b8-3c1e5f2a9d01"],
			["daytona-container", "7c9e6679-7425-40de-944b-e07fc1f90ae7"],
			["blaxel", "sandbox-abc"],
			["microsandbox-local", "local-sandbox"],
			["microsandbox-cloud", "cloud-sandbox"],
			["modal-gvisor", "sb-abc123"],
			["modal-vm", "sb-def456"],
			["novita", "i9z8y7x6"],
			["runloop", "dbx_9f8e7d"],
			["namespace", "namespace-abc"],
			["vercel", "sandbox-benchmarks-abc123"],
			["runcloud", "sb-abc123"],
			["tama", "m-1"],
		] as const;

		for (const [provider, id] of valid) {
			const ref = sandboxRef(provider, id);
			expect(ref.provider).toBe(provider);
			expect(ref.id).toBe(id);
		}
	});

	test("rejects an id in the wrong format for the provider, naming the pattern", () => {
		expect(() => sandboxRef("modal-gvisor", "vm-abc123")).toThrow(
			/invalid sandbox ref: id must be matched by \^sb-\\w\+\$ \(was "vm-abc123"\)/,
		);
		expect(() => sandboxRef("e2b", "sb-abc123")).toThrow(/id must be matched by \^i\[a-z0-9\]\+\$/);
		expect(() => sandboxRef("daytona-vm", "not-a-uuid")).toThrow(/id must be a UUID/);
		expect(() => sandboxRef("tama", "")).toThrow(/invalid sandbox ref/);
		expect(() => sandboxRef("tama", "has spaces")).toThrow(/invalid sandbox ref/);
	});

	test("a rejection is a typed DriverError carrying the provider", () => {
		const error = (() => {
			try {
				sandboxRef("modal-gvisor", "vm-abc");
				return null;
			} catch (caught) {
				return caught;
			}
		})();
		expect(error).toBeInstanceOf(DriverError);
		expect((error as DriverError).code).toBe("invalid-sandbox-ref");
		expect((error as DriverError).provider).toBe("modal-gvisor");
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
		artifact: { kind: "baked", ref: "im-abc123" },
		deadlineMs: 60_000,
		gpu: { model: "H100", count: 1 },
	};

	test("returns the parsed request (registry-unit spec reused, not re-declared)", () => {
		const request = parseCreateRequest(valid);
		expect(request.spec.memoryGb).toBe(8);
		expect(request.gpu?.model).toBe("H100");
	});

	test("rejects DEEP undeclared keys — nested misspellings included", () => {
		expect(() => parseCreateRequest({ ...valid, spec: { vcpus: 4, memroyGb: 8 } })).toThrow(
			/spec\.memroyGb must be removed/,
		);
		expect(() =>
			parseCreateRequest({ ...valid, gpu: { model: "H100", count: 1, cout: 2 } }),
		).toThrow(/gpu\.cout must be removed/);
		expect(() => parseCreateRequest({ ...valid, deadlienMs: 1 })).toThrow(
			/deadlienMs must be removed/,
		);
	});

	test("a rejection is a typed invalid-create-request DriverError", () => {
		const error = (() => {
			try {
				parseCreateRequest({ ...valid, spec: { vcpus: -1, memoryGb: 8 } });
				return null;
			} catch (caught) {
				return caught;
			}
		})();
		expect(error).toBeInstanceOf(DriverError);
		expect((error as DriverError).code).toBe("invalid-create-request");
	});

	test("rejects non-positive and malformed values with path-bearing messages", () => {
		expect(() => parseCreateRequest({ ...valid, spec: { vcpus: -1, memoryGb: 8 } })).toThrow(
			/spec\.vcpus must be/,
		);
		expect(() => parseCreateRequest({ ...valid, artifact: { kind: "baked", ref: "" } })).toThrow(
			/artifact\.ref/,
		);
		expect(() =>
			parseCreateRequest({ ...valid, artifact: { kind: "none", ref: "not-allowed" } }),
		).toThrow(/artifact\.ref must be removed/);
		expect(() => parseCreateRequest({ ...valid, deadlineMs: 0 })).toThrow(/deadlineMs/);
		expect(() => parseCreateRequest({ ...valid, gpu: { model: "", count: 1 } })).toThrow(
			/gpu\.model/,
		);
	});

	test("gpu and env are genuinely optional", () => {
		const request = parseCreateRequest({
			spec: { vcpus: 2, memoryGb: 4, diskGb: 40 },
			artifact: { kind: "none" },
			deadlineMs: 1_000,
		});
		expect(request.gpu).toBeUndefined();
		expect(request.artifact).toEqual({ kind: "none" });
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
