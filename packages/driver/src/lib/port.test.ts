import { describe, expect, test } from "bun:test";
import {
	parseCreateRequest,
	parseSandboxRefEnvelope,
	sandboxRefEnvelopeSchema,
} from "../schemas.ts";
import { DriverError } from "./errors.ts";
import type { SandboxRef } from "./port.ts";
import { sandboxRef, succeeded } from "./port.ts";

// Minimal type-level assertion helpers.
type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

describe("sandboxRef", () => {
	test("constructs a provider-qualified ref from a driver-validated id", () => {
		const valid = [
			["e2b", "i2f3k4abc"],
			["modal-gvisor", "sb-abc123"],
			["runloop", "dbx_9f8e7d"],
			["tama", "m-1"],
		] as const;

		for (const [provider, id] of valid) {
			const ref = sandboxRef(provider, id);
			expect(ref.provider).toBe(provider);
			expect(ref.id).toBe(id);
		}
	});

	test("the generic process parser validates qualification, not vendor-specific id syntax", () => {
		expect(
			parseSandboxRefEnvelope({ provider: "modal-gvisor", id: "vendor-owned-format" }),
		).toEqual({
			provider: "modal-gvisor",
			id: "vendor-owned-format",
		});
		expect(() => parseSandboxRefEnvelope({ provider: "tama", id: "" })).toThrow(
			/invalid sandbox ref/,
		);
	});

	test("a process-boundary rejection is a typed DriverError", () => {
		const error = (() => {
			try {
				parseSandboxRefEnvelope({ provider: "modal-gvisor", id: "" });
				return null;
			} catch (caught) {
				return caught;
			}
		})();
		expect(error).toBeInstanceOf(DriverError);
		expect((error as DriverError).code).toBe("invalid-sandbox-ref");
	});

	test("the schema rejects an unregistered provider outright", () => {
		const parsed = sandboxRefEnvelopeSchema({ provider: "not-a-provider", id: "x" });
		expect(String(parsed)).toContain("provider must be");
	});

	test("the provider remains narrowed while id syntax belongs to its driver", () => {
		type _modal = Expect<Equal<SandboxRef<"modal-gvisor">["id"], string>>;
		type _runloop = Expect<Equal<SandboxRef<"runloop">["id"], string>>;
		type _provider = Expect<Equal<SandboxRef<"tama">["provider"], "tama">>;
		const modal = sandboxRef("modal-gvisor", "sb-abc");
		const id: string = modal.id;
		void id;
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
