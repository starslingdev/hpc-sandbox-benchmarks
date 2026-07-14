/**
 * The raw-file naming contract — the ONE home for how files in a Run's curated raw tree
 * (`data/raw/<runId>/<provider>/<suite>/`) are named, and how gap markers are shaped. The in-sandbox
 * producer and the harness collector (writers) and the results extractor (the single reader) all
 * route through this module, so a filename's spelling can never drift between them.
 *
 * A suite that produces no result leaves a MARKER saying why, and the marker's suffix carries the
 * outcome: `--skipped.json` (deliberately not run) or `--failed.json` (attempted, errored). Two
 * suffixes rather than a flag inside one file, so the distinction survives every layer that only ever
 * looks at a filename — the collector's "did this suite report anything at all?" guard included.
 *
 * Layout: a Run nests one subdirectory per provider, and under it one subdirectory per suite that ran
 * (the harness pulls each suite's output into `<provider>/<suite>/`). Tagging the tree by suite lets
 * the normalizer attribute every result to the suite that produced it and reject — per suite — any
 * catalogued metric emitted on a Dimension that suite does not declare (the runtime half of the
 * suite↔dimension↔metric contract; see suite-contract.ts). The normalizer still accepts the older
 * un-nested `<provider>/<file>` layout (results directly under the provider dir) for back-compatibility.
 *
 * Parse, don't validate: the filename predicates and the gap-marker/artifact-name readers are arktype
 * Types — `.matching` regex narrowing plus `.pipe` morphs — so a malformed marker or off-contract name
 * can never produce a half-resolved value. A morph either yields a fully-formed result or `type.errors`.
 *
 * This slice covers the PTS result files and gap markers the node-web-tooling path needs. The
 * lifecycle timing files (`<name>_ms.txt`, `<name>-exit-code.txt`) land with the lifecycle path.
 */
import { type } from "arktype";
import type { GapOutcome, ResultGap } from "./run.ts";
import { gapOutcomeSchema } from "./run.ts";

const SKIP_SUFFIX = "--skipped.json";
const FAILURE_SUFFIX = "--failed.json";

// Filename predicates: regex-narrowed string Types. Wrapped (not point-free `T.allows`) so the bound
// receiver is never lost.

/**
 * A PTS structured result, e.g. `pts_node-web-tooling.xml`. The producer writes one per test under a
 * `pts_` prefix; the extractor keys on this to route XML through the PTS parser. Most `pts_*` siblings
 * (`.json`/`.log`) are provenance, not metrics, so they don't match — with one intentional exception:
 * the forensics tarball ({@link isPtsForensicsFile}), a recognized provenance name that is provably
 * disjoint from this predicate (it ends `--forensics.tar.gz`, never `.xml`).
 */
const ptsResultFile = type("string").matching("^pts_.*\\.xml$");
export const isPtsResultFile = (filename: string): boolean => ptsResultFile.allows(filename);

const FORENSICS_SUFFIX = "--forensics.tar.gz";

/**
 * `pts_<test>--forensics.tar.gz` — the full PTS result directory (composite.xml + installation-logs/ +
 * test-logs/) captured as a tarball for post-hoc debugging. A tarball, not a flattened copy, so its
 * nested `.xml` files can't be misrouted by {@link isPtsResultFile}: it `startsWith("pts_")` yet ends
 * `--forensics.tar.gz`, so it is provably disjoint from the `.xml` result predicate.
 */
export function ptsForensicsFile(prefix: string): string {
	return `${prefix}${FORENSICS_SUFFIX}`;
}

const ptsForensicsFileName = type("string").matching("^pts_.+--forensics\\.tar\\.gz$");
export const isPtsForensicsFile = (filename: string): boolean =>
	ptsForensicsFileName.allows(filename);

const skipMarkerFileName = type("string").matching("--skipped\\.json$");
export const isSkipMarkerFile = (filename: string): boolean => skipMarkerFileName.allows(filename);

const failureMarkerFileName = type("string").matching("--failed\\.json$");
export const isFailureMarkerFile = (filename: string): boolean =>
	failureMarkerFileName.allows(filename);

/**
 * Either marker: the two outcomes a suite can report instead of a result ({@link GapOutcome}). The
 * suffix IS the outcome — a skip and a failure are different filenames, so neither the collector's
 * "did this suite report anything?" check nor the extractor can conflate them by reading a flag.
 */
export const isGapMarkerFile = (filename: string): boolean =>
	isSkipMarkerFile(filename) || isFailureMarkerFile(filename);

// Name builders (the writer side of the contract).

/** `<name>--skipped.json` — the benchmark was deliberately not run. */
export function skipMarkerFile(name: string): string {
	return `${name}${SKIP_SUFFIX}`;
}

/** `<name>--failed.json` — the benchmark was attempted and errored. */
export function failureMarkerFile(name: string): string {
	return `${name}${FAILURE_SUFFIX}`;
}

/** Composite name for harness-level (whole suite × provider) files. */
export function sandboxResultName(provider: string, suite: string): string {
	return `sandbox-${provider}-${suite}`;
}

/** `sandbox-<provider>-<suite>--skipped.json` — the whole suite was deliberately not run. */
export function sandboxSkipMarkerFile(provider: string, suite: string): string {
	return skipMarkerFile(sandboxResultName(provider, suite));
}

/** `sandbox-<provider>-<suite>--failed.json` — the whole suite ran and broke. */
export function sandboxFailureMarkerFile(provider: string, suite: string): string {
	return failureMarkerFile(sandboxResultName(provider, suite));
}

/** The marker filename for an outcome — the writer's half of the suffix↔outcome contract. */
export function sandboxGapMarkerFile(provider: string, suite: string, outcome: GapOutcome): string {
	return outcome === "failed"
		? sandboxFailureMarkerFile(provider, suite)
		: sandboxSkipMarkerFile(provider, suite);
}

/**
 * Serialized harness gap marker — the exact bytes the harness writes into a `*--skipped.json` /
 * `*--failed.json` (pretty-printed, trailing newline, fixed key order) so the producer side has one
 * source of truth. The body restates the outcome the suffix already encodes, and {@link parseGapMarker}
 * rejects the file if the two ever disagree: a marker is either coherent or it is not read at all.
 */
export function harnessGapMarkerJson(
	provider: string,
	suite: string,
	outcome: GapOutcome,
	reason: string,
): string {
	return `${JSON.stringify({ provider, suite, outcome, reason }, null, 2)}\n`;
}

/**
 * Suite re-derived from a `sandbox-<provider>-<suite>--{skipped,failed}.json` filename — the fallback
 * when a marker body carries no suite field. Undefined for filenames that are not gap markers, and for
 * an empty suite portion (e.g. `sandbox-daytona---skipped.json`), so the caller's `?? filename`
 * fallback still fires instead of yielding an empty suite name.
 */
export function suiteFromGapMarkerFilename(
	filename: string,
	providerId: string,
): string | undefined {
	const suffix = isFailureMarkerFile(filename)
		? FAILURE_SUFFIX
		: isSkipMarkerFile(filename)
			? SKIP_SUFFIX
			: undefined;
	if (!suffix) return undefined;
	let base = filename.slice(0, -suffix.length);
	const prefix = `sandbox-${providerId}-`;
	if (base.startsWith(prefix)) base = base.slice(prefix.length);
	return base || undefined;
}

/**
 * Every on-disk gap-marker body shape, unified at the type boundary. All THREE must stay accepted —
 * the committed raw tree is the source of truth and is re-normalized retroactively, so dropping one
 * would silently rewrite history:
 *
 *   1. Current harness:   `{ provider, suite, outcome, reason }`
 *   2. Legacy harness:    `{ provider, suite, skipped: true, reason }`
 *   3. bash skip_result:  `{ schema_version, benchmark, skipped: true, skip_reason }`
 *
 * Shapes 2 and 3 predate the skipped/failed distinction, so they carry no `outcome`; the suffix
 * supplies it (both were only ever written for deliberate skips, and both only ever landed in
 * `--skipped.json`). The morph normalizes the divergent field spellings into `{ outcome?, suite?,
 * reason }`; {@link parseGapMarker} resolves the suite from the filename when the body omits it.
 */
const gapMarkerBody = type({
	"outcome?": gapOutcomeSchema,
	// Legacy shapes' flag. Accepted, never required, and never read: it cannot distinguish a skip from
	// a failure (it predates failures), so the filename suffix is what decides the outcome.
	"skipped?": "boolean",
	"suite?": "string",
	"benchmark?": "string",
	"reason?": "string",
	"skip_reason?": "string",
}).pipe((d) => ({
	outcome: d.outcome,
	// `|| undefined` (not `??`) so an empty-string `suite`/`benchmark` is treated as absent — suite is
	// a downstream identifier, and an explicit `""` must fall through to the filename derivation in
	// `parseGapMarker`, exactly as a missing field does (mirrors `suiteFromGapMarkerFilename`).
	suite: d.suite || d.benchmark || undefined,
	reason: d.reason ?? d.skip_reason ?? "unknown",
}));

/**
 * Parse a `*--skipped.json` / `*--failed.json` body into a suite-scoped {@link ResultGap}.
 *
 * The FILENAME decides the outcome — it is the half of the contract the collector and the extractor
 * both already agree on — and a body that names a contradicting `outcome` is rejected outright rather
 * than resolved by precedence: a marker whose two halves disagree is corrupt, and guessing which half
 * to believe is how a crashed suite comes to be published as a deliberate skip. Undefined for any
 * filename outside the naming contract, whatever the body claims.
 */
export function parseGapMarker(
	filename: string,
	data: unknown,
	providerId: string,
): ResultGap | undefined {
	const outcome: GapOutcome | undefined = isFailureMarkerFile(filename)
		? "failed"
		: isSkipMarkerFile(filename)
			? "skipped"
			: undefined;
	if (!outcome) return undefined;
	const body = gapMarkerBody(data);
	if (body instanceof type.errors) return undefined;
	if (body.outcome !== undefined && body.outcome !== outcome) return undefined;
	return {
		scope: "suite",
		id: body.suite ?? suiteFromGapMarkerFilename(filename, providerId) ?? filename,
		outcome,
		reason: body.reason,
	};
}

/** GHA artifact name for one suite × provider results upload: `benchmark-results-<suite>-sandbox-<provider>`. */
export function resultsArtifactName(suite: string, provider: string): string {
	return `benchmark-results-${suite}-sandbox-${provider}`;
}

// Suite is matched non-greedily, so the name splits on the FIRST `-sandbox-` (suite names never
// contain `-sandbox-`). One regex, reused by `.matching` (narrow) and the morph (named-group extract).
const ARTIFACT_RE = /^benchmark-results-(?<suite>.+?)-sandbox-(?<provider>.+)$/;
const artifactName = type("string")
	.matching(ARTIFACT_RE.source)
	.pipe((name) => {
		// `.matching` already proved the pattern (with both named groups) matched, so `groups` is
		// always present; the `?? ""` only satisfies the type-checker for the unreachable miss.
		const groups = name.match(ARTIFACT_RE)?.groups;
		return { suite: groups?.suite ?? "", provider: groups?.provider ?? "" };
	});

/** Inverse of {@link resultsArtifactName}; undefined when the name doesn't match the contract. */
export function parseResultsArtifactName(
	name: string,
): { suite: string; provider: string } | undefined {
	const out = artifactName(name);
	return out instanceof type.errors ? undefined : out;
}
