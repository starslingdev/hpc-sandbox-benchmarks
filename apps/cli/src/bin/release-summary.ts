#!/usr/bin/env bun
// `release-summary` — the script behind the `release-summary` composite action. Renders a consistent
// per-phase job summary and a run annotation via @actions/core (GitHub's Actions Toolkit) instead of
// hand-rolled `>> "$GITHUB_STEP_SUMMARY"` bash: core.summary owns the Markdown/HTML table + link, and
// core.notice/core.error surface the phase result in the run's annotations panel. Inputs arrive as env
// (the composite maps its `with:` inputs), NOT via core.getInput (that only works for JS/Docker actions).
import * as core from "@actions/core";
import type { CellKind } from "../lib/actions-log.ts";
import {
	canWriteSummary,
	escapeHtml,
	fieldTable,
	isFailure,
	renderCell,
} from "../lib/actions-log.ts";

// Re-export pure helpers so existing unit tests keep importing from this bin path.
export { escapeHtml, isFailure, renderCell };

if (import.meta.main) {
	const env = (key: string): string => process.env[key]?.trim() ?? "";
	const phase = env("PHASE") || "release";
	const status = env("STATUS");

	// The field vocabulary, in display order. `code` fields (refs, commands, pointers) render monospaced.
	const fields: Array<[label: string, value: string, kind: CellKind]> = [
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

	// `addHeading`/`addLink`/`addRaw` do NOT escape — every value reaching those is escaped by hand.
	if (canWriteSummary()) {
		core.summary.addHeading(`Image release: ${escapeHtml(phase)}`, 3).addTable(fieldTable(fields));

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

	// Surface the phase result in the run's annotations panel (grouped/filterable), not just the log.
	const title = `Image release: ${phase}${status ? ` — ${status}` : ""}`;
	const detail =
		[env("IMAGE") && `image=${env("IMAGE")}`, env("PUBLISHED") && `published=${env("PUBLISHED")}`]
			.filter(Boolean)
			.join(" · ") || phase;
	if (isFailure(status)) core.error(detail, { title });
	else core.notice(detail, { title });
}
