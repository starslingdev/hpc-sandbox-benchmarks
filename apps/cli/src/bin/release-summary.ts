#!/usr/bin/env bun
// `release-summary` — the script behind the `release-summary` composite action. Renders a consistent
// per-phase job summary and a run annotation via @actions/core (GitHub's Actions Toolkit) instead of
// hand-rolled `>> "$GITHUB_STEP_SUMMARY"` bash: core.summary owns the Markdown/HTML table + link, and
// core.notice/core.error surface the phase result in the run's annotations panel. Inputs arrive as env
// (the composite maps its `with:` inputs), NOT via core.getInput (that only works for JS/Docker actions).
import * as core from "@actions/core";

type Kind = "plain" | "code";

/** Escape the HTML metacharacters so a value (an image ref, a command) can't break — or inject into —
 *  the summary table. Pure + exported for unit testing. */
export function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Render a table cell: `code` values are HTML-escaped and wrapped in `<code>`; `plain` prose is only
 *  escaped. Pure + exported for unit testing. */
export function renderCell(value: string, kind: Kind): string {
	const escaped = escapeHtml(value);
	return kind === "code" ? `<code>${escaped}</code>` : escaped;
}

/** Whether a phase `status` denotes failure. Accepts BOTH spellings in circulation: GitHub's own
 *  `job.status` yields `failure`, while the bake report and this composite's documented vocabulary say
 *  `failed`. Matching only one would render a failed phase as a green notice. Pure + exported. */
export function isFailure(status: string): boolean {
	const s = status.trim().toLowerCase();
	return s === "failure" || s === "failed";
}

if (import.meta.main) {
	const env = (key: string): string => process.env[key]?.trim() ?? "";
	const phase = env("PHASE") || "release";
	const status = env("STATUS");

	// The field vocabulary, in display order. `code` fields (refs, commands, pointers) render monospaced.
	const fields: Array<[label: string, value: string, kind: Kind]> = [
		["Status", status, "plain"],
		["Mode", env("MODE"), "code"],
		["Source ref", env("SOURCE_REF"), "code"],
		["Image", env("IMAGE"), "code"],
		["Base image", env("BASE_IMAGE"), "code"],
		["Provider target", env("PROVIDER_TARGET"), "code"],
		["Size tier", env("SIZE_TIER"), "plain"],
		["Verify command", env("VERIFY"), "code"],
		["Published", env("PUBLISHED"), "code"],
		["Elapsed", env("ELAPSED"), "plain"],
	];

	// A header row plus one row per non-empty field, so each phase shows only its own facts.
	// Typed structurally as the (SummaryTableCell | string)[][] core.summary.addTable accepts.
	const headerRow: Array<{ data: string; header: boolean } | string> = [
		{ data: "Field", header: true },
		{ data: "Value", header: true },
	];
	const rows = [
		headerRow,
		...fields
			.filter(([, value]) => value.length > 0)
			.map(([label, value, kind]) => [label, renderCell(value, kind)]),
	];

	// `addTable` escapes its cells, but `addHeading`/`addLink`/`addRaw` do NOT — @actions/core wraps the
	// text in a tag and emits it verbatim. So every value reaching those three is escaped here by hand;
	// otherwise a phase label or artifact name carrying HTML would inject into the job summary, which is
	// the one release surface an operator reads and trusts.
	core.summary.addHeading(`Image release: ${escapeHtml(phase)}`, 3).addTable(rows);

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

	// Surface the phase result in the run's annotations panel (grouped/filterable), not just the log.
	const title = `Image release: ${phase}${status ? ` — ${status}` : ""}`;
	const detail =
		[env("IMAGE") && `image=${env("IMAGE")}`, env("PUBLISHED") && `published=${env("PUBLISHED")}`]
			.filter(Boolean)
			.join(" · ") || phase;
	// Both spellings mean the same thing and both are in circulation: GitHub's own `job.status` yields
	// `failure`, while the bake report (and this composite's documented vocabulary) says `failed`. Match
	// on either — a release phase that FAILED must never render as a green notice because the caller
	// picked the other word.
	if (isFailure(status)) core.error(detail, { title });
	else core.notice(detail, { title });
}
