import { expect, test } from "bun:test";
import { RunloopSDK } from "@runloop/api-client";
import { runloopArtifactBuilder } from "./artifact.ts";

test("Blueprint release over the real SDK preserves good builds on failure and cancels pending requests", async () => {
	const records = new Map([
		[
			"retained",
			{ id: "retained", name: "candidate", status: "build_complete", create_time_ms: 0 },
		],
		[
			"previous",
			{ id: "previous", name: "candidate", status: "build_complete", create_time_ms: 0 },
		],
	]);
	const posted: unknown[] = [];
	const deleted: string[] = [];
	let phase: "success" | "failed" | "cancel" = "success";
	const started = Promise.withResolvers<void>();
	const server = Bun.serve({
		port: 0,
		async fetch(req) {
			const url = new URL(req.url),
				id = url.pathname.split("/")[3];
			if (id && url.pathname.endsWith("/delete")) {
				if (id === "retained")
					return Response.json({ message: "dependent snapshot" }, { status: 409 });
				deleted.push(id);
				records.delete(id);
				return Response.json({});
			}
			if (req.method === "POST") {
				posted.push(await req.json());
				const row = {
					id: phase,
					name: "candidate",
					status:
						phase === "success" ? "build_complete" : phase === "cancel" ? "building" : "failed",
					create_time_ms: 1,
				};
				records.set(phase, row);
				return Response.json(row);
			}
			if (id) {
				if (phase === "cancel") {
					started.resolve();
					return new Promise<Response>((resolve) =>
						req.signal.addEventListener("abort", () => resolve(Response.json({})), { once: true }),
					);
				}
				return Response.json(records.get(id));
			}
			return Response.json({
				blueprints: [...records.values()].filter(
					(row) => row.status === url.searchParams.get("status"),
				),
				has_more: false,
			});
		},
	});
	const signal = new AbortController();
	const request = {
		bakes: "oci" as const,
		name: "candidate",
		base: { digestRef: `ghcr.io/toolchain@sha256:${"a".repeat(64)}` },
		spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		env: { RUNLOOP_API_KEY: "test-key" },
		replace: "allowed" as const,
		imagesDir: "unused",
		dockerConfig: "unused",
		log: () => {},
		signal: signal.signal,
	};
	const builder = runloopArtifactBuilder(
		(env) =>
			new RunloopSDK({
				baseURL: server.url.toString(),
				bearerToken: env.RUNLOOP_API_KEY,
				maxRetries: 0,
			}),
	);
	try {
		expect(await builder.build(request)).toEqual({ ref: "candidate", replaced: "atomic" });
		expect(deleted).toEqual(["previous"]);
		expect(posted[0]).toMatchObject({
			dockerfile: `FROM ${request.base.digestRef}\n`,
			launch_parameters: { custom_cpu_cores: 4, custom_gb_memory: 8, custom_disk_size: 40 },
		});
		phase = "failed";
		await expect(builder.build(request)).rejects.toThrow("non-complete state failed");
		expect(deleted).toEqual(["previous", "failed"]);
		expect(records.has("success")).toBe(true);
		phase = "cancel";
		const pending = builder.build(request);
		await started.promise;
		signal.abort(new Error("stop release"));
		await expect(pending).rejects.toThrow();
		expect(records.has("success")).toBe(true);
		expect(records.has("cancel")).toBe(false);
		expect(records.has("retained")).toBe(true);
		expect(deleted).toEqual(["previous", "failed", "cancel"]);
	} finally {
		signal.abort();
		await server.stop(true);
	}
});
