/**
 * The shape of the DERIVED sandbox-benchmark artifact.
 *
 * Explicit shapes rather than a JSON import's inferred literal type: an inferred
 * type makes `values[providerId]` unindexable and would couple every consumer to
 * one run's exact provider set. Ids stay `string` on purpose — correctness is
 * pinned by the recompute test, not the type system.
 *
 * These are the package's CONTRACT, and both ends of the pipeline are held to it.
 * `ingest/build.ts` declares this as its return type, so the producer cannot emit a
 * field the consumers do not know about; `parse.ts` turns an `unknown` document into
 * one of these or throws. There used to be a second, parallel declaration —
 * `ReturnType<typeof buildSandboxBenchmarkData>` in the generator script — which
 * silently disagreed with this one about `r` and `rep`, because `valueRow`'s declared
 * return type erased them. One type, one producer, one parse.
 *
 * They live in the package rather than in the site because everything below them
 * — the derivations, the formatters, the composite resolver — is typed against
 * them, and a package that has to reach into `@/lib` for its own argument type is
 * not self-contained. The site parses the artifact into this shape; the package
 * never imports the artifact.
 */
export type SandboxProviderId = string;

export interface MetricCell {
	p50: number;
	n: number;
	/** Full aggregate set — present on measured cells, absent on derived totals/costs. */
	p95?: number;
	mean?: number;
	stdev?: number;
	min?: number;
	max?: number;
	samples?: number[];
	/** Replicate sandboxes this cell pooled (v3 runs) — how many machines, where
	 *  `n` counts pooled passes (convergence-mode suites run a varying number). */
	r?: number;
	/** Each replicate sandbox's own median, in replicate order — the
	 *  between-sandbox view the repeatability panel reads. */
	rep?: number[];
	/** True when the cell was backfilled from the disclosed earlier run. */
	backfilled?: boolean;
}

export interface SandboxProvider {
	id: string;
	name: string;
	specMatched: boolean;
	priceUsdHr: number | null;
	specs: {
		vcpus: number | null;
		cpuModel: string | null;
		/** The DISTINCT host CPU models this provider's replicate sandboxes saw —
		 *  present only when there was more than one (a heterogeneous fleet), in
		 *  which case `cpuModel` is one replicate's reading, not the fleet. */
		cpuModels: string[] | null;
		cpuCacheSize: string | null;
		virtualization: string | null;
		/** The run's own isolation verdict ("vm" | "gvisor" | …) — what separates
		 *  two variants of the same vendor's account. */
		isolation: string | null;
		memoryGb: number | null;
		diskGb: number | null;
		/** Storage shape from the Phoronix system header — what the disk numbers
		 *  are measuring (overlay vs block device, atime behaviour, block size). */
		fileSystem: string | null;
		mountOptions: string | null;
		diskScheduler: string | null;
		diskBlockSize: string | null;
		kernel: string | null;
		os: string | null;
		/** Address family the sandbox actually egressed on ("IPv4" | "IPv6"). */
		egressFamily: string | null;
		asn: string | null;
		asnOrg: string | null;
		geo: string | null;
		/** True when asn/asnOrg/geo were recovered from the shard artifacts because
		 *  the in-sandbox probe reported none — a different provenance, marked. */
		egressFromShard: boolean;
		region: string | null;
		regionPinned: boolean | null;
	};
}

export interface BarSegment {
	id: string;
	label: string;
	shortLabel: string;
	phase: string;
	p50: number;
	n: number;
}

export interface PipelineBar {
	provider: string;
	totalS: number;
	costPerRunUsd: number | null;
	segments: BarSegment[];
}

export interface PipelineSuite {
	id: string;
	name: string;
	minDiskGb: number | null;
	tasks: { id: string; label: string; shortLabel: string; phase: string }[];
	bars: PipelineBar[];
	incomplete: { provider: string; outcome: string; reason: string }[];
}

export interface MetricTableRow {
	id: string;
	label: string;
	unit: string;
	direction: "HIB" | "LIB";
	headline: boolean;
	derived: boolean;
	values: Record<string, MetricCell | null>;
	/** True on a pipeline task row nested under its suite's total row. */
	indent?: boolean;
}

export interface SandboxBenchmarkData {
	provenance: {
		runFile: string;
		catalogFile: string;
		catalogSourceSha: string;
		generator: string;
	};
	run: {
		runId: string;
		commit: string;
		date: string;
		schemaVersion: string;
		targetSpec: { vcpus: number; memoryGb: number; diskGb: number };
	};
	backfill: {
		runFile: string;
		runId: string;
		commit: string;
		date: string;
		targetSpec: { vcpus: number; memoryGb: number; diskGb: number };
		cells: { provider: string; metricId: string }[];
	} | null;
	providers: SandboxProvider[];
	/** In the run, not in the report: providers the harness attempted that never
	 *  reached `validated` (no metrics). Disclosed under the coverage table so a
	 *  dropped column is visible rather than silent. */
	excludedProviders: { id: string; name: string; validationStatus: string; metrics: number }[];
	environmentFlags: { provider: string; field: string }[];
	phaseOrder: string[];
	suites: PipelineSuite[];
	dimensionGroups: { dimension: string; rows: MetricTableRow[] }[];
	coverageGaps: {
		provider: string;
		suite: string;
		outcome: string;
		reason: string;
		disk: boolean;
	}[];
}
