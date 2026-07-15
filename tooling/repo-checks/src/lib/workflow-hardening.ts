// Drift gate: the security posture of the GitHub Actions layer. Invariants the .github/ files must
// hold, none of which the type system can enforce (GHA is YAML):
//
//   1. persist-credentials hygiene — every `actions/checkout` step sets `persist-credentials: false`
//      UNLESS it is one of the few jobs that later `git push`es (it needs the persisted job token).
//      The pushing checkouts are enumerated in CREDENTIALED_CHECKOUTS with provenance; the gate fails
//      both when a read-only checkout forgets the opt-out AND when a pushing checkout is in the
//      allowlist but no longer exists / no longer keeps its token (so the allowlist can't rot).
//   2. The ci-lint workflow actually runs the two linters at the agreed gate threshold — an actionlint
//      job and a zizmor job invoked with `--min-severity medium --min-confidence high`. A renamed job
//      or a loosened threshold (e.g. someone dropping --min-confidence) must fail this gate.
//   3. Privileged-environment gate — every job that reads a custom secret (anything other than
//      GITHUB_TOKEN / github.token) OR elevates to contents:write / packages:write must declare
//      `environment: privileged`, so secrets and releases stay behind Environment protection rules.
//   4. Toolchain publish is dispatch-only — toolchain-image.yml must not fire a release on push/merge.
//
// Bun.YAML.parse is built into bun >= 1.3 (no new dependency).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { findRepoRoot } from "./workspace.ts";

export const WORKFLOWS_DIR = ".github/workflows";
export const CI_LINT_WORKFLOW = ".github/workflows/ci-lint.yml";
export const TOOLCHAIN_WORKFLOW = "toolchain-image.yml";

/** GitHub Environment name that holds provider secrets and gates releases. See docs/ci-secrets.md. */
export const PRIVILEGED_ENVIRONMENT = "privileged";

/** Checkout steps that intentionally keep the persisted job token, keyed "<file>::<jobId>", with the
 *  reason they push. Every other `actions/checkout` must set persist-credentials: false. */
export const CREDENTIALED_CHECKOUTS: Readonly<Record<string, string>> = {
	// bench-matrix.yml's publish job commits the promoted dataset and `git push`es it back to the
	// branch (it grants `contents: write` for exactly this), so it must keep the persisted token.
	"bench-matrix.yml::publish": "commits + pushes the promoted dataset back to the branch",
};

/** Built-in / non-environment tokens that may appear as `${{ secrets.* }}` without requiring the
 *  privileged Environment. Provider API keys and other org secrets must NOT be listed here. */
const BUILTIN_SECRET_NAMES = new Set(["GITHUB_TOKEN"]);

/** Matches `${{ secrets.NAME }}`, `${{ secrets['NAME'] }}`, or `${{ secrets["NAME"] }}`
 *  (with optional `|| …` after the access). Bracket form is rarer but a real bypass if ignored. */
const SECRET_EXPR = /\$\{\{\s*secrets(?:\.([A-Za-z0-9_]+)|\s*\[\s*['"]([A-Za-z0-9_]+)['"]\s*\])/g;

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

/** Invariant 2: ci-lint.yml runs actionlint + zizmor, and zizmor at the agreed gate threshold. */
export function checkCiLintGate(doc: unknown, label: string = CI_LINT_WORKFLOW): string[] {
	const errors: string[] = [];
	const root = asRecord(doc, `${label}: not a YAML mapping`);
	const jobs = asRecord(root.jobs, `${label}: no jobs mapping`);
	// The joined `run:` text of a job's steps — used to confirm the job actually invokes its tool.
	const jobRun = (jobId: string): string => {
		const job = asRecord(jobs[jobId], `${label}: "${jobId}" job is not a mapping`);
		const steps = Array.isArray(job.steps) ? job.steps : [];
		return steps
			.map((s) => asRecord(s, `${label}: malformed "${jobId}" step`).run)
			.filter((r): r is string => typeof r === "string")
			.join("\n");
	};
	for (const tool of ["actionlint", "zizmor"]) {
		if (!(tool in jobs)) {
			errors.push(`${label}: missing the "${tool}" job — the ${tool} linter is the gate`);
			continue;
		}
		// Job existence isn't enough: it must actually invoke the tool, or the gate false-passes if
		// the real invocation is renamed/removed while an empty job shell survives.
		if (!jobRun(tool).includes(tool)) {
			errors.push(
				`${label}: the "${tool}" job must actually run \`${tool}\` — the gate must not pass on a job that no longer invokes it`,
			);
		}
	}
	if ("zizmor" in jobs) {
		const run = jobRun("zizmor");
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

/** Collect string leaves from an `env:` mapping (job- or step-level). */
function envStrings(envValue: unknown): string[] {
	if (envValue === undefined || envValue === null) return [];
	const env = asRecord(envValue, "env is not a mapping");
	return Object.values(env).filter((v): v is string => typeof v === "string");
}

/** Custom secret names referenced in a string (excludes GITHUB_TOKEN). */
export function customSecretsIn(text: string): string[] {
	const found: string[] = [];
	for (const match of text.matchAll(SECRET_EXPR)) {
		const name = match[1] || match[2];
		if (name && !BUILTIN_SECRET_NAMES.has(name)) found.push(name);
	}
	return found;
}

/** Effective write scopes for a job: job permissions override top-level when the job sets any. */
function effectiveWriteScopes(
	workflowPerms: Record<string, unknown> | undefined,
	jobPerms: Record<string, unknown> | undefined,
): { contentsWrite: boolean; packagesWrite: boolean } {
	const scopes = jobPerms !== undefined ? jobPerms : (workflowPerms ?? {});
	return {
		contentsWrite: scopes.contents === "write",
		packagesWrite: scopes.packages === "write",
	};
}

/** Resolve a job's `environment` name (string form or `{ name: … }` mapping). */
export function jobEnvironmentName(job: Record<string, unknown>): string | undefined {
	const env = job.environment;
	if (typeof env === "string") return env;
	if (env !== null && typeof env === "object" && !Array.isArray(env)) {
		const name = (env as Record<string, unknown>).name;
		return typeof name === "string" ? name : undefined;
	}
	return undefined;
}

/**
 * Invariant 3: jobs that touch custom secrets or elevate write permissions must sit behind the
 * `privileged` GitHub Environment so Environment secrets + required reviewers apply.
 */
export function checkPrivilegedEnvironment(
	doc: unknown,
	file: string,
	privileged: string = PRIVILEGED_ENVIRONMENT,
): string[] {
	const errors: string[] = [];
	const root = asRecord(doc, `${file}: not a YAML mapping`);
	const workflowPerms =
		root.permissions === undefined || root.permissions === null
			? undefined
			: asRecord(root.permissions, `${file}: malformed permissions`);
	// Workflow-level `env` is inherited by every job/step — secrets there must not bypass the gate.
	const workflowSecrets = new Set(envStrings(root.env).flatMap((text) => customSecretsIn(text)));
	const jobs = asRecord(root.jobs, `${file}: no jobs mapping`);

	for (const [jobId, jobValue] of Object.entries(jobs)) {
		const job = asRecord(jobValue, `${file}: job "${jobId}" is not a mapping`);
		const key = `${file}::${jobId}`;
		const secrets = new Set(workflowSecrets);

		if (typeof job.if === "string") {
			for (const name of customSecretsIn(job.if)) secrets.add(name);
		}
		for (const text of envStrings(job.env)) {
			for (const name of customSecretsIn(text)) secrets.add(name);
		}
		const steps = Array.isArray(job.steps) ? job.steps : [];
		for (const stepValue of steps) {
			const step = asRecord(stepValue, `${file}: job "${jobId}" has a malformed step`);
			if (typeof step.if === "string") {
				for (const name of customSecretsIn(step.if)) secrets.add(name);
			}
			for (const text of envStrings(step.env)) {
				for (const name of customSecretsIn(text)) secrets.add(name);
			}
			// Inline secrets in `with:` (e.g. docker/login-action password) — only flag custom ones.
			if (step.with !== undefined && step.with !== null) {
				const withBlock = asRecord(step.with, `${file}: malformed with`);
				for (const value of Object.values(withBlock)) {
					if (typeof value !== "string") continue;
					for (const name of customSecretsIn(value)) secrets.add(name);
				}
			}
			if (typeof step.run === "string") {
				for (const name of customSecretsIn(step.run)) secrets.add(name);
			}
		}

		const jobPerms =
			job.permissions === undefined || job.permissions === null
				? undefined
				: asRecord(job.permissions, `${file}: job "${jobId}" malformed permissions`);
		const { contentsWrite, packagesWrite } = effectiveWriteScopes(workflowPerms, jobPerms);
		const needsPrivileged = secrets.size > 0 || contentsWrite || packagesWrite;
		if (!needsPrivileged) continue;

		const envName = jobEnvironmentName(job);
		if (envName !== privileged) {
			const reasons: string[] = [];
			if (secrets.size > 0) {
				reasons.push(`custom secrets (${[...secrets].sort().join(", ")})`);
			}
			if (contentsWrite) reasons.push("contents: write");
			if (packagesWrite) reasons.push("packages: write");
			errors.push(
				`${key}: must set \`environment: ${privileged}\` because it uses ${reasons.join(" and ")} — ` +
					`see docs/ci-secrets.md`,
			);
		}
	}
	return errors;
}

/**
 * Invariant 4: toolchain-image.yml publishes only via workflow_dispatch — a push/merge must never
 * start a GHCR release. Allowed top-level triggers are exactly `workflow_dispatch` + `pull_request`
 * (the secret-free PR gate). Call only with that workflow's document; {@link runHardeningCheck}
 * does the file selection.
 */
export function checkToolchainDispatchOnly(
	doc: unknown,
	file: string = TOOLCHAIN_WORKFLOW,
): string[] {
	const errors: string[] = [];
	const root = asRecord(doc, `${file}: not a YAML mapping`);
	// Bun.YAML keeps the GHA `on:` key as the string "on" (see workflow-sync.ts).
	const on = root.on;
	if (on === null || typeof on !== "object" || Array.isArray(on)) {
		errors.push(`${file}: missing or malformed \`on:\` trigger map`);
		return errors;
	}
	const triggers = on as Record<string, unknown>;
	const allowed = new Set(["workflow_dispatch", "pull_request"]);
	const triggerKeys = Object.keys(triggers);
	for (const key of triggerKeys) {
		if (!allowed.has(key)) {
			errors.push(
				`${file}: trigger \`${key}\` is not allowed — toolchain publish is workflow_dispatch-only ` +
					`(plus pull_request for the secret-free PR gate); see docs/ci-secrets.md`,
			);
		}
	}
	if (!("workflow_dispatch" in triggers)) {
		errors.push(
			`${file}: must declare \`workflow_dispatch\` — that is the only path that reaches the publish job`,
		);
	}
	if (!("pull_request" in triggers)) {
		errors.push(
			`${file}: must declare \`pull_request\` — the secret-free PR docker smoke gate must stay on the PR path`,
		);
	}

	const jobs = asRecord(root.jobs, `${file}: no jobs mapping`);
	if (!("publish" in jobs)) {
		errors.push(`${file}: missing the "publish" job — that is the GHCR release lane`);
		return errors;
	}
	const publish = asRecord(jobs.publish, `${file}: publish job is not a mapping`);
	if (jobEnvironmentName(publish) !== PRIVILEGED_ENVIRONMENT) {
		errors.push(
			`${file}::publish: must set \`environment: ${PRIVILEGED_ENVIRONMENT}\` — GHCR promote is a release`,
		);
	}
	const publishIf = typeof publish.if === "string" ? publish.if : "";
	for (const needle of [
		"workflow_dispatch",
		"refs/heads/main",
		"starslingdev/sandbox-benchmarks",
	] as const) {
		if (!publishIf.includes(needle)) {
			errors.push(
				`${file}::publish: \`if:\` must confine the release to workflow_dispatch on main of ` +
					`starslingdev/sandbox-benchmarks (missing "${needle}")`,
			);
		}
	}
	return errors;
}

/** The whole gate against the real .github files under `root`. */
export function runHardeningCheck(root: string = findRepoRoot()): string[] {
	const files = listWorkflowFiles(root);
	const docs = new Map(
		files.map((file) => [file, readWorkflow(`${WORKFLOWS_DIR}/${file}`, root)] as const),
	);
	const steps = files.flatMap((file) => checkoutSteps(docs.get(file), file));
	const ciLintFile = CI_LINT_WORKFLOW.slice(`${WORKFLOWS_DIR}/`.length);
	const ciLintDoc = docs.get(ciLintFile);
	const errors = [
		...checkPersistCredentials(steps),
		...(ciLintDoc === undefined
			? [`${CI_LINT_WORKFLOW}: missing from ${WORKFLOWS_DIR}`]
			: checkCiLintGate(ciLintDoc)),
	];
	for (const file of files) {
		errors.push(...checkPrivilegedEnvironment(docs.get(file), file));
	}
	const toolchainDoc = docs.get(TOOLCHAIN_WORKFLOW);
	if (toolchainDoc === undefined) {
		errors.push(`${TOOLCHAIN_WORKFLOW}: missing from ${WORKFLOWS_DIR}`);
	} else {
		errors.push(...checkToolchainDispatchOnly(toolchainDoc, TOOLCHAIN_WORKFLOW));
	}
	return errors;
}
