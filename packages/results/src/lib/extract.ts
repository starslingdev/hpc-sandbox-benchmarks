/**
 * Walk one provider's raw result directory (`data/raw/<runId>/<provider>/`) and pull out catalogued
 * Metric samples, uncatalogued stragglers, and gap markers. SDK-free: the filesystem and the schema
 * contract only — never a provider SDK (enforced by the package boundary).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ObservedSpecs, ResultGap, UncataloguedResult } from "@sandbox-benchmarks/schema";
import { isGapMarkerFile, isPtsResultFile, parseGapMarker } from "@sandbox-benchmarks/schema";
import { parsePtsComposite, ptsResultToMetric } from "./pts.ts";
import { parseSystemHost } from "./system-specs.ts";

/** One Metric's samples sourced from a single raw file — the provenance the normalizer preserves. */
export interface SampleContribution {
	metricId: string;
	samples: number[];
	sourceFile: string;
	/** PTS profile AppVersion, when the `<Result>` reported a non-empty one. */
	appVersion?: string;
	/** The exact PTS option Arguments that produced these Samples, when non-empty. */
	arguments?: string;
}

/** A catalogued Metric that was attempted but produced no measurement (every pass errored). */
export interface AttemptedEmptyResult {
	metricId: string;
	/**
	 * The composite that contained this Result. PTS result-name reuse can duplicate one metric across
	 * composites, so this is provenance, not proof that the filename's leaf produced the Result;
	 * consumers must reconcile attempted-empty and measured observations by metricId.
	 */
	sourceFile: string;
}

/** A PTS Result that was present in a composite but did not match any catalog Metric. */
export interface UnmappedPtsResult {
	test: string;
	description: string;
	scale: string;
	sourceFile: string;
}

/** Everything one provider directory yields: catalogued samples, stragglers, and gap markers. */
export interface ProviderExtraction {
	contributions: SampleContribution[];
	uncatalogued: UncataloguedResult[];
	/** Internal evidence that a Result existed even when it carried no publishable measurement. */
	unmappedPts: UnmappedPtsResult[];
	/** Suite-scoped gaps read from `*--skipped.json` / `*--failed.json` markers. */
	gaps: ResultGap[];
	/**
	 * CATALOGUED `<Result>`s that were attempted and produced no measurement (the all-passes-failed
	 * empty-`<Value>` shape). Evidence, not a gap yet: the normalizer diffs these against the suite's
	 * declared metrics to emit its suite-shortfall gap. Deliberately restricted to catalogued ids —
	 * an uncatalogued empty Result records nothing, because only declared metrics participate in the
	 * shortfall diff (an expectation-based diff would fabricate gaps for disk's probe-dependent fio
	 * variants and PTS's dropped-duplicate Results, which are legitimately absent, not lost).
	 */
	attemptedEmpty: AttemptedEmptyResult[];
	/**
	 * HOST-side specs read from a composite's `<System>` fingerprint (the underlying machine, not the
	 * sandbox quota), when any composite in this directory carried one. The first composite with a
	 * non-empty `<System>` wins (all files come from one sandbox). The run-writer layer merges this UNDER
	 * the in-sandbox spec probe, so the dedicated probe always wins on the effective fields.
	 */
	observedHost?: ObservedSpecs;
}

/** Parse JSON, returning undefined rather than throwing on a malformed gap marker. */
function readJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/** Extract every catalogued/uncatalogued result and gap marker from one provider's raw directory. */
export function extractProviderDir(dir: string, providerId: string): ProviderExtraction {
	const out: ProviderExtraction = {
		contributions: [],
		uncatalogued: [],
		unmappedPts: [],
		gaps: [],
		attemptedEmpty: [],
	};

	// `withFileTypes` so a subdirectory can't be fed to readFileSync (EISDIR); sort for determinism.
	const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	);
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const filename = entry.name;
		const fullPath = join(dir, filename);

		if (isPtsResultFile(filename)) {
			const composite = parsePtsComposite(readFileSync(fullPath, "utf8"));
			// Capture the host fingerprint from the first composite that carries a non-empty <System>.
			// Host-only (never effective): merged under the in-sandbox spec probe at the run-writer layer.
			if (!out.observedHost && composite.PhoronixTestSuite.System) {
				const host = parseSystemHost(composite.PhoronixTestSuite.System);
				if (Object.keys(host).length > 0) out.observedHost = host;
			}
			for (const result of composite.PhoronixTestSuite.Result) {
				const mapped = ptsResultToMetric(result);
				if (mapped.kind === "uncatalogued") {
					// Keep existence evidence even when the Result is empty. Consumers that infer a Result
					// was omitted must distinguish true absence from a present-but-unmapped Result.
					out.unmappedPts.push({
						test: mapped.test,
						description: mapped.description,
						scale: mapped.scale,
						sourceFile: filename,
					});
				}
				// A <Result> with no measured <Entry>, or one whose every pass failed (empty <Value> — pts-schema.ts
				// treats that as "no measurement", not a parse error; fio's all-failed shape additionally
				// empties <Proportion> and <Scale>, tolerated the same way), carries no sample to aggregate
				// and no headline value to report. Skip it rather than emit a zero-sample contribution
				// (which would throw in the normalizer's aggregate([])) or fabricate a 0-valued straggler —
				// but record a CATALOGUED skip as attempted-empty evidence first, so the normalizer's
				// suite-shortfall gap can name the declared metrics that were attempted and lost. Inspect every
				// Entry: PTS can preserve an empty entry before a later measured one.
				const measuredEntry = result.Data.Entry.find((entry) => entry.Value !== undefined);
				if (!measuredEntry || measuredEntry.Value === undefined) {
					if (mapped.kind === "matched") {
						out.attemptedEmpty.push({ metricId: mapped.def.id, sourceFile: filename });
					}
					continue;
				}
				switch (mapped.kind) {
					case "matched":
						// Carry the profile version + option arguments as provenance, but only when PTS actually
						// populated them — node-web-tooling, e.g., emits empty <AppVersion>/<Arguments>.
						out.contributions.push({
							metricId: mapped.def.id,
							samples: mapped.samples,
							sourceFile: filename,
							...(result.AppVersion ? { appVersion: result.AppVersion } : {}),
							...(result.Arguments ? { arguments: result.Arguments } : {}),
						});
						break;
					case "uncatalogued":
						out.uncatalogued.push({
							// Scale is part of the id: scale-pinned twins (fio posts MB/s and IOPS under one
							// description) share a test+description, so without it two stragglers whose
							// `<Scale>` matched no pin collapse onto one id and the dedupe downstream
							// (normalize-tree) silently drops the second measurement.
							id: `${mapped.test}::${mapped.description || "default"}::${mapped.scale}`,
							// Value is a guaranteed number — the schema parses it and we selected a measured Entry.
							value: measuredEntry.Value,
							unit: result.Scale,
							// The schema narrow makes a valued Result with an empty Proportion unrepresentable;
							// this guard exists only to convince the type system and degrades to an omitted
							// (optional) direction if that invariant ever regresses.
							...(result.Proportion !== "" ? { direction: result.Proportion } : {}),
							sourceFile: filename,
						});
						break;
					default: {
						// Exhaustiveness guard: a new PtsMapping arm without a case here is a compile error.
						const _exhaustive: never = mapped;
						throw new Error(`unhandled PTS mapping: ${JSON.stringify(_exhaustive)}`);
					}
				}
			}
			continue;
		}

		if (isGapMarkerFile(filename)) {
			const marker = parseGapMarker(filename, readJson(readFileSync(fullPath, "utf8")), providerId);
			if (marker) out.gaps.push(marker);
		}
	}

	return out;
}
