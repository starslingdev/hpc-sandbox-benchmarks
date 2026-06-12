// Private implementation detail of @sandbox-benchmarks/schema.
// Never import this module across a package boundary — go through the package's public index.
import { type } from "arktype";

/**
 * Runtime schema for a single raw benchmark run, validated with arktype.
 * Stub shape — real fields land in the schema implementation pass.
 */
export const rawRunSchema = type({
  provider: "string",
  operation: "string",
  // A real benchmarked operation always takes measurable wall-clock time; a 0ms (or negative)
  // duration is a timing error or dropped observation, so reject it at the boundary.
  durationMs: "number>0",
});
