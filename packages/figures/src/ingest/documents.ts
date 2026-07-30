/**
 * The RAW documents the package ingests — the slice of each one the derivation reads.
 *
 * These are the dataset's shapes, not the site's: a Run document as the sandbox-benchmarks
 * harness emits it, that repo's own metric catalog, and the four snapshot shards that carry
 * facts the Run document does not (host details from the Phoronix headers, a shard-recovered
 * egress identity, the region each provider ran in). Nothing here describes a file path or a
 * filesystem — the CALLER reads the documents and hands them over, exactly as the renderer's
 * `FigureInput` works, which is what keeps the package buildable with no repo around it.
 *
 * Declared as the read slice rather than the full schema on purpose. A field the derivation
 * never touches is a field a future run may change without this package caring.
 */

/** One measured metric on one provider, with the run's own aggregates. */
export interface RunMetric {
	metricId: string;
	samples: number[];
	aggregates: {
		p50: number;
		p95: number;
		mean: number;
		stdev: number;
		min: number;
		max: number;
		n: number;
	};
	/** v3 replicate breakdown: the per-sandbox sample clusters the aggregate
	 *  pooled `samples` from, present when ≥2 replicate sandboxes measured this
	 *  metric. `samples` above stays the pooled union (the ranking value). */
	replicates?: { index: number; samples: number[] }[];
}

export interface RunProvider {
	providerId: string;
	validationStatus: string;
	/** Absent on a provider that produced no results — there was no observed spec
	 *  to compare against the target. */
	specMatched?: boolean;
	observedSpecs: {
		vcpus?: number;
		cpuModel?: string;
		virtualization?: string;
		/** The run's own isolation verdict ("vm" | "gvisor" | …) — the field that
		 *  separates the two Modal variants without reading their kernel strings. */
		detectedIsolation?: string;
		memoryGb?: number;
		diskGb?: number;
		kernel?: string;
		os?: string;
		egressAsn?: string;
		egressOrgName?: string;
		city?: string;
		region?: string;
		country?: string;
		/** Aggregate-level heterogeneity disclosure: the DISTINCT host CPU models a
		 *  provider's replicate shards observed, present only when there was more
		 *  than one — i.e. the fleet is not one machine type. `cpuModel` above is
		 *  then just the first shard's reading, not the fleet. */
		hostCpuModels?: string[];
	};
	metrics: RunMetric[];
	suitesCovered: string[];
	gaps: { scope: string; id: string; outcome: "skipped" | "failed"; reason: string }[];
}

export interface RunDoc {
	schemaVersion: string;
	runId: string;
	sha: string;
	generatedAt: string;
	targetSpec: { vcpus: number; memoryGb: number; diskGb: number };
	providers: RunProvider[];
}

export interface CatalogMetric {
	id: string;
	dimension: string;
	unit: string;
	direction: "HIB" | "LIB";
	headline: boolean;
	label: string;
	derived: boolean;
}

export interface Catalog {
	source: { repo: string; sha: string; module: string };
	dimensions: string[];
	providers: { id: string; displayName: string }[];
	metrics: CatalogMetric[];
	suites: Record<string, { minDiskGb: number | null; metrics: string[] }>;
}

export interface HostDetails {
	source: { repo: string; runId: string; artifactPattern: string; field: string };
	providers: Record<
		string,
		{
			cpuCacheSize: string | null;
			fileSystem: string | null;
			mountOptions: string | null;
			diskScheduler: string | null;
			diskBlockSize: string | null;
			sourceFile: string;
		}
	>;
}

export interface Egress {
	source: { repo: string; runId: string; shardRunId: string; field: string };
	providers: Record<
		string,
		{
			localIp: string;
			family: "IPv4" | "IPv6";
			routable: boolean;
			asn: string | null;
			asnOrg: string | null;
			prefix: string | null;
			geo: string | null;
			sourceFile: string;
		}
	>;
}

export interface Regions {
	source: { repo: string; sha: string; extractor: string };
	providers: Record<string, { region: string | null; pinned: boolean; sourceRef: string }>;
}

/**
 * Where the caller read the documents, and what wrote the result — the strings that end up
 * verbatim in the artifact's own `provenance` block and its backfill disclosure.
 *
 * Passed in rather than derived because they are REPO paths. A package that hardcoded
 * `data/sandbox-benchmarks/runs/<id>.json` would be describing one checkout's directory
 * layout in a document it claims is a function of the run alone.
 */
export interface IngestProvenance {
	/** Path the primary Run document was read from. */
	runFile: string;
	/** Path the metric catalog snapshot was read from. */
	catalogFile: string;
	/** Path the backfill Run was read from — recorded only if it filled a cell. */
	backfillRunFile: string;
	/** What produced the artifact, for the reader who finds it hand-edited. */
	generator: string;
}

/**
 * Everything one derivation run consumes. The two required documents are the run and its
 * catalog; the four shards are optional because each fills a field that may simply not have
 * been snapshotted for a given run.
 */
export interface SandboxIngestInput {
	run: RunDoc;
	catalog: Catalog;
	provenance: IngestProvenance;
	/** An earlier run of the same harness, used to fill hardware table cells the primary
	 *  run is missing. Every cell it fills is marked and disclosed. */
	backfillRun?: RunDoc;
	hostDetails?: HostDetails;
	regions?: Regions;
	egress?: Egress;
}
