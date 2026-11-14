// Daytona's cost evidence: the bill for exactly one benchmark sandbox, read after teardown inside the
// harness's 30 s hook budget. A bill that has not appeared by then is recorded as unmeasured.
//
//  - v0 sandboxes (today's cells): Daytona's analytics API reports each sandbox's billed USD, the
//    allocation times its wall clock (no burst on v0). Recorded as `provider_reported`.
//  - v2 burstable sandboxes: `/sandboxes/{id}/usage/history` reports measured core-seconds and
//    memory byte-seconds but no price, so the bill is `calculated_from_provider_usage` with
//    {@link priceV2} and the dated list rates recorded beside it.

import type { ModelsUsagePeriod } from "@daytona/analytics-api-client";
import { Configuration as AnalyticsConfiguration, UsageApi } from "@daytona/analytics-api-client";
import { Configuration as ApiConfiguration, ApiKeysApi } from "@daytona/api-client";
import type {
	CostEvidenceCaptureInput,
	EnvOf,
	ProviderCostEvidenceCapability,
} from "@sandbox-benchmarks/driver";
import type { ProviderCostEvidence } from "@sandbox-benchmarks/schema";
import { canonicalJsonString, PROVIDER_RESPONSE_LIMITS } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { DAYTONA_PROVENANCE } from "./provenance.ts";
import type { DaytonaV2Api, DaytonaV2Shape, DaytonaV2UsageHistory } from "./v2.ts";
import { DAYTONA_V2_RATES, daytonaV2Api, priceV2 } from "./v2.ts";
import type { DaytonaId } from "./vendor.ts";
import { DAYTONA_V0_API_URL } from "./vendor.ts";

// Measured 2026-11-14 (n=8 v0 sandboxes): a deleted sandbox's bill appears ~17–21 s after delete,
// sometimes later. Poll every 2 s, accept two identical closed responses, stop before the budget.
const POLL_MS = 2_000;
const DEADLINE_MS = 26_000;
// Usage is looked up from a day before teardown: no benchmark sandbox outlives that.
const LOOKBACK_MS = 24 * 3_600_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// The v0 key endpoint returns the key's organization, which 0.211.2's ApiKeyList type omits.
const keyOrganization = type({ organizationId: "string.uuid" });

/** Poll until two consecutive reads agree and `settled` holds, or the deadline passes. */
async function settle<T>(
	read: () => Promise<T>,
	settled: (value: T) => boolean,
): Promise<{ value: T; settled: boolean }> {
	const deadline = Date.now() + DEADLINE_MS;
	let previous: string | undefined;
	let value = await read();
	for (;;) {
		const key = JSON.stringify(value);
		if (settled(value) && key === previous) return { value, settled: true };
		if (Date.now() + POLL_MS > deadline) return { value, settled: false };
		previous = key;
		await sleep(POLL_MS);
		value = await read();
	}
}

async function captureV0(
	input: CostEvidenceCaptureInput<DaytonaId>,
	env: EnvOf<DaytonaId>,
): Promise<ProviderCostEvidence> {
	const auth = { headers: { Authorization: `Bearer ${env.DAYTONA_API_KEY}` } };
	const key = keyOrganization(
		(
			await new ApiKeysApi(
				new ApiConfiguration({ basePath: DAYTONA_V0_API_URL, baseOptions: auth }),
			).getCurrentApiKey()
		).data,
	);
	if (key instanceof type.errors) throw new Error("Daytona API key has no organization id");
	const organizationId = key.organizationId;
	const usage = new UsageApi(
		new AnalyticsConfiguration({
			baseOptions: {
				headers: { ...auth.headers, "X-Daytona-Organization-ID": organizationId },
			},
		}),
	);
	const torn = Date.parse(input.teardown.attemptedAt);
	const from = new Date(torn - LOOKBACK_MS).toISOString();
	const to = new Date(torn + 3_600_000).toISOString();
	const base = {
		cell: input.cell,
		subject: { kind: "sandbox", sandboxId: input.sandboxId, organizationId },
		capturedAt: new Date().toISOString(),
		sdk: DAYTONA_PROVENANCE,
		apiOperation: "organizationOrganizationIdSandboxSandboxIdUsageGet",
	} as const;
	const closed = (periods: ModelsUsagePeriod[]) =>
		periods.length > 0 &&
		periods.every((period) => period.startAt && period.endAt && Number.isFinite(period.price));
	const { value: periods, settled } = await settle(
		async () =>
			(
				await usage.organizationOrganizationIdSandboxSandboxIdUsageGet(
					organizationId,
					input.sandboxId,
					from,
					to,
				)
			).data,
		closed,
	);
	const responseJson = canonicalJsonString(
		{ request: { from, to }, periods },
		PROVIDER_RESPONSE_LIMITS,
	);
	if (!settled) {
		return {
			...base,
			kind: "missing",
			reason: "provider_api_error",
			detail: "The sandbox's usage periods did not appear closed before the capture deadline.",
			responseJson,
		};
	}
	const seconds = (period: ModelsUsagePeriod) =>
		(Date.parse(period.endAt ?? "") - Date.parse(period.startAt ?? "")) / 1000;
	const sum = (value: (period: ModelsUsagePeriod) => number) =>
		periods.reduce((total, period) => total + value(period), 0);
	return {
		...base,
		kind: "observed",
		// v0 bills the allocation for the sandbox's wall clock: reserved quantities, not measured use.
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
			{ resource: "gpu_seconds", quantity: sum((p) => (p.gpu ?? 0) * seconds(p)), unit: "GPU-s" },
		],
		amount: sum((p) => p.price ?? 0),
		currency: "USD",
		source: "provider_reported",
		responseJson,
	};
}

async function captureV2(
	input: CostEvidenceCaptureInput<DaytonaId>,
	api: DaytonaV2Api,
	shape: DaytonaV2Shape,
): Promise<ProviderCostEvidence> {
	const torn = Date.parse(input.teardown.attemptedAt);
	const startAt = new Date(torn - LOOKBACK_MS);
	const endAt = new Date(torn + 120_000);
	const base = {
		cell: input.cell,
		subject: { kind: "sandbox", sandboxId: input.sandboxId },
		capturedAt: new Date().toISOString(),
		sdk: DAYTONA_PROVENANCE,
		apiOperation: "get_sandbox_usage_history",
	} as const;
	// Settled once the last bucket reaches teardown: a minute bucket reports the span it covered.
	const reachesTeardown = (history: DaytonaV2UsageHistory) => {
		const last = history.periods.at(-1);
		return (
			history.available &&
			last !== undefined &&
			Date.parse(last.start_at) + last.duration_ms >= torn - 1_000
		);
	};
	const { value: history, settled } = await settle(
		() => api.usageHistory(input.sandboxId, startAt, endAt),
		reachesTeardown,
	);
	const responseJson = canonicalJsonString(history, PROVIDER_RESPONSE_LIMITS);
	if (!settled) {
		return {
			...base,
			kind: "missing",
			reason: "provider_api_error",
			detail: "The sandbox's usage history did not reach teardown before the capture deadline.",
			responseJson,
		};
	}
	return {
		...base,
		kind: "observed",
		...priceV2(history.periods, shape),
		currency: "USD",
		source: "calculated_from_provider_usage",
		calculation: {
			componentIds: [...DAYTONA_V2_RATES.componentIds],
			rateVerifiedAt: DAYTONA_V2_RATES.verifiedAt,
			sourceUrls: [...DAYTONA_V2_RATES.sourceUrls],
		},
		responseJson,
	};
}

/**
 * The cost hook for a Daytona cell. `v0` is every existing cell; `v2` takes the burst shape the
 * sandbox was created with, since the guarantee is the billing floor.
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
				? captureV0(input, env)
				: captureV2(input, daytonaV2Api(env.DAYTONA_API_KEY), platform.shape);
		},
	};
}
