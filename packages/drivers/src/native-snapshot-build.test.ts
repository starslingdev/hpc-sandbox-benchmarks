// End to end through the generated join: Freestyle's builder is derived from its own driver, so a
// native-snapshot build boots the stock alias from a build context, hands the booted sandbox to the
// release lane's preparation, captures a durable snapshot and destroys the sandbox, all over a
// stubbed Freestyle control plane.

import { afterEach, expect, test } from "bun:test";
import { loadArtifactBuilder } from "./index.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

const vm = {
	id: "vm-build",
	snapshotId: "sh-stock-resolved",
	state: "running",
	metadata: {},
	resources: { cpu: 4, memory: 8192, storage: 40960 },
};

test("a Freestyle build records the immutable snapshot and destroys its sandbox", async () => {
	const calls: string[] = [];
	let createBody: Record<string, unknown> = {};
	let snapshotBody: Record<string, unknown> = {};
	let deleted = false;
	globalThis.fetch = Object.assign(
		async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
			const path = new URL(String(input)).pathname;
			const method = init?.method ?? "GET";
			const body =
				typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
			calls.push(`${method} ${path}`);
			if (path === "/v5/vms" && method === "POST") {
				createBody = body;
				return Response.json(vm);
			}
			if (path === "/v5/vms/vm-build/resize") return Response.json(vm);
			if (path === "/v5/vms/vm-build/exec-await")
				return Response.json({ statusCode: 0, stdout: "", stderr: "" });
			if (path === "/v5/vms/vm-build/snapshot") {
				snapshotBody = body;
				return Response.json({ snapshotId: "sh-release", snapshot: { autoDeleteSeconds: null } });
			}
			if (path === "/v5/vms/vm-build" && method === "DELETE") {
				deleted = true;
				return new Response(null, { status: 204 });
			}
			if (path === "/v5/vms/vm-build")
				return deleted
					? Response.json({ code: "NOT_FOUND", message: "gone" }, { status: 404 })
					: Response.json(vm);
			throw new Error(`unexpected Freestyle request: ${method} ${path}`);
		},
		{ preconnect: realFetch.preconnect },
	) as typeof fetch;

	const builder = await loadArtifactBuilder("freestyle");
	const prepared: { id: string; base: string }[] = [];
	const result = await builder.build({
		bakes: "native-snapshot",
		name: "sandbox-benchmarks-toolchain-v9-candidate",
		spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		env: { FREESTYLE_API_KEY: "freestyle-test-sentinel" },
		artifact: { kind: "baked", source: "native-snapshot" },
		replace: "allowed",
		log: () => {},
		signal: new AbortController().signal,
		prepare: async (session, { base }) => {
			prepared.push({ id: session.sandboxRef.id, base });
			await session.exec("true");
		},
	});

	// The candidate is the immutable capture, never a name the driver would have to resolve.
	expect(result).toEqual({ ref: "sh-release", replaced: "none" });
	expect(createBody).toMatchObject({ snapshotId: "freestyle/ubuntu" });
	// Preparation learns the immutable ID the stock alias resolved to, for its provenance record.
	expect(prepared).toEqual([{ id: "vm-build", base: "sh-stock-resolved" }]);
	expect(snapshotBody).toEqual({ autoDeleteSeconds: -1 });
	expect(deleted).toBe(true);
	expect(calls.indexOf("POST /v5/vms/vm-build/snapshot")).toBeLessThan(
		calls.indexOf("DELETE /v5/vms/vm-build"),
	);
});
