// Daytona's cost evidence: the bill for exactly one benchmark sandbox, read after teardown within
// the harness's 30 s hook budget. A bill that has not settled by then is recorded as unmeasured.
//
//  - v0 (every existing cell): the analytics API reports each sandbox's billed USD, its allocation
//    times its wall clock, so v0 has no burst. Recorded as `provider_reported`.
//  - v2 (burstable): usage history reports measured core-seconds and memory byte-seconds but no
//    price, so the bill is `calculated_from_provider_usage` at the dated list rates.

import type { ModelsUsagePeriod } from "@daytona/analytics-api-client";
import { Configuration as AnalyticsConfiguration, UsageApi } from "@daytona/analytics-api-client";
import { Configuration as ApiConfiguration, ApiKeysApi } from "@daytona/api-client";
import type {
	CostEvidenceCaptureInput,
	EnvOf,
	ProviderCostEvidenceCapability,
} from "@sandbox-benchmarks/driver";
import type {
	ObservedProviderCostEvidence,
	ProviderCostEvidence,
} from "@sandbox-benchmarks/schema";
import { canonicalJsonString, PROVIDER_RESPONSE_LIMITS } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { DAYTONA_PROVENANCE } from "./provenance.ts";
import type { DaytonaV2Shape, DaytonaV2UsageHistory } from "./v2.ts";
import { DAYTONA_V2_RATES, daytonaV2Api, priceV2 } from "./v2.ts";
import type { DaytonaId } from "./vendor.ts";
import { DAYTONA_V0_API_URL } from "./vendor.ts";

// v0 bills appeared ~17–21 s after delete, sometimes later (n=11, 2026-11-14). Poll every 2 s and
// accept two identical settled reads, stopping short of the harness's 30 s budget.
const POLL_MS = 2_000;
const DEADLINE_MS = 26_000;
// No benchmark sandbox outlives a day.
const LOOKBACK_MS = 24 * 3_600_000;

// The v0 key endpoint returns the key's organization; 0.211.2's ApiKeyList type omits it.
const keyOrganization = type({ organizationId: "string.uuid" });

/** One platform's billing read: what to poll, when it is final, and how it prices. */
interface Bill<T> {
	readonly apiOperation: string;
	readonly organizationId?: string;
	read(): Promise<T>;
	settled(value: T): boolean;
	unsettled(value: T): string;
	response(value: T): object;
	price(
		value: T,
	): Pick<ObservedProviderCostEvidence, "usage" | "amount" | "source" | "calculation">;
}

async function v0Bill(
	input: CostEvidenceCaptureInput<DaytonaId>,
	env: EnvOf<DaytonaId>,
): Promise<Bill<ModelsUsagePeriod[]>> {
	const headers = { Authorization: `Bearer ${env.DAYTONA_API_KEY}` };
	const { organizationId } = keyOrganization.assert(
		(
			await new ApiKeysApi(
				new ApiConfiguration({ basePath: DAYTONA_V0_API_URL, baseOptions: { headers } }),
			).getCurrentApiKey()
		).data,
	);
	const usage = new UsageApi(
		new AnalyticsConfiguration({
			baseOptions: { headers: { ...headers, "X-Daytona-Organization-ID": organizationId } },
		}),
	);
	const torn = Date.parse(input.teardown.attemptedAt);
	const from = new Date(torn - LOOKBACK_MS).toISOString();
	const to = new Date(torn + 3_600_000).toISOString();
	const seconds = (p: ModelsUsagePeriod) =>
		(Date.parse(p.endAt ?? "") - Date.parse(p.startAt ?? "")) / 1000;
	return {
		apiOperation: "organizationOrganizationIdSandboxSandboxIdUsageGet",
		organizationId,
		read: async () =>
			(
				await usage.organizationOrganizationIdSandboxSandboxIdUsageGet(
					organizationId,
					input.sandboxId,
					from,
					to,
				)
			).data,
		settled: (periods) =>
			periods.length > 0 && periods.every((p) => p.startAt && p.endAt && p.price !== undefined),
		unsettled: () => "The sandbox's usage periods were not closed before the capture deadline.",
		response: (periods) => ({ request: { from, to }, periods }),
		price: (periods) => {
			const sum = (value: (p: ModelsUsagePeriod) => number) =>
				periods.reduce((total, p) => total + value(p), 0);
			return {
				// The allocation for the sandbox's wall clock: reserved quantities, not measured use.
				usage: [
					{ resource: "wall_seconds", quantity: sum(seconds), unit: "s" },
					{
						resource: "allocated_vcpu_seconds",
						quantity: sum((p) => (p.cpu ?? 0) * seconds(p)),
						unit: "vCPU-s",
					},
					{
						resource: "allocated_memory_gib_seconds",
						quantity: sum((p) => (p.ramGB ?? 0) * seconds(p)),
						unit: "GiB-s",
					},
					{
						resource: "allocated_disk_gib_seconds",
						quantity: sum((p) => (p.diskGB ?? 0) * seconds(p)),
						unit: "GiB-s",
					},
				],
				amount: sum((p) => p.price ?? 0),
				source: "provider_reported",
			};
		},
	};
}

function v2Bill(
	input: CostEvidenceCaptureInput<DaytonaId>,
	env: EnvOf<DaytonaId>,
	shape: DaytonaV2Shape,
): Bill<DaytonaV2UsageHistory> {
	const api = daytonaV2Api(env.DAYTONA_API_KEY);
	const torn = Date.parse(input.teardown.attemptedAt);
	const startAt = new Date(torn - LOOKBACK_MS);
	const endAt = new Date(torn + 120_000);
	return {
		apiOperation: "get_sandbox_usage_history",
		read: () => api.usageHistory(input.sandboxId, startAt, endAt),
		// A minute bucket reports the span it covered; settled once the last one reaches teardown.
		settled: ({ available, periods }) => {
			const last = periods.at(-1);
			return (
				available &&
				last !== undefined &&
				Date.parse(last.start_at) + last.duration_ms >= torn - 1_000
			);
		},
		// Seen 2026-11-14: an org can create v2 sandboxes before Daytona meters their usage.
		unsettled: ({ available }) =>
			available
				? "The sandbox's usage history did not reach teardown before the capture deadline."
				: "Daytona reported the sandbox's usage history as unavailable (`available: false`).",
		response: (history) => history,
		price: ({ periods }) => ({
			...priceV2(periods, shape),
			source: "calculated_from_provider_usage",
			calculation: {
				componentIds: [...DAYTONA_V2_RATES.componentIds],
				rateVerifiedAt: DAYTONA_V2_RATES.verifiedAt,
				sourceUrls: [...DAYTONA_V2_RATES.sourceUrls],
			},
		}),
	};
}

/** Poll until two consecutive reads agree and are settled, or the deadline passes. */
async function capture<T>(
	bill: Bill<T>,
	record: Pick<ProviderCostEvidence, "cell" | "subject" | "capturedAt" | "sdk">,
): Promise<ProviderCostEvidence> {
	const deadline = Date.now() + DEADLINE_MS;
	let value = await bill.read();
	let previous: string | undefined;
	let settled = false;
	for (;;) {
		const key = JSON.stringify(value);
		settled = bill.settled(value) && key === previous;
		if (settled || Date.now() + POLL_MS > deadline) break;
		previous = key;
		await Bun.sleep(POLL_MS);
		value = await bill.read();
	}
	const base = {
		...record,
		subject: {
			...record.subject,
			...(bill.organizationId && { organizationId: bill.organizationId }),
		},
		apiOperation: bill.apiOperation,
		responseJson: canonicalJsonString(bill.response(value), PROVIDER_RESPONSE_LIMITS),
	};
	return settled
		? { ...base, kind: "observed", currency: "USD", ...bill.price(value) }
		: { ...base, kind: "missing", reason: "provider_api_error", detail: bill.unsettled(value) };
}

/**
 * The cost hook for a Daytona cell: `v0` for every existing cell, `v2` with the burst shape the
 * sandbox was created with, since its guarantee is the billing floor.
 */
export function daytonaCostEvidence(
	platform: { readonly api: "v0" } | { readonly api: "v2"; readonly shape: DaytonaV2Shape },
): ProviderCostEvidenceCapability<DaytonaId> {
	return {
		sdk: DAYTONA_PROVENANCE,
		captureAfterTeardown: async (input, env) => {
			const record = {
				cell: input.cell,
				subject: { kind: "sandbox", sandboxId: input.sandboxId },
				capturedAt: new Date().toISOString(),
				sdk: DAYTONA_PROVENANCE,
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
			return platform.api === "v0"
				? capture(await v0Bill(input, env), record)
				: capture(v2Bill(input, env, platform.shape), record);
		},
	};
}
