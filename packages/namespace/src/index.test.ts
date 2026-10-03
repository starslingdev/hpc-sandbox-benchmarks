// Namespace tested at the vendor seam: the adapter's translation over the real generated clients
// and protobuf serialization (only service behaviour replaced), the port contract, and sessions
// through the package's own module. Kit behaviour (convergence, deadlines, the inventory partition,
// recovery mechanics) is tested once in the driver package.

import { describe, expect, test } from "bun:test";
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
import { launchDetached } from "@sandbox-benchmarks/driver";
import { vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import namespace from "./index.ts";
import type { NamespaceClient } from "./vendor.ts";
import {
	NAMESPACE_CONTAINER,
	NAMESPACE_EXIT_SENTINEL,
	NAMESPACE_PURPOSE_PREFIX,
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
	return vendorDriver(namespace, context, {
		vendor: namespaceVendor(context, world.client),
		timing: { pollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 },
	});
}

vendorContract("namespace adapter", namespace, () =>
	namespaceVendor(context, namespaceWorld({ pageSize: 1, readyAfterDescribes: 2 }).client),
);

describe("Namespace end to end through its module", () => {
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
});
