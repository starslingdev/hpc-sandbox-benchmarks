// One unary call to `ModalClient/SandboxGetTimeRangeStats`, which the pinned `modal` SDK does not
// generate yet (see proto/modal/client/sandbox_stats.proto for when to delete this).

import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import type { ModalClient } from "modal";
import { createChannel, createClientFactory, Metadata } from "nice-grpc";
import {
	SandboxGetTimeRangeStatsRequestSchema,
	SandboxGetTimeRangeStatsResponseSchema,
} from "./gen/modal/client/sandbox_stats_pb.ts";

export interface SandboxStatsRequest {
	readonly appId: string;
	/** Inclusive, on a UTC hour boundary; the server rejects a range wider than 7 days. */
	readonly since: Date;
	readonly groupByTags: readonly string[];
	/** Only Sandboxes carrying all of these tags. */
	readonly tags: Readonly<Record<string, string>>;
}

/** One `SandboxStatsGroup`, keeping only the non-deprecated decimal-string USD fields. */
export interface SandboxStatsGroup {
	/** The group's value for each `groupByTags` name; `null` where a Sandbox lacks the tag. */
	readonly tags: Readonly<Record<string, string | null>>;
	readonly cost: string;
	/** By billed resource: `CPU`, `Memory`, GPU types. */
	readonly costByResource: Readonly<Record<string, string>>;
}

const encode = (request: SandboxStatsRequest & { readonly pageToken: string }) =>
	toBinary(
		SandboxGetTimeRangeStatsRequestSchema,
		create(SandboxGetTimeRangeStatsRequestSchema, {
			...request,
			since: timestampFromDate(request.since),
			groupByTags: [...request.groupByTags],
			tags: { ...request.tags },
		}),
	);

export function decodeSandboxStatsResponse(bytes: Uint8Array) {
	const response = fromBinary(SandboxGetTimeRangeStatsResponseSchema, bytes);
	return {
		nextPageToken: response.nextPageToken,
		groups: response.groups.map(
			(group): SandboxStatsGroup => ({
				tags: Object.fromEntries(
					Object.entries(group.tags).map(([name, tag]) => [name, tag.value ?? null]),
				),
				cost: group.costStr,
				costByResource: { ...group.costByResourceStr },
			}),
		),
	};
}

const clientOnly = (): never => {
	throw new Error("SandboxGetTimeRangeStats is client-only here");
};

const definition = {
	sandboxGetTimeRangeStats: {
		path: "/modal.client.ModalClient/SandboxGetTimeRangeStats",
		requestStream: false,
		responseStream: false,
		requestSerialize: encode,
		requestDeserialize: clientOnly,
		responseSerialize: clientOnly,
		responseDeserialize: decodeSandboxStatsResponse,
		options: {},
	},
} as const;

/** Authenticates with the SDK profile's token headers, which the control plane accepts alone. */
export function sandboxStatsClient(
	profile: Pick<ModalClient["profile"], "serverUrl" | "tokenId" | "tokenSecret">,
) {
	const { tokenId, tokenSecret } = profile;
	if (!tokenId || !tokenSecret) throw new Error("Modal token credentials are required");
	const channel = createChannel(profile.serverUrl);
	const host = new URL(profile.serverUrl).hostname;
	const client = createClientFactory()
		.use(async function* authenticate(call, options) {
			const metadata = Metadata(options.metadata)
				.set("x-modal-client-type", "8")
				.set("x-modal-client-version", "1.0.0")
				.set("x-modal-token-id", tokenId)
				.set("x-modal-token-secret", tokenSecret)
				.set("x-modal-host", host);
			return yield* call.next(call.request, { ...options, metadata });
		})
		.create(definition, channel);
	return {
		async *stats(request: SandboxStatsRequest): AsyncGenerator<SandboxStatsGroup> {
			let pageToken = "";
			do {
				const page = await client.sandboxGetTimeRangeStats({ ...request, pageToken });
				yield* page.groups;
				pageToken = page.nextPageToken;
			} while (pageToken);
		},
		close: () => channel.close(),
	};
}
