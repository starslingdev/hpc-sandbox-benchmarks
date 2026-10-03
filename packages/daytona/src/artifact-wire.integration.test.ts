import { expect, test } from "bun:test";
import { SandboxClass } from "@daytona/sdk";
import { daytonaArtifactBuilder, daytonaBuildTransport } from "./snapshot-build.ts";

test("Daytona release over the real API pins imageName and reclaims accepted cancellation", async () => {
	const records = new Map<string, { id: string; name: string; state: string }>([
		["old", { id: "old", name: "candidate", state: "active" }],
	]);
	const bodies: unknown[] = [],
		commands: string[] = [];
	let phase: "success" | "cancel-create" | "cancel-delete" | "lost-response" = "success";
	let owner = new AbortController();
	const started = Promise.withResolvers<void>();
	const server = Bun.serve({
		port: 0,
		async fetch(req) {
			expect(req.headers.get("authorization")).toBe("Bearer test-key");
			const path = new URL(req.url).pathname,
				id = path.split("/")[2];
			if (path.endsWith("registry-push-access"))
				return Response.json({
					registryUrl: "https://registry.test",
					project: "project",
					username: "upload",
					secret: "secret",
				});
			if (req.method === "DELETE" && id) {
				records.delete(id);
				if (phase === "cancel-delete") owner.abort(Error("stop delete"));
				return Response.json({});
			}
			if (req.method === "POST") {
				const body = (await req.json()) as Record<string, unknown>;
				bodies.push(body);
				if (!body.imageName) return Response.json({ error: "imageName required" }, { status: 400 });
				const row = {
					id: `built-${bodies.length}`,
					name: String(body.name),
					state: phase === "cancel-create" ? "pending" : "active",
				};
				records.set(row.id, row);
				if (phase === "lost-response") {
					Object.assign(row, { imageName: body.imageName });
					owner.abort(Error("lost create response"));
					return new Promise<Response>((resolve) => {
						if (req.signal.aborted) resolve(Response.json(row));
						else
							req.signal.addEventListener("abort", () => resolve(Response.json(row)), {
								once: true,
							});
					});
				}
				return Response.json(row);
			}
			if (id) {
				if (phase === "cancel-create") started.resolve();
				const row = records.get(id);
				return row ? Response.json(row) : Response.json({}, { status: 404 });
			}
			return Response.json({ items: [...records.values()] });
		},
	});
	const transport = {
		...daytonaBuildTransport(server.url.toString().replace(/\/$/, "")),
		run: async (argv: readonly string[]) => {
			commands.push(argv.join(" "));
			return 0;
		},
		sleep: async () => {},
	};
	const builder = daytonaArtifactBuilder(
		"daytona-vm",
		{ sandboxClass: SandboxClass.LINUX_VM, target: (env) => env.DAYTONA_TARGET },
		transport,
	);
	const request = () => ({
		bakes: "oci" as const,
		name: "candidate",
		base: { digestRef: `ghcr.io/toolchain@sha256:${"a".repeat(64)}` },
		spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		env: { DAYTONA_API_KEY: "test-key", DAYTONA_TARGET: "us-west-2" },
		replace: "allowed" as const,
		imagesDir: "unused",
		dockerConfig: "unused",
		log: () => {},
		signal: owner.signal,
	});
	try {
		expect(await builder.build(request())).toEqual({ ref: "candidate", replaced: "destructive" });
		expect(bodies[0]).toMatchObject({
			imageName: expect.stringContaining("registry.test/project/ghcr.io/toolchain:"),
			cpu: 4,
			memory: 8,
			disk: 40,
			regionId: "us-west-2",
			sandboxClass: SandboxClass.LINUX_VM,
		});
		expect(bodies[0]).not.toHaveProperty("image");
		expect(commands.some((cmd) => cmd.includes("secret"))).toBe(false);
		phase = "cancel-create";
		owner = new AbortController();
		const pending = builder.build(request());
		await started.promise;
		owner.abort(Error("stop build"));
		await expect(pending).rejects.toThrow("previous snapshot was deleted");
		expect(records.size).toBe(0);
		phase = "lost-response";
		owner = new AbortController();
		await expect(builder.build(request())).rejects.toThrow();
		expect(records.size).toBe(0);
		phase = "cancel-delete";
		owner = new AbortController();
		records.set("old", { id: "old", name: "candidate", state: "active" });
		await expect(builder.build(request())).rejects.toThrow("deletion was requested");
		expect(records.size).toBe(0);
	} finally {
		owner.abort();
		await server.stop(true);
	}
});
