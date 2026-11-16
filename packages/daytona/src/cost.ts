// Daytona's cost evidence: the bill for exactly one benchmark sandbox, read after teardown within
// the harness's 30 s hook budget. A bill that has not settled by then is recorded as unmeasured.
//
//  - v0 (daytona-container): the analytics API reports each sandbox's billed USD, its allocation
//    times its wall clock, so v0 has no burst. Recorded as `provider_reported`.
//  - v2 (daytona-vm, burstable): usage history reports measured core-seconds and memory byte-seconds but no
//    price, so the bill is `calculated_from_provider_usage` at the dated list rates.

import type { ModelsUsagePeriod } from "@daytona/analytics-api-client";
import { Configuration as AnalyticsConfiguration, UsageApi } from "@daytona/analytics-api-client";
import { Configuration as ApiConfiguration, ApiKeysApi } from "@daytona/api-client";
import { DEFAULT_V2_API_URL } from "@daytona/sdk";
import type { CreateSandboxOptions } from "@daytona/sdk/v2";
import type {
	CostEvidenceCaptureInput,
	EnvOf,
	ProviderCostEvidenceCapability,
} from "@sandbox-benchmarks/driver";
import type {
	ObservedProviderCostEvidence,
	ProviderCostEvidence,
} from "@sandbox-benchmarks/schema";
import {
	BILLED_WALL_SECONDS,
	canonicalJsonString,
	PROVIDER_RESPONSE_LIMITS,
} from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { DAYTONA_PROVENANCE } from "./provenance.ts";
import type { DaytonaId } from "./vendor.ts";
import { DAYTONA_V2_BURST } from "./vendor.ts";

// On-demand list rates; a `cpuType` multiplies CPU only, and ephemeral disk is free:
// https://www.daytona.com/docs/billing#pricing-dimensions
const V2_RATES = {
	coreHourUsd: 0.101,
	memoryGibHourUsd: 0.0162,
	cpuTypeMultiplier: { zen5: 0.235 / 0.101 } as Record<string, number>,
	calculation: {
		componentIds: ["linux.cpu.core_hour.on_demand", "linux.memory.gib_hour.on_demand"],
		rateVerifiedAt: "2026-11-15T05:20:00.000Z",
		sourceUrls: ["https://www.daytona.com/pricing", "https://www.daytona.com/docs/billing"],
	},
};

// `GET /sandboxes/{id}/usage/history`: the SDK has no helper for it, so it is read directly.
const usageHistory = type({
	available: "boolean",
	periods: type({
		start_at: "string.date.iso",
		duration_ms: "number.integer >= 0",
		cpu_core_seconds: "number >= 0",
		memory_byte_seconds: "number >= 0",
	}).array(),
});

// v0 bills appeared ~17–21 s after delete, sometimes later (n=11, 2026-11-14). Poll every 2 s and
// accept two identical settled reads, stopping short of the harness's 30 s budget.
const POLL_MS = 2_000;
const DEADLINE_MS = 26_000;
// No benchmark sandbox outlives a day.
const LOOKBACK_MS = 24 * 3_600_000;

// The v0 key endpoint returns the key's organization; the generated ApiKeyList leaves it optional.
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
				new ApiConfiguration({ basePath: "https://app.daytona.io/api", baseOptions: { headers } }),
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
					{ ...BILLED_WALL_SECONDS, quantity: sum(seconds) },
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
	create: CreateSandboxOptions,
): Bill<typeof usageHistory.infer> {
	const torn = Date.parse(input.teardown.attemptedAt);
	const query = new URLSearchParams({
		start_at: new Date(torn - LOOKBACK_MS).toISOString(),
		end_at: new Date(torn + 120_000).toISOString(),
		resolution: "minute",
	});
	const url = `${DEFAULT_V2_API_URL}/sandboxes/${encodeURIComponent(input.sandboxId)}/usage/history?${query}`;
	return {
		apiOperation: "get_sandbox_usage_history",
		read: async () => {
			const response = await fetch(url, {
				headers: { Authorization: `Bearer ${env.DAYTONA_API_KEY}` },
				signal: AbortSignal.timeout(10_000),
			});
			if (!response.ok) throw new Error(`Daytona v2 usage history: HTTP ${response.status}`);
			return usageHistory.assert(await response.json());
		},
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
		// Each bucket bills the greater of measured use and the guarantee.
		price: ({ periods }) => {
			const sum = (value: (p: (typeof periods)[number]) => number) =>
				periods.reduce((total, p) => total + value(p), 0);
			const floor = (p: (typeof periods)[number], guarantee = 0) =>
				(guarantee * p.duration_ms) / 1000;
			const coreSeconds = sum((p) => Math.max(p.cpu_core_seconds, floor(p, create.resources?.cpu)));
			const gibSeconds = sum((p) =>
				Math.max(p.memory_byte_seconds / 2 ** 30, floor(p, create.resources?.memory)),
			);
			const multiplier = V2_RATES.cpuTypeMultiplier[create.cpuType ?? ""] ?? 1;
			return {
				usage: [
					{ ...BILLED_WALL_SECONDS, quantity: sum((p) => p.duration_ms / 1000) },
					{ resource: "billed_core_seconds", quantity: coreSeconds, unit: "core-s" },
					{ resource: "billed_memory_gib_seconds", quantity: gibSeconds, unit: "GiB-s" },
				],
				amount:
					(coreSeconds / 3600) * V2_RATES.coreHourUsd * multiplier +
					(gibSeconds / 3600) * V2_RATES.memoryGibHourUsd,
				source: "calculated_from_provider_usage",
				calculation: V2_RATES.calculation,
			};
		},
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

/** The cost hook for a Daytona cell: daytona-vm prices v2 usage history, daytona-container reads v0. */
export function daytonaCostEvidence(
	provider: DaytonaId,
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
			return provider === "daytona-vm"
				? capture(v2Bill(input, env, DAYTONA_V2_BURST), record)
				: capture(await v0Bill(input, env), record);
		},
	};
}
