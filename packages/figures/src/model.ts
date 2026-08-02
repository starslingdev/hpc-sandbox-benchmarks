/**
 * Run document → the realworld figure model: exactly what the pipeline charts consume, and
 * nothing else.
 *
 * The input is typed by `@sandbox-benchmarks/schema` — the workspace's one Run contract and
 * its metric/suite registries — so there is no parallel hand-written copy of either to drift
 * (the type-only imports cost nothing at runtime). The registries still arrive as ARGUMENTS
 * rather than being imported as values: that is what lets every test below run against a
 * synthetic run and a synthetic catalog instead of whatever the committed dataset contains.
 *
 * This replaced a vendored copy of an upstream site's whole data layer (a hand-written
 * RunDoc shadow, a 449-line parse boundary for a document that never crosses a process
 * boundary here, and derivations — metric tables, coverage gaps, environment flags,
 * economics rows — that nothing in this repo renders). The model below is the ~20% that the
 * charts actually read; `packages/results` owns every other derivation over a Run.
 */
import type { MetricDef, ProviderRun, Run, Suite } from "@sandbox-benchmarks/schema";
import type { PhaseId } from "./phases.ts";
import { phaseOfTask } from "./phases.ts";

/** One task's slice of a bar: the run's median for that task, and how many trials back it. */
export interface BarSegment {
	readonly id: string;
	readonly phase: PhaseId;
	readonly p50: number;
	readonly n: number;
}

/** One environment's whole pipeline, as one stacked bar. `totalS` is the sum of the
 *  segments' medians — the cost of the pipeline, not the timing of any single run. */
export interface PipelineBar {
	readonly provider: string;
	readonly totalS: number;
	readonly segments: readonly BarSegment[];
}

export interface PipelineSuite {
	/** The suite's registry id, e.g. `realworld-better-auth`. Names the output file. */
	readonly id: string;
	/** Display name from the tasks' catalog labels, e.g. `Better-Auth`. */
	readonly name: string;
	readonly minDiskGb: number | null;
	/** The exercised tasks, in the suite's canonical (execution) order. */
	readonly tasks: readonly { readonly id: string; readonly phase: PhaseId }[];
	/**
	 * DECLARED tasks that NO environment completed — dropped from every bar, as short labels.
	 * A task that fails everywhere would otherwise vanish silently: the exercised set shrinks,
	 * every bar looks complete, and a universally-failed suite publishes as a clean comparison
	 * (this happened — mastra's `test_core`). The chart must disclose what it is not showing.
	 */
	readonly droppedTasks: readonly string[];
	readonly bars: readonly PipelineBar[];
	/** Environments that did not complete the suite: outcome and reason, no bar. */
	readonly incomplete: readonly {
		readonly provider: string;
		readonly outcome: string;
		readonly reason: string;
	}[];
}

/** What a chart row needs to name an environment. */
export interface FigureProvider {
	readonly id: string;
	readonly name: string;
	/** False when the run disclosed an off-target allocation — the chart daggers the label. */
	readonly specMatched: boolean;
	/** The isolation subtitle rendered beneath the provider title, when declared or detected. */
	readonly isolation?: FigureIsolation;
}

/** The two segments shown in a provider row's isolation chip. */
export interface FigureIsolation {
	readonly kind: string;
	readonly technology: string;
}

export interface RealworldFigureModel {
	/** Chartable suites only (≥2 completing environments), widest comparison first. */
	readonly suites: readonly PipelineSuite[];
	readonly providers: readonly FigureProvider[];
}

/** The registry slice the derivation needs, typed by the schema that owns it — `Pick`ed to
 *  exactly the fields read, so the real registries satisfy it and a synthetic test registry
 *  needs no cast. */
export interface FigureModelInput {
	readonly run: Run;
	/** The metric catalog — task labels come from here. */
	readonly metrics: readonly Pick<MetricDef, "id" | "label">[];
	/** Provider display names. String-keyed on purpose: the run side carries provider ids as
	 *  strings, and the registry's narrower `ProviderId` union assigns into this cleanly. */
	readonly providers: readonly {
		readonly id: string;
		readonly displayName: string;
		/** Registry declaration; host metadata may provide a more specific observed runtime. */
		readonly isolationTechnology?: string;
	}[];
	/** The suite registry: which dimension a suite measures, canonical task order, disk floors. */
	readonly suites: Readonly<Record<string, Pick<Suite, "dimensions" | "metrics" | "minDiskGb">>>;
}

const round = (v: number, dp: number) => Number(v.toFixed(dp));

/** The chart uses concise vendor names while the full registry names remain in the Markdown tables. */
function figureProviderName(providerId: string, displayName: string): string {
	if (providerId.startsWith("daytona")) return "Daytona";
	if (providerId.startsWith("modal")) return "Modal";
	if (providerId.startsWith("microsandbox")) return "microsandbox";
	return displayName;
}

/** Map the isolation probe's stable runtime ids to the short, reader-facing chip vocabulary. */
function isolationFromRuntime(runtime: string | undefined): FigureIsolation | undefined {
	if (!runtime) return undefined;
	const normalized = runtime.trim().toLowerCase();
	if (!normalized || ["unknown", "none", "not-observable"].includes(normalized)) return undefined;
	if (normalized.includes("firecracker")) return { kind: "microVM", technology: "Firecracker" };
	if (normalized.includes("libkrun") || normalized === "krunvm") {
		return { kind: "microVM", technology: "libkrun" };
	}
	if (normalized.includes("gvisor")) return { kind: "Userspace", technology: "gVisor" };
	if (normalized.includes("kata")) return { kind: "microVM", technology: "Kata" };
	if (normalized.includes("cloud-hypervisor")) {
		return { kind: "microVM", technology: "Cloud Hypervisor" };
	}
	if (normalized.includes("crosvm")) return { kind: "microVM", technology: "crosvm" };
	if (normalized.includes("sysbox")) return { kind: "Container", technology: "Sysbox" };
	if (normalized.includes("lxc")) return { kind: "Container", technology: "LXC" };
	if (normalized.includes("oci") || normalized.includes("container")) {
		return { kind: "Container", technology: "OCI" };
	}
	if (normalized.includes("microvm") || normalized === "vm") {
		return { kind: "microVM", technology: normalized === "vm" ? "VM" : "microVM" };
	}
	return undefined;
}

/** Turn a registry declaration into the same compact chip when no exact probe result is available. */
function isolationFromDeclaration(declared: string | undefined): FigureIsolation | undefined {
	if (!declared) return undefined;
	const normalized = declared.toLowerCase();
	if (normalized.includes("firecracker")) return { kind: "microVM", technology: "Firecracker" };
	if (normalized.includes("libkrun")) return { kind: "microVM", technology: "libkrun" };
	if (normalized.includes("gvisor")) return { kind: "Userspace", technology: "gVisor" };
	if (normalized.includes("kata")) return { kind: "microVM", technology: "Kata" };
	if (normalized.includes("microvm") || normalized.includes("vm")) {
		const detail = declared.match(/\(([^)]+)\)/)?.[1];
		return { kind: "microVM", technology: detail ?? "VM" };
	}
	if (normalized.includes("container")) return { kind: "Container", technology: "OCI" };
	return undefined;
}

/**
 * Read the dominant exact runtime from the aggregated mise/system-provider records.
 *
 * `machine_vmm` is consulted FIRST because the probe reports NESTED isolation and these paths name
 * different layers of it. Vercel and Namespace run the workload in an OCI container inside a
 * Firecracker microVM, so they report `machine_vmm=firecracker` AND `isolation_runtime=oci-container`
 * — both true. Reading `isolation_runtime` first returned the innermost layer and threw away the
 * hardware boundary, chipping two Firecracker microVMs as "Container · OCI" while the Markdown table
 * for the same run called them microVMs.
 *
 * The outer boundary wins because that is what the chip claims: the isolation the workload is
 * actually confined by, and the thing a reader comparing environments is weighing. It also puts this
 * derivation back in agreement with `packages/results`, whose roster treats the registry declaration
 * as authoritative and documents (see `isolationClass`) that the probe's container signal is a
 * cgroup-quota heuristic a microVM trips too — so it must never override a VM.
 *
 * `machine_vmm` is skipped when it is `not-observable` (Modal's gVisor cell, where no VMM is exposed
 * and `isolation_runtime=gvisor` is the correct answer) by the same emptiness filter below.
 */
function observedIsolationRuntime(provider: ProviderRun): string | undefined {
	const paths = ["machine_vmm", "isolation_runtime", "container_runtime"];
	for (const path of paths) {
		const counts = new Map<string, number>();
		for (const record of provider.hostMetadata ?? []) {
			if (record.source !== "mise/system-provider") continue;
			const value = record.fields.find((field) => field.path === path)?.value?.trim();
			if (!value || ["unknown", "none", "not-observable"].includes(value.toLowerCase())) continue;
			counts.set(value, (counts.get(value) ?? 0) + (record.sandboxes ?? 1));
		}
		const winner = [...counts.entries()].sort(
			([valueA, countA], [valueB, countB]) => countB - countA || valueA.localeCompare(valueB, "en"),
		)[0]?.[0];
		if (winner) return winner;
	}
	return undefined;
}

function isolationFor(
	provider: ProviderRun,
	declared: string | undefined,
): FigureIsolation | undefined {
	return (
		isolationFromRuntime(observedIsolationRuntime(provider)) ?? isolationFromDeclaration(declared)
	);
}

export function buildRealworldFigureModel(input: FigureModelInput): RealworldFigureModel {
	const { run, metrics, providers, suites } = input;
	const labelOf = new Map(metrics.map((m) => [m.id, m.label]));
	const displayName = new Map(providers.map((p) => [p.id, p.displayName]));

	// The charts cover the run's VALIDATED providers — the dataset's own word for "a
	// committed run carries real metrics for it". A provider the harness attempted that
	// reported nothing is `pending`; charting it would add a data-less row. (The published
	// board discloses those absences — that is `packages/results`' jurisdiction, not a
	// figure's.)
	const rendered = run.providers.filter((p) => p.validationStatus === "validated");
	const metricsByProvider = new Map(
		rendered.map((p) => [p.providerId, new Map(p.metrics.map((m) => [m.metricId, m]))]),
	);
	const aggregatesOf = (p: ProviderRun, id: string) =>
		metricsByProvider.get(p.providerId)?.get(id)?.aggregates;

	const requireLabel = (id: string): string => {
		const label = labelOf.get(id);
		if (!label) {
			throw new Error(`metric "${id}" is in the run but not in the metric catalog`);
		}
		return label;
	};

	const chartable = Object.entries(suites)
		// By declared dimension, not by id prefix: the registry already says what a suite
		// measures, and a naming-convention filter would silently skip a renamed suite.
		.filter(([, suite]) => suite.dimensions.includes("realworld"))
		.map(([name, suite]) => {
			// The run's own exercised task set for this suite, in the suite's canonical
			// (execution) order — a task nobody emitted is not a column.
			const exercised = suite.metrics.filter((id) =>
				rendered.some((p) => aggregatesOf(p, id) !== undefined),
			);
			const firstTask = exercised[0];
			if (firstTask === undefined) return null;
			// Declared tasks nobody completed, as the short labels the disclosure prints.
			// ("Better-Auth: test core" → "test core" — the chart names the repo once.)
			const droppedTasks = suite.metrics
				.filter((id) => !exercised.includes(id))
				.map((id) => requireLabel(id).replace(/^[^:]+:\s*/, ""));

			const bars: PipelineBar[] = rendered.flatMap((p) => {
				// A bar requires EVERY exercised task: a partial pipeline would chart an
				// understated total as if it were comparable.
				const segments: BarSegment[] = [];
				for (const id of exercised) {
					const a = aggregatesOf(p, id);
					if (a === undefined) return [];
					segments.push({ id, phase: phaseOfTask(id), p50: a.p50, n: a.n });
				}
				return [
					{
						provider: p.providerId,
						totalS: round(
							segments.reduce((sum, s) => sum + s.p50, 0),
							3,
						),
						segments,
					},
				];
			});

			// Chart a suite only when there is a comparison to draw.
			if (bars.length < 2) return null;

			const charted = new Set(bars.map((b) => b.provider));
			const incomplete = rendered
				.filter((p) => !charted.has(p.providerId))
				.map((p) => {
					const gap = p.gaps.find((g) => g.scope === "suite" && g.id === name);
					return {
						provider: p.providerId,
						outcome: gap?.outcome ?? "missing",
						// Wording matches packages/results' coverageGapsOf fallback for the same hole, so
						// the figure's disclosure row and the board's coverage table cannot describe one
						// fact in two voices.
						reason:
							gap?.reason ?? "No result and no marker: the suite never reported for this provider.",
					};
				});

			return {
				id: name,
				// Suite display name from its tasks' catalog labels ("Better-Auth: …").
				name: requireLabel(firstTask).split(":")[0] ?? name,
				minDiskGb: suite.minDiskGb ?? null,
				tasks: exercised.map((id) => ({ id, phase: phaseOfTask(id) })),
				droppedTasks,
				bars,
				incomplete,
			};
		})
		.filter((s): s is NonNullable<typeof s> => s !== null)
		// Widest comparison first (most bars), suite id the deterministic tie-break.
		.sort((a, b) => b.bars.length - a.bars.length || a.id.localeCompare(b.id, "en"));

	return {
		suites: chartable,
		providers: rendered.map((p) => {
			const isolation = isolationFor(
				p,
				providers.find((meta) => meta.id === p.providerId)?.isolationTechnology,
			);
			return {
				id: p.providerId,
				name: figureProviderName(p.providerId, displayName.get(p.providerId) ?? p.providerId),
				specMatched: p.specMatched !== false,
				...(isolation ? { isolation } : {}),
			};
		}),
	};
}
