// Drift gate: the security posture of the GitHub Actions layer. Two invariants the .github/ files
// must hold, neither of which the type system can enforce (GHA is YAML):
//
//   1. persist-credentials hygiene — every `actions/checkout` step sets `persist-credentials: false`
//      UNLESS it is one of the few jobs that later `git push`es (it needs the persisted job token).
//      The pushing checkouts are enumerated in CREDENTIALED_CHECKOUTS with provenance; the gate fails
//      both when a read-only checkout forgets the opt-out AND when a pushing checkout is in the
//      allowlist but no longer exists / no longer keeps its token (so the allowlist can't rot).
//   2. The ci-lint workflow actually runs the two linters at the agreed gate threshold — an actionlint
//      job and a zizmor job invoked with `--min-severity medium --min-confidence high`. A renamed job
//      or a loosened threshold (e.g. someone dropping --min-confidence) must fail this gate.
//
// Mirrors runner-benchmarking's ci-lint.yml + zizmor.yml hardening, adapted to this repo's workflows.
// Bun.YAML.parse is built into bun >= 1.3 (no new dependency).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { findRepoRoot } from "./workspace.ts";

export const WORKFLOWS_DIR = ".github/workflows";
export const CI_LINT_WORKFLOW = ".github/workflows/ci-lint.yml";

/** Checkout steps that intentionally keep the persisted job token, keyed "<file>::<jobId>", with the
 *  reason they push. Every other `actions/checkout` must set persist-credentials: false. */
export const CREDENTIALED_CHECKOUTS: Record<string, string> = {
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
			const withBlock =
				step.with === undefined ? {} : asRecord(step.with, `${file}: malformed with`);
			const pc = withBlock["persist-credentials"];
			found.push({
				file,
				jobId,
				persistCredentials: typeof pc === "boolean" ? pc : undefined,
			});
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
	allowlist: Record<string, string> = CREDENTIALED_CHECKOUTS,
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

/** Invariant 2: ci-lint.yml runs actionlint + zizmor, and zizmor at the agreed gate threshold. */
export function checkCiLintGate(doc: unknown, label: string = CI_LINT_WORKFLOW): string[] {
	const errors: string[] = [];
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	for (const required of ["actionlint", "zizmor"]) {
		if (!(required in jobs)) {
			errors.push(`${label}: missing the "${required}" job — the ${required} linter is the gate`);
		}
	}
	if ("zizmor" in jobs) {
		const zizmor = asRecord(jobs.zizmor, `${label}: zizmor job is not a mapping`);
		const steps = Array.isArray(zizmor.steps) ? zizmor.steps : [];
		const run = steps
			.map((s) => asRecord(s, `${label}: malformed zizmor step`).run)
			.filter((r): r is string => typeof r === "string")
			.join("\n");
		for (const flag of ["--min-severity medium", "--min-confidence high"]) {
			if (!run.includes(flag)) {
				errors.push(
					`${label}: the zizmor job must invoke zizmor with \`${flag}\` — the gate threshold can't be loosened`,
				);
			}
		}
	}
	return errors;
}

/** The whole gate against the real .github files under `root`. */
export function runHardeningCheck(root: string = findRepoRoot()): string[] {
	const steps = listWorkflowFiles(root).flatMap((file) =>
		checkoutSteps(readWorkflow(`${WORKFLOWS_DIR}/${file}`, root), file),
	);
	return [
		...checkPersistCredentials(steps),
		...checkCiLintGate(readWorkflow(CI_LINT_WORKFLOW, root)),
	];
}
