/**
 * INGEST — the package's front door: raw dataset documents in, the derived artifact out.
 *
 * A separate, satori-free entry point (like `plan.ts`) so the generator script can build the
 * artifact without loading a renderer and two 340 KB fonts. Import it as `@/figures/ingest`;
 * `@/figures` is the RENDERER's surface and pulls satori.
 *
 * With this here the package is a whole pipeline — `data/sandbox-benchmarks/**` → PNG — rather
 * than a renderer that trusts an artifact someone else produced. The caller still owns the
 * filesystem: `scripts/generate-sandbox-benchmark-data.ts` reads the six documents, names the
 * paths, and writes the result. Nothing in here touches a file, and that is what keeps the
 * derivation testable against a synthetic run.
 */
export {
	buildSandboxBenchmarkData,
	burstCostPerRunUsd,
	phaseOfTask,
} from "./build.ts";
export type {
	Catalog,
	CatalogMetric,
	Egress,
	HostDetails,
	IngestProvenance,
	Regions,
	RunDoc,
	RunMetric,
	RunProvider,
	SandboxIngestInput,
} from "./documents.ts";
