// Daytona v2 (api.daytona.com) burstable sandboxes, over a thin typed REST client.
//
// The pinned @daytona/sdk (0.211.2) has no v2 surface. 2.0.0 does, but it moves the root `Daytona`
// to `Daytona.v0` under the shared computesdk catalog and exports none of its generated v2 types, so
// this calls the documented endpoints and narrows only the usage-history response at its edge.
//
// A v2 sandbox has a guarantee (`cpu`, `memoryGib`) and a ceiling (`cpuMax`, `memoryMaxGib`); one
// core is 2 vCPU. Each bucket bills the greater of measured use and the guarantee, so CPU and memory
// used above the guarantee are billed as measured: https://www.daytona.com/docs/billing#sandbox-billing

import { type } from "arktype";

const API_URL = "https://api.daytona.com";

export interface DaytonaV2Shape {
	readonly cpu: number;
	readonly cpuMax: number;
	readonly memoryGib: number;
	readonly memoryMaxGib: number;
	readonly diskGib: number;
}

/**
 * A 2-core / 0.5 GiB guarantee bursting to the Starter plan's 4-core / 8 GiB ceiling, with 40 GiB disk. It
 * requests no CPU type: a `zen5` request is accepted but never placed (2026-11-14), while an
 * unrequested create lands on Zen 5 hardware anyway and is billed at the baseline rate.
 */
export const DAYTONA_V2_BURST: DaytonaV2Shape = Object.freeze({
	cpu: 2,
	cpuMax: 4,
	memoryGib: 0.5,
	memoryMaxGib: 8,
	diskGib: 40,
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

const created = type({ id: "string" });

/** The v2 calls the benchmark needs. Ids are `sbx_<id>-<region>`, not v0's UUIDs. */
export function daytonaV2Api(apiKey: string) {
	const call = async (method: string, path: string, body?: object): Promise<unknown> => {
		const response = await fetch(`${API_URL}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${apiKey}`,
				...(body && { "Content-Type": "application/json" }),
			},
			...(body && { body: JSON.stringify(body) }),
			signal: AbortSignal.timeout(10_000),
		});
		const text = await response.text();
		if (!response.ok) {
			throw new Error(`Daytona v2 ${method} ${path.split("?")[0]}: HTTP ${response.status}`);
		}
		return text ? JSON.parse(text) : undefined;
	};
	return {
		createBurst: async (name: string, shape: DaytonaV2Shape): Promise<string> => {
			const sandbox = created.assert(
				await call("POST", "/sandboxes", {
					name,
					cpu: shape.cpu,
					cores_max: shape.cpuMax,
					memory_mib: shape.memoryGib * 1024,
					memory_max_mib: shape.memoryMaxGib * 1024,
					disk_mib: shape.diskGib * 1024,
				}),
			);
			return sandbox.id;
		},
		delete: async (sandboxId: string): Promise<void> => {
			await call("DELETE", `/sandboxes/${encodeURIComponent(sandboxId)}`);
		},
		usageHistory: async (sandboxId: string, startAt: Date, endAt: Date) =>
			usageHistory.assert(
				await call(
					"GET",
					`/sandboxes/${encodeURIComponent(sandboxId)}/usage/history?start_at=${startAt.toISOString()}&end_at=${endAt.toISOString()}&resolution=minute`,
				),
			),
	};
}

/**
 * On-demand list rates. A create that names no CPU type is billed at the baseline rate, and one that
 * names no region at its default region's multiplier, or Earth's (1) when none is set:
 * https://www.daytona.com/docs/billing#pricing-dimensions
 */
export const DAYTONA_V2_RATES = Object.freeze({
	verifiedAt: "2026-11-14T16:30:00.000Z",
	sourceUrls: ["https://www.daytona.com/pricing", "https://www.daytona.com/docs/billing"],
	componentIds: ["linux.cpu.core_hour.on_demand", "linux.memory.gib_hour.on_demand"],
	coreHourUsd: 0.101,
	memoryGibHourUsd: 0.0162,
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
	const cpuUsd = (billedCore / 3600) * DAYTONA_V2_RATES.coreHourUsd;
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
