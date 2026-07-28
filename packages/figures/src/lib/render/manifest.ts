/**
 * The figure manifest — written by the renderer, read back by the gate in a different process (and
 * on a different machine in CI). That is a boundary, so it is parsed rather than trusted: ADR-0001,
 * same treatment as `packages/templates/src/manifest.ts` gives the toolchain manifest.
 *
 * The manifest is what ties a figure to the run it came from. The figures live at stable, run-agnostic
 * paths so the tree does not accumulate a directory per run — which means the files themselves carry
 * no evidence of their provenance, and a half-landed regeneration could leave `cpu.svg` from run A
 * beside a `LEADERBOARD.md` describing run B. The gate cross-checks `runId` here against the run id
 * in the Markdown header, which is a text comparison needing no rasterizer.
 */
import { type } from "arktype";

const sha256 = "/^[0-9a-f]{64}$/";

export const figureManifestSchema = type({
	/** The dataset run these figures were rendered from. */
	runId: "string > 0",
	/** The commit the run was produced at, mirrored from the Run document. */
	sha: "string > 0",
	/** Read from the Run document, never from the clock — the render must stay deterministic. */
	generatedAt: "string > 0",
	/** Identity of every bundled face, so a reflow caused by a font swap is attributable. */
	fonts: type({ file: "string > 0", sha256 }).array(),
	files: type({
		path: "string > 0",
		dimension: "string > 0",
		metricId: "string > 0",
		bytes: "number.integer >= 0",
		sha256,
	}).array(),
});

export type FigureManifest = typeof figureManifestSchema.infer;

/** Parse an untrusted manifest, failing loudly with arktype's summary. */
export function parseFigureManifest(input: unknown): FigureManifest {
	const out = figureManifestSchema(input);
	if (out instanceof type.errors) {
		throw new Error(`Invalid figure manifest: ${out.summary}`);
	}
	return out;
}
