// Prototype of `@sandbox-benchmarks/driver/vendor`: the deepened driver authoring module.
//
// A provider package states what is true about its vendor through two seams, the control plane
// (create/get/remove/page/find) and the data plane (attach/exec/launch/files). This module owns
// everything provider-neutral: readiness, convergent teardown with cleanup confirmation,
// destroyById, probes, the owned/foreign inventory partition, ambiguous-create recovery, the
// artifact guard and the disk proof. It lowers onto the existing ComputeSDK bridge, so coverage
// proof, sandbox-id parsing, cleanup double faults, redaction and output caps stay where they are.

import { randomUUID } from "node:crypto";
import type {
	CreateRequest,
	DriverContext,
	ExecOptions,
	ProviderId,
	SandboxObservation,
} from "@sandbox-benchmarks/driver";
import { pollUntilReady, shellQuote } from "@sandbox-benchmarks/driver";
import type { ComputeSdkCreateRequestCoverage } from "@sandbox-benchmarks/driver/computesdk";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import type { Type } from "arktype";

/* ------------------------------------ interface ------------------------------------ */

/**
 * A provider-neutral reading of one control-plane record. `failed` still owns resources and is
 * deleted; `gone` is removal evidence (cleanup confirmation), never inferred from a delete request.
 */
export type Phase = "pending" | "ready" | "failed" | "deleting" | "gone";

/** Every port call is cancellable; the kit always supplies a bounded signal. */
export interface Op {
	readonly signal: AbortSignal;
}

/** One control-plane record, parsed by the adapter (Tier 2) into provider-neutral facts. */
export interface VendorRecord<Raw = unknown> {
	readonly id: string;
	readonly phase: Phase;
	/** The create-time ownership marker the vendor echoes back (shared accounts). */
	readonly marker?: string;
	readonly raw: Raw;
}

export interface VendorPage<Raw = unknown> {
	readonly records: readonly VendorRecord<Raw>[];
	/** More records exist. An empty string means the vendor omitted its cursor: the kit fails closed. */
	readonly next?: string;
}

export interface ControlPlane<Raw = unknown> {
	/** May resolve `phase: "ready"` only when the response itself proves readiness. */
	create(attempt: CreateAttempt, op: Op): Promise<VendorRecord<Raw>>;
	/** `null` only on the vendor's own not-found; every other failure throws. */
	get(id: string, op: Op): Promise<VendorRecord<Raw> | null>;
	/** `removed`: the vendor proved removal (or reported not-found). `accepted`: acknowledgement only. */
	remove(id: string, op: Op): Promise<"removed" | "accepted">;
	/** One page of the whole account. The kit drains, caps, and fails closed on a bad cursor. */
	page(cursor: string | undefined, op: Op): Promise<VendorPage<Raw>>;
	/**
	 * Server-side lookup of an ambiguous create by its marker, one page at a time. Required on a
	 * dedicated account (where it is an idempotent replay). The kit rejects unrelated records.
	 */
	find?(marker: string, cursor: string | undefined, op: Op): Promise<VendorPage<Raw>>;
	/** The vendor refused before allocating; `retryable` marks a capacity or rate refusal. */
	refused?(error: unknown): { readonly retryable: boolean } | undefined;
	/** A post-readiness invariant beyond the request axes; returns a reason to reject. */
	admit?(record: VendorRecord<Raw>): string | undefined;
}

export interface DataPlane<Raw, Native> {
	attach(record: VendorRecord<Raw>, op: Op): Native | Promise<Native>;
	exec(native: Native, command: string, options?: ExecOptions): Promise<ExecOutcome>;
	/** Resolves only on genuine background acceptance. Requires `durable: "native-launch"`. */
	launch?(native: Native, command: string, options?: ExecOptions): Promise<void>;
	/** Omitted: the kit's shell fallback serves files and `hasWorkingFilesystem` is false. */
	readonly files?: {
		read(native: Native, path: string): Promise<string>;
		write(native: Native, path: string, text: string): Promise<void>;
		exists?(native: Native, path: string): Promise<boolean>;
	};
}

export interface Vendor<Raw, Native> {
	readonly control: ControlPlane<Raw>;
	readonly data: DataPlane<Raw, Native>;
}

export interface CreateAttempt {
	readonly request: CreateRequest;
	readonly marker: string;
}

export interface ExecOutcome {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

export interface VendorTiming {
	readonly pollMs: number;
	readonly readyTimeoutMs: number;
	readonly deleteTimeoutMs: number;
}

/** Static per module: decided before any driver context exists. */
export interface VendorTraits {
	readonly sandboxId: Type<string>;
	readonly coverage: ComputeSdkCreateRequestCoverage;
	/** `dedicated`: the credential's account is benchmark-only; every live record is owned. */
	readonly account?: "shared" | "dedicated";
	readonly durable?: "shell-detach" | "native-launch";
	readonly syncCapMs?: number;
	readonly timing?: Partial<VendorTiming>;
	readonly recovery?: { readonly absenceConfirmationMs?: number; readonly maxAttempts?: number };
}

export const MARKER_PREFIX = "benchmark-";
const DEFAULT_TIMING: VendorTiming = {
	pollMs: 250,
	readyTimeoutMs: 180_000,
	deleteTimeoutMs: 60_000,
};
const PAGE_CAP = 100;

/* --------------------------------- coverage presets --------------------------------- */

type Axis = ComputeSdkCreateRequestCoverage["spec"]["vcpus"];

/** The artifact pins CPU and memory; disk is proven after boot (4 of 13 drivers). */
export const pinned = (vcpus: number, memoryGb: number): ComputeSdkCreateRequestCoverage =>
	coverage({
		vcpus: { artifact: vcpus },
		memoryGb: { artifact: memoryGb },
		diskGb: "runtime-verified",
	});

/** The create request maps every resource axis (7 of 13 drivers, with or without disk proof). */
export const mapped = (diskGb: Axis = "mapped"): ComputeSdkCreateRequestCoverage =>
	coverage({ vcpus: "mapped", memoryGb: "mapped", diskGb });

export function coverage(
	spec: ComputeSdkCreateRequestCoverage["spec"],
	options: { readonly env?: "mapped" | "unsupported" } = {},
): ComputeSdkCreateRequestCoverage {
	return {
		spec,
		artifact: "context",
		deadlineMs: "harness",
		gpu: { model: "unsupported", count: "unsupported" },
		env: options.env ?? "unsupported",
	};
}

/* ------------------------------- error classification ------------------------------- */

/** A cause-chain classifier over typed vendor errors, shared by every SDK adapter. */
export const instanceOfAny =
	(...classes: ReadonlyArray<abstract new (...args: never[]) => unknown>) =>
	(error: unknown): boolean =>
		matchesAnyCause(error, (cause) => classes.some((errorClass) => cause instanceof errorClass));

/* ------------------------------------ lowering ------------------------------------ */

interface Handle<Raw, Native> {
	readonly record: VendorRecord<Raw>;
	readonly native: Native;
}

/** The disk-capacity probe command; exported so test vendors answer the same command the kit runs. */
export const DISK_PROBE = "df -Pk / | awk 'NR==2 {print $2}'";

function bounded(timeoutMs: number, signal?: AbortSignal): AbortSignal {
	return AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
}

/** Drain a paged listing; a repeated, omitted, or runaway cursor fails closed, never empty. */
export async function drainPages<Raw>(
	provider: ProviderId,
	fetchPage: (cursor: string | undefined) => Promise<VendorPage<Raw>>,
	op: Op,
	inspect?: (records: readonly VendorRecord<Raw>[]) => void,
): Promise<VendorRecord<Raw>[]> {
	const records: VendorRecord<Raw>[] = [];
	const seen = new Set<string>();
	let cursor: string | undefined;
	for (let pages = 0; ; pages++) {
		op.signal.throwIfAborted();
		if (pages >= PAGE_CAP) throw new Error(`${provider} listing exceeded ${PAGE_CAP} pages`);
		const page = await fetchPage(cursor);
		inspect?.(page.records);
		records.push(...page.records);
		if (page.next === undefined) return records;
		if (page.next === "" || seen.has(page.next))
			throw new Error(`${provider} listing repeated or omitted a continuation cursor`);
		seen.add(page.next);
		cursor = page.next;
	}
}

/** Lower one bound vendor onto the ComputeSDK bridge. */
export function vendorSpec<P extends ProviderId, Raw, Native>(
	provider: P,
	context: DriverContext<P>,
	traits: VendorTraits,
	vendor: Vendor<Raw, Native>,
) {
	const { control, data } = vendor;
	const { files, launch, refused } = { ...data, refused: control.refused };
	const timing = { ...DEFAULT_TIMING, ...traits.timing };
	const dedicated = traits.account === "dedicated";
	if (dedicated && !control.find)
		throw new Error(`${provider}: a dedicated account recovers by replay and needs control.find`);
	if ((traits.durable === "native-launch") !== (launch !== undefined))
		throw new Error(
			`${provider}: durable "native-launch" and data.launch must be declared together`,
		);
	const op = (signal?: AbortSignal): Op => ({ signal: signal ?? new AbortController().signal });
	const isGone = (record: VendorRecord<Raw> | null) => record === null || record.phase === "gone";
	const owned = (record: VendorRecord<Raw>) =>
		dedicated || (record.marker?.startsWith(MARKER_PREFIX) ?? false);

	async function liveRecords(signal?: AbortSignal): Promise<VendorRecord<Raw>[]> {
		const o = op(signal);
		const records = await drainPages(provider, (cursor) => control.page(cursor, o), o);
		return records.filter((record) => !isGone(record));
	}

	/** Cleanup confirmation: observe, request removal once, then observe removal. */
	async function destroy(id: string, signal?: AbortSignal): Promise<void> {
		const o = op(bounded(timing.deleteTimeoutMs, signal));
		let requested = false;
		await pollUntilReady({
			provider,
			deadlineMs: timing.deleteTimeoutMs,
			intervalMs: timing.pollMs,
			signal: o.signal,
			poll: async () => {
				const record = await control.get(id, o);
				if (isGone(record)) return true;
				if (!requested && record?.phase !== "deleting") {
					requested = true;
					if ((await control.remove(id, o)) === "removed") return true;
				}
				return null;
			},
		});
	}

	async function awaitReady(record: VendorRecord<Raw>, outer?: AbortSignal) {
		if (record.phase === "ready") return record;
		const o = op(bounded(timing.readyTimeoutMs, outer));
		return pollUntilReady({
			provider,
			deadlineMs: timing.readyTimeoutMs,
			intervalMs: timing.pollMs,
			signal: o.signal,
			poll: async () => {
				const current = await control.get(record.id, o);
				if (current === null) throw new Error(`${provider} sandbox disappeared before readiness`);
				if (current.phase === "ready") return current;
				if (current.phase !== "pending")
					throw new Error(`${provider} sandbox entered ${current.phase} before readiness`);
				return null;
			},
		});
	}

	async function recoveryIds(marker: string, signal?: AbortSignal): Promise<string[]> {
		const lookup = control.find;
		if (!lookup)
			return (await liveRecords(signal))
				.filter((record) => record.marker === marker)
				.map((record) => record.id);
		const o = op(signal);
		const records = await drainPages(
			provider,
			(cursor) => lookup(marker, cursor, o),
			o,
			(page) => {
				if (dedicated) return;
				for (const record of page)
					if (record.marker !== marker)
						throw new Error(`${provider} recovery returned an unrelated sandbox`);
			},
		);
		return records.filter((record) => !isGone(record)).map((record) => record.id);
	}

	const compute = nativeSdkCompute(
		async (attempt: CreateAttempt, operation): Promise<Handle<Raw, Native>> => {
			const o = op(operation.signal);
			const record = await control.create(attempt, o);
			o.signal.throwIfAborted();
			return { record, native: await data.attach(record, o) };
		},
		({ record, native }) => ({
			sandboxId: record.id,
			runCommand: (command: string, options?: ExecOptions) => data.exec(native, command, options),
			destroy: () => destroy(record.id),
			...(files && {
				filesystem: {
					readFile: (path: string) => files.read(native, path),
					exists: async (path: string) =>
						files.exists
							? files.exists(native, path)
							: (await data.exec(native, `test -e ${shellQuote(path)}`)).exitCode === 0,
					writeFile: (path: string, text: string) => files.write(native, path, text),
				},
			}),
		}),
	);

	return computeSdkSpec(compute, {
		sandboxId: traits.sandboxId,
		createOptions: {
			coverage: traits.coverage,
			map: (request, unsupported) => {
				const resolved = context.resolvedArtifact;
				const same =
					request.artifact.kind === resolved.kind &&
					(resolved.kind === "none" ||
						(request.artifact.kind !== "none" && request.artifact.ref === resolved.ref));
				if (!same) unsupported(`request artifact differs from the resolved ${provider} artifact`);
				return { request, marker: `${MARKER_PREFIX}${randomUUID()}` };
			},
		},
		...(launch && {
			commands: {
				exec: (sandbox, command, options) =>
					data.exec(sandbox.getInstance().native, command, options),
				launch: (sandbox, command, options) =>
					launch(sandbox.getInstance().native, command, options),
			},
		}),
		lifecycle: {
			destroy: (sandbox, ref, operation) =>
				destroy(ref?.id ?? sandbox.getInstance().record.id, operation.signal),
		},
		createRecovery: {
			absenceConfirmationMs: traits.recovery?.absenceConfirmationMs ?? 2_000,
			maxAttempts: traits.recovery?.maxAttempts ?? 4,
			locator: (attempt) => ({ kind: "marker", key: `${provider}-marker`, value: attempt.marker }),
			...(refused && {
				isDefinitive: (error: unknown) => refused(error) !== undefined,
				isRetryableCreate: (error: unknown) => refused(error)?.retryable === true,
			}),
			cleanup: async (_compute, locator, operation) => {
				const ids = await recoveryIds(locator.value, operation.signal);
				// Each teardown is independently bounded; run them together, then surface any failure.
				const outcomes = await Promise.allSettled(ids.map((id) => destroy(id, operation.signal)));
				const failed = outcomes.find((outcome) => outcome.status === "rejected");
				if (failed) throw failed.reason;
				return ids.length > 0 ? { status: "destroyed" } : { status: "absent" };
			},
		},
		prepareAndVerifyCreatedRequest: async (_sandbox, handle, request, operation) => {
			const ready = await awaitReady(handle.record, operation.signal);
			const reason = control.admit?.(ready);
			if (reason) throw new Error(`${provider} rejected the allocation: ${reason}`);
			if (traits.coverage.spec.diskGb !== "runtime-verified" || request.spec.diskGb === undefined)
				return { status: "honored" };
			return verifyDisk(provider, request.spec.diskGb, (command) =>
				data.exec(handle.native, command, operation),
			);
		},
		hasWorkingFilesystem: files !== undefined,
		probes: {
			observe: async (_compute, ref): Promise<SandboxObservation> => ({
				state: isGone(await control.get(ref.id, op())) ? "absent" : "running",
			}),
			describe: async (_compute, ref) => (await control.get(ref.id, op()))?.raw,
			// One page, as a control-plane latency probe rather than a full enumeration.
			list: async () => (await control.page(undefined, op())).records.map((record) => record.raw),
		},
		inventory: {
			list: async (_compute, operation) => {
				const ownedIds: string[] = [];
				let foreignCount = 0;
				for (const record of await liveRecords(operation.signal)) {
					if (owned(record)) ownedIds.push(record.id);
					else foreignCount += 1;
				}
				return { owned: ownedIds, foreignCount };
			},
		},
		destroyById: (_compute, ref, operation) => destroy(ref.id, operation.signal),
	});
}

/** The `df` disk-capacity proof that ten drivers copy today. */
export async function verifyDisk(
	provider: ProviderId,
	requestedGb: number,
	exec: (command: string) => Promise<ExecOutcome>,
) {
	const result = await exec(DISK_PROBE);
	if (result.exitCode !== 0 || !/^\d+$/.test(result.stdout.trim()))
		throw new Error(`${provider} disk capacity probe failed`);
	const capacityGb = Number(result.stdout.trim()) / 1024 / 1024;
	return capacityGb >= requestedGb
		? ({ status: "honored" } as const)
		: ({
				status: "unsupported",
				detail: `requested ${requestedGb} GiB but allocation exposes ${capacityGb.toFixed(2)} GiB`,
			} as const);
}

/* ---------------------------------- module entry ---------------------------------- */

/** The prototype carries provenance only; accelerator and cost evidence pass through unchanged. */
interface ModulePolicy {
	readonly provenance: { readonly packageName: string; readonly version: string };
}

/**
 * Define a provider's DriverModule from its vendor. `vendor(context)` is the composition point:
 * the only place the package binds its real SDK, client, or transport. `specFor` lowers the same
 * module against another vendor or timing (a stubbed transport in tests), so packages never
 * restate their binding.
 */
export function defineVendorDriver<P extends ProviderId, Raw, Native>(
	provider: P,
	module: ModulePolicy &
		VendorTraits & { readonly vendor: (context: DriverContext<P>) => Vendor<Raw, Native> },
) {
	const { provenance, vendor, ...traits } = module;
	const specFor = (
		context: DriverContext<P>,
		overrides: { vendor?: Vendor<Raw, Native>; timing?: Partial<VendorTiming> } = {},
	) =>
		vendorSpec(
			provider,
			context,
			{ ...traits, timing: { ...traits.timing, ...overrides.timing } },
			overrides.vendor ?? vendor(context),
		);
	const driver = defineComputeSdkDriver(provider, {
		provenance,
		readiness: { startup: "create-returns-ready" },
		execution: { syncCapMs: traits.syncCapMs ?? 60_000, durable: traits.durable ?? "shell-detach" },
		spec: (context) => specFor(context),
	});
	// DriverModules are frozen; the test seam travels beside the module, not inside it.
	return Object.freeze({ ...driver, specFor });
}
