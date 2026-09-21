import type { MetricResult, ObservedMixtures, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import {
	aggregate,
	canonicalJsonString,
	effectiveArtifact,
	isDerivedMetric,
	parseRun,
} from "@sandbox-benchmarks/schema";

import { evidenceDigest } from "./experiment.ts";

/** The Run-shaped fields every consumer of a dataset reads, whichever arm it is. */
type DatasetFields = Pick<
	Run,
	"runId" | "sha" | "generatedAt" | "targetSpec" | "providers" | "experiment"
>;

/**
 * One published experiment, read as itself. The pooled fields are declared `?: undefined` rather
 * than omitted: that is what makes the two arms a discriminated union on `sources`, so
 * `if (dataset.sources)` narrows to {@link PooledDataset} and a HALF-pooled object — `sources`
 * without `cells`, the state the optional-triple permitted — stops type-checking. A `Run` is still
 * assignable, since it has none of the three.
 */
export type PublishedDataset = DatasetFields & {
	readonly sources?: undefined;
	readonly poolingNotes?: undefined;
	readonly cells?: undefined;
};

/**
 * Several published experiments read together: a consumption-only view, never a publishable Run or
 * a replacement experiment. All three pooled fields are REQUIRED — `combineLeaderboardDatasets`
 * has only ever set them together, and a reader that has `sources` needs `cells` and
 * `poolingNotes` to describe what it is looking at.
 */
export type PooledDataset = DatasetFields & {
	readonly sources: readonly Run[];
	readonly poolingNotes: readonly string[];
	readonly cells: readonly DatasetCell[];
};

/** A published experiment or a pooled view of several. Discriminated on `sources`. */
export type LeaderboardDataset = PublishedDataset | PooledDataset;

export interface DatasetCell {
	readonly runId: string;
	readonly providerId: string;
	readonly metricId: string;
	readonly suite: string;
	readonly replicateIndex: number;
	readonly sandboxId?: string;
	readonly combinedIndex: number;
}

export interface CombineDatasetsOptions {
	/** Explicit, recorded review of differing/missing cohort digests; never overrides metric incompatibility. */
	readonly cohortReview?: string;
}

/**
 * Pool the provisioning tallies of the runs being combined.
 *
 * The verdict counts and the boot-id denominator are plain sandbox counts, so they add. The two
 * derived numbers cannot be recovered exactly from tallies alone, and each is carried the way that
 * errs toward saying LESS than the evidence might support:
 *
 *  - `distinctBootIds` is summed, which double-counts a machine that served sandboxes in two of the
 *    pooled runs. Over-counting distinctness can only close the `distinct < disclosing` gap that
 *    signals reuse, never open one — so a pooled board can miss reuse it would have shown per-run,
 *    and can never claim reuse that did not happen.
 *  - `medianPreBootedByS` is dropped rather than averaged: a median of medians is not a median, and
 *    the margins themselves are per-sandbox identity that aggregation already discarded. Absent reads
 *    as "not available at this grain", which is exactly true.
 */
function mergeProvisioning(
	mixtures: readonly ObservedMixtures[],
): ObservedMixtures["provisioning"] {
	const tallies = mixtures.flatMap((m) => (m.provisioning ? [m.provisioning] : []));
	if (!tallies.length) return undefined;
	let bootIdSandboxes = 0;
	let distinctBootIds = 0;
	const pooled = tallies.reduce(
		(acc, tally) => {
			bootIdSandboxes += tally.bootIdSandboxes ?? 0;
			distinctBootIds += tally.distinctBootIds ?? 0;
			return {
				preBooted: acc.preBooted + tally.preBooted,
				bootOnCreate: acc.bootOnCreate + tally.bootOnCreate,
				indeterminate: acc.indeterminate + tally.indeterminate,
			};
		},
		{ preBooted: 0, bootOnCreate: 0, indeterminate: 0 },
	);
	return {
		...pooled,
		...(bootIdSandboxes > 0 ? { bootIdSandboxes, distinctBootIds } : {}),
	};
}

function mergeMixtures(providers: readonly ProviderRun[]): ObservedMixtures | undefined {
	const mixtures = providers.flatMap((p) => (p.observedMixtures ? [p.observedMixtures] : []));
	if (!mixtures.length) return undefined;
	const result: ObservedMixtures = { sandboxes: 0, hostHardware: {}, hostNetwork: {} };
	for (const mixture of mixtures) {
		result.sandboxes += mixture.sandboxes;
		for (const category of ["hostHardware", "hostNetwork"] as const) {
			for (const [id, entry] of Object.entries(mixture[category])) {
				const previous = result[category][id];
				if (previous && canonicalJsonString(previous.specs) !== canonicalJsonString(entry.specs)) {
					throw new Error(`Conflicting ${category} identity ${id}`);
				}
				result[category][id] = { ...entry, count: (previous?.count ?? 0) + entry.count };
			}
		}
	}
	const provisioning = mergeProvisioning(mixtures);
	return provisioning === undefined ? result : { ...result, provisioning };
}

/**
 * Union independent sandbox cells, retaining trials inside their original clusters. Run id
 * namespaces replicate indices; a repeated dataset is idempotent, a conflicting copy is an error.
 * Pooling assumes exchangeable sandbox draws across the selected dates. It does not estimate
 * uncertainty across future dates, remove run effects, or repair the original coverage denominator.
 */
export function combineLeaderboardDatasets(
	inputs: readonly Run[],
	options: CombineDatasetsOptions = {},
): LeaderboardDataset {
	if (!inputs.length) throw new Error("At least one dataset is required");
	const byId = new Map<string, Run>();
	for (const input of inputs) {
		const run = parseRun(input);
		const previous = byId.get(run.runId);
		if (previous && evidenceDigest(previous) !== evidenceDigest(run))
			throw new Error(`Conflicting dataset ${run.runId}`);
		byId.set(run.runId, run);
	}
	const sources = [...byId.values()].sort(
		(a, b) => a.generatedAt.localeCompare(b.generatedAt) || a.runId.localeCompare(b.runId),
	);
	const first = sources[0];
	if (!first) throw new Error("At least one dataset is required");
	// Several inputs that all name ONE run is a caller mistake, not a pooling result. Identity is only
	// known here — by the time this returns, "these datasets pooled to one" and "the same dataset was
	// passed twice" are the same value, and the single-input return below would hand back a published
	// board for a request to pool. Distinct ids that merely repeat are still idempotent (the documented
	// contract): this rejects only the degenerate all-identical case.
	if (inputs.length > 1 && byId.size === 1) {
		throw new Error(
			`${inputs.length} datasets requested but all name Run ${first.runId}; pass distinct datasets`,
		);
	}
	if (sources.length === 1) return first;
	for (const run of sources) {
		if (canonicalJsonString(run.targetSpec) !== canonicalJsonString(first.targetSpec))
			throw new Error("Cannot pool different requested resource targets");
	}
	const cohorts = new Set(sources.map((r) => r.experiment?.cohortDigest));
	const cohortMismatch = cohorts.size !== 1 || cohorts.has(undefined);
	if (cohortMismatch && !options.cohortReview?.trim())
		throw new Error(
			"Datasets have different or missing cohort digests; supply a documented cohortReview for an exploratory pooling analysis",
		);
	const sourceIds = new Set<string>();
	for (const run of sources) {
		// Historical dataset unions encoded their source ids with '+'. They can overlap even
		// when their schema predates attempt and sandbox evidence.
		for (const id of run.runId.split("+")) {
			if (sourceIds.has(id)) throw new Error(`Overlapping source run ${id}`);
			sourceIds.add(id);
		}
	}
	const attempts = new Set<string>();
	const sandboxes = new Set<string>();
	for (const run of sources) {
		for (const id of run.experiment?.attemptIds ?? []) {
			if (attempts.has(id))
				throw new Error(`Overlapping attempt ${id}; cannot count a measurement twice`);
			attempts.add(id);
		}
		for (const provider of run.providers) {
			for (const evidence of provider.artifactEvidence ?? []) {
				const key = `${provider.providerId}:${evidence.sandboxId}`;
				if (sandboxes.has(key))
					throw new Error(`Reused sandbox ${key}; independence is not established`);
				sandboxes.add(key);
			}
		}
	}
	const cells: DatasetCell[] = [];
	const providers = [...new Set(sources.flatMap((r) => r.providers.map((p) => p.providerId)))]
		.sort()
		.map((providerId): ProviderRun => {
			const contributions = sources.flatMap((run) =>
				run.providers
					.filter((p) => p.providerId === providerId)
					.map((provider) => ({ run, provider })),
			);
			const latest = contributions.at(-1)?.provider;
			if (!latest) throw new Error(`Missing provider ${providerId}`);
			const metrics: MetricResult[] = [];
			for (const metricId of [
				...new Set(
					contributions.flatMap(({ provider }) => provider.metrics.map((m) => m.metricId)),
				),
			].sort()) {
				const entries = contributions.flatMap(({ run, provider }) =>
					provider.metrics
						.filter((m) => m.metricId === metricId)
						.map((metric) => ({ run, provider, metric })),
				);
				const initial = entries[0];
				if (!initial) continue;
				if (isDerivedMetric(initial.metric)) {
					// Published prices are not repeated experimental observations. Keep the latest value;
					// other derived metrics need their own re-derivation and cannot be pooled as samples.
					if (metricId === "usd_per_hour")
						metrics.push(structuredClone(entries.at(-1)?.metric ?? initial.metric));
					continue;
				}
				const signature = (m: MetricResult) =>
					canonicalJsonString([
						m.appVersion ?? null,
						m.arguments ?? null,
						m.sourceFile?.split("/")[0] ?? null,
					]);
				if (entries.some(({ metric }) => signature(metric) !== signature(initial.metric)))
					throw new Error(
						`Incompatible measurement version, arguments or suite: ${providerId}/${metricId}`,
					);
				const artifactSets = entries.map(({ provider, metric }) => {
					const suite = metric.sourceFile?.split("/")[0];
					return [
						...new Set(
							(provider.artifactEvidence ?? [])
								.filter((e) => e.cell.suite === suite)
								.map((e) => canonicalJsonString(effectiveArtifact(e.provenance))),
						),
					].sort();
				});
				const knownArtifacts = artifactSets.filter((set) => set.length > 0);
				if (new Set(knownArtifacts.map((set) => canonicalJsonString(set))).size > 1)
					throw new Error(`Incompatible artifact identities: ${providerId}/${metricId}`);
				const passPolicies = entries.flatMap(
					({ run, metric }) =>
						run.experiment?.partial?.cells
							.filter(
								(cell) =>
									cell.provider === providerId &&
									cell.suite === metric.sourceFile?.split("/")[0] &&
									cell.plannedMetrics.includes(metricId),
							)
							.map((cell) => cell.passes) ?? [],
				);
				if (new Set(passPolicies).size > 1)
					throw new Error(`Incompatible pass policies: ${providerId}/${metricId}`);
				let nextIndex = 0;
				const replicates = entries.flatMap(({ run, provider, metric }) => {
					const suite = metric.sourceFile?.split("/")[0];
					if (!suite)
						throw new Error(`Missing suite provenance: ${run.runId}/${providerId}/${metricId}`);
					const retained = run.experiment?.partial?.cells.filter(
						(c) =>
							c.provider === providerId &&
							c.suite === suite &&
							c.retainedMetrics.includes(metricId),
					);
					const clusters = metric.replicates ?? [
						{
							index:
								retained?.length === 1 ? (retained[0]?.replicate ?? 0) : (run.replicateIndex ?? 0),
							samples: metric.samples,
							...(metric.ptsSampleSource ? { ptsSampleSource: metric.ptsSampleSource } : {}),
							...(metric.hostHardwareId ? { hostHardwareId: metric.hostHardwareId } : {}),
							...(metric.hostNetworkId ? { hostNetworkId: metric.hostNetworkId } : {}),
						},
					];
					if (!metric.replicates && retained && retained.length !== 1)
						throw new Error(`Ambiguous sandbox breakdown: ${run.runId}/${providerId}/${metricId}`);
					return clusters.map((cluster) => {
						if (retained && !retained.some((c) => c.replicate === cluster.index))
							throw new Error(
								`Metric lacks retained-cell evidence: ${run.runId}/${providerId}/${metricId}/${cluster.index}`,
							);
						const evidence = provider.artifactEvidence?.find(
							(e) => e.cell.suite === suite && e.cell.replicateIndex === cluster.index,
						);
						const combinedIndex = entries.length === 1 ? cluster.index : nextIndex++;
						cells.push({
							runId: run.runId,
							providerId,
							metricId,
							suite,
							replicateIndex: cluster.index,
							combinedIndex,
							...(evidence ? { sandboxId: evidence.sandboxId } : {}),
						});
						return { ...structuredClone(cluster), index: combinedIndex };
					});
				});
				const samples = replicates.flatMap((r) => r.samples);
				const {
					ptsSampleSource: _source,
					hostHardwareId: _hardware,
					hostNetworkId: _network,
					...base
				} = initial.metric;
				metrics.push(
					entries.length === 1
						? structuredClone(initial.metric)
						: { ...base, samples, aggregates: aggregate(samples), replicates },
				);
			}
			const slices = contributions.map(({ provider }) => provider);
			const observedMixtures = mergeMixtures(slices);
			return {
				...structuredClone(latest),
				metrics,
				validationStatus: metrics.length ? "validated" : "pending",
				...(slices.some((p) => p.specMatched === false)
					? {
							specMatched: false,
							observedSpecs: structuredClone(
								slices.find((p) => p.specMatched === false)?.observedSpecs ?? latest.observedSpecs,
							),
						}
					: {}),
				...(observedMixtures ? { observedMixtures } : {}),
				suitesCovered: [...new Set(slices.flatMap((p) => p.suitesCovered))].sort(),
				gaps: contributions.flatMap(({ run, provider }) =>
					provider.gaps.map((gap) => ({ ...gap, reason: `[${run.runId}] ${gap.reason}` })),
				),
				costEvidence: slices.flatMap((p) => p.costEvidence ?? []),
				artifactEvidence: slices.flatMap((p) => p.artifactEvidence ?? []),
				hostMetadata: slices.flatMap((p) => p.hostMetadata ?? []),
				uncatalogued: slices.flatMap((p) => p.uncatalogued),
			};
		});
	return {
		runId: sources.map((r) => r.runId).join("+"),
		sha: first.sha,
		generatedAt: sources.at(-1)?.generatedAt ?? first.generatedAt,
		targetSpec: first.targetSpec,
		providers,
		sources,
		cells,
		poolingNotes: [
			"Exploratory pooled sandbox analysis: each sandbox has one vote, regardless of its trial count. Intervals resample whole sandboxes and assume exchangeability across these selected runs; they do not quantify future-run variability or correct run/date effects.",
			...(cohortMismatch ? [`Different comparison cohorts. Review: ${options.cohortReview}`] : []),
			"Original experiments retain their separate completeness records. Missing cells are never zero-valued observations. Only hourly price is retained from the latest contributing dataset; other derived metrics are omitted.",
		],
	};
}
