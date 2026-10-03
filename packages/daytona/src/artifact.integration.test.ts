import { expect, test } from "bun:test";
import { SnapshotState } from "@daytona/api-client";
import { SandboxClass } from "@daytona/sdk";
import type { DaytonaBuildTransport } from "./snapshot-build.ts";
import { daytonaArtifactBuilder } from "./snapshot-build.ts";

test("Daytona artifact release preserves forbidden names and reports destructive replacement failures", async () => {
	const commands: string[] = [],
		events: string[] = [];
	let present = true,
		fail = false;
	const transport = {
		client: () => ({
			snapshot: {
				list: async () => ({
					items: present ? [{ id: "old", name: "candidate", state: SnapshotState.ACTIVE }] : [],
				}),
				delete: async () => {
					events.push("delete");
					present = false;
				},
				create: async (params: unknown) => {
					events.push("create");
					expect(params).toMatchObject({
						sandboxClass: SandboxClass.LINUX_VM,
						regionId: "us-west-2",
						resources: { cpu: 4, memory: 8, disk: 40 },
					});
					if (fail) throw Error("registry refused");
					present = true;
				},
			},
		}),
		pushAccess: async () => ({
			registryUrl: "https://registry.test",
			project: "project",
			username: "upload",
			secret: "short-lived",
		}),
		run: async (argv: readonly string[], options?: { stdin?: string }) => {
			commands.push(argv.join(" "));
			if (argv[1] === "login") expect(options?.stdin).toBe("short-lived");
			events.push(argv[1] ?? "");
			return 0;
		},
		sleep: async () => {},
	} as unknown as DaytonaBuildTransport;
	const builder = daytonaArtifactBuilder(
		"daytona-vm",
		{ sandboxClass: SandboxClass.LINUX_VM, target: (env) => env.DAYTONA_TARGET },
		transport,
	);
	const request = {
		bakes: "oci" as const,
		name: "candidate",
		base: { digestRef: `ghcr.io/toolchain@sha256:${"a".repeat(64)}` },
		spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		env: { DAYTONA_API_KEY: "test-key", DAYTONA_TARGET: "us-west-2" },
		replace: "forbidden" as "forbidden" | "allowed",
		imagesDir: "unused",
		dockerConfig: "unused",
		log: () => {},
		signal: new AbortController().signal,
	};
	await expect(builder.build(request)).rejects.toThrow("may not be replaced");
	expect(present).toBe(true);
	expect(events).not.toContain("delete");
	request.replace = "allowed";
	expect(await builder.build(request)).toEqual({ ref: "candidate", replaced: "destructive" });
	expect(events.indexOf("logout")).toBeLessThan(events.indexOf("delete"));
	expect(commands.some((cmd) => cmd.includes(request.base.digestRef))).toBe(true);
	expect(commands.some((cmd) => cmd.includes("short-lived"))).toBe(false);
	fail = true;
	await expect(builder.build(request)).rejects.toThrow("previous snapshot was deleted");
	expect(present).toBe(false);
});
