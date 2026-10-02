// Novita's adapter tested at the vendor seam: translation and the port contract, over a stubbed
// SDK. Kit behaviour (convergence, recovery, inventory) is not re-tested here.

import { describe, expect, test } from "bun:test";
import { vendorContract } from "../../driver-vendor/src/testing.ts";
import type { NovitaSdk } from "./sdk.ts";
import { novitaVendor } from "./vendor.ts";

class SandboxNotFoundError extends Error {}
class AuthenticationError extends Error {}
class InvalidArgumentError extends Error {}
class RateLimitError extends Error {}

/** A whole-account stand-in for the novita-sandbox statics the adapter uses. */
function stubNovitaSdk() {
	const rows = new Map<
		string,
		{ sandboxId: string; state: string; metadata: Record<string, string> }
	>();
	let next = 0;
	const native = (sandboxId: string) => ({ sandboxId, commands: {}, files: {} });
	const Sandbox = {
		create: async (_template: string, options: { metadata: Record<string, string> }) => {
			const sandboxId = `i${++next}`;
			rows.set(sandboxId, { sandboxId, state: "running", metadata: options.metadata });
			return native(sandboxId);
		},
		getInfo: async (id: string) => {
			const row = rows.get(id);
			if (!row) throw new SandboxNotFoundError(id);
			return row;
		},
		kill: async (id: string) => {
			if (!rows.delete(id)) throw new SandboxNotFoundError(id);
			return true;
		},
		list: (options: { query: { metadata?: Record<string, string> } }) => {
			const wanted = options.query.metadata;
			const items = [...rows.values()].filter(
				(row) =>
					!wanted || Object.entries(wanted).every(([key, value]) => row.metadata[key] === value),
			);
			return { hasNext: false, nextToken: undefined, nextItems: async () => items };
		},
		connect: async (id: string) => native(id),
	};
	return {
		Sandbox,
		SandboxNotFoundError,
		AuthenticationError,
		InvalidArgumentError,
		RateLimitError,
	} as unknown as NovitaSdk;
}

const context = {
	env: { NOVITA_API_KEY: "nvta_test" },
	resolvedArtifact: { kind: "baked", ref: "toolchain-test" },
} as const;

describe("novita translation", () => {
	test("echoes the ownership marker and reads every live state as ready", async () => {
		const vendor = novitaVendor(stubNovitaSdk(), context);
		const op = { signal: new AbortController().signal };
		const request = {
			spec: { vcpus: 4, memoryGb: 8 },
			artifact: context.resolvedArtifact,
			deadlineMs: 1,
		};
		const created = await vendor.control.create({ request, marker: "benchmark-x" }, op);
		expect(created).toMatchObject({ phase: "ready", marker: "benchmark-x" });
	});

	test("classifies refusals by the SDK's typed errors only", () => {
		const { control } = novitaVendor(stubNovitaSdk(), context);
		expect(control.refused?.(new AuthenticationError())).toEqual({ retryable: false });
		expect(control.refused?.(new RateLimitError())).toEqual({ retryable: true });
		expect(control.refused?.(new Error("HTTP 429 response lost"))).toBeUndefined();
	});
});

vendorContract("novita adapter", () => ({
	vendor: novitaVendor(stubNovitaSdk(), context),
	account: "shared",
}));
