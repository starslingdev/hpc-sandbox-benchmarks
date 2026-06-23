/**
 * Normalization pipeline: a raw `data/raw/<runId>/` tree → one validated {@link Run}. The tree has
 * one subdirectory per provider id; every file inside is routed through ./extract.ts. The output is
 * validated against the shared schema before it leaves this module — validation happens at the
 * producer boundary, so no malformed Run can reach a consumer. SDK-free — filesystem + schema only.
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type {
	MetricResult,
	ProviderRun,
	Run,
	UncataloguedResult,
} from "@sandbox-benchmarks/schema";
import { aggregate, PROVIDERS, parseRun, TARGET_SPEC } from "@sandbox-benchmarks/schema";
import { extractProviderDir } from "./extract.ts";
import { computeSpecMatched, readObservedSpecs } from "./specs.ts";

export interface NormalizeInput {
	rawRoot: string;
	runId: string;
	sha: string;
	generatedAt: string;
	sourceRunUrl?: string;
}

/** Normalize a whole raw tree into one validated Run — every known provider appears in every Run. */
export function normalizeResultsTree(input: NormalizeInput): Run {
	// Providers without results stay `pending`, which is itself a first-class fact the tool surfaces.
	const providers = [...PROVIDERS]
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((meta) => normalizeProviderDir(input.rawRoot, meta.id));

	const candidate = {
		schemaVersion: "1" as const,
		runId: input.runId,
		sha: input.sha,
		generatedAt: input.generatedAt,
		...(input.sourceRunUrl !== undefined ? { sourceRunUrl: input.sourceRunUrl } : {}),
		targetSpec: { ...TARGET_SPEC },
		providers,
	};

	try {
		return parseRun(candidate);
	} catch (err) {
		throw new Error(
			`Normalized Run for ${input.runId} failed schema validation: ${
				err instanceof Error ? err.message : String(err)
			}`,
		);
	}
}

/** Element-wise sample equality — used to tell a benign duplicate from divergent contamination. */
function sameSamples(a: readonly number[], b: readonly number[]): boolean {
	return a.length === b.length && a.every((value, i) => value === b[i]);
}

/** Normalize one provider's raw directory into a ProviderRun (pending when the directory is absent). */
export function normalizeProviderDir(rawRoot: string, providerId: string): ProviderRun {
	const dir = join(rawRoot, providerId);
	// Single stat (not existsSync + statSync) so a directory removed between the two calls degrades to
	// `pending` instead of throwing ENOENT mid-normalization.
	let dirStat: ReturnType<typeof statSync> | undefined;
	try {
		dirStat = statSync(dir);
	} catch {
		dirStat = undefined;
	}
	if (!dirStat?.isDirectory()) {
		return {
			providerId,
			validationStatus: "pending",
			observedSpecs: {},
			metrics: [],
			skips: [],
			uncatalogued: [],
		};
	}

	const extraction = extractProviderDir(dir, providerId);

	// De-dupe catalogued metrics by metricId across source files — keep the FIRST (deterministic file
	// order). In our model one <Result> owns a metric's per-pass samples, so the same metricId in two
	// files is a duplicate, not extra passes: real PTS producers that reuse TEST_RESULTS_NAME write the
	// same result into more than one composite (observed in runner-benchmarking's pts_git result, which
	// landed in both pts_git.xml and pts_compress_zstd.xml). Pooling the samples would inflate n and
	// distort the stddev, so drop the later copy and warn — louder when the samples diverge, which
	// signals genuine result-name contamination rather than a benign rewrite.
	const merged = new Map<
		string,
		{ samples: number[]; sourceFile: string; appVersion?: string; arguments?: string }
	>();
	for (const contribution of extraction.contributions) {
		const existing = merged.get(contribution.metricId);
		if (existing) {
			const diverged = !sameSamples(existing.samples, contribution.samples);
			console.warn(
				`[normalize] ${providerId}: metric "${contribution.metricId}" appears in both ` +
					`${existing.sourceFile} and ${contribution.sourceFile}` +
					(diverged
						? " with DIFFERENT samples — keeping the first (check for result-name contamination)"
						: " — keeping the first"),
			);
			continue;
		}
		merged.set(contribution.metricId, {
			samples: [...contribution.samples],
			sourceFile: contribution.sourceFile,
			appVersion: contribution.appVersion,
			arguments: contribution.arguments,
		});
	}
	const metrics: MetricResult[] = [...merged.entries()]
		// A metric must carry >=1 sample to aggregate (and to satisfy the schema). The extractor no
		// longer emits empty-sample contributions, but guard here too so a zero-sample metric is
		// dropped rather than throwing out of aggregate() before parseRun's try/catch can frame it.
		.filter(([, { samples }]) => samples.length > 0)
		.map(([metricId, { samples, sourceFile, appVersion, arguments: args }]) => ({
			metricId,
			samples,
			aggregates: aggregate(samples),
			sourceFile,
			...(appVersion !== undefined ? { appVersion } : {}),
			...(args !== undefined ? { arguments: args } : {}),
		}))
		.sort((a, b) => a.metricId.localeCompare(b.metricId));

	// De-dupe uncatalogued stragglers by id for the same reason (a contaminating result leaks into every
	// composite it lands in); keep the first occurrence and preserve extraction order.
	const seenUncatalogued = new Set<string>();
	const uncatalogued: UncataloguedResult[] = [];
	for (const straggler of extraction.uncatalogued) {
		if (seenUncatalogued.has(straggler.id)) continue;
		seenUncatalogued.add(straggler.id);
		uncatalogued.push(straggler);
	}

	const observedSpecs = readObservedSpecs((name) => {
		try {
			return JSON.parse(readFileSync(join(dir, name), "utf8"));
		} catch {
			return undefined;
		}
	});
	const specMatched = computeSpecMatched(observedSpecs);

	return {
		providerId,
		// A provider is validated exactly when it produced ≥1 catalogued Metric.
		validationStatus: metrics.length > 0 ? "validated" : "pending",
		...(specMatched !== undefined ? { specMatched } : {}),
		observedSpecs,
		metrics,
		skips: extraction.skips,
		uncatalogued,
	};
}
