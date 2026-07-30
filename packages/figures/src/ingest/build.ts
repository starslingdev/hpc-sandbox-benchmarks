/**
 * INGEST: raw dataset documents → the derived `SandboxBenchmarkData` everything else reads.
 *
 * This is the front of the package. Downstream of here nothing re-derives a number: the page,
 * the markdown mirror, the composite share images and the eight page figures all render from
 * the value this function returns, through the pure derivations in `../domain`. Putting it
 * here rather than in a script is what makes the package a whole pipeline — raw run to PNG —
 * instead of a renderer that trusts an artifact somebody else produced.
 *
 * Deterministic and side-effect free. It reads no files, writes none, and consults no clock:
 * same documents in, byte-identical document out. The caller does the I/O (see
 * `scripts/generate-sandbox-benchmark-data.ts`) and the recompute guard in
 * `src/lib/sandbox-benchmark-content.test.ts` rebuilds the committed artifact from the
 * vendored inputs and fails on any byte of drift — which is only a meaningful check because
 * of the sentence above.
 *
 * No measurement, label or ordering in the output is hand-typed: numbers come from the runs,
 * editorial metadata from the catalog, and the only derivations are sums of task medians
 * (pipeline totals) and the dataset's own burst cost model (hourly × runtime —
 * packages/schema/src/economics.ts#burstCostPerRun).
 */
import { median } from "../domain/metrics.ts";
import type { MetricCell, MetricTableRow, SandboxBenchmarkData } from "../domain/types.ts";
import type { CatalogMetric, RunMetric, RunProvider, SandboxIngestInput } from "./documents.ts";

/** Full cell for the all-metrics table / results explorer — every aggregate the
 *  run carries, plus the raw samples for tooltips. Derived rows (pipeline
 *  totals, burst costs) only emit p50 + n. A v3 metric measured on ≥2 replicate
 *  sandboxes also carries `r` (how many) and `rep` (each sandbox's own median,
 *  replicate order) — the between-sandbox view the repeatability panel reads,
 *  kept separate from `samples` because pooled passes conflate a sandbox that
 *  converged slowly with a fleet that genuinely differs between sandboxes. */
function cellFromMetric(m: RunMetric, extras: { backfilled?: boolean } = {}): MetricCell {
	const a = m.aggregates;
	return {
		p50: a.p50,
		p95: a.p95,
		mean: a.mean,
		stdev: a.stdev,
		min: a.min,
		max: a.max,
		n: a.n,
		samples: m.samples,
		...(m.replicates !== undefined
			? {
					r: m.replicates.length,
					rep: m.replicates.map((rep) => round(median(rep.samples), 6)),
				}
			: {}),
		...(extras.backfilled ? { backfilled: true as const } : {}),
	};
}

/** Pipeline phase of a realworld task, mechanically from its metric id. */
export function phaseOfTask(metricId: string): string {
	const key = metricId.replace(/^realworld_[a-z0-9_]+?_task_/, "");
	if (key === "git_clone") return "clone";
	if (key === "cold_install") return "install";
	if (key.startsWith("lint")) return "lint";
	if (key === "typecheck") return "typecheck";
	if (key.startsWith("build")) return "build";
	if (key.startsWith("test")) return "test";
	return "check";
}

/** The dataset's burst cost model (economics.ts#burstCostPerRun), hours→USD. */
export function burstCostPerRunUsd(hourlyUsd: number, runtimeSeconds: number): number {
	return hourlyUsd * (runtimeSeconds / 3600);
}

const round = (v: number, dp: number) => Number(v.toFixed(dp));

export function buildSandboxBenchmarkData(input: SandboxIngestInput): SandboxBenchmarkData {
	const { run, catalog, provenance, backfillRun, hostDetails, regions, egress } = input;
	const metricDef = new Map(catalog.metrics.map((m) => [m.id, m]));
	const displayName = new Map(catalog.providers.map((p) => [p.id, p.displayName]));

	// The report covers the run's VALIDATED providers — the dataset's own word
	// for "a committed run carries real metrics for it". A provider the harness
	// attempted and that reported nothing is `pending`, and rendering it would
	// add an all-"—" column to every table and a data-less row to every chart.
	// It is not dropped silently: `excludedProviders` below carries it onto the
	// page, so the run's real attempt surface stays visible.
	const rendered = run.providers.filter((p) => p.validationStatus === "validated");
	const excludedProviders = run.providers
		.filter((p) => p.validationStatus !== "validated")
		.map((p) => ({
			id: p.providerId,
			name: displayName.get(p.providerId) ?? p.providerId,
			validationStatus: p.validationStatus,
			metrics: p.metrics.length,
		}));
	const providerIds = rendered.map((p) => p.providerId);

	const requireDef = (id: string): CatalogMetric => {
		const def = metricDef.get(id);
		if (!def) {
			throw new Error(
				`metric "${id}" is in the run but not in ${provenance.catalogFile}: the catalog ` +
					`snapshot is stale; re-snapshot it from the dataset repo's schema package`,
			);
		}
		return def;
	};

	const metricOf = (provider: RunProvider, id: string): RunMetric | undefined =>
		provider.metrics.find((m) => m.metricId === id);

	/** The run's own isolation verdict, falling back to the kernel string for a
	 *  run predating `detectedIsolation` (gVisor names itself: "4.19.0-gvisor").
	 *  One source for both the environments row and its comparability flag. */
	const isolationOf = (o: RunProvider["observedSpecs"]): string | null =>
		o.detectedIsolation ?? (o.kernel?.includes("gvisor") ? "gvisor" : null);

	// -- providers ------------------------------------------------------------

	/** The shard-derived egress record for a provider, if the snapshot has one. */
	const egressOf = (providerId: string) => egress?.providers[providerId];

	/**
	 * Fill an egress field the Run document left blank, from the shard snapshot —
	 * and ONLY then. A sandbox behind NAT has a private `local_ip` that says
	 * nothing about egress, so `routable` gates the whole thing; a provider whose
	 * own probe answered keeps its own answer, because that measurement was taken
	 * inside the sandbox and this one was not.
	 */
	const usedEgressFill = new Set<string>();
	const egressFill = (providerId: string, field: "asn" | "asnOrg" | "geo"): string | null => {
		const record = egressOf(providerId);
		if (!record?.routable) return null;
		const value = record[field];
		if (value === null) return null;
		usedEgressFill.add(providerId);
		return value;
	};

	const providers = rendered.map((p) => ({
		id: p.providerId,
		name: displayName.get(p.providerId) ?? p.providerId,
		// A validated provider always carries the run's own verdict; `false` only
		// guards the shape, since an absent verdict means no spec was observed.
		specMatched: p.specMatched ?? false,
		priceUsdHr: metricOf(p, "usd_per_hour")?.aggregates.p50 ?? null,
		specs: {
			vcpus: p.observedSpecs.vcpus ?? null,
			cpuModel: p.observedSpecs.cpuModel ?? null,
			// The run's own heterogeneity disclosure: every distinct host CPU model
			// this provider's replicate shards saw, when there was more than one.
			// Rendering `cpuModel` alone for such a fleet would present one
			// replicate's machine as the provider's hardware.
			cpuModels: p.observedSpecs.hostCpuModels ?? null,
			// From the raw Phoronix system logs, not the Run document.
			cpuCacheSize: hostDetails?.providers[p.providerId]?.cpuCacheSize ?? null,
			virtualization: p.observedSpecs.virtualization ?? null,
			// The run's own isolation verdict — what separates the Modal variants.
			isolation: isolationOf(p.observedSpecs),
			memoryGb: p.observedSpecs.memoryGb ?? null,
			diskGb: p.observedSpecs.diskGb ?? null,
			// Storage shape, also from the Phoronix header: what the disk numbers
			// are actually measuring (an overlay vs a block device, and whether an
			// atime write rides along with every file open).
			fileSystem: hostDetails?.providers[p.providerId]?.fileSystem ?? null,
			mountOptions: hostDetails?.providers[p.providerId]?.mountOptions ?? null,
			diskScheduler: hostDetails?.providers[p.providerId]?.diskScheduler ?? null,
			diskBlockSize: hostDetails?.providers[p.providerId]?.diskBlockSize ?? null,
			kernel: p.observedSpecs.kernel ?? null,
			os: p.observedSpecs.os ?? null,
			// The address family the sandbox actually egressed on, from the shard
			// artifacts — the fact that explains an otherwise blank ASN row, since
			// the harness's own probe is IPv4-only by design.
			egressFamily: egressOf(p.providerId)?.family ?? null,
			asn: p.observedSpecs.egressAsn ?? egressFill(p.providerId, "asn"),
			asnOrg: p.observedSpecs.egressOrgName ?? egressFill(p.providerId, "asnOrg"),
			geo:
				[p.observedSpecs.city, p.observedSpecs.region, p.observedSpecs.country]
					.filter((part): part is string => Boolean(part))
					.join(", ") || egressFill(p.providerId, "geo"),
			// True when the ASN/geo above came from the shard lookup rather than the
			// sandbox's own probe. The page marks those cells; two provenances must
			// never render as one.
			egressFromShard: usedEgressFill.has(p.providerId),
			// The placement the harness requested, from the harness source at the
			// run's sha — null region + pinned:false = the provider's default region
			// (no selector exists).
			region: regions?.providers[p.providerId]?.region ?? null,
			regionPinned: regions?.providers[p.providerId]?.pinned ?? null,
		},
	}));

	// Off-target spec cells, mechanically: vCPUs must equal the target; RAM must
	// sit within ±10% of it (the dataset's own comparability rule); gVisor
	// isolation is flagged as user-space syscall interception rather than KVM; a
	// disk more than 10% BELOW the target (one-sided — extra disk is not a
	// comparability problem) is flagged as under-provisioned. Neither disk nor
	// isolation is part of the dataset's own specMatched check, so those two can
	// sit next to a "matched" verdict.
	const environmentFlags = rendered.flatMap((p) => {
		const flags: { provider: string; field: string }[] = [];
		const o = p.observedSpecs;
		if (o.vcpus !== undefined && o.vcpus !== run.targetSpec.vcpus) {
			flags.push({ provider: p.providerId, field: "vcpus" });
		}
		if (
			o.memoryGb !== undefined &&
			Math.abs(o.memoryGb - run.targetSpec.memoryGb) > run.targetSpec.memoryGb * 0.1
		) {
			flags.push({ provider: p.providerId, field: "memoryGb" });
		}
		if (o.diskGb !== undefined && o.diskGb < run.targetSpec.diskGb * 0.9) {
			flags.push({ provider: p.providerId, field: "diskGb" });
		}
		if (isolationOf(o) === "gvisor") {
			flags.push({ provider: p.providerId, field: "isolation" });
		}
		// A heterogeneous fleet is a comparability flag on the CPU row: this
		// provider's replicate sandboxes did not run on one machine type, so its
		// medians pool across hardware generations.
		if (o.hostCpuModels !== undefined && o.hostCpuModels.length > 1) {
			flags.push({ provider: p.providerId, field: "cpuModel" });
		}
		return flags;
	});

	// -- realworld pipeline suites --------------------------------------------
	const realworldSuites = Object.entries(catalog.suites)
		.filter(([name]) => name.startsWith("realworld-"))
		.map(([name, suite]) => {
			// The run's own exercised task set for this suite, in the suite's
			// canonical (execution) order — a task nobody emitted is not a column.
			const exercisedTasks = suite.metrics.filter((id) =>
				rendered.some((p) => metricOf(p, id) !== undefined),
			);
			// Bound as a value, not asserted off the array: the suite NAME below is read from this
			// task's catalog label, so an empty task list has to stop the suite here rather than
			// reach that line.
			const firstTask = exercisedTasks[0];
			if (firstTask === undefined) return null;

			const bars = rendered.flatMap((p) => {
				// A bar requires EVERY exercised task: a partial pipeline would chart
				// an understated total as if it were comparable.
				const tasks = exercisedTasks.map((id) => ({ id, metric: metricOf(p, id) }));
				if (tasks.some((t) => t.metric === undefined)) return [];
				const segments = tasks.map(({ id, metric }) => {
					const def = requireDef(id);
					return {
						id,
						label: def.label,
						// "Better-Auth: lint types" → "lint types" (the chart names the repo once)
						shortLabel: def.label.replace(/^[^:]+:\s*/, ""),
						phase: phaseOfTask(id),
						p50: (metric as RunMetric).aggregates.p50,
						n: (metric as RunMetric).aggregates.n,
					};
				});
				const totalS = round(
					segments.reduce((sum, s) => sum + s.p50, 0),
					3,
				);
				const hourly = metricOf(p, "usd_per_hour")?.aggregates.p50;
				return [
					{
						provider: p.providerId,
						totalS,
						costPerRunUsd:
							hourly === undefined ? null : round(burstCostPerRunUsd(hourly, totalS), 6),
						segments,
					},
				];
			});

			// Chart a suite only when there is a comparison to draw.
			if (bars.length < 2) return null;

			const incomplete = rendered
				.filter((p) => !bars.some((b) => b.provider === p.providerId))
				.map((p) => {
					const gap = p.gaps.find((g) => g.scope === "suite" && g.id === name);
					return {
						provider: p.providerId,
						outcome: gap?.outcome ?? "missing",
						reason: gap?.reason ?? "no result and no marker: the suite never reported",
					};
				});

			return {
				id: name,
				// Suite display name from its tasks' catalog labels ("Better-Auth: …").
				name: requireDef(firstTask).label.split(":")[0] ?? name,
				minDiskGb: suite.minDiskGb,
				tasks: exercisedTasks.map((id) => {
					const def = requireDef(id);
					return {
						id,
						label: def.label,
						shortLabel: def.label.replace(/^[^:]+:\s*/, ""),
						phase: phaseOfTask(id),
					};
				}),
				bars,
				incomplete,
			};
		})
		.filter((s): s is NonNullable<typeof s> => s !== null)
		// Widest comparison first (most bars), suite id the deterministic tie-break.
		.sort((a, b) => b.bars.length - a.bars.length || a.id.localeCompare(b.id, "en"));

	// Phase order for the ordinal color ramp: first occurrence across the charted
	// suites' canonical task orders — i.e. real execution order, not editorial.
	const phaseOrder: string[] = [];
	for (const suite of realworldSuites) {
		for (const task of suite.tasks) {
			if (!phaseOrder.includes(task.phase)) phaseOrder.push(task.phase);
		}
	}

	// -- the all-metrics table ------------------------------------------------

	// Backfill lookup: (providerId, metricId) → metric from the backfill run.
	// Scope: TABLE CELLS in the hardware benchmark dimensions only. Realworld
	// tasks are excluded (a pipeline mixed across two runs never happened as a
	// pipeline), and economics is excluded (prices/costs at another run's target
	// spec would corrupt the cost model). Charts, totals, environment flags, and
	// coverage gaps always read the primary run alone.
	const BACKFILL_DIMENSIONS = new Set([
		"lifecycle",
		"control-plane",
		"cpu",
		"disk",
		"memory",
		"network",
		"system",
	]);
	const backfillMetricOf = (providerId: string, id: string): RunMetric | undefined =>
		backfillRun?.providers
			.find((p) => p.providerId === providerId)
			?.metrics.find((m) => m.metricId === id);

	const backfilledCells: { provider: string; metricId: string }[] = [];
	const valueRow = (def: CatalogMetric): MetricTableRow => ({
		id: def.id,
		label: def.label,
		unit: def.unit,
		direction: def.direction,
		headline: def.headline,
		derived: def.derived,
		values: Object.fromEntries(
			rendered.map((p) => {
				const m = metricOf(p, def.id);
				if (m) return [p.providerId, cellFromMetric(m)];
				if (BACKFILL_DIMENSIONS.has(def.dimension)) {
					const fill = backfillMetricOf(p.providerId, def.id);
					if (fill) {
						backfilledCells.push({ provider: p.providerId, metricId: def.id });
						return [p.providerId, cellFromMetric(fill, { backfilled: true })];
					}
				}
				return [p.providerId, null];
			}),
		),
	});

	const emittedIds = new Set(rendered.flatMap((p) => p.metrics.map((m) => m.metricId)));

	/** A charted suite's derived total — the headline row its task rows nest under. */
	const totalRowOf = (suite: (typeof realworldSuites)[number]): MetricTableRow => ({
		id: `${suite.id}_total`,
		label: `${suite.name}: total (Σ task medians)`,
		unit: "Seconds",
		direction: "LIB",
		headline: false,
		derived: true,
		values: Object.fromEntries(
			providerIds.map((id) => {
				const bar = suite.bars.find((b) => b.provider === id);
				return [id, bar ? { p50: bar.totalS, n: Math.min(...bar.segments.map((s) => s.n)) } : null];
			}),
		),
	});

	const dimensionGroups = catalog.dimensions
		.map((dimension) => {
			// The realworld dimension reads as suite lineages: each charted suite's
			// TOTAL leads as the headline row, its task rows nest under it (indent),
			// in the suite's own execution order. Tasks outside any charted suite
			// stay flat at the end.
			const rows: MetricTableRow[] =
				dimension === "realworld"
					? realworldSuites.flatMap((suite) => [
							totalRowOf(suite),
							...suite.tasks.map((task) => ({ ...valueRow(requireDef(task.id)), indent: true })),
						])
					: catalog.metrics
							.filter((def) => def.dimension === dimension && emittedIds.has(def.id))
							.map(valueRow);
			if (dimension === "realworld") {
				const charted = new Set(realworldSuites.flatMap((s) => s.tasks.map((t) => t.id)));
				rows.push(
					...catalog.metrics
						.filter(
							(def) =>
								def.dimension === "realworld" && emittedIds.has(def.id) && !charted.has(def.id),
						)
						.map(valueRow),
				);
			}

			// Derived economics rows, appended to the dimension they extend: each
			// charted pipeline's burst cost (hourly × total — the dataset's
			// usd_per_compute_run model), which the published Run omits because
			// normalize-time has no pipeline runtime to price.
			if (dimension === "economics") {
				const costDef = requireDef("usd_per_compute_run");
				for (const suite of realworldSuites) {
					rows.push({
						id: `${costDef.id}__${suite.id}`,
						label: `${costDef.label} (${suite.name})`,
						unit: costDef.unit,
						direction: costDef.direction,
						headline: false,
						derived: true,
						values: Object.fromEntries(
							providerIds.map((id) => {
								const bar = suite.bars.find((b) => b.provider === id);
								return [
									id,
									bar && bar.costPerRunUsd !== null ? { p50: bar.costPerRunUsd, n: 1 } : null,
								];
							}),
						),
					});
				}
			}
			return { dimension, rows };
		})
		.filter((g) => g.rows.length > 0);

	// -- coverage gaps (recorded + derived-missing, ordered like the dataset's
	//    own leaderboard: disk shortfalls first, then outcome, provider, suite) --
	const exercisedSuites = new Set<string>();
	for (const p of rendered) {
		for (const s of p.suitesCovered) exercisedSuites.add(s);
		for (const g of p.gaps) if (g.scope === "suite") exercisedSuites.add(g.id);
	}
	const OUTCOME_ORDER: Record<string, number> = { skipped: 0, failed: 1, missing: 2 };
	/** An unrecognised outcome sorts LAST rather than indexing to `undefined` — subtracting
	 *  those yields NaN, which every JS sort reads as "these two are equal", so the order
	 *  would quietly become input-dependent instead of failing. */
	const outcomeRank = (outcome: string): number => OUTCOME_ORDER[outcome] ?? 3;
	const coverageGaps = rendered
		.flatMap((p) => {
			const accountedFor = new Set([
				...p.suitesCovered,
				...p.gaps.filter((g) => g.scope === "suite").map((g) => g.id),
			]);
			return [
				...p.gaps.map((g) => ({
					provider: p.providerId,
					suite: g.id,
					outcome: g.outcome as string,
					reason: g.reason,
					disk: g.outcome === "skipped" && /^insufficient disk/i.test(g.reason.trim()),
				})),
				...[...exercisedSuites]
					.filter((s) => !accountedFor.has(s))
					.map((s) => ({
						provider: p.providerId,
						suite: s,
						outcome: "missing",
						reason: "No result and no marker: the suite never reported for this provider.",
						disk: false,
					})),
			];
		})
		.sort(
			(a, b) =>
				Number(b.disk) - Number(a.disk) ||
				outcomeRank(a.outcome) - outcomeRank(b.outcome) ||
				a.provider.localeCompare(b.provider, "en") ||
				a.suite.localeCompare(b.suite, "en"),
		);

	return {
		provenance: {
			runFile: provenance.runFile,
			catalogFile: provenance.catalogFile,
			catalogSourceSha: catalog.source.sha,
			generator: provenance.generator,
		},
		run: {
			runId: run.runId,
			commit: run.sha.slice(0, 12),
			date: run.generatedAt.slice(0, 10),
			schemaVersion: run.schemaVersion,
			targetSpec: run.targetSpec,
		},
		// Cross-run backfill disclosure: which older run filled which table cells,
		// and at what target spec — null when nothing was backfilled.
		backfill:
			backfillRun && backfilledCells.length > 0
				? {
						runFile: provenance.backfillRunFile,
						runId: backfillRun.runId,
						commit: backfillRun.sha.slice(0, 12),
						date: backfillRun.generatedAt.slice(0, 10),
						targetSpec: backfillRun.targetSpec,
						cells: backfilledCells,
					}
				: null,
		providers,
		// Attempted but not rendered — see the `rendered` filter above.
		excludedProviders,
		environmentFlags,
		phaseOrder,
		suites: realworldSuites,
		dimensionGroups,
		coverageGaps,
	};
}
