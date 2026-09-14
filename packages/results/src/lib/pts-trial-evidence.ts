import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import type { Run } from "@sandbox-benchmarks/schema";
import { getMetric, isPtsResultFile } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { parsePtsComposite, ptsResultToMetric } from "./pts.ts";
import type { PtsEntry, PtsResult } from "./pts-schema.ts";

/** Trial evidence recovered from an attempt's original, digest-verified raw tree. */
export interface PtsTrialEvidence {
	providerId: string;
	metricId: string;
	source: "raw-string" | "single-trial-value" | "aggregate-value" | "unverified";
	/** RawString count, or one trial proved by the original Entry's execution metadata. */
	observed?: number;
}

const successfulSingleTrialMetadata = type({
	"error?": "never",
	"test-run-times": "string",
}).narrow((metadata) => {
	const duration = metadata["test-run-times"];
	return /^\d+(?:\.\d+)?$/.test(duration.trim()) && Number.isFinite(Number(duration));
});

/** PTS 10.8.4 omits RawString when raw equals final (pts_test_result_buffer_item). Its execution
 * loop records every attempted child in test-run-times; a positive Value with one duration and no
 * error therefore proves a single successful trial. Multiple durations cannot recover raw values. */
function provesSingleValueTrial(entry: PtsEntry): boolean {
	if (entry.Value === undefined || entry.Value <= 0 || !entry.JSON) return false;
	try {
		successfulSingleTrialMetadata.assert(JSON.parse(entry.JSON));
		return true;
	} catch {
		return false;
	}
}

/**
 * Verify the stored shard samples against their original XML before counting trials. In particular,
 * this allows old shards that predate ptsSampleSource to prove their passes without changing their
 * Run or attempt digest. The caller must verify the raw-tree digest and reject links before entry.
 * Never search a different file for a better result: the shard's actual sourceFile owns its samples.
 */
export function readPtsTrialEvidence(rawRoot: string, run: Run): PtsTrialEvidence[] {
	const parsed = new Map<string, PtsResult[]>();
	return run.providers.flatMap((provider) =>
		provider.metrics
			.filter((metric) => getMetric(metric.metricId)?.pts)
			.map((metric) => {
				const evidence: PtsTrialEvidence = {
					providerId: provider.providerId,
					metricId: metric.metricId,
					source: "unverified",
				};
				// Run retains unknown historical provider names. They must still name one directory:
				// sourceFile containment alone cannot protect an already-escaped providerRoot.
				if (
					!provider.providerId ||
					provider.providerId === "." ||
					provider.providerId === ".." ||
					isAbsolute(provider.providerId) ||
					basename(provider.providerId) !== provider.providerId
				)
					return evidence;
				if (!metric.sourceFile || !isPtsResultFile(basename(metric.sourceFile))) return evidence;
				const providerRoot = resolve(rawRoot, provider.providerId);
				const path = resolve(providerRoot, metric.sourceFile);
				const inside = relative(providerRoot, path);
				if (isAbsolute(inside) || inside === ".." || inside.startsWith(`..${sep}`)) return evidence;
				if (!existsSync(path)) return evidence;
				let results = parsed.get(path);
				if (!results) {
					results = parsePtsComposite(readFileSync(path, "utf8")).PhoronixTestSuite.Result;
					parsed.set(path, results);
				}
				for (const result of results) {
					const mapped = ptsResultToMetric(result);
					if (mapped.kind !== "matched" || mapped.def.id !== metric.metricId) continue;
					if (!mapped.measurement) continue;
					if (
						mapped.samples.length !== metric.samples.length ||
						!mapped.samples.every((value, i) => value === metric.samples[i])
					)
						return evidence;
					const { entry, source } = mapped.measurement;
					if (metric.ptsSampleSource !== undefined && metric.ptsSampleSource !== source)
						return evidence;
					if (source === "raw-string")
						return { ...evidence, source, observed: mapped.samples.length };
					return provesSingleValueTrial(entry)
						? { ...evidence, source: "single-trial-value" as const, observed: 1 }
						: { ...evidence, source: "aggregate-value" as const };
				}
				return evidence;
			}),
	);
}
