// Shared GitHub Actions Toolkit helpers for CLI bins that also run locally.
// Prefer @actions/core over console.* so step logs, foldable groups, annotations, and job
// summaries stay metadata-rich in CI. Outside Actions, avoid emitting workflow-command prefixes
// onto stdout (they break local JSON contracts); summary writes are gated on $GITHUB_STEP_SUMMARY.

import type { AnnotationProperties } from "@actions/core";
import * as core from "@actions/core";
import type { Run } from "@sandbox-benchmarks/schema";

export type CellKind = "plain" | "code";

/** True when the process is running inside a GitHub Actions runner. */
export function inActions(): boolean {
	return process.env.GITHUB_ACTIONS === "true";
}

/** True when the job summary file is available (Actions sets $GITHUB_STEP_SUMMARY). */
export function canWriteSummary(): boolean {
	return Boolean(process.env.GITHUB_STEP_SUMMARY?.trim());
}

/** Escape HTML metacharacters for values reaching core.summary addHeading/addRaw/addLink. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Render a summary table cell: `code` wraps in `<code>` after escaping; `plain` only escapes. */
export function renderCell(value: string, kind: CellKind): string {
	const escaped = escapeHtml(value);
	return kind === "code" ? `<code>${escaped}</code>` : escaped;
}

/** Whether a status string denotes failure (`failure` / `failed`, either casing). */
export function isFailure(status: string): boolean {
	const s = status.trim().toLowerCase();
	return s === "failure" || s === "failed";
}

type SummaryRow = Array<{ data: string; header: boolean } | string>;

/** Build a Field/Value table from non-empty `[label, value, kind]` rows. */
export function fieldTable(
	fields: Array<[label: string, value: string, kind: CellKind]>,
): SummaryRow[] {
	const header: SummaryRow = [
		{ data: "Field", header: true },
		{ data: "Value", header: true },
	];
	return [
		header,
		...fields
			.filter(([, value]) => value.length > 0)
			.map(([label, value, kind]) => [label, renderCell(value, kind)]),
	];
}

/** Provider-status rows for a Run summary table (one row per provider). */
export function providerSummaryRows(run: Run): SummaryRow[] {
	const header: SummaryRow = [
		{ data: "Provider", header: true },
		{ data: "Status", header: true },
		{ data: "Metrics", header: true },
		{ data: "Suites", header: true },
		{ data: "Skipped", header: true },
		{ data: "Failed", header: true },
		{ data: "Uncatalogued", header: true },
	];
	const rows = run.providers.map((provider) => {
		const skipped = provider.gaps.filter((g) => g.outcome === "skipped").length;
		const failed = provider.gaps.filter((g) => g.outcome === "failed").length;
		return [
			renderCell(provider.providerId, "code"),
			escapeHtml(provider.validationStatus),
			escapeHtml(String(provider.metrics.length)),
			escapeHtml(String(provider.suitesCovered.length)),
			escapeHtml(String(skipped)),
			escapeHtml(String(failed)),
			escapeHtml(String(provider.uncatalogued.length)),
		];
	});
	return [header, ...rows];
}

/** Log each provider status line; optionally wrap in a foldable group (never nest inside core.group). */
export function logProviderStatuses(
	run: Run,
	opts: { groupTitle?: string; grouped?: boolean } = {},
): void {
	const grouped = opts.grouped === true && inActions();
	if (grouped) core.startGroup(opts.groupTitle ?? "Provider status");
	for (const provider of run.providers) {
		const skipped = provider.gaps.filter((g) => g.outcome === "skipped").length;
		const failed = provider.gaps.filter((g) => g.outcome === "failed").length;
		const line =
			`${provider.providerId} status=${provider.validationStatus} ` +
			`metrics=${provider.metrics.length} suites=${provider.suitesCovered.length} ` +
			`skipped=${skipped} failed=${failed} uncatalogued=${provider.uncatalogued.length}`;
		if (inActions()) core.info(line);
		else console.error(line);
		if (inActions() && core.isDebug()) {
			for (const gap of provider.gaps) {
				core.debug(`  gap ${gap.scope}/${gap.id} ${gap.outcome}: ${gap.reason}`);
			}
			if (provider.observedSpecs.cpuModel) {
				core.debug(
					`  observed cpu=${provider.observedSpecs.cpuModel}` +
						(provider.observedSpecs.cpuMicroarch
							? ` (${provider.observedSpecs.cpuMicroarch})`
							: ""),
				);
			}
		}
	}
	if (grouped) core.endGroup();
}

/**
 * Run `fn` inside a foldable Actions group when in CI; otherwise just await `fn` so local stdout
 * stays free of `::group::` prefixes (needed for single-line JSON contracts).
 */
export async function withGroup<T>(title: string, fn: () => Promise<T> | T): Promise<T> {
	if (inActions()) return await core.group(title, async () => fn());
	return await fn();
}

export interface JobSummaryOptions {
	/** Heading text (HTML-escaped). */
	heading: string;
	/** Heading level 1–6 (default 3). */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
	/** Field/value rows for the primary metadata table. */
	fields: Array<[label: string, value: string, kind: CellKind]>;
	/** Optional extra tables (e.g. provider status). */
	tables?: Array<{ heading: string; rows: SummaryRow[] }>;
	/** Optional free-form detail paragraph. */
	detail?: string;
	/**
	 * Annotation for the run's annotations panel. Failures always annotate; successes stay in the
	 * job summary unless `noticeOnSuccess` is set (avoids notice spam across matrix cells).
	 */
	annotation?: {
		failed: boolean;
		title: string;
		message: string;
		properties?: AnnotationProperties;
		noticeOnSuccess?: boolean;
	};
}

/**
 * Write a metadata-rich job summary (when $GITHUB_STEP_SUMMARY is set) and optionally an
 * annotation. Failure annotations always emit; success notices are opt-in.
 */
export async function writeJobSummary(opts: JobSummaryOptions): Promise<void> {
	if (canWriteSummary()) {
		core.summary
			.addHeading(escapeHtml(opts.heading), opts.headingLevel ?? 3)
			.addTable(fieldTable(opts.fields));
		for (const table of opts.tables ?? []) {
			core.summary.addHeading(escapeHtml(table.heading), 4).addTable(table.rows);
		}
		if (opts.detail) {
			core.summary.addRaw(escapeHtml(opts.detail)).addEOL();
		}
		await core.summary.write();
	}
	if (opts.annotation?.failed) {
		core.error(opts.annotation.message, {
			title: opts.annotation.title,
			...opts.annotation.properties,
		});
	} else if (opts.annotation?.noticeOnSuccess) {
		core.notice(opts.annotation.message, {
			title: opts.annotation.title,
			...opts.annotation.properties,
		});
	}
}

export interface FailOptions {
	/** Titled annotation properties (emits one core.error). */
	properties?: AnnotationProperties;
	/** Process exit code (default 1; plan/discovery usage errors use 2). */
	exitCode?: number;
	/**
	 * When false, skip emitting another annotation — the caller already wrote one (e.g.
	 * writeJobSummary). Non-zero exit still fails the Actions step.
	 */
	annotate?: boolean;
}

/**
 * Fail the process with at most one Actions annotation. Prefer this over bare `console.error` +
 * `process.exit`. Do not combine with a prior `core.error` for the same message — `setFailed`
 * itself annotates, so titled failures use `core.error` alone. Outside Actions, always print to
 * stderr (never `::error::` workflow commands that mangle multi-line HELP locally).
 */
export function fail(message: string, opts: FailOptions = {}): never {
	const exitCode = opts.exitCode ?? 1;
	const annotate = opts.annotate !== false;
	if (inActions()) {
		if (annotate) {
			if (opts.properties) core.error(message, opts.properties);
			else core.setFailed(message);
		}
		// annotate:false → silent non-zero exit; caller already wrote the annotation.
	} else {
		console.error(message);
	}
	process.exit(exitCode);
}
