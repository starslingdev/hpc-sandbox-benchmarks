/**
 * Walk one provider's raw result directory (`data/raw/<runId>/<provider>/`) and pull out catalogued
 * Metric samples, uncatalogued stragglers, and skip markers. SDK-free: the filesystem and the schema
 * contract only — never a provider SDK (enforced by the package boundary).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ObservedSpecs, SkipMarker, UncataloguedResult } from "@sandbox-benchmarks/schema";
import { isPtsResultFile, isSkipMarkerFile, parseSkipMarker } from "@sandbox-benchmarks/schema";
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

/** Everything one provider directory yields: catalogued samples, stragglers, and skips. */
export interface ProviderExtraction {
	contributions: SampleContribution[];
	uncatalogued: UncataloguedResult[];
	skips: SkipMarker[];
	/**
	 * HOST-side specs read from a composite's `<System>` fingerprint (the underlying machine, not the
	 * sandbox quota), when any composite in this directory carried one. The first composite with a
	 * non-empty `<System>` wins (all files come from one sandbox). The run-writer layer merges this UNDER
	 * the in-sandbox spec probe, so the dedicated probe always wins on the effective fields.
	 */
	observedHost?: ObservedSpecs;
}

/** Parse JSON, returning undefined rather than throwing on a malformed skip marker. */
function readJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/** Extract every catalogued/uncatalogued result and skip marker from one provider's raw directory. */
export function extractProviderDir(dir: string, providerId: string): ProviderExtraction {
	const out: ProviderExtraction = { contributions: [], uncatalogued: [], skips: [] };

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
				// A <Result> with no <Entry> carries no measurement — no sample to aggregate and no
				// headline value to report. Skip it rather than emit a zero-sample contribution (which
				// would throw in the normalizer's aggregate([])) or fabricate a 0-valued straggler.
				const headEntry = result.Data.Entry[0];
				if (!headEntry) continue;
				const mapped = ptsResultToMetric(result);
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
							id: `${mapped.test}::${mapped.description || "default"}`,
							// Entry[0].Value is a guaranteed number — the schema parses it and we skipped the
							// entry-less results above.
							value: headEntry.Value,
							unit: result.Scale,
							direction: result.Proportion,
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

		if (isSkipMarkerFile(filename)) {
			const marker = parseSkipMarker(
				filename,
				readJson(readFileSync(fullPath, "utf8")),
				providerId,
			);
			if (marker) out.skips.push(marker);
		}
	}

	return out;
}
