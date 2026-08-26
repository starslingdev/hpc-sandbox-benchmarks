// Driver-module policy (ADR-0007 §3, ADR-0008 §2/§6). These declarations belong beside
// provider behavior, not in the metadata registry: they describe how this integration is driven and
// how the kit can verify it. The module boundary snapshots the records so later mutation cannot
// silently change routing or conformance claims.

import type {
	ProviderCostCell,
	ProviderCostEvidence,
	SdkProvenance,
} from "@sandbox-benchmarks/schema";
import type { ProviderId } from "@sandbox-benchmarks/schema/provider-ids";
import { DriverError } from "./errors.ts";
import type { CreateBudget, DriverOperationOptions, GpuSpec, SandboxSession } from "./port.ts";

/** A finite synchronous route always has a durable route to fall back to. */
export type ExecutionPolicy =
	| {
			readonly syncCapMs: null;
			readonly durable: "native-launch" | "shell-detach" | "none";
	  }
	| {
			readonly syncCapMs: number;
			readonly durable: "native-launch" | "shell-detach";
	  };

/** A normalized accelerator observation, independent of the guest tool that produced it. */
export interface AcceleratorObservation {
	readonly model: string;
	readonly count: number;
}

/**
 * Module-owned guest observation for the accelerator family accepted by a driver.
 *
 * The conformance gate executes {@link command}, rejects a failed/truncated command envelope, then
 * delegates stdout parsing and request matching here. An NVIDIA strategy can therefore use
 * `nvidia-smi` without teaching the shared gate about NVIDIA, while a future AMD/TPU strategy can
 * supply an entirely different command and grammar.
 */
export interface AcceleratorStrategy {
	/** Stable family label used in evidence and diagnostics, for example `nvidia`. */
	readonly family: string;
	/** In-guest command whose successful stdout is passed to {@link parse}. */
	readonly command: string;
	/** Parse and normalize successful, non-truncated probe stdout. */
	readonly parse: (stdout: string) => AcceleratorObservation;
	/** Compare the vendor-neutral request with the normalized observation. */
	readonly matches: (requested: GpuSpec, observed: AcceleratorObservation) => boolean;
}

/** The kit-level meaning of one provider-specific readiness signal. */
export type ReadinessProbeResult =
	| { readonly status: "ready" }
	| { readonly status: "pending" }
	| { readonly status: "terminal"; readonly detail: string };

export type ReadinessSignal = "cli" | "exec" | "vendor-state";

/**
 * Readiness is either part of create's contract or one kit-owned polling strategy.
 *
 * A create-then-poll driver supplies only one typed attempt. The kit owns the loop, deadline,
 * backoff/jitter, terminal handling, and cleanup; the module owns the provider-specific signal and
 * its two hard budgets.
 */
export type DriverReadinessPolicy<Handle = unknown> =
	| { readonly startup: "create-returns-ready" }
	| {
			readonly startup: "create-then-poll";
			readonly signal: ReadinessSignal;
			readonly totalBudgetMs: number;
			readonly attemptTimeoutMs: number;
			readonly probe: (
				session: SandboxSession<Handle>,
				options?: DriverOperationOptions,
			) => Promise<ReadinessProbeResult>;
	  };

export interface SandboxTeardownResult {
	readonly completed: boolean;
	readonly attemptedAt: string;
	readonly completedAt?: string;
}

export interface CostEvidenceCaptureInput<P extends ProviderId = ProviderId> {
	readonly cell: ProviderCostCell;
	readonly providerId: P;
	readonly sandboxId: string;
	readonly teardown: SandboxTeardownResult;
}

/** Optional provider-owned billing hook, invoked only after teardown has been attempted. */
export interface ProviderCostEvidenceCapability<P extends ProviderId = ProviderId> {
	readonly sdk: SdkProvenance;
	readonly captureAfterTeardown: (
		input: CostEvidenceCaptureInput<P>,
	) => Promise<ProviderCostEvidence>;
}

/** Policy every joined provider module must declare beside its driver factory. */
export interface DriverPolicy<P extends ProviderId, Handle = unknown> {
	/** Package/CLI identity and version that implement this integration. */
	readonly provenance: SdkProvenance;
	/** Who owns the create attempt's budget. Omitted ⇒ the harness races create (the default). */
	readonly createBudget?: CreateBudget;
	readonly readiness: DriverReadinessPolicy<Handle>;
	readonly execution: ExecutionPolicy;
	readonly accelerator?: AcceleratorStrategy;
	readonly costEvidence?: ProviderCostEvidenceCapability<P>;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function contractError(provider: ProviderId, detail: string): DriverError {
	return new DriverError("vendor-contract-violation", detail, { provider });
}

function recordMember(provider: ProviderId, label: string, value: unknown): UnknownRecord {
	if ((typeof value !== "object" && typeof value !== "function") || value === null) {
		throw contractError(provider, `${label} must be an object`);
	}
	return value as UnknownRecord;
}

function ownEntries(provider: ProviderId, label: string, value: unknown): UnknownRecord {
	const source = recordMember(provider, label, value);
	try {
		const snapshot = Object.create(null) as Record<string, unknown>;
		for (const [key, entry] of Object.entries(source)) {
			Object.defineProperty(snapshot, key, {
				value: entry,
				enumerable: true,
				writable: false,
				configurable: false,
			});
		}
		return Object.freeze(snapshot) as UnknownRecord;
	} catch {
		throw contractError(provider, `${label} could not be read safely`);
	}
}

function exactKeys(
	provider: ProviderId,
	label: string,
	record: UnknownRecord,
	required: readonly string[],
	optional: readonly string[] = [],
): void {
	const keys = Object.keys(record);
	const allowed = new Set([...required, ...optional]);
	const unknown = keys.find((key) => !allowed.has(key));
	if (unknown !== undefined)
		throw contractError(provider, `${label} declares unknown field ${unknown}`);
	const missing = required.find((key) => !Object.hasOwn(record, key));
	if (missing !== undefined) throw contractError(provider, `${label} is missing ${missing}`);
}

function nonemptyString(provider: ProviderId, label: string, value: unknown): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw contractError(provider, `${label} must be a non-empty string`);
	}
	return value;
}

function boundedString(
	provider: ProviderId,
	label: string,
	value: unknown,
	maximum: number,
): string {
	const normalized = nonemptyString(provider, label, value);
	if (normalized.length > maximum) {
		throw contractError(provider, `${label} must be at most ${maximum} characters`);
	}
	return normalized;
}

function positiveSafeInteger(provider: ProviderId, label: string, value: unknown): number {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
		throw contractError(provider, `${label} must be a positive safe integer`);
	}
	return value;
}

function normalizeProvenance(provider: ProviderId, value: unknown): SdkProvenance {
	const record = ownEntries(provider, "driver provenance", value);
	exactKeys(provider, "driver provenance", record, ["packageName", "version"]);
	return Object.freeze({
		packageName: boundedString(provider, "driver provenance packageName", record.packageName, 256),
		version: boundedString(provider, "driver provenance version", record.version, 256),
	});
}

function normalizeCreateBudget(provider: ProviderId, value: unknown): CreateBudget | undefined {
	if (value === undefined) return undefined;
	const record = ownEntries(provider, "create budget", value);
	const owner = record.owner;
	if (owner === "harness") {
		exactKeys(provider, "harness create budget", record, ["owner"], ["timeoutMs"]);
		const timeoutMs =
			record.timeoutMs === undefined
				? undefined
				: positiveSafeInteger(provider, "create budget timeoutMs", record.timeoutMs);
		return Object.freeze({ owner, ...(timeoutMs === undefined ? {} : { timeoutMs }) });
	}
	if (owner === "driver") {
		exactKeys(provider, "driver create budget", record, ["owner", "attemptCeilingMs"]);
		return Object.freeze({
			owner,
			attemptCeilingMs: positiveSafeInteger(
				provider,
				"create budget attemptCeilingMs",
				record.attemptCeilingMs,
			),
		});
	}
	throw contractError(provider, "create budget owner must be harness or driver");
}

function normalizeReadiness<Handle>(
	provider: ProviderId,
	value: unknown,
): DriverReadinessPolicy<Handle> {
	const record = ownEntries(provider, "readiness policy", value);
	if (record.startup === "create-returns-ready") {
		exactKeys(provider, "create-returns-ready policy", record, ["startup"]);
		return Object.freeze({ startup: record.startup });
	}
	if (record.startup !== "create-then-poll") {
		throw contractError(
			provider,
			"readiness policy startup must be create-returns-ready or create-then-poll",
		);
	}
	exactKeys(provider, "create-then-poll policy", record, [
		"startup",
		"signal",
		"totalBudgetMs",
		"attemptTimeoutMs",
		"probe",
	]);
	if (record.signal !== "cli" && record.signal !== "exec" && record.signal !== "vendor-state") {
		throw contractError(provider, "readiness signal must be cli, exec, or vendor-state");
	}
	if (typeof record.probe !== "function") {
		throw contractError(provider, "readiness probe must be callable");
	}
	const totalBudgetMs = positiveSafeInteger(
		provider,
		"readiness totalBudgetMs",
		record.totalBudgetMs,
	);
	const attemptTimeoutMs = positiveSafeInteger(
		provider,
		"readiness attemptTimeoutMs",
		record.attemptTimeoutMs,
	);
	if (attemptTimeoutMs > totalBudgetMs) {
		throw contractError(provider, "readiness attemptTimeoutMs cannot exceed totalBudgetMs");
	}
	return Object.freeze({
		startup: record.startup,
		signal: record.signal,
		totalBudgetMs,
		attemptTimeoutMs,
		probe: record.probe as (
			session: SandboxSession<Handle>,
			options?: DriverOperationOptions,
		) => Promise<ReadinessProbeResult>,
	});
}

function normalizeExecution(provider: ProviderId, value: unknown): ExecutionPolicy {
	const record = ownEntries(provider, "execution policy", value);
	exactKeys(provider, "execution policy", record, ["syncCapMs", "durable"]);
	const durable = record.durable;
	if (durable !== "native-launch" && durable !== "shell-detach" && durable !== "none") {
		throw contractError(provider, "execution durable must be native-launch, shell-detach, or none");
	}
	if (record.syncCapMs === null) return Object.freeze({ syncCapMs: null, durable });
	const syncCapMs = positiveSafeInteger(provider, "execution syncCapMs", record.syncCapMs);
	if (durable === "none") {
		throw contractError(provider, "a finite execution syncCapMs requires a durable route");
	}
	return Object.freeze({ syncCapMs, durable });
}

function normalizeAccelerator(
	provider: ProviderId,
	value: unknown,
): AcceleratorStrategy | undefined {
	if (value === undefined) return undefined;
	const record = ownEntries(provider, "accelerator strategy", value);
	exactKeys(provider, "accelerator strategy", record, ["family", "command", "parse", "matches"]);
	if (typeof record.parse !== "function" || typeof record.matches !== "function") {
		throw contractError(provider, "accelerator parse and matches members must be callable");
	}
	return Object.freeze({
		family: nonemptyString(provider, "accelerator family", record.family),
		command: nonemptyString(provider, "accelerator command", record.command),
		parse: record.parse as AcceleratorStrategy["parse"],
		matches: record.matches as AcceleratorStrategy["matches"],
	});
}

function normalizeCostEvidence<P extends ProviderId>(
	provider: P,
	value: unknown,
): ProviderCostEvidenceCapability<P> | undefined {
	if (value === undefined) return undefined;
	const record = ownEntries(provider, "cost evidence capability", value);
	exactKeys(provider, "cost evidence capability", record, ["sdk", "captureAfterTeardown"]);
	if (typeof record.captureAfterTeardown !== "function") {
		throw contractError(provider, "cost evidence captureAfterTeardown must be callable");
	}
	return Object.freeze({
		sdk: normalizeProvenance(provider, record.sdk),
		captureAfterTeardown:
			record.captureAfterTeardown as ProviderCostEvidenceCapability<P>["captureAfterTeardown"],
	});
}

/** Snapshot and boundary-check module policy once, before any provider factory can run. */
export function normalizeDriverPolicy<P extends ProviderId, Handle>(
	provider: P,
	policy: DriverPolicy<P, Handle>,
): DriverPolicy<P, Handle> {
	const record = recordMember(provider, "driver policy", policy);
	let provenance: unknown;
	let createBudget: unknown;
	let readiness: unknown;
	let execution: unknown;
	let accelerator: unknown;
	let costEvidence: unknown;
	try {
		provenance = Reflect.get(record, "provenance");
		createBudget = Reflect.get(record, "createBudget");
		readiness = Reflect.get(record, "readiness");
		execution = Reflect.get(record, "execution");
		accelerator = Reflect.get(record, "accelerator");
		costEvidence = Reflect.get(record, "costEvidence");
	} catch {
		throw contractError(provider, "driver policy could not be read safely");
	}
	const normalizedBudget = normalizeCreateBudget(provider, createBudget);
	const normalizedAccelerator = normalizeAccelerator(provider, accelerator);
	const normalizedCostEvidence = normalizeCostEvidence(provider, costEvidence);
	return Object.freeze({
		provenance: normalizeProvenance(provider, provenance),
		...(normalizedBudget === undefined ? {} : { createBudget: normalizedBudget }),
		readiness: normalizeReadiness(provider, readiness),
		execution: normalizeExecution(provider, execution),
		...(normalizedAccelerator === undefined ? {} : { accelerator: normalizedAccelerator }),
		...(normalizedCostEvidence === undefined ? {} : { costEvidence: normalizedCostEvidence }),
	});
}
