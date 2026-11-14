// Daytona v2 (api.daytona.com) for burstable cells, over a thin typed REST client.
//
// The installed @daytona/sdk (0.211.2) has no v2 surface, and 2.0.0 moves the root `Daytona` to
// `Daytona.v0`, which the shared computesdk catalog (`@computesdk/daytona`) still pins against, so
// this module calls the documented endpoints directly. 2.0.0's generated v2 types are not exported,
// so the usage-history response is narrowed here, at the parse edge, and nowhere else.
//
// A v2 sandbox has a guarantee (`cpu`, `memory`) and a ceiling (`cpuMax`, `memoryMax`). Per bucket
// Daytona bills the greater of the measured use and the guarantee, so CPU kept busy above the
// guarantee is billed as measured: https://www.daytona.com/docs/billing#sandbox-billing.

import { type } from "arktype";

export const DAYTONA_V2_API_URL = "https://api.daytona.com";
/** v2 ids are `sbx_<id>-<region>` (seen live 2026-11-14), not the v0 UUIDs of `DAYTONA_SANDBOX_ID`. */
export const DAYTONA_V2_SANDBOX_ID = type(/^sbx_[A-Za-z0-9]+-[a-z0-9-]+$/);

export type DaytonaV2CpuType =
	| "zen3"
	| "zen4"
	| "zen5"
	| "zen5c"
	| "arrowlake1"
	| "arrowlake2"
	| "graviton"
	| "graviton3"
	| "graviton4";

/** A burstable v2 Linux sandbox: cores (1 core = 2 vCPU) and GiB, guarantee then ceiling. */
export interface DaytonaV2Shape {
	readonly cpu: number;
	readonly cpuMax: number;
	readonly memoryGib: number;
	readonly memoryMaxGib: number;
	readonly diskGib: number;
	readonly cpuType?: DaytonaV2CpuType;
	readonly spot?: boolean;
	/** The create's region multiplier; Earth (1) when the create names none. */
	readonly regionMultiplier?: number;
}

/**
 * The like-for-like burst cell: a 4 vCPU guarantee that bursts to the Starter plan's ceiling of
 * 4 cores (8 vCPU) and 8 GiB, on Zen 5. Opt-in only; no existing Daytona cell uses it.
 */
export const DAYTONA_V2_ZEN5_BURST: DaytonaV2Shape = Object.freeze({
	cpu: 2,
	cpuMax: 4,
	memoryGib: 0.5,
	memoryMaxGib: 8,
	diskGib: 40,
	cpuType: "zen5",
});

/** One minute or hour bucket of `GET /sandboxes/{id}/usage/history`. */
const usagePeriod = type({
	start_at: "string.date.iso",
	duration_ms: "number.integer >= 0",
	cpu_core_seconds: "number >= 0",
	memory_byte_seconds: "number >= 0",
	memory_peak_bytes: "number.integer >= 0",
	disk_used_bytes: "number.integer >= 0",
});
export type DaytonaV2UsagePeriod = typeof usagePeriod.infer;

const usageHistory = type({
	sandbox_id: "string",
	available: "boolean",
	periods: usagePeriod.array(),
});
export type DaytonaV2UsageHistory = typeof usageHistory.infer;

export class DaytonaV2HttpError extends Error {
	constructor(
		readonly status: number,
		readonly code: string | undefined,
		message: string,
	) {
		super(message);
	}
}

export function daytonaV2Api(apiKey: string, fetchImpl: typeof fetch = fetch) {
	const call = async (method: string, path: string, body?: unknown): Promise<unknown> => {
		const response = await fetchImpl(`${DAYTONA_V2_API_URL}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${apiKey}`,
				...(body !== undefined && { "Content-Type": "application/json" }),
			},
			...(body !== undefined && { body: JSON.stringify(body) }),
			signal: AbortSignal.timeout(10_000),
		});
		const text = await response.text();
		const json: unknown = text ? JSON.parse(text) : undefined;
		if (!response.ok) {
			const error = type({ "code?": "string", "message?": "string" })(json);
			const parsed = error instanceof type.errors ? {} : error;
			throw new DaytonaV2HttpError(
				response.status,
				parsed.code,
				`Daytona v2 ${method} ${path.split("?")[0]}: HTTP ${response.status} ${parsed.code ?? ""}`,
			);
		}
		return json;
	};
	return {
		/** Create a burstable Linux sandbox from the platform default image; resolves its id. */
		createBurst: async (name: string, shape: DaytonaV2Shape): Promise<string> => {
			const created = type({ id: "string" })(
				await call("POST", "/sandboxes", {
					name,
					cpu: shape.cpu,
					cores_max: shape.cpuMax,
					memory_mib: Math.round(shape.memoryGib * 1024),
					memory_max_mib: Math.round(shape.memoryMaxGib * 1024),
					disk_mib: Math.round(shape.diskGib * 1024),
					...(shape.cpuType && { cpu_type: shape.cpuType }),
					...(shape.spot !== undefined && { spot: shape.spot }),
				}),
			);
			if (created instanceof type.errors) throw new Error("Daytona v2 create returned no id");
			return created.id;
		},
		delete: async (sandboxId: string): Promise<void> => {
			await call("DELETE", `/sandboxes/${encodeURIComponent(sandboxId)}`);
		},
		/** Minute buckets for `[startAt, endAt)`, plus the canonical response for evidence. */
		usageHistory: async (
			sandboxId: string,
			startAt: Date,
			endAt: Date,
		): Promise<DaytonaV2UsageHistory> => {
			const query = `start_at=${startAt.toISOString()}&end_at=${endAt.toISOString()}&resolution=minute`;
			const parsed = usageHistory(
				await call("GET", `/sandboxes/${encodeURIComponent(sandboxId)}/usage/history?${query}`),
			);
			if (parsed instanceof type.errors) throw new Error(`usage history: ${parsed.summary}`);
			return parsed;
		},
	};
}
export type DaytonaV2Api = ReturnType<typeof daytonaV2Api>;

/** List rates read from the sources below; the evidence records both with the date. */
export const DAYTONA_V2_RATES = Object.freeze({
	verifiedAt: "2026-11-14T16:30:00.000Z",
	sourceUrls: ["https://www.daytona.com/pricing", "https://www.daytona.com/docs/billing"],
	componentIds: ["linux.cpu.core_hour.on_demand", "linux.memory.gib_hour.on_demand"],
	coreHourUsd: 0.101,
	memoryGibHourUsd: 0.0162,
	cpuTypeMultiplier: {
		zen3: 1,
		arrowlake1: 1,
		graviton: 1,
		graviton3: 1,
		graviton4: 1,
		zen4: 1.6667,
		arrowlake2: 1.6667,
		zen5: 2.3313,
		zen5c: 2.3313,
	} satisfies Record<DaytonaV2CpuType, number>,
	spotMultiplier: 0.7,
});

/**
 * Price measured buckets the way Daytona bills them: each bucket's CPU and memory at the greater of
 * the measured use and the guarantee. Ephemeral NVMe disk is free, so disk is reported, not priced.
 */
export function priceV2(periods: readonly DaytonaV2UsagePeriod[], shape: DaytonaV2Shape) {
	const rates = DAYTONA_V2_RATES;
	const common = (shape.regionMultiplier ?? 1) * (shape.spot ? rates.spotMultiplier : 1);
	const cpuMultiplier = shape.cpuType ? rates.cpuTypeMultiplier[shape.cpuType] : 1;
	let wall = 0;
	let measuredCore = 0;
	let billedCore = 0;
	let measuredGib = 0;
	let billedGib = 0;
	let peakMemory = 0;
	let peakDisk = 0;
	for (const period of periods) {
		const seconds = period.duration_ms / 1000;
		const gibSeconds = period.memory_byte_seconds / 2 ** 30;
		wall += seconds;
		measuredCore += period.cpu_core_seconds;
		billedCore += Math.max(period.cpu_core_seconds, shape.cpu * seconds);
		measuredGib += gibSeconds;
		billedGib += Math.max(gibSeconds, shape.memoryGib * seconds);
		peakMemory = Math.max(peakMemory, period.memory_peak_bytes);
		peakDisk = Math.max(peakDisk, period.disk_used_bytes);
	}
	const cpuUsd = (billedCore / 3600) * rates.coreHourUsd * cpuMultiplier * common;
	const memoryUsd = (billedGib / 3600) * rates.memoryGibHourUsd * common;
	const guaranteedCore = shape.cpu * wall;
	const guaranteedGib = shape.memoryGib * wall;
	return {
		amount: cpuUsd + memoryUsd,
		usage: [
			{ resource: "wall_seconds", quantity: wall, unit: "s" },
			{ resource: "measured_vcpu_seconds", quantity: measuredCore * 2, unit: "vCPU-s" },
			{ resource: "guaranteed_core_seconds", quantity: guaranteedCore, unit: "core-s" },
			{ resource: "billed_core_seconds", quantity: billedCore, unit: "core-s" },
			{ resource: "burst_core_seconds", quantity: billedCore - guaranteedCore, unit: "core-s" },
			{ resource: "measured_memory_gib_seconds", quantity: measuredGib, unit: "GiB-s" },
			{ resource: "billed_memory_gib_seconds", quantity: billedGib, unit: "GiB-s" },
			{ resource: "burst_memory_gib_seconds", quantity: billedGib - guaranteedGib, unit: "GiB-s" },
			{ resource: "peak_memory_bytes", quantity: peakMemory, unit: "B" },
			{ resource: "peak_disk_bytes", quantity: peakDisk, unit: "B" },
			{ resource: "cpu_usd", quantity: cpuUsd, unit: "USD" },
			{ resource: "memory_usd", quantity: memoryUsd, unit: "USD" },
		],
	};
}
