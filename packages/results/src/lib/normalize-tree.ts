/**
 * Normalization pipeline: a raw `data/raw/<runId>/` tree → one validated {@link Run}. The tree has
 * one subdirectory per provider id; every file inside is routed through ./extract.ts. The output is
 * validated against the shared schema before it leaves this module — validation happens at the
 * producer boundary, so no malformed Run can reach a consumer. SDK-free — filesystem + schema only.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type {
	HostMetadataRecord,
	MetricResult,
	ObservedSpecs,
	OffDimensionEmission,
	ProviderRun,
	ResultGap,
	Run,
	UncataloguedResult,
} from "@sandbox-benchmarks/schema";
import {
	aggregate,
	deriveEconomics,
	describeOffDimensionEmission,
	getProvider,
	offDimensionEmissions,
	PROVIDERS,
	parseRun,
	SUITE_NAMES,
	TARGET_SPEC,
} from "@sandbox-benchmarks/schema";
import type { SampleContribution } from "./extract.ts";
import { extractProviderDir } from "./extract.ts";
import { readHostMetadata } from "./host-metadata.ts";
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
		schemaVersion: "2" as const,
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

/** Parse a JSON file, returning undefined (never throwing) when it's absent or malformed. */
function readJsonFile(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return undefined;
	}
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
		// No raw directory at all: the provider reported NOTHING — no result, not even a marker saying
		// why. That is a real hole, but not one this layer can describe: only the whole Run knows which
		// suites the other providers ran, and therefore which ones are missing here. Left as an empty
		// slice; `buildLeaderboard` derives the missing-suite gaps across providers.
		return {
			providerId,
			validationStatus: "pending",
			observedSpecs: {},
			metrics: [],
			suitesCovered: [],
			gaps: [],
			uncatalogued: [],
		};
	}

	// The raw tree tags results by suite (`<provider>/<suite>/`). Read each registered-suite
	// subdirectory on its own, so every produced metric can be attributed to — and contract-checked
	// against — the suite that wrote it. Also read any files directly under the provider dir: the older
	// un-nested layout, kept working for back-compat. extractProviderDir only reads files (it skips
	// subdirectories), so the flat read never double-counts a suite subdir's contents.
	const registered = new Set<string>(SUITE_NAMES);
	const suiteDirs: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		if (!entry.isDirectory()) continue;
		if (registered.has(entry.name)) {
			suiteDirs.push(entry.name);
			continue;
		}
		// An unexpected subdirectory can't be attributed to a suite, so it can't be contract-checked;
		// skip it loudly rather than silently fold its results into the provider untagged.
		console.warn(
			`[normalize] ${providerId}: ignoring subdirectory "${entry.name}" — not a registered suite`,
		);
	}

	const contributions: SampleContribution[] = [];
	const rawUncatalogued: UncataloguedResult[] = [];
	const gaps: ResultGap[] = [];
	// The positive record of coverage: a suite lands here iff it produced at least one catalogued Metric
	// for this provider. A suite directory that exists but yielded nothing (the run died mid-suite, or
	// every <Result> was empty) is NOT coverage — it is a hole with no marker, and recording the
	// directory instead of the metrics would hide exactly that case.
	const suitesCovered = new Set<string>();
	const offDimension: OffDimensionEmission[] = [];
	const hostMetadata: HostMetadataRecord[] = [];
	// Host fingerprint from a composite's <System>, first non-empty across the read order (all suites of
	// one provider ran on the same machine). Merged UNDER the spec probe below so the probe always wins.
	let systemHost: ObservedSpecs | undefined;

	for (const suite of suiteDirs) {
		const ext = extractProviderDir(join(dir, suite), providerId);
		for (const record of readHostMetadata(join(dir, suite))) {
			hostMetadata.push({ ...record, sourceFile: `${suite}/${record.sourceFile}` });
		}
		if (!systemHost && ext.observedHost) systemHost = ext.observedHost;
		// Runtime half of the contract: collect any catalogued metric this suite emitted on a Dimension it
		// does not declare. (Uncatalogued emissions are NOT breaches — they stay inert stragglers below.)
		offDimension.push(
			...offDimensionEmissions(
				suite,
				ext.contributions.map((c) => c.metricId),
			),
		);
		// Carry the suite in each result's provenance so a metric/straggler stays traceable to its source.
		for (const c of ext.contributions)
			contributions.push({ ...c, sourceFile: `${suite}/${c.sourceFile}` });
		for (const u of ext.uncatalogued)
			rawUncatalogued.push({ ...u, sourceFile: `${suite}/${u.sourceFile}` });
		if (ext.contributions.length > 0) suitesCovered.add(suite);
		gaps.push(...ext.gaps);
	}
	// Reject at the boundary before any further work: a suite emitting a catalogued metric off its
	// declared Dimensions is a producer/registry drift that would land a number under the wrong
	// leaderboard axis. Fail the run with every such emission listed at once, rather than silently
	// ranking it — and before the flat read below, so the error path does no extra I/O.
	if (offDimension.length > 0) {
		const lines = offDimension.map((e) => `  - ${describeOffDimensionEmission(e)}`);
		throw new Error(
			`provider "${providerId}" emitted off-contract metrics (suite ↔ dimension ↔ metric contract):\n${lines.join("\n")}`,
		);
	}

	// Legacy flat files (no suite subdir): no suite to attribute to, so they can't be contract-checked —
	// and, for the same reason, they can't be credited to `suitesCovered`. A Run whose tree is entirely
	// flat therefore claims no suite coverage, which correctly makes the derived missing-suite gaps
	// empty (nothing is known to have run anywhere) rather than accusing every provider of a hole.
	const flat = extractProviderDir(dir, providerId);
	hostMetadata.push(...readHostMetadata(dir));
	contributions.push(...flat.contributions);
	rawUncatalogued.push(...flat.uncatalogued);
	gaps.push(...flat.gaps);
	if (!systemHost && flat.observedHost) systemHost = flat.observedHost;

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
	for (const contribution of contributions) {
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

	// Enrich a measured provider with derived economics ($/run): pricing × the runtime already on the
	// Run. Done here, AFTER the off-dimension contract check above, because economics is derived and
	// declared by no suite — running it through that check would flag it as off-contract. Gated on ≥1
	// measured Metric so economics enriches a `validated` provider and never promotes a `pending` one
	// (a provider with no real measurements has no economics either). An unknown/unpriced provider
	// yields no economics, so a null rate can never read as free.
	const meta = getProvider(providerId);
	if (meta && metrics.length > 0) {
		metrics.push(
			...deriveEconomics(
				meta,
				metrics.map((m) => ({ metricId: m.metricId, mean: m.aggregates.mean })),
			),
		);
		metrics.sort((a, b) => a.metricId.localeCompare(b.metricId));
	}

	// De-dupe uncatalogued stragglers by id for the same reason (a contaminating result leaks into every
	// composite it lands in); keep the first occurrence and preserve extraction order.
	const seenUncatalogued = new Set<string>();
	const uncatalogued: UncataloguedResult[] = [];
	for (const straggler of rawUncatalogued) {
		if (seenUncatalogued.has(straggler.id)) continue;
		seenUncatalogued.add(straggler.id);
		uncatalogued.push(straggler);
	}

	// Observed specs are per-sandbox; each suite ran in its own sandbox of the same provider, so the
	// readings describe the same machine. Prefer a suite subdirectory's file (the suite-scoped, current
	// layout) over a provider-dir file (legacy flat), so a stray legacy file can't shadow the tagged one.
	// `suiteDirs` is sorted, so when several suites carry one the alphabetically-first wins — an arbitrary
	// but deterministic tie-break, fine while suites share a provider's spec; revisit if tiers diverge.
	const specSources = [...suiteDirs, ""];
	const probeSpecs = readObservedSpecs((name) => {
		for (const sub of specSources) {
			const parsed = readJsonFile(join(dir, sub, name));
			if (parsed !== undefined) return parsed;
		}
		return undefined;
	});
	// Merge the <System> host fingerprint UNDER the in-sandbox spec probe: the probe owns the effective
	// fields (vcpus/memoryGb), and <System> only ever fills host-side fields, so the probe always wins on
	// overlap and a host disclosure can never masquerade as the sandbox's effective size.
	const observedSpecs: ObservedSpecs = { ...(systemHost ?? {}), ...probeSpecs };
	const specMatched = computeSpecMatched(observedSpecs);

	return {
		providerId,
		// A provider is validated exactly when it produced ≥1 catalogued Metric.
		validationStatus: metrics.length > 0 ? "validated" : "pending",
		...(specMatched !== undefined ? { specMatched } : {}),
		observedSpecs,
		...(hostMetadata.length > 0 ? { hostMetadata } : {}),
		metrics,
		suitesCovered: [...suitesCovered].sort((a, b) => a.localeCompare(b)),
		gaps,
		uncatalogued,
	};
}
