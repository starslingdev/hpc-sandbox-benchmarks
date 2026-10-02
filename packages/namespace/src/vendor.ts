// Namespace's vendor adapter: translation only. Namespace's generated clients own RPC encoding,
// protobuf types, and typed errors; this states what they mean in the vendor port's terms.
// Readiness, cleanup confirmation, recovery, inventory and the disk proof live in the driver kit
// (`@sandbox-benchmarks/driver/vendor`).

import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError, createClient } from "@connectrpc/connect";
import { createComputeClient, createRegionTransport } from "@namespacelabs/sdk/api";
import type { TokenSource } from "@namespacelabs/sdk/auth";
import { fromBearerToken } from "@namespacelabs/sdk/auth";
import { CommandService } from "@namespacelabs/sdk/proto/namespace/cloud/compute/v1beta/command_pb";
import type { InstanceMetadata } from "@namespacelabs/sdk/proto/namespace/cloud/compute/v1beta/compute_pb";
import {
	CreateInstanceRequestSchema,
	InstanceMetadata_Status as Status,
} from "@namespacelabs/sdk/proto/namespace/cloud/compute/v1beta/compute_pb";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export const NAMESPACE_INSTANCE_ID = type(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
/** Every benchmark create documents this purpose plus its attempt's UUID; ownership keys on it. */
export const NAMESPACE_PURPOSE_PREFIX = "sandbox-benchmarks:namespace:";
export const NAMESPACE_CONTAINER = "main-container";
export const NAMESPACE_EXIT_SENTINEL = "__sandbox_benchmarks_exit__:";
export const NAMESPACE_CONTROL_TIMEOUT_MS = 20_000;
export const NAMESPACE_INSTANCE_LIFETIME_MS = 195 * 60_000;

const tokenFileSchema = type("string.json.parse")
	.to({ bearer_token: "string >= 1" })
	.pipe(({ bearer_token }) => fromBearerToken(bearer_token));

/** Only the explicit CI token file is used. A transient read failure can be retried. */
export function namespaceClient(tokenFile: string, baseUrl?: string) {
	let loaded: Promise<TokenSource> | undefined;
	const tokenSource: TokenSource = {
		issueToken: async (minDuration, force) => {
			loaded ??= Bun.file(tokenFile)
				.text()
				.then((text) => tokenFileSchema.assert(text))
				.catch((error) => {
					loaded = undefined;
					throw error;
				});
			return (await loaded).issueToken(minDuration, force);
		},
	};
	const transport = createRegionTransport("us", {
		tokenSource,
		...(baseUrl === undefined ? {} : { baseUrl }),
	});
	return {
		compute: createComputeClient({ tokenSource, transport }).compute,
		command: (endpoint: string) =>
			createClient(CommandService, createRegionTransport("us", { tokenSource, baseUrl: endpoint })),
	};
}
export type NamespaceClient = ReturnType<typeof namespaceClient>;

/** One instance; a create or describe also carries the command endpoint the data plane attaches to. */
export interface NamespaceRow {
	readonly instance: InstanceMetadata;
	readonly commandEndpoint?: string;
}

/** The connected data plane of one instance. */
export interface NamespaceNative {
	readonly instanceId: string;
	readonly commands: ReturnType<NamespaceClient["command"]>;
}

/**
 * Suspended and errored instances remain account resources (failed: owned and destroyed, never
 * released); only DESTROYED proves absence. An unknown status fails closed.
 */
function phaseOf(status: Status): Phase {
	switch (status) {
		case Status.PENDING:
		case Status.CREATING:
			return "pending";
		case Status.RUNNING:
			return "ready";
		case Status.SUSPENDING:
		case Status.SUSPENDED:
		case Status.ERROR:
			return "failed";
		case Status.DESTROYING:
			return "deleting";
		case Status.DESTROYED:
			return "gone";
		default:
			throw new Error(`Namespace returned an unknown instance status ${status}`);
	}
}

/** The documented purpose carries the kit marker's attempt UUID under the Namespace prefix. */
const purposeOf = (marker: string) =>
	`${NAMESPACE_PURPOSE_PREFIX}${marker.slice(MARKER_PREFIX.length)}`;
const markerOf = (purpose: string) =>
	purpose.startsWith(NAMESPACE_PURPOSE_PREFIX)
		? `${MARKER_PREFIX}${purpose.slice(NAMESPACE_PURPOSE_PREFIX.length)}`
		: undefined;

const codeIn = (codes: readonly Code[]) => (error: unknown) =>
	matchesAnyCause(error, (cause) => cause instanceof ConnectError && codes.includes(cause.code));
const notFound = codeIn([Code.NotFound]);
const refusal = codeIn([
	Code.InvalidArgument,
	Code.Unauthenticated,
	Code.PermissionDenied,
	Code.ResourceExhausted,
]);
const exhausted = codeIn([Code.ResourceExhausted]);

// RunCommandSync collapses nonzero exits to 1. Capture the guest status before the RPC wrapper
// sees it; a missing or truncated trailer is an unknown exit, never an invented success.
const sentinelWrapped = (command: string) =>
	`( ${command}\n); printf '\\n${NAMESPACE_EXIT_SENTINEL}%d\\n' "$?"`;
function splitSentinel(stdout: string) {
	const marker = stdout.lastIndexOf(`\n${NAMESPACE_EXIT_SENTINEL}`);
	if (marker === -1) return { stdout };
	const match = /^(\d{1,3})\n?$/.exec(stdout.slice(marker + 1 + NAMESPACE_EXIT_SENTINEL.length));
	if (match === null || Number(match[1]) > 255) return { stdout };
	return { stdout: stdout.slice(0, marker), exitCode: Number(match[1]) };
}

export function namespaceVendor(
	{ resolvedArtifact }: Pick<DriverContext<"namespace">, "resolvedArtifact">,
	client: NamespaceClient,
): Vendor<NamespaceRow, NamespaceNative> {
	const control = (signal: AbortSignal) => ({ timeoutMs: NAMESPACE_CONTROL_TIMEOUT_MS, signal });
	const record = (row: NamespaceRow): VendorRecord<NamespaceRow> => {
		const marker = markerOf(row.instance.documentedPurpose);
		return {
			id: row.instance.instanceId,
			phase: phaseOf(row.instance.status),
			...(marker !== undefined && { marker }),
			raw: row,
		};
	};
	const decoder = new TextDecoder();

	return {
		control: {
			// RunCommandSync hangs against a pending container: readiness is observed by describe,
			// never read off the create acknowledgement.
			create: async ({ request, marker }, { signal }) => {
				const { metadata, extendedMetadata } = await client.compute.createInstance(
					create(CreateInstanceRequestSchema, {
						shape: {
							virtualCpu: request.spec.vcpus,
							memoryMegabytes: request.spec.memoryGb * 1024,
							machineArch: "amd64",
							os: "linux",
						},
						containers: [
							{
								name: NAMESPACE_CONTAINER,
								imageRef: resolvedArtifact.ref,
								args: ["sleep", "infinity"],
								environment: request.env ?? {},
							},
						],
						documentedPurpose: purposeOf(marker),
						deadline: timestampFromDate(new Date(Date.now() + NAMESPACE_INSTANCE_LIFETIME_MS)),
					}),
					control(signal),
				);
				const commandEndpoint = extendedMetadata?.commandServiceEndpoint;
				if (!metadata?.instanceId || !commandEndpoint)
					throw new Error("Namespace create omitted instance identity or command endpoint");
				return { ...record({ instance: metadata, commandEndpoint }), phase: "pending" };
			},
			get: async (instanceId, { signal }) => {
				try {
					const { metadata, extendedMetadata } = await client.compute.describeInstance(
						{ instanceId },
						control(signal),
					);
					if (metadata?.instanceId !== instanceId)
						throw new Error("Namespace describe returned no matching instance metadata");
					const commandEndpoint = extendedMetadata?.commandServiceEndpoint;
					return record({ instance: metadata, ...(commandEndpoint && { commandEndpoint }) });
				} catch (error) {
					if (notFound(error)) return null;
					throw error;
				}
			},
			remove: async (instanceId, { signal }) => {
				try {
					await client.compute.destroyInstance(
						{ instanceId, reason: "sandbox-benchmarks teardown" },
						control(signal),
					);
					return "accepted";
				} catch (error) {
					if (notFound(error)) return "removed";
					throw error;
				}
			},
			// The SDK's byte cursor travels as base64; completed runs are listed so no retained
			// allocation is hidden.
			page: async (cursor, { signal }) => {
				const page = await client.compute.listInstances(
					{
						paginationCursor:
							cursor === undefined ? new Uint8Array() : Uint8Array.fromBase64(cursor),
						maxEntries: 100n,
						includeCompleteRuns: true,
					},
					control(signal),
				);
				const records = page.instances.map((instance) => record({ instance }));
				return page.paginationCursor.length === 0
					? { records }
					: { records, next: page.paginationCursor.toBase64() };
			},
			refused: (error) => (refusal(error) ? { retryable: exhausted(error) } : undefined),
		},
		data: {
			attach: ({ id, raw }) => {
				if (!raw.commandEndpoint)
					throw new Error("Namespace reported no command endpoint for the instance");
				return { instanceId: id, commands: client.command(raw.commandEndpoint) };
			},
			exec: async ({ instanceId, commands }, command, options?: ExecOptions) => {
				const result = await commands.runCommandSync(
					{
						instanceId,
						targetContainerName: NAMESPACE_CONTAINER,
						command: { command: ["sh", "-c", sentinelWrapped(command)] },
					},
					{ signal: options?.signal },
				);
				return {
					...splitSentinel(decoder.decode(result.stdout)),
					stderr: decoder.decode(result.stderr),
				};
			},
		},
	};
}
