// Drift gate: the security posture of the GitHub Actions layer. The persist-credentials invariant the
// .github/ files must hold, which the type system can't enforce (GHA is YAML):
//
//   1. persist-credentials hygiene — every `actions/checkout` step sets `persist-credentials: false`
//      UNLESS it is one of the few jobs that later `git push`es (it needs the persisted job token).
//      The pushing checkouts are enumerated in CREDENTIALED_CHECKOUTS with provenance; the gate fails
//      both when a read-only checkout forgets the opt-out AND when a pushing checkout is in the
//      allowlist but no longer exists / no longer keeps its token (so the allowlist can't rot).
//
// The ci-lint threshold invariant (ci-lint.yml runs actionlint + zizmor at the agreed gate) builds on
// the same parse core and lands in the next PR up the stack.
//
// Mirrors runner-benchmarking's ci-lint.yml + zizmor.yml hardening, adapted to this repo's workflows.
// Bun.YAML.parse is built into bun >= 1.3 (no new dependency).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { findRepoRoot } from "./workspace.ts";

export const WORKFLOWS_DIR = ".github/workflows";

/** Checkout steps that intentionally keep the persisted job token, keyed "<file>::<jobId>", with the
 *  reason they push. Every other `actions/checkout` must set persist-credentials: false. */
export const CREDENTIALED_CHECKOUTS: Readonly<Record<string, string>> = {
	// bench-matrix.yml's publish job commits the promoted dataset and `git push`es it back to the
	// branch (it grants `contents: write` for exactly this), so it must keep the persisted token.
	"bench-matrix.yml::publish": "commits + pushes the promoted dataset back to the branch",
};

function asRecord(value: unknown, message: string): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(message);
	}
	return value as Record<string, unknown>;
}

/** Parse a workflow YAML file under `root` (Bun.YAML — built-in, no dependency). */
export function readWorkflow(relPath: string, root: string = findRepoRoot()): unknown {
	return Bun.YAML.parse(readFileSync(join(root, relPath), "utf8"));
}

/** The workflow file names (e.g. "ci.yml") under .github/workflows, sorted. */
export function listWorkflowFiles(root: string = findRepoRoot()): string[] {
	const glob = new Glob("*.{yml,yaml}");
	return [...glob.scanSync({ cwd: join(root, WORKFLOWS_DIR), onlyFiles: true })].sort();
}

/** One `actions/checkout` step found while walking a workflow's jobs. */
export interface CheckoutStep {
	/** Workflow file name, e.g. "ci.yml". */
	file: string;
	/** The job the step lives in. */
	jobId: string;
	/** The step's `with.persist-credentials` value (undefined if no `with`/key). */
	persistCredentials: boolean | undefined;
}

/** Every `actions/checkout` step in a parsed workflow, with its persist-credentials setting. */
export function checkoutSteps(doc: unknown, file: string): CheckoutStep[] {
	const root = asRecord(doc, `${file}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${file}: no jobs mapping`);
	const found: CheckoutStep[] = [];
	for (const [jobId, jobValue] of Object.entries(jobs)) {
		const job = asRecord(jobValue, `${file}: job "${jobId}" is not a mapping`);
		const steps = job.steps;
		if (!Array.isArray(steps)) continue;
		for (const stepValue of steps) {
			const step = asRecord(stepValue, `${file}: job "${jobId}" has a malformed step`);
			const uses = step.uses;
			if (typeof uses !== "string" || !uses.startsWith("actions/checkout@")) continue;
			// An empty `with:` block parses as null (not undefined); treat both as "no inputs" so a
			// valid workflow with a bare `with:` doesn't crash the gate in asRecord.
			const withBlock =
				step.with === undefined || step.with === null
					? {}
					: asRecord(step.with, `${file}: malformed with`);
			// YAML may carry the value as a boolean (`false`) or a quoted string (`"false"`); accept both
			// so a string-typed opt-out isn't misread as "unset" and wrongly flagged by the gate.
			const pc = withBlock["persist-credentials"];
			const persistCredentials =
				typeof pc === "boolean" ? pc : pc === "true" ? true : pc === "false" ? false : undefined;
			found.push({ file, jobId, persistCredentials });
		}
	}
	return found;
}

/**
 * Invariant 1: read-only checkouts opt out of credential persistence; pushing checkouts (the
 * allowlist) keep it. `steps` is the flattened list across all workflows; `allowlist` maps
 * "<file>::<jobId>" to the reason it pushes.
 */
export function checkPersistCredentials(
	steps: CheckoutStep[],
	allowlist: Readonly<Record<string, string>> = CREDENTIALED_CHECKOUTS,
): string[] {
	const errors: string[] = [];
	const seen = new Set<string>();
	for (const step of steps) {
		const key = `${step.file}::${step.jobId}`;
		seen.add(key);
		if (key in allowlist) {
			// A pushing checkout must NOT opt out, or its later `git push` loses its credentials.
			if (step.persistCredentials === false) {
				errors.push(
					`${key}: sets persist-credentials: false but is allowlisted as a pushing checkout ` +
						`(${allowlist[key]}) — the push would lose its token; remove it from the allowlist or the opt-out`,
				);
			}
			continue;
		}
		if (step.persistCredentials !== false) {
			errors.push(
				`${key}: actions/checkout must set persist-credentials: false (it does not push) — ` +
					`add it under \`with:\`, or list "${key}" in CREDENTIALED_CHECKOUTS if it pushes`,
			);
		}
	}
	// The allowlist can't rot: every entry must name a checkout that still exists.
	for (const key of Object.keys(allowlist)) {
		if (!seen.has(key)) {
			errors.push(
				`${key}: listed in CREDENTIALED_CHECKOUTS but no such checkout step exists — remove the stale entry`,
			);
		}
	}
	return errors;
}
