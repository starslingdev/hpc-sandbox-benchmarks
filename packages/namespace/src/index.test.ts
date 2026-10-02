// Namespace tested at the vendor seam: the adapter's translation over the real generated clients
// and protobuf serialization (only service behaviour replaced), the port contract, and sessions
// through the package's own module. Kit behaviour (convergence, deadlines, the inventory partition,
// recovery mechanics) is tested once in the driver package.

import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create } from "@bufbuild/protobuf";
import type { ServiceImpl } from "@connectrpc/connect";
import { Code, ConnectError, createClient, createRouterTransport } from "@connectrpc/connect";
import { CommandService } from "@namespacelabs/sdk/proto/namespace/cloud/compute/v1beta/command_pb";
import type { InstanceMetadata } from "@namespacelabs/sdk/proto/namespace/cloud/compute/v1beta/compute_pb";
import {
	ComputeService,
	InstanceMetadataSchema,
	InstanceMetadata_Status as Status,
} from "@namespacelabs/sdk/proto/namespace/cloud/compute/v1beta/compute_pb";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate, launchDetached } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { vendorContract } from "@sandbox-benchmarks/driver/vendor/testing";
import namespace from "./index.ts";
import type { NamespaceClient } from "./vendor.ts";
import {
	NAMESPACE_CONTAINER,
	NAMESPACE_EXIT_SENTINEL,
	NAMESPACE_PURPOSE_PREFIX,
	namespaceClient,
	namespaceVendor,
} from "./vendor.ts";

const context: DriverContext<"namespace"> = {
	env: { NSC_TOKEN_FILE: "/not-read-in-unit-tests" },
	artifact: { kind: "image" },
	resolvedArtifact: { kind: "image", ref: "ghcr.io/example/toolchain:v1" },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 30_000,
};
const op = () => ({ signal: new AbortController().signal });
const bytes = (text: string) => new TextEncoder().encode(text);
const metadata = (instanceId: string, documentedPurpose = "", status = Status.RUNNING) =>
	create(InstanceMetadataSchema, { instanceId, documentedPurpose, status });
const exited = (stdout: string, code: number | string) =>
	bytes(`${stdout}\n${NAMESPACE_EXIT_SENTINEL}${code}\n`);

interface Instance {
	metadata: InstanceMetadata;
	describes: number;
}

/**
 * A whole Namespace account behind the real generated clients: creates start CREATING, describes
 * advance them to RUNNING, a destroy is acknowledged as DESTROYING and observed DESTROYED, and
 * listings page by a byte cursor. Only service behaviour is replaced.
 */
function namespaceWorld(
	options: {
		readonly readyAfterDescribes?: number;
		readonly destroyedAfterDescribes?: number;
		readonly pageSize?: number;
		/** The first create allocates and then loses its response. */
		readonly ambiguousFirstCreate?: boolean;
		readonly diskGb?: number;
		readonly compute?: Partial<ServiceImpl<typeof ComputeService>>;
		readonly runCommandSync?: ServiceImpl<typeof CommandService>["runCommandSync"];
	} = {},
) {
	const instances = new Map<string, Instance>();
	const calls: string[] = [];
	const commands: string[] = [];
	let next = 0;
	let ambiguous = options.ambiguousFirstCreate ?? false;
	const allocate = (documentedPurpose: string, status = Status.CREATING) => {
		const instanceId = `inst-${++next}`;
		instances.set(instanceId, {
			metadata: metadata(instanceId, documentedPurpose, status),
			describes: 0,
		});
		return instanceId;
	};
	const set = (instance: Instance, status: Status) => {
		instance.metadata = { ...instance.metadata, status };
	};
	const transport = createRouterTransport(({ service }) => {
		service(ComputeService, {
			createInstance: (input) => {
				calls.push("createInstance");
				const id = allocate(input.documentedPurpose);
				if (ambiguous) {
					ambiguous = false;
					throw new ConnectError("response lost", Code.Unavailable);
				}
				return {
					metadata: instances.get(id)?.metadata,
					extendedMetadata: { commandServiceEndpoint: `https://commands.example/${id}` },
				};
			},
			describeInstance: (input) => {
				calls.push("describeInstance");
				const found = instances.get(input.instanceId);
				if (!found) throw new ConnectError("not found", Code.NotFound);
				found.describes += 1;
				const status = found.metadata.status;
				if (status === Status.CREATING && found.describes >= (options.readyAfterDescribes ?? 1))
					set(found, Status.RUNNING);
				if (
					status === Status.DESTROYING &&
					found.describes >= (options.destroyedAfterDescribes ?? 1)
				)
					set(found, Status.DESTROYED);
				return {
					metadata: found.metadata,
					extendedMetadata: {
						commandServiceEndpoint: `https://commands.example/${input.instanceId}`,
					},
				};
			},
			destroyInstance: (input) => {
				calls.push("destroyInstance");
				const found = instances.get(input.instanceId);
				if (!found || found.metadata.status === Status.DESTROYED)
					throw new ConnectError("not found", Code.NotFound);
				set(found, Status.DESTROYING);
				found.describes = 0;
				return {};
			},
			listInstances: (input) => {
				calls.push("listInstances");
				expect(input.includeCompleteRuns).toBe(true);
				const all = [...instances.values()].map((instance) => instance.metadata);
				const size = options.pageSize ?? 100;
				const from = input.paginationCursor[0] ?? 0;
				return {
					instances: all.slice(from, from + size),
					...(from + size < all.length && { paginationCursor: new Uint8Array([from + size]) }),
				};
			},
			...options.compute,
		});
		service(CommandService, {
			runCommandSync:
				options.runCommandSync ??
				((input) => {
					expect(input.targetContainerName).toBe(NAMESPACE_CONTAINER);
					const found = instances.get(input.instanceId);
					if (found?.metadata.status !== Status.RUNNING)
						throw new ConnectError("instance not running", Code.FailedPrecondition);
					const shell = input.command?.command[2] ?? "";
					const inner = /^\( ([\s\S]*)\n\);/.exec(shell)?.[1] ?? "";
					commands.push(inner);
					if (inner.startsWith("df -Pk"))
						return { stdout: exited(`${(options.diskGb ?? 80) * 1024 * 1024}`, 0) };
					const exit = /^sh -c 'exit (\d+)'$/.exec(inner);
					return { stdout: exited("out", exit?.[1] ?? 0), stderr: bytes("err"), exitCode: 1 };
				}),
		});
	});
	const client: NamespaceClient = {
		compute: createClient(ComputeService, transport),
		command: (_endpoint: string) => createClient(CommandService, transport),
	};
	return { client, instances, calls, commands, allocate };
}

/** The package's own module, lowered over a fake account instead of the real API. */
function driverOver(world: ReturnType<typeof namespaceWorld>) {
	return driverFromComputeSpec(
		"namespace",
		namespace.specFor(context, {
			vendor: namespaceVendor(context, world.client),
			timing: { pollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 },
		}),
		context.resolvedArtifact,
		[],
	);
}

describe("Namespace translation", () => {
	test("creates the mapped protobuf request with the attempt's UUID in its documented purpose", async () => {
		let sent: unknown;
		const world = namespaceWorld({
			compute: {
				createInstance: (input) => {
					sent = input;
					return {
						metadata: metadata("inst-x", input.documentedPurpose, Status.RUNNING),
						extendedMetadata: { commandServiceEndpoint: "https://commands.example" },
					};
				},
			},
		});
		const { control } = namespaceVendor(context, world.client);
		const marker = `${MARKER_PREFIX}0000-attempt`;
		const created = await control.create(
			{ request: { ...request, env: { HELLO: "world" } }, marker },
			op(),
		);
		// Even a RUNNING acknowledgement is not readiness: RunCommandSync hangs on a pending container.
		expect(created).toMatchObject({ id: "inst-x", phase: "pending", marker });
		expect(sent).toMatchObject({
			$typeName: "namespace.cloud.compute.v1beta.CreateInstanceRequest",
			shape: { virtualCpu: 4, memoryMegabytes: 8192, machineArch: "amd64", os: "linux" },
			containers: [
				{
					name: NAMESPACE_CONTAINER,
					imageRef: context.resolvedArtifact.ref,
					args: ["sleep", "infinity"],
					environment: { HELLO: "world" },
				},
			],
			documentedPurpose: `${NAMESPACE_PURPOSE_PREFIX}0000-attempt`,
		});
	});

	test("reads every lifecycle enum as a phase; suspended and errored instances stay owned", async () => {
		const world = namespaceWorld();
		const { control } = namespaceVendor(context, world.client);
		const phases: Record<string, string | undefined> = {};
		for (const [name, status] of Object.entries({
			PENDING: Status.PENDING,
			CREATING: Status.CREATING,
			RUNNING: Status.RUNNING,
			SUSPENDING: Status.SUSPENDING,
			SUSPENDED: Status.SUSPENDED,
			ERROR: Status.ERROR,
			DESTROYING: Status.DESTROYING,
			DESTROYED: Status.DESTROYED,
		})) {
			const id = world.allocate(`${NAMESPACE_PURPOSE_PREFIX}x`, status);
			const instance = world.instances.get(id);
			if (instance) instance.describes = -1_000; // hold the status still
			phases[name] = (await control.get(id, op()))?.phase;
		}
		expect(phases).toEqual({
			PENDING: "pending",
			CREATING: "pending",
			RUNNING: "ready",
			SUSPENDING: "failed",
			SUSPENDED: "failed",
			ERROR: "failed",
			DESTROYING: "deleting",
			DESTROYED: "gone",
		});
		const unknown = world.allocate("", Status.STATUS_UNKNOWN);
		await expect(control.get(unknown, op())).rejects.toThrow("unknown instance status");
		expect(await control.get("missing", op())).toBeNull();
		const mismatch = namespaceWorld({
			compute: { describeInstance: () => ({ metadata: metadata("someone-else") }) },
		});
		await expect(
			namespaceVendor(context, mismatch.client).control.get("inst-1", op()),
		).rejects.toThrow("matching instance");
	});

	test("recovers the guest's exit through the sentinel trailer; a missing one stays unknown", async () => {
		const outputs = [
			{
				stdout: bytes(`héllo\n${NAMESPACE_EXIT_SENTINEL}7\n`),
				stderr: bytes("bad €"),
				exitCode: 1,
			},
			{ stdout: bytes("partial"), exitCode: 0 },
			{ stdout: exited("x", 999), exitCode: 1 },
		];
		const world = namespaceWorld({ runCommandSync: () => outputs.shift() ?? {} });
		const { data } = namespaceVendor(context, world.client);
		const native = await data.attach(
			{ id: "inst-1", phase: "ready", raw: { instance: metadata("inst-1"), commandEndpoint: "e" } },
			op(),
		);
		expect(await data.exec(native, "exit 7")).toEqual({
			stdout: "héllo",
			stderr: "bad €",
			exitCode: 7,
		});
		expect(await data.exec(native, "true")).not.toHaveProperty("exitCode");
		expect(await data.exec(native, "true")).not.toHaveProperty("exitCode");
	});

	test("classifies refusals by Connect's typed codes only; exhaustion is retryable", () => {
		const { refused } = namespaceVendor(context, namespaceWorld().client).control;
		for (const code of [Code.InvalidArgument, Code.Unauthenticated, Code.PermissionDenied])
			expect(refused?.(new ConnectError("refused", code))).toEqual({ retryable: false });
		expect(refused?.(new ConnectError("capacity", Code.ResourceExhausted))).toEqual({
			retryable: true,
		});
		expect(refused?.(new ConnectError("lost", Code.Unavailable))).toBeUndefined();
		expect(refused?.(new Error("HTTP 403 permission denied"))).toBeUndefined();
	});
});

vendorContract("namespace adapter", () => ({
	vendor: namespaceVendor(context, namespaceWorld({ pageSize: 1, readyAfterDescribes: 2 }).client),
	account: "shared",
}));

describe("Namespace end to end through its module", () => {
	test("declares identity, a harness-owned create budget, and the 120s shell-detach cap", () => {
		expect(namespace.id).toBe("namespace");
		expect(namespace.provenance.packageName).toBe("@namespacelabs/sdk");
		expect(namespace.execution).toEqual({ syncCapMs: 120_000, durable: "shell-detach" });
		expect(namespace.createBudget).toEqual({ owner: "harness", timeoutMs: 20 * 60_000 });
	});

	test("a session waits through CREATING, proves disk, runs and detaches commands, inventories, and is destroyed", async () => {
		const world = namespaceWorld({
			readyAfterDescribes: 2,
			destroyedAfterDescribes: 2,
			pageSize: 1,
		});
		world.allocate("someone-else", Status.SUSPENDED); // another tenant's retained instance
		const driver = driverOver(world);
		const session = await driver.create(request);
		expect(world.commands[0]).toBe("df -Pk / | awk 'NR==2 {print $2}'");

		const seven = await session.exec("sh -c 'exit 7'");
		expect(seven).toMatchObject({
			exit: { kind: "exited", code: 7 },
			stdout: "out",
			stderr: "err",
		});
		await launchDetached(session, "sleep 65");
		expect(world.commands.at(-1)).toContain("nohup");
		expect(world.commands.at(-1)).toContain("sleep 65");

		// An errored benchmark instance still holds resources: inventoried and destroyed by id.
		const errored = world.allocate(`${NAMESPACE_PURPOSE_PREFIX}errored`, Status.ERROR);
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef, { provider: "namespace", id: errored }],
			foreignCount: 1,
		});
		await driver.destroyById?.({ provider: "namespace", id: errored });
		await session.destroy();
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});

	test("an undersized guest is refused as a shape and destroyed", async () => {
		const world = namespaceWorld({ diskGb: 10 });
		await expect(driverOver(world).create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
		});
		expect(world.calls).toContain("destroyInstance");
	});

	test("an ambiguous create is found by its documented purpose and destroyed; other attempts survive", async () => {
		const world = namespaceWorld({ ambiguousFirstCreate: true });
		const other = world.allocate(`${NAMESPACE_PURPOSE_PREFIX}another-attempt`, Status.RUNNING);
		const failure = await driverOver(world)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed" });
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect(world.instances.get("inst-2")?.metadata.status).toBe(Status.DESTROYED);
		expect(world.instances.get(other)?.metadata.status).toBe(Status.RUNNING);
	});

	test("an unrecoverable ambiguous create names the documented purpose it sent", async () => {
		const world = namespaceWorld({
			ambiguousFirstCreate: true,
			compute: {
				listInstances: () => {
					throw new ConnectError("listing unavailable", Code.Unavailable);
				},
			},
		});
		const failure = await driverOver(world)
			.create(request)
			.catch((caught) => caught);
		const purpose = world.instances.get("inst-1")?.metadata.documentedPurpose ?? "";
		expect(purpose).toMatch(new RegExp(`^${NAMESPACE_PURPOSE_PREFIX}[0-9a-f-]{36}$`));
		expect(failure.locator).toEqual({ kind: "marker", key: "documented_purpose", value: purpose });
		expect(failure.message).toContain(`by marker documented_purpose=${purpose} `);
	});

	test("inventory drains completed runs past the kit's default page cap", async () => {
		const world = namespaceWorld({ pageSize: 1 });
		for (let index = 0; index < 150; index++) world.allocate("", Status.DESTROYED);
		const live = world.allocate(`${NAMESPACE_PURPOSE_PREFIX}leftover`, Status.ERROR);
		expect(await driverOver(world).inventory?.list()).toEqual({
			owned: [{ provider: "namespace", id: live }],
			foreignCount: 0,
		});
	});

	test("a listing that repeats its byte cursor fails closed", async () => {
		const world = namespaceWorld({
			compute: { listInstances: () => ({ paginationCursor: new Uint8Array([1]) }) },
		});
		await expect(driverOver(world).inventory?.list()).rejects.toMatchObject({
			code: "probe-failed",
		});
	});

	test("the production client reads only the explicit token file and retries a failed read", async () => {
		const directory = await mkdtemp(join(tmpdir(), "namespace-sdk-"));
		const tokenFile = join(directory, "token.json");
		const authorization: (string | null)[] = [];
		const server = Bun.serve({
			hostname: "127.0.0.1",
			port: 0,
			fetch: (incoming) => {
				authorization.push(incoming.headers.get("authorization"));
				return Response.json({ instances: [] });
			},
		});
		try {
			const client = namespaceClient(tokenFile, server.url.toString());
			await expect(client.compute.listInstances({})).rejects.toThrow();
			await Bun.write(tokenFile, JSON.stringify({ bearer_token: "test-bearer" }));
			expect((await client.compute.listInstances({})).instances).toEqual([]);
			expect(authorization).toEqual(["Bearer test-bearer"]);
		} finally {
			await server.stop(true);
			await rm(directory, { recursive: true, force: true });
		}
	});
});
