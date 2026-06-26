/**
 * The raw-file naming contract — the ONE home for how files in a Run's curated raw tree
 * (`data/raw/<runId>/<provider>/<suite>/`) are named, and how skip markers are shaped. The in-sandbox
 * producer and the harness collector (writers) and the results extractor (the single reader) all
 * route through this module, so a filename's spelling can never drift between them.
 *
 * Layout: a Run nests one subdirectory per provider, and under it one subdirectory per suite that ran
 * (the harness pulls each suite's output into `<provider>/<suite>/`). Tagging the tree by suite lets
 * the normalizer attribute every result to the suite that produced it and reject — per suite — any
 * catalogued metric emitted on a Dimension that suite does not declare (the runtime half of the
 * suite↔dimension↔metric contract; see suite-contract.ts). The normalizer still accepts the older
 * un-nested `<provider>/<file>` layout (results directly under the provider dir) for back-compatibility.
 *
 * Parse, don't validate: the filename predicates and the skip-marker/artifact-name readers are arktype
 * Types — `.matching` regex narrowing plus `.pipe` morphs — so a malformed marker or off-contract name
 * can never produce a half-resolved value. A morph either yields a fully-formed result or `type.errors`.
 *
 * This slice covers the PTS result files and skip markers the node-web-tooling path needs. The
 * lifecycle timing files (`<name>_ms.txt`, `<name>-exit-code.txt`) land with the lifecycle path.
 */
import { type } from "arktype";
import type { SkipMarker } from "./run.ts";

const SKIP_SUFFIX = "--skipped.json";

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

const ptsForensicsFileName = type("string").matching("^pts_.*--forensics\\.tar\\.gz$");
export const isPtsForensicsFile = (filename: string): boolean =>
	ptsForensicsFileName.allows(filename);

const skipMarkerFileName = type("string").matching("--skipped\\.json$");
export const isSkipMarkerFile = (filename: string): boolean => skipMarkerFileName.allows(filename);

// Name builders (the writer side of the contract).

/** `<name>--skipped.json` — the benchmark was deliberately not run. */
export function skipMarkerFile(name: string): string {
	return `${name}${SKIP_SUFFIX}`;
}

/** Composite name for harness-level (whole suite × provider) files. */
export function sandboxResultName(provider: string, suite: string): string {
	return `sandbox-${provider}-${suite}`;
}

/** `sandbox-<provider>-<suite>--skipped.json` — the whole suite never ran. */
export function sandboxSkipMarkerFile(provider: string, suite: string): string {
	return skipMarkerFile(sandboxResultName(provider, suite));
}

/**
 * Serialized harness skip marker — the exact bytes the harness writes into a `*--skipped.json`
 * (pretty-printed, trailing newline, fixed key order) so the producer side has one source of truth.
 */
export function harnessSkipMarkerJson(provider: string, suite: string, reason: string): string {
	return `${JSON.stringify({ provider, suite, skipped: true, reason }, null, 2)}\n`;
}

/**
 * Suite re-derived from a `sandbox-<provider>-<suite>--skipped.json` filename — the fallback when a
 * marker body carries no suite field. Undefined for filenames that are not skip markers, and for an
 * empty suite portion (e.g. `sandbox-daytona---skipped.json`), so the caller's `?? filename` fallback
 * still fires instead of yielding an empty suite name.
 */
export function suiteFromSkipMarkerFilename(
	filename: string,
	providerId: string,
): string | undefined {
	if (!isSkipMarkerFile(filename)) return undefined;
	let base = filename.slice(0, -SKIP_SUFFIX.length);
	const prefix = `sandbox-${providerId}-`;
	if (base.startsWith(prefix)) base = base.slice(prefix.length);
	return base || undefined;
}

/**
 * The two legacy on-disk skip-marker body shapes, unified at the type boundary. BOTH must stay
 * accepted — the committed raw tree is the source of truth and is re-normalized retroactively, so
 * dropping either would silently rewrite history:
 *
 *   1. Harness shape:     `{ provider, suite, skipped: true, reason }`
 *   2. bash skip_result:  `{ schema_version, benchmark, skipped: true, skip_reason }`
 *
 * `skipped: "true"` is a literal trap: a body with `skipped: false` (or no `skipped`) fails the morph,
 * so the old `!json.skipped` check disappears. The morph normalizes the divergent field spellings into
 * `{ suite?, reason }`; the filename fallback for `suite` is applied by {@link parseSkipMarker}.
 */
const skipMarkerBody = type({
	skipped: "true",
	"suite?": "string",
	"benchmark?": "string",
	"reason?": "string",
	"skip_reason?": "string",
}).pipe((d) => ({
	// `|| undefined` (not `??`) so an empty-string `suite`/`benchmark` is treated as absent — suite is
	// a downstream identifier, and an explicit `""` must fall through to the filename derivation in
	// `parseSkipMarker`, exactly as a missing field does (mirrors `suiteFromSkipMarkerFilename`).
	suite: d.suite || d.benchmark || undefined,
	reason: d.reason ?? d.skip_reason ?? "unknown",
}));

/**
 * Parse a `*--skipped.json` body into a {@link SkipMarker}. Guards the filename naming contract first
 * (a non-marker filename is never a skip marker, even if its JSON happens to carry `skipped: true`),
 * then morphs the body and re-derives the suite from the filename when the body omits it.
 */
export function parseSkipMarker(
	filename: string,
	data: unknown,
	providerId: string,
): SkipMarker | undefined {
	if (!isSkipMarkerFile(filename)) return undefined;
	const body = skipMarkerBody(data);
	if (body instanceof type.errors) return undefined;
	return {
		suite: body.suite ?? suiteFromSkipMarkerFilename(filename, providerId) ?? filename,
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
