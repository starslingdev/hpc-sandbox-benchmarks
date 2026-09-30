import { type } from "arktype";
import type { BakeReport } from "./types.ts";

const evidenceSchema = type({
	stage: {
		provider: "string",
		sourceRef: "string",
		baseImage: "string",
		version: "string",
		partial: "boolean",
		force: "boolean",
		ok: "boolean",
	},
	reports: type({
		provider: "string",
		status: "'ok' | 'skipped' | 'failed'",
		"reason?": "string",
		"durationMs?": "number",
	}).array(),
});
export interface PromotionExpectation {
	providers: readonly string[];
	required: readonly string[];
	sourceRef: string;
	baseImage: string;
	version: string;
	partial: boolean;
	force: boolean;
}

/** Only matching, complete per-provider evidence can cross the immutable image commit barrier. */
export function verifyPromotionEvidence(
	values: readonly unknown[],
	expected: PromotionExpectation,
): BakeReport[] {
	if (
		expected.providers.length === 0 ||
		new Set(expected.providers).size !== expected.providers.length ||
		expected.required.some((provider) => !expected.providers.includes(provider)) ||
		!expected.sourceRef ||
		!expected.baseImage ||
		!expected.version ||
		(expected.partial && expected.force)
	)
		throw new Error("Invalid promotion expectation");
	const seen = new Set<string>();
	const reports: BakeReport[] = [];
	for (const value of values) {
		const evidence = evidenceSchema.assert(value);
		const stage = evidence.stage;
		if (!expected.providers.includes(stage.provider) || seen.has(stage.provider))
			throw new Error(`Unexpected or duplicate promotion: ${stage.provider}`);
		seen.add(stage.provider);
		for (const field of ["sourceRef", "baseImage", "version", "partial", "force"] as const) {
			if (stage[field] !== expected[field])
				throw new Error(`Promotion ${stage.provider} mismatches ${field}`);
		}
		if (
			evidence.reports.some(
				(report) => report.provider !== stage.provider && report.provider !== "image",
			)
		)
			throw new Error(`Foreign provider report in ${stage.provider}`);
		if (
			expected.required.includes(stage.provider) &&
			(!stage.ok ||
				!evidence.reports.some(
					(report) => report.provider === stage.provider && report.status === "ok",
				) ||
				evidence.reports.some((report) => report.status === "failed"))
		)
			throw new Error(`Required provider did not promote: ${stage.provider}`);
		reports.push(...evidence.reports);
	}
	const missing = expected.providers.filter((provider) => !seen.has(provider));
	if (missing.length) throw new Error(`Missing promotion evidence: ${missing.join(", ")}`);
	return reports;
}
