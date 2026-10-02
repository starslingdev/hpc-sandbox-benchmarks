// The Daytona snapshot builder at its interface: a build request becomes a transient-registry
// upload, a delete-then-create of the named snapshot pinned to the variant's class and region, and
// an honest account of what the replacement destroyed, over a recording transport.

import { describe, expect, test } from "bun:test";
import { SandboxClass } from "@daytona/sdk";
import type { BuildCommandOptions } from "@sandbox-benchmarks/driver/artifact";
import containerBuilder from "./container/artifact.ts";
import type { DaytonaBuildTransport } from "./snapshot-build.ts";
import {
	daytonaArtifactBuilder,
	daytonaTransientPushCommands,
	daytonaTransientRef,
	describeDaytonaError,
	snapshotDestroyedMessage,
} from "./snapshot-build.ts";
import vmBuilder from "./vm/artifact.ts";

const PUBLISHED = "sandbox-benchmarks-toolchain-v1";
const DIGEST = `ghcr.io/starslingdev/toolchain@sha256:${"d".repeat(64)}`;
const ACCESS = {
	registryUrl: "https://cr.app.daytona.io/",
	project: "sbox-transient",
	username: "robot",
	secret: "registry-secret",
};

describe("snapshotDestroyedMessage", () => {
	test("names the snapshot that no longer exists and keeps the create failure", () => {
		const message = snapshotDestroyedMessage(PUBLISHED, 1, "runner out of capacity");
		expect(message).toContain(`no snapshot named ${PUBLISHED} now exists`);
		expect(message).toContain("rerun the bake to recreate it");
		expect(message).toContain("runner out of capacity");
		// A stuck bake can leave several snapshots of one name; the count is not hardcoded.
		expect(snapshotDestroyedMessage(PUBLISHED, 3, "boom")).toContain("deleting 3 pre-existing");
	});
});

describe("daytonaTransientRef", () => {
	test("preserves the source repository and replaces its tag under Daytona's transient project", () => {
		expect(
			daytonaTransientRef(
				{ registryUrl: "https://cr.app.daytona.io/", project: "/sbox-transient/" },
				"ghcr.io/starslingdev/toolchain:v1-candidate",
				"20260714041422",
			),
		).toBe("cr.app.daytona.io/sbox-transient/ghcr.io/starslingdev/toolchain:20260714041422");
	});

	test("does not mistake a registry port for an image tag", () => {
		expect(
			daytonaTransientRef(
				{ registryUrl: "registry.example:5000", project: "transient" },
				"registry.example:5000/org/image",
				"upload",
			),
		).toBe("registry.example:5000/transient/registry.example:5000/org/image:upload");
	});

	test("replaces an immutable source digest with the transient upload tag", () => {
		expect(
			daytonaTransientRef(
				{ registryUrl: "https://cr.app.daytona.io", project: "sbox-transient" },
				"ghcr.io/starslingdev/toolchain@sha256:c70601f8c3c93bf6",
				"20260714060245",
			),
		).toBe("cr.app.daytona.io/sbox-transient/ghcr.io/starslingdev/toolchain:20260714060245");
	});

	test("rejects incomplete registry credentials before invoking Docker", () => {
		expect(() =>
			daytonaTransientRef(
				{ registryUrl: "cr.app.daytona.io", project: "" },
				"ghcr.io/o/image:v1",
				"upload",
			),
		).toThrow("incomplete upload destination");
	});

	test("pulls a buildx-pushed digest before tagging and pushing it", () => {
		const destination = "cr.app.daytona.io/sbox-transient/ghcr.io/starslingdev/toolchain:upload";
		expect(daytonaTransientPushCommands(DIGEST, destination)).toEqual([
			["docker", "pull", DIGEST],
			["docker", "tag", DIGEST, destination],
			["docker", "push", destination],
		]);
	});
});

describe("describeDaytonaError", () => {
	test("surfaces status code, error code, and response body from the opaque SDK error", () => {
		const out = describeDaytonaError({
			name: "DaytonaError",
			statusCode: 500,
			code: "INTERNAL",
			response: { data: { message: "failed to inspect in registry" } },
		});
		expect(out).toContain("name=DaytonaError");
		expect(out).toContain("status=500");
		expect(out).toContain("code=INTERNAL");
		expect(out).toContain("failed to inspect in registry");
	});

	test("never throws on a non-serializable body, a cause chain, or a non-object", () => {
		expect(describeDaytonaError({ statusCode: 500, response: { data: () => "boom" } })).toContain(
			"response=",
		);
		expect(
			describeDaytonaError({ message: "boom", cause: new Error("registry unreachable") }),
		).toContain("cause=registry unreachable");
		expect(describeDaytonaError("plain string")).toContain("plain string");
		expect(describeDaytonaError(undefined)).toContain("non-object");
		expect(describeDaytonaError(new Error("failed to inspect"))).toContain(
			"message=failed to inspect",
		);
	});
});

describe("the Daytona snapshot builder", () => {
	type Snapshot = { name: string; state: string };

	/** An account holding `existing` snapshots; `createFailures` creates reject before one lands. */
	function account(
		options: { existing?: Snapshot[]; createFailures?: number; failCommand?: string } = {},
	) {
		let snapshots = [...(options.existing ?? [])];
		let failures = options.createFailures ?? 0;
		const events: string[] = [];
		const created: Record<string, unknown>[] = [];
		const clients: unknown[] = [];
		const runs: { argv: readonly string[]; options?: BuildCommandOptions }[] = [];
		const transport: DaytonaBuildTransport = {
			client: (config) => {
				clients.push(config);
				return {
					snapshot: {
						list: async () => ({ items: snapshots, total: snapshots.length }),
						delete: async (snap: Snapshot) => {
							events.push(`delete ${snap.name}`);
							snapshots = snapshots.filter((s) => s !== snap);
						},
						create: async (params: Record<string, unknown>) => {
							events.push(`create ${String(params.name)}`);
							if (failures > 0) {
								failures--;
								throw Object.assign(new Error("failed to inspect image"), { statusCode: 500 });
							}
							created.push(params);
							snapshots.push({ name: String(params.name), state: "active" });
						},
					},
				} as never;
			},
			pushAccess: async (apiKey, region) => {
				events.push(`access ${apiKey} ${region}`);
				return ACCESS as never;
			},
			run: async (argv, runOptions) => {
				runs.push({ argv, ...(runOptions && { options: runOptions }) });
				events.push(argv.slice(0, 2).join(" "));
				return argv[1] === options.failCommand ? 1 : 0;
			},
			sleep: async () => {},
		};
		const builder = daytonaArtifactBuilder(
			"daytona-vm",
			{ sandboxClass: SandboxClass.LINUX_VM, target: (env) => env.DAYTONA_TARGET },
			transport,
		);
		const logs: string[] = [];
		const build = (replace: "allowed" | "forbidden" = "allowed") =>
			builder.build({
				bakes: "oci",
				name: PUBLISHED,
				base: { digestRef: DIGEST },
				spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
				env: { DAYTONA_API_KEY: "dtn_test", DAYTONA_TARGET: "us-west-2" },
				replace,
				imagesDir: "/unused",
				dockerConfig: "/unused",
				log: (line) => logs.push(line),
				signal: new AbortController().signal,
			});
		return { events, created, clients, runs, logs, build };
	}

	test("uploads through the transient registry, then creates the class-pinned snapshot", async () => {
		const { events, created, clients, runs, build } = account();
		expect(await build()).toEqual({ ref: PUBLISHED, replaced: "none" });
		expect(clients).toEqual([{ apiKey: "dtn_test", target: "us-west-2" }]);
		expect(events).toEqual([
			"access dtn_test us-west-2",
			"docker login",
			"docker pull",
			"docker tag",
			"docker push",
			"docker logout",
			`create ${PUBLISHED}`,
		]);
		// The registry secret travels on stdin, never in argv.
		expect(runs[0]?.argv).toEqual([
			"docker",
			"login",
			"cr.app.daytona.io",
			"--username",
			"robot",
			"--password-stdin",
		]);
		expect(runs[0]?.options?.stdin).toBe("registry-secret");
		expect(JSON.stringify(runs.map((run) => run.argv))).not.toContain("registry-secret");
		expect(created[0]).toMatchObject({
			name: PUBLISHED,
			resources: { cpu: 4, memory: 8, disk: 40 },
			regionId: "us-west-2",
			sandboxClass: "linux-vm",
		});
		expect(String(created[0]?.image)).toMatch(
			/^cr\.app\.daytona\.io\/sbox-transient\/ghcr\.io\/starslingdev\/toolchain:\d+$/,
		);
	});

	test("reports deleting a predecessor before recreating it as a destructive replacement", async () => {
		const { events, build } = account({ existing: [{ name: PUBLISHED, state: "active" }] });
		expect(await build()).toEqual({ ref: PUBLISHED, replaced: "destructive" });
		expect(events.slice(-2)).toEqual([`delete ${PUBLISHED}`, `create ${PUBLISHED}`]);
	});

	test("says the name no longer resolves when every create fails after the delete", async () => {
		const { events, build } = account({
			existing: [{ name: PUBLISHED, state: "active" }],
			createFailures: 5,
		});
		await expect(build()).rejects.toThrow(`no snapshot named ${PUBLISHED} now exists`);
		expect(events.filter((event) => event.startsWith("create"))).toHaveLength(5);
	});

	test("rethrows an ordinary create failure unchanged when nothing was deleted", async () => {
		const { build } = account({ createFailures: 5 });
		await expect(build()).rejects.toThrow(/^failed to inspect image$/);
	});

	test("retries a transient create failure and still succeeds", async () => {
		const { events, build } = account({ createFailures: 1 });
		expect(await build()).toEqual({ ref: PUBLISHED, replaced: "none" });
		expect(events.filter((event) => event.startsWith("create"))).toHaveLength(2);
	});

	test("logs out after a failed upload and leaves the existing snapshot untouched", async () => {
		const { events, build } = account({
			existing: [{ name: PUBLISHED, state: "active" }],
			failCommand: "push",
		});
		await expect(build()).rejects.toThrow("docker push exited 1");
		expect(events.at(-1)).toBe("docker logout");
		expect(events.some((event) => event.startsWith("delete"))).toBe(false);
	});

	test("refuses to delete an existing snapshot when replacement is forbidden", async () => {
		const { events, build } = account({ existing: [{ name: PUBLISHED, state: "active" }] });
		await expect(build("forbidden")).rejects.toThrow("may not be replaced");
		expect(events.some((event) => event.startsWith("delete"))).toBe(false);
	});

	test("binds each variant to its own class", () => {
		expect(vmBuilder).toMatchObject({ provider: "daytona-vm", bakes: "oci" });
		expect(containerBuilder).toMatchObject({ provider: "daytona-container", bakes: "oci" });
	});
});
