// Modal's cost evidence: the billed USD of exactly one benchmark sandbox, CPU burst included. Every
// sandbox carries its ownership marker as a tag, and SandboxGetTimeRangeStats filtered on that one
// value returns that sandbox's cost alone.

import type {
	CostEvidenceCaptureInput,
	EnvOf,
	ProviderCostEvidenceCapability,
} from "@sandbox-benchmarks/driver";
import { LEAK_EXPIRY_MS } from "@sandbox-benchmarks/driver/vendor";
import type { ProviderCostEvidence } from "@sandbox-benchmarks/schema";
import { canonicalJsonString, PROVIDER_RESPONSE_LIMITS } from "@sandbox-benchmarks/schema";
import { ModalClient } from "modal";
import { MODAL_PROVENANCE } from "./provenance.ts";
import type { SandboxStatsGroup, SandboxStatsRequest } from "./stats.ts";
import { sandboxStatsClient } from "./stats.ts";
import type { ModalProviderId } from "./vendor.ts";
import { modalAppName } from "./vendor.ts";

export const MODAL_MARKER_TAG = "sandbox-benchmarks-marker";

const OPERATION = "SandboxGetTimeRangeStats";
// Billed cost moves for ~9 s after terminate (measured 2026-11-14): accept it once it holds for four
// 2 s polls, and give up after eleven (~20 s of waiting, inside the harness's 30 s hook budget).
const POLL_MS = 2_000;
const SETTLE_POLLS = 4;
const MAX_POLLS = 11;
const USD = /^\d{1,12}(\.\d{1,12})?$/;

/** What the hook reads from Modal; tests substitute it. */
export interface ModalBilling {
	tags(sandboxId: string): Promise<Readonly<Record<string, string>>>;
	appId(appName: string): Promise<string>;
	stats(request: SandboxStatsRequest): AsyncIterable<SandboxStatsGroup>;
	close(): void;
}

function modalBilling(env: EnvOf<ModalProviderId>): ModalBilling {
	const client = new ModalClient({
		tokenId: env.MODAL_TOKEN_ID,
		tokenSecret: env.MODAL_TOKEN_SECRET,
	});
	const stats = sandboxStatsClient(client.profile);
	return {
		tags: async (id) => (await client.sandboxes.fromId(id)).getTags(),
		appId: async (name) => (await client.apps.fromName(name)).appId,
		stats: (request) => stats.stats(request),
		close: () => {
			stats.close();
			client.close();
		},
	};
}

type Outcome =
	| { readonly group: SandboxStatsGroup }
	| { readonly invalid: readonly SandboxStatsGroup[] }
	| { readonly last?: SandboxStatsGroup };

const validGroup = (group: SandboxStatsGroup, marker: string) =>
	group.tags[MODAL_MARKER_TAG] === marker &&
	USD.test(group.cost) &&
	Object.keys(group.costByResource).length > 0 &&
	Object.values(group.costByResource).every((usd) => USD.test(usd));

async function settle(
	billing: ModalBilling,
	request: SandboxStatsRequest,
	marker: string,
	sleep: (ms: number) => Promise<void>,
): Promise<Outcome> {
	let last: SandboxStatsGroup | undefined;
	let unchanged = 0;
	for (let poll = 1; ; poll++) {
		const groups: SandboxStatsGroup[] = [];
		for await (const group of billing.stats(request)) groups.push(group);
		const [group] = groups;
		if (groups.length > 1 || (group && !validGroup(group, marker))) return { invalid: groups };
		if (group) {
			unchanged = group.cost === last?.cost ? unchanged + 1 : 0;
			last = group;
			if (unchanged >= SETTLE_POLLS) return { group };
		}
		if (poll >= MAX_POLLS) return last ? { last } : {};
		await sleep(POLL_MS);
	}
}

export function modalCostEvidence(
	provider: ModalProviderId,
	options: {
		readonly billing?: (env: EnvOf<ModalProviderId>) => ModalBilling;
		readonly sleep?: (ms: number) => Promise<void>;
	} = {},
): ProviderCostEvidenceCapability<ModalProviderId> {
	const appName = modalAppName(provider);
	const sleep = options.sleep ?? ((ms: number) => Bun.sleep(ms));
	return {
		sdk: MODAL_PROVENANCE,
		captureAfterTeardown: async (
			input: CostEvidenceCaptureInput<ModalProviderId>,
			env: EnvOf<ModalProviderId>,
		): Promise<ProviderCostEvidence> => {
			const record = {
				cell: input.cell,
				subject: { kind: "sandbox", sandboxId: input.sandboxId, appName },
				capturedAt: new Date().toISOString(),
				sdk: MODAL_PROVENANCE,
			} as const;
			// Billing for a sandbox that may still run is not final.
			if (!input.teardown.completed) {
				return {
					...record,
					kind: "missing",
					reason: "sandbox_teardown_unconfirmed",
					detail: "Sandbox teardown was not confirmed; no provider usage was considered.",
				};
			}
			const billing = (options.billing ?? modalBilling)(env);
			try {
				const [tags, appId] = await Promise.all([
					billing.tags(input.sandboxId),
					billing.appId(appName),
				]);
				const base = { ...record, subject: { ...record.subject, appId }, apiOperation: OPERATION };
				const marker = tags[MODAL_MARKER_TAG];
				if (marker === undefined) {
					return {
						...base,
						kind: "missing",
						reason: "not_sandbox_scoped",
						detail: `The sandbox has no ${MODAL_MARKER_TAG} tag to isolate its cost by.`,
					};
				}
				// The window opens on the hour the longest-lived sandbox could have started.
				const since = Date.parse(input.teardown.attemptedAt) - LEAK_EXPIRY_MS;
				const request: SandboxStatsRequest = {
					appId,
					since: new Date(Math.floor(since / 3_600_000) * 3_600_000),
					groupByTags: [MODAL_MARKER_TAG],
					tags: { [MODAL_MARKER_TAG]: marker },
				};
				const response = (groups: readonly SandboxStatsGroup[]) =>
					canonicalJsonString(
						{ request: { ...request, since: request.since.toISOString() }, groups },
						PROVIDER_RESPONSE_LIMITS,
					);
				const outcome = await settle(billing, request, marker, sleep);
				if ("invalid" in outcome) {
					return {
						...base,
						kind: "missing",
						reason: "invalid_provider_response",
						detail: "The response was not exactly this sandbox's decimal USD cost.",
						responseJson: response(outcome.invalid),
					};
				}
				if (!("group" in outcome)) {
					return {
						...base,
						kind: "missing",
						reason: "provider_api_error",
						detail: "The reported cost did not settle before the capture deadline.",
						...(outcome.last && { responseJson: response([outcome.last]) }),
					};
				}
				const { group } = outcome;
				return {
					...base,
					kind: "observed",
					// Modal reports billed USD per resource, not quantities: the cost is the usage.
					usage: Object.entries(group.costByResource)
						.sort()
						.map(([resource, usd]) => ({ resource, quantity: Number(usd), unit: "USD" })),
					amount: Number(group.cost),
					currency: "USD",
					source: "provider_reported",
					responseJson: response([group]),
				};
			} finally {
				billing.close();
			}
		},
	};
}
