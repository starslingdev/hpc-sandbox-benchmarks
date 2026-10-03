// Shared vendor lifecycle and request-proof mechanics.
import type { ExecutionPolicy, ProviderId } from "@sandbox-benchmarks/driver";
import { shellQuote } from "@sandbox-benchmarks/driver";
import type {
	DiskProof,
	ExecOutcome,
	Op,
	VendorPage,
	VendorRecord,
	VendorTiming,
	VendorTraits,
	Verification,
} from "../vendor.ts";
import { CONTROL_TIMEOUT_MS } from "./vendor-port.ts";

const DEFAULT_EXECUTION: ExecutionPolicy = { syncCapMs: 60_000, durable: "shell-detach" };
export const DEFAULT_TIMING: VendorTiming = {
	pollMs: 250,
	readyTimeoutMs: 180_000,
	deleteTimeoutMs: 60_000,
	controlTimeoutMs: CONTROL_TIMEOUT_MS,
	inventoryTimeoutMs: 5 * 60_000,
	snapshotTimeoutMs: 600_000,
};
const DEFAULT_PAGE_CAP = 100;

/** The disk-capacity probe of `path`; exported so test vendors answer the command the kit runs. */
export const diskProbe = (path = "/") =>
	`df -Pk ${path === "/" ? path : shellQuote(path)} | awk 'NR==2 {print $2}'`;
/** The root filesystem's disk-capacity probe. */
export const DISK_PROBE = diskProbe();

export function budget(timeoutMs: number, signal?: AbortSignal): AbortSignal {
	return AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
}

/**
 * Drain a paged listing; a repeated, omitted, or runaway cursor, or a sandbox listed twice (a
 * listing that shifted under its cursor), fails closed, never empty. `inspect` sees each page
 * before it is accepted, so a caller can refuse a record mid-listing.
 */
export async function drainPages<Raw>(
	provider: ProviderId,
	fetchPage: (cursor: string | undefined) => Promise<VendorPage<Raw>>,
	op: Op,
	options: {
		readonly inspect?: (records: readonly VendorRecord<Raw>[]) => void;
		readonly pageCap?: number;
	} = {},
): Promise<VendorRecord<Raw>[]> {
	const cap = options.pageCap ?? DEFAULT_PAGE_CAP;
	const records: VendorRecord<Raw>[] = [];
	const seen = new Set<string>();
	const ids = new Set<string>();
	let cursor: string | undefined;
	for (let pages = 0; ; pages++) {
		op.signal.throwIfAborted();
		if (pages >= cap) throw new Error(`${provider} listing exceeded ${cap} pages`);
		const page = await fetchPage(cursor);
		options.inspect?.(page.records);
		for (const { id } of page.records) {
			if (ids.has(id)) throw new Error(`${provider} listing returned a duplicate sandbox id`);
			ids.add(id);
		}
		records.push(...page.records);
		if (page.next === undefined) return records;
		if (page.next === "" || seen.has(page.next))
			throw new Error(`${provider} listing repeated or omitted a continuation cursor`);
		seen.add(page.next);
		cursor = page.next;
	}
}

/** The `df` disk-capacity proof for a disk axis the create request cannot control. */
export async function verifyDisk(
	provider: ProviderId,
	requestedGb: number,
	exec: (command: string) => Promise<ExecOutcome>,
	{ path = "/", allowanceGb = 0, allowanceRatio = 0 }: DiskProof = {},
): Promise<Verification> {
	const result = await exec(diskProbe(path));
	// A mounted filesystem has capacity: a zero reading is a broken probe, not a small disk.
	if (result.exitCode !== 0 || !/^[1-9]\d*$/.test(result.stdout.trim()))
		throw new Error(`${provider} disk capacity probe failed`);
	const capacityGb = Number(result.stdout.trim()) / 1024 / 1024;
	return capacityGb + allowanceGb + requestedGb * allowanceRatio >= requestedGb
		? { status: "honored" }
		: {
				status: "unsupported",
				detail: `requested ${requestedGb} GiB but ${path === "/" ? "allocation" : path} exposes ${capacityGb.toFixed(2)} GiB`,
			};
}

export function executionOf(
	provider: ProviderId,
	traits: VendorTraits,
	launches: boolean | undefined,
): ExecutionPolicy {
	const execution = traits.execution ?? DEFAULT_EXECUTION;
	if (execution.durable === "native-launch" && launches === false)
		throw new Error(`${provider}: durable "native-launch" requires data.launch`);
	return execution;
}
