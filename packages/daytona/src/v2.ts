// Daytona v2 (api.daytona.com) burstable sandboxes, through @daytona/sdk 2.x's `v2` client.
//
// The 0.x SDK every existing cell creates on stays pinned under its own name; the 2.x line is
// installed alongside it as `@daytona/sdk-v2`, so nothing on v0 moves.
//
// A v2 sandbox has a guarantee (`cpu`, `memoryGib`) and a ceiling (`cpuMax`, `memoryMaxGib`); one
// core is 2 vCPU. Each bucket bills the greater of measured use and the guarantee, so CPU and memory
// used above the guarantee are billed as measured: https://www.daytona.com/docs/billing#sandbox-billing

import type { DaytonaV2Client } from "@daytona/sdk-v2";
import { Daytona, DEFAULT_V2_API_URL } from "@daytona/sdk-v2";
import type { CreateSandboxOptions } from "@daytona/sdk-v2/v2";
import { type } from "arktype";

export interface DaytonaV2Shape {
	readonly cpu: number;
	readonly cpuMax: number;
	readonly memoryGib: number;
	readonly memoryMaxGib: number;
	readonly diskGib: number;
	/** A CPU type from `/cpu-catalog`; requesting one multiplies the CPU price. */
	readonly cpuType: keyof typeof DAYTONA_V2_RATES.cpuTypeMultiplier;
}

/**
 * A 2-core / 0.5 GiB guarantee bursting to the Starter plan's 4-core / 8 GiB ceiling, with 40 GiB disk, on
 * Zen 5. An unrequested create also lands on Zen 5 today, but is billed at the baseline rate and
 * Daytona does not promise that placement; requesting `zen5` pins it and bills CPU at its multiplier.
 */
export const DAYTONA_V2_BURST: DaytonaV2Shape = Object.freeze({
	cpu: 2,
	cpuMax: 4,
	memoryGib: 0.5,
	memoryMaxGib: 8,
	diskGib: 40,
	cpuType: "zen5",
});

const usagePeriod = type({
	start_at: "string.date.iso",
	duration_ms: "number.integer >= 0",
	cpu_core_seconds: "number >= 0",
	memory_byte_seconds: "number >= 0",
	memory_peak_bytes: "number.integer >= 0",
});
export type DaytonaV2UsagePeriod = typeof usagePeriod.infer;

const usageHistory = type({ available: "boolean", periods: usagePeriod.array() });
export type DaytonaV2UsageHistory = typeof usageHistory.infer;

/** The SDK's v2 client. Ids are `sbx_<id>-<region>`, not v0's UUIDs. */
export function daytonaV2(apiKey: string): DaytonaV2Client {
	return new Daytona({ apiKey }).v2;
}

/** Create options for a burst sandbox of `shape`, for `daytonaV2(key).create(options)`. */
export function burstCreateOptions(name: string, shape: DaytonaV2Shape): CreateSandboxOptions {
	return {
		name,
		cpuType: shape.cpuType,
		resources: {
			cpu: shape.cpu,
			cpuMax: shape.cpuMax,
			memory: shape.memoryGib,
			memoryMax: shape.memoryMaxGib,
			disk: shape.diskGib,
		},
	};
}

/**
 * Minute usage buckets for one sandbox. The SDK has no helper for
 * `GET /sandboxes/{id}/usage/history` (2.0.0-alpha.13 carries only its generated type, unexported),
 * so this is the one v2 call made directly, narrowed at its edge.
 */
export async function daytonaV2UsageHistory(
	apiKey: string,
	sandboxId: string,
	startAt: Date,
	endAt: Date,
): Promise<DaytonaV2UsageHistory> {
	const query = new URLSearchParams({
		start_at: startAt.toISOString(),
		end_at: endAt.toISOString(),
		resolution: "minute",
	});
	const response = await fetch(
		`${DEFAULT_V2_API_URL}/sandboxes/${encodeURIComponent(sandboxId)}/usage/history?${query}`,
		{ headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) },
	);
	if (!response.ok) {
		throw new Error(`Daytona v2 GET /sandboxes/{id}/usage/history: HTTP ${response.status}`);
	}
	return usageHistory.assert(await response.json());
}

/**
 * On-demand list rates. The CPU type multiplies CPU only (memory is unaffected), and a create that
 * names no region at its default region's multiplier, or Earth's (1) when none is set:
 * https://www.daytona.com/docs/billing#pricing-dimensions
 */
export const DAYTONA_V2_RATES = Object.freeze({
	verifiedAt: "2026-11-15T05:20:00.000Z",
	sourceUrls: ["https://www.daytona.com/pricing", "https://www.daytona.com/docs/billing"],
	componentIds: ["linux.cpu.core_hour.on_demand", "linux.memory.gib_hour.on_demand"],
	coreHourUsd: 0.101,
	memoryGibHourUsd: 0.0162,
	cpuTypeMultiplier: { zen5: 2.3313 },
});

/** Price buckets as Daytona bills them. Ephemeral disk is free, so it is not priced. */
export function priceV2(periods: readonly DaytonaV2UsagePeriod[], shape: DaytonaV2Shape) {
	let wall = 0;
	let measuredCore = 0;
	let billedCore = 0;
	let measuredGib = 0;
	let billedGib = 0;
	let peakMemory = 0;
	for (const period of periods) {
		const seconds = period.duration_ms / 1000;
		const gibSeconds = period.memory_byte_seconds / 2 ** 30;
		wall += seconds;
		measuredCore += period.cpu_core_seconds;
		billedCore += Math.max(period.cpu_core_seconds, shape.cpu * seconds);
		measuredGib += gibSeconds;
		billedGib += Math.max(gibSeconds, shape.memoryGib * seconds);
		peakMemory = Math.max(peakMemory, period.memory_peak_bytes);
	}
	const cpuUsd =
		(billedCore / 3600) *
		DAYTONA_V2_RATES.coreHourUsd *
		DAYTONA_V2_RATES.cpuTypeMultiplier[shape.cpuType];
	const memoryUsd = (billedGib / 3600) * DAYTONA_V2_RATES.memoryGibHourUsd;
	return {
		amount: cpuUsd + memoryUsd,
		usage: [
			{ resource: "wall_seconds", quantity: wall, unit: "s" },
			{ resource: "measured_core_seconds", quantity: measuredCore, unit: "core-s" },
			{ resource: "billed_core_seconds", quantity: billedCore, unit: "core-s" },
			{
				resource: "burst_core_seconds",
				quantity: Math.max(0, billedCore - shape.cpu * wall),
				unit: "core-s",
			},
			{ resource: "measured_memory_gib_seconds", quantity: measuredGib, unit: "GiB-s" },
			{ resource: "billed_memory_gib_seconds", quantity: billedGib, unit: "GiB-s" },
			{
				resource: "burst_memory_gib_seconds",
				quantity: Math.max(0, billedGib - shape.memoryGib * wall),
				unit: "GiB-s",
			},
			{ resource: "peak_memory_bytes", quantity: peakMemory, unit: "B" },
			{ resource: "cpu_usd", quantity: cpuUsd, unit: "USD" },
			{ resource: "memory_usd", quantity: memoryUsd, unit: "USD" },
		],
	};
}
