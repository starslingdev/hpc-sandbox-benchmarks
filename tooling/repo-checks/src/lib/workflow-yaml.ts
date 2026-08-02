// Shared YAML navigation for workflow drift gates. Bun.YAML.parse is built into bun >= 1.3 (no new
// dependency). Kept separate from credential/timeout checks and nesting invariants so each module
// owns one concern.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WORKFLOW_TIMEOUT_MARGIN_MINUTES } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { findRepoRoot } from "./workspace.ts";

export const SMOKE_WORKFLOW = ".github/workflows/bench-smoke.yml";
export const MATRIX_WORKFLOW = ".github/workflows/bench-matrix.yml";
/** The reusable workflow BOTH dispatch lanes call; it owns the credential block + run timeout. */
export const SUITE_WORKFLOW = ".github/workflows/bench-suite.yml";
/** The step that drives the provider SDK; it owns the credential env. It exists exactly once, in the
 *  reusable bench-suite.yml — a copy in either dispatch lane is the drift Invariant 3b rejects. */
export const RUN_STEP = "Run suite and normalize";
/** The fan-out job inside the reusable bench-suite.yml (its credential env + timeout). */
export const SUITE_JOB = "bench";
/** Host-side checkout/teardown/normalization/upload allowance beyond the sandbox lifetime. Re-exported
 *  from the schema, which owns it — `bench-suite`'s fan-out budget guard adds the SAME margin, and the
 *  two must not drift (see the constant's own note). */
export { WORKFLOW_TIMEOUT_MARGIN_MINUTES };

// Single source of truth: this schema drives BOTH the runtime parse (coercions live in the morphs)
// and the exported DispatchInput type (inferred below) — there is no hand-written interface or
// typeof-narrowing that could drift from the parse. onUndeclaredKey("delete") drops the fields the
// gate ignores (description/required/…) so the parsed value is exactly what gets compared.
const dispatchInputSchema = type({
	// Only `type: choice` makes GitHub enforce `options`. A non-string (malformed YAML) coerces to
	// undefined so the invariant check reports it, rather than the parse throwing.
	"type?": type("unknown").pipe((v) => (typeof v === "string" ? v : undefined)),
	"default?": type("unknown").pipe((v) => (typeof v === "string" ? v : undefined)),
	// A YAML option list may carry non-string scalars; coerce each. A non-list value is rejected.
	"options?": type("unknown[]").pipe((arr) => arr.map((o) => String(o))),
}).onUndeclaredKey("delete");

/** A single `workflow_dispatch` input, narrowed to the fields the gate compares — inferred from
 *  {@link dispatchInputSchema} so the type and the parser can never disagree. */
export type DispatchInput = typeof dispatchInputSchema.infer;

// The workflow envelope down to the dynamic `inputs` map: validated once, with inference, so the
// navigation is type-safe end to end instead of a hand-rolled chain of object guards. (Bun.YAML keeps
// the GHA `on:` key as the string "on", so the YAML 1.1 boolean gotcha does not bite here.)
const workflowEnvelope = type({
	on: { workflow_dispatch: { inputs: { "[string]": "unknown" } } },
});

/** Parse a workflow YAML file under `root` (Bun.YAML — built-in, no dependency). */
export function readWorkflow(relPath: string, root: string = findRepoRoot()): unknown {
	return Bun.YAML.parse(readFileSync(join(root, relPath), "utf8"));
}

/**
 * Assert `value` is a non-null, non-array object, or throw `message`. A lazy per-node guard for job/
 * step navigation: unlike the fixed `on.workflow_dispatch` path (an arktype envelope), step-env walks
 * to one *named* job/step, so validating the whole `jobs` map with a schema would over-reject sibling
 * jobs the gate doesn't care about.
 */
export function asRecord(value: unknown, message: string): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(message);
	}
	return value as Record<string, unknown>;
}

/**
 * The `on.workflow_dispatch.inputs.<name>` entry, parsed to its {@link DispatchInput}. Throws if the
 * envelope is malformed or the named input is missing — a renamed/removed input must fail the gate
 * loudly, not pass vacuously.
 */
export function dispatchInput(doc: unknown, name: string, label: string): DispatchInput {
	const envelope = workflowEnvelope(doc);
	if (envelope instanceof type.errors) {
		throw new Error(`${label}: ${envelope.summary}`);
	}
	const raw = envelope.on.workflow_dispatch.inputs[name];
	if (raw === undefined) {
		throw new Error(`${label}: workflow_dispatch input "${name}" not found`);
	}
	const input = dispatchInputSchema(raw);
	if (input instanceof type.errors) {
		throw new Error(`${label}: workflow_dispatch input "${name}" is malformed — ${input.summary}`);
	}
	return input;
}

/** Parse a job's literal positive integer `timeout-minutes`; expressions cannot satisfy this gate. */
export function jobTimeoutMinutes(doc: unknown, jobId: string, label: string): number {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const job = asRecord(jobs[jobId], `${label}: job "${jobId}" not found`);
	const timeout = job["timeout-minutes"];
	if (typeof timeout !== "number" || !Number.isInteger(timeout) || timeout <= 0) {
		throw new Error(`${label}: job "${jobId}" timeout-minutes must be a positive integer literal`);
	}
	return timeout;
}

/**
 * The step named `stepName` inside an already-resolved `job`, or undefined when the job has no steps
 * list or no such step. LENIENT on purpose: the nesting gate (workflow-nesting.ts) accumulates error
 * strings instead of throwing, so it needs "absent" as a value it can report. A step that is present
 * but not a mapping still throws — that is malformed YAML, not drift. {@link stepEnv} layers the
 * strict spelling on top for callers where a renamed job/step must fail the gate loudly.
 */
export function stepByName(
	job: Record<string, unknown>,
	stepName: string,
	label: string,
): Record<string, unknown> | undefined {
	if (!Array.isArray(job.steps)) return undefined;
	for (const value of job.steps) {
		const step = asRecord(value, `${label}: malformed step`);
		if (step.name === stepName) return step;
	}
	return undefined;
}

/**
 * The `env` mapping of a named step inside a job, as key -> value-expression entries. Throws if the
 * job, the step, or its env block is missing, or an env value is not a string — a renamed job/step
 * must fail the gate, not silently match nothing.
 */
export function stepEnv(
	doc: unknown,
	jobId: string,
	stepName: string,
	label: string,
): Record<string, string> {
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	const job = asRecord(jobs[jobId], `${label}: job "${jobId}" not found`);
	if (!Array.isArray(job.steps)) throw new Error(`${label}: job "${jobId}" has no steps list`);
	const step = stepByName(job, stepName, label);
	if (step === undefined) {
		throw new Error(`${label}: job "${jobId}" has no step named "${stepName}"`);
	}
	const env = asRecord(step.env, `${label}: step "${stepName}" has no env mapping`);
	const entries: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (typeof value !== "string") {
			throw new Error(`${label}: step "${stepName}" env.${key} is not a string value`);
		}
		entries[key] = value;
	}
	return entries;
}
