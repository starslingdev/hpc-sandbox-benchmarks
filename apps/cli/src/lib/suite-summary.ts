// Actions job-summary table builders for a SuiteTaskPlan.
// Kept separate from suite-tasks.ts so discovery (mise/bash mining) stays free of HTML / Toolkit
// presentation concerns — only the CI cell reporter needs these rows.
import type { SummaryRow } from "./actions-log.ts";
import { escapeHtml, renderCell } from "./actions-log.ts";
import type { SuiteTaskPlan } from "./suite-tasks.ts";

/** Summary-table rows for the suite's mise tasks (Task / Role / Description / PTS profile). */
export function suiteTaskSummaryRows(plan: SuiteTaskPlan): SummaryRow[] {
	const header: SummaryRow = [
		{ data: "Task", header: true },
		{ data: "Role", header: true },
		{ data: "Description", header: true },
		{ data: "PTS profile", header: true },
		{ data: "Results prefix", header: true },
	];
	if (plan.tasks.length === 0) {
		return [
			header,
			[renderCell("(none)", "code"), "", escapeHtml("No mise run commands on this suite"), "", ""],
		];
	}
	return [
		header,
		...plan.tasks.map((task) => [
			renderCell(task.task, "code"),
			escapeHtml(task.role),
			escapeHtml(task.description || task.file || "—"),
			task.ptsProfile ? renderCell(task.ptsProfile, "code") : "",
			task.resultsPrefix ? renderCell(task.resultsPrefix, "code") : "",
		]),
	];
}

/** Summary-table rows for the suite's declared catalog metrics. */
export function suiteMetricSummaryRows(plan: SuiteTaskPlan): SummaryRow[] {
	const header: SummaryRow = [
		{ data: "Metric", header: true },
		{ data: "Label", header: true },
		{ data: "Dimension", header: true },
		{ data: "PTS test", header: true },
	];
	if (plan.metrics.length === 0) {
		return [header, [renderCell("(none)", "code"), "", "", ""]];
	}
	return [
		header,
		...plan.metrics.map((metric) => [
			renderCell(metric.id, "code"),
			escapeHtml(metric.label),
			escapeHtml(metric.dimension),
			metric.ptsTest ? renderCell(metric.ptsTest, "code") : "",
		]),
	];
}
