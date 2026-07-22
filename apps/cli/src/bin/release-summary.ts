#!/usr/bin/env bun
// `release-summary` — the script behind the `release-summary` composite action. Renders a consistent
// per-phase job summary and a run annotation via @actions/core (GitHub's Actions Toolkit) instead of
// hand-rolled `>> "$GITHUB_STEP_SUMMARY"` bash: core.summary owns the Markdown/HTML table + link, and
// core.error/warning/notice surface the phase result in the run's annotations panel. Inputs arrive as
// env (the composite maps its `with:` inputs + the github context), NOT via core.getInput (that only
// works for JS/Docker actions).
//
// Beyond the scalar metadata, the summary reads the phase's uploaded report JSON (bake-<p>.json /
// promote-payload.json) and the release's required-provider set, so the rendered Result is the PRECISE
// outcome — not just `job.status`. That closes the gap that made run 29896891577 unreadable at a glance:
// a promote that had actually published :v5 but showed only "failure", with no hint that the sole
// failure was the best-effort daytona-container. Now every phase shows, at a glance: whether it truly
// passed, which providers failed and whether each was blocking, and any mismatch between job.status and
// the real result.
import * as core from "@actions/core";
import type { CellKind, SummaryRow } from "../lib/actions-log.ts";
import {
	canWriteSummary,
	escapeHtml,
	fieldTable,
	isFailure,
	renderCell,
} from "../lib/actions-log.ts";
import { blockingFailures, isBlockingId, nonBlockingFailures } from "../lib/bake/gates.ts";
import type { BakeReport } from "../lib/bake/types.ts";

// Re-export pure helpers so existing unit tests keep importing from this bin path.
export { escapeHtml, isFailure, renderCell };

/** A phase result classified from the report reports + the required set + the raw job status. */
export interface ReleaseResult {
	/** Drives the annotation channel: error (blocking/failed), warning (best-effort failed), notice (ok). */
	kind: "failure" | "warning" | "ok";
	/** The one-line at-a-glance verdict shown as the summary's first row. */
	result: string;
	/** Failed providers/sentinels that block the release. */
	blocking: string[];
	/** Failed providers that are best-effort (recorded, non-blocking). */
	nonBlocking: string[];
	/** Providers that skipped (missing creds). */
	skipped: string[];
	/**
	 * A stated mismatch between `job.status` and the report-derived result — the "green but failed / red
	 * but nothing failed" case the operator must see. Absent when the two agree.
	 */
	discrepancy?: string;
}

/**
 * Classify a phase from its job status, its provider reports, and the required set. Pure (no env, no
 * core) so the precise-result logic is unit-testable. `required` empty ⇒ the lenient local default,
 * where any provider failure blocks (see gates.ts).
 */
export function classifyRelease(input: {
	jobStatus: string;
	reports: ReadonlyArray<{ provider: string; status: string }>;
	required: readonly string[];
}): ReleaseResult {
	const { jobStatus, reports, required } = input;
	const blocking = blockingFailures(reports, required).map((r) => r.provider);
	const nonBlocking = nonBlockingFailures(reports, required).map((r) => r.provider);
	const skipped = reports.filter((r) => r.status === "skipped").map((r) => r.provider);
	const jobFailed = isFailure(jobStatus);

	let kind: ReleaseResult["kind"];
	let result: string;
	if (blocking.length > 0) {
		kind = "failure";
		result = `Failed — blocking: ${blocking.join(", ")}`;
	} else if (jobFailed) {
		// The job failed but no report blocked — the cause is a step outside the provider reports (an
		// infra/setup step, a crash before the report was written). Still a failure; say where to look.
		kind = "failure";
		result =
			reports.length > 0
				? `Failed (${jobStatus}) — no blocking provider failure recorded; check the step log`
				: `Failed${jobStatus ? ` (${jobStatus})` : ""}`;
	} else if (nonBlocking.length > 0) {
		// The green-but-failed case: the job passed and the release ships, but a best-effort provider did
		// not. Surface it as a warning so it can't hide behind a green check.
		kind = "warning";
		result = `Passed with non-blocking failure(s): ${nonBlocking.join(", ")}`;
	} else {
		kind = "ok";
		result = skipped.length > 0 ? `OK (skipped: ${skipped.join(", ")})` : "OK";
	}

	let discrepancy: string | undefined;
	if (!jobFailed && blocking.length > 0) {
		discrepancy =
			`Job status "${jobStatus || "success"}" is GREEN but a blocking failure was recorded ` +
			`(${blocking.join(", ")}) — the green status is wrong.`;
	} else if (jobFailed && reports.length > 0 && blocking.length === 0) {
		discrepancy =
			`Job status "${jobStatus}" is a failure but no blocking provider failure was recorded — ` +
			"the cause is outside the provider reports (check earlier steps).";
	}

	return { kind, result, blocking, nonBlocking, skipped, discrepancy };
}

/** Parse the `reports` array out of a bake/promote payload; `[]` on any absence/parse error (a phase
 *  with no report — plan/build — or a crash before the report was written must still render metadata). */
export function readReports(json: string | undefined): BakeReport[] {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json) as { reports?: unknown };
		if (!Array.isArray(parsed.reports)) return [];
		return parsed.reports.filter(
			(r): r is BakeReport =>
				typeof r === "object" &&
				r !== null &&
				typeof (r as BakeReport).provider === "string" &&
				typeof (r as BakeReport).status === "string",
		);
	} catch {
		return [];
	}
}

/** Split a comma-separated id list (the `required` composite input) into trimmed, non-empty ids. */
function splitList(raw: string): string[] {
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

/** One row per provider report: id, status, whether a failure blocks, wall time, and the reason. */
function providerReportRows(
	reports: readonly BakeReport[],
	required: readonly string[],
): SummaryRow[] {
	const header: SummaryRow = [
		{ data: "Provider", header: true },
		{ data: "Status", header: true },
		{ data: "Blocking", header: true },
		{ data: "Duration", header: true },
		{ data: "Reason", header: true },
	];
	const rows: SummaryRow[] = reports.map((r) => {
		const blocking = isBlockingId(r.provider, required) ? "yes" : "best-effort";
		const duration = r.durationMs !== undefined ? `${(r.durationMs / 1000).toFixed(1)}s` : "";
		return [
			renderCell(r.provider, "code"),
			renderCell(r.status, "plain"),
			// "Blocking" only matters for a failure; leave it blank for ok/skipped so the eye lands on failures.
			renderCell(r.status === "failed" ? blocking : "", "plain"),
			renderCell(duration, "plain"),
			renderCell(r.reason ?? "", "plain"),
		];
	});
	return [header, ...rows];
}

if (import.meta.main) {
	const env = (key: string): string => process.env[key]?.trim() ?? "";
	const phase = env("PHASE") || "release";
	const status = env("STATUS");
	const required = splitList(env("REQUIRED"));

	let reports: BakeReport[] = [];
	const reportFile = env("REPORT_FILE");
	if (reportFile) {
		const file = Bun.file(reportFile);
		if (await file.exists()) reports = readReports(await file.text());
	}

	const verdict = classifyRelease({ jobStatus: status, reports, required });

	// Job identity — derived in the composite from the github context, so no caller has to thread it.
	const runId = env("RUN_ID");
	const runAttempt = env("RUN_ATTEMPT");
	const job = env("JOB");
	const jobLine = [job, runId && `run ${runId}`, runAttempt && `attempt ${runAttempt}`]
		.filter(Boolean)
		.join(" · ");
	const actor = env("ACTOR");
	const event = env("EVENT");
	const triggeredBy = [actor, event].filter(Boolean).join(" · ");

	// The field vocabulary, in display order. `code` fields (refs, commands, pointers) render monospaced.
	// Result + Job status lead so the precise outcome — and any mismatch with the raw status — is first.
	const fields: Array<[label: string, value: string, kind: CellKind]> = [
		["Result", verdict.result, "plain"],
		["Job status", status, "plain"],
		["Phase", phase, "plain"],
		["Mode", env("MODE"), "code"],
		["Job", jobLine, "code"],
		["Triggered by", triggeredBy, "plain"],
		["Source ref", env("SOURCE_REF"), "code"],
		["Image", env("IMAGE"), "code"],
		["Base image", env("BASE_IMAGE"), "code"],
		["Provider target", env("PROVIDER_TARGET"), "code"],
		["Size tier", env("SIZE_TIER"), "plain"],
		["Required providers", required.join(", "), "code"],
		["Published", env("PUBLISHED"), "code"],
		["Verify command", env("VERIFY"), "code"],
		["Elapsed", env("ELAPSED"), "plain"],
	];

	// `addHeading`/`addLink`/`addRaw` do NOT escape — every value reaching those is escaped by hand.
	if (canWriteSummary()) {
		core.summary.addHeading(`Image release: ${escapeHtml(phase)}`, 3).addTable(fieldTable(fields));

		// The mismatch banner: a bold line an operator can't miss when job.status and the real result disagree.
		if (verdict.discrepancy) {
			core.summary.addRaw(`<strong>⚠ ${escapeHtml(verdict.discrepancy)}</strong>`).addEOL();
		}

		// Per-provider outcomes — the precise result behind the headline (which failed, and was it blocking).
		if (reports.length > 0) {
			core.summary.addHeading("Providers", 4).addTable(providerReportRows(reports, required));
		}

		// Link the uploaded diagnostics artifact to the run's artifacts, so an operator can jump straight there.
		const diagnostics = env("DIAGNOSTICS");
		const runUrl = env("RUN_URL");
		if (diagnostics) {
			core.summary.addRaw("Diagnostics: ", false);
			if (runUrl) core.summary.addLink(escapeHtml(diagnostics), `${runUrl}#artifacts`);
			else core.summary.addRaw(escapeHtml(diagnostics));
			core.summary.addEOL();
		}

		await core.summary.write();
	}

	// Surface the phase result in the run's annotations panel (grouped/filterable), not just the log. The
	// channel follows the PRECISE result, not the raw status: a best-effort failure is a warning even on a
	// green job, and a status/result mismatch always escalates to an error.
	const title = `Image release: ${phase} — ${verdict.result}`;
	const detail = [
		verdict.discrepancy,
		env("IMAGE") && `image=${env("IMAGE")}`,
		env("PUBLISHED") && `published=${env("PUBLISHED")}`,
	]
		.filter(Boolean)
		.join(" · ");
	const message = detail || verdict.result;
	if (verdict.kind === "failure" || verdict.discrepancy) core.error(message, { title });
	else if (verdict.kind === "warning") core.warning(message, { title });
	else core.notice(message, { title });
}
