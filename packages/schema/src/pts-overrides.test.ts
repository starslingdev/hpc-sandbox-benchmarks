// Validates the hand-authored curation against the committed generator output, without wiring either
// into METRIC_CATALOG. Catches the two ways the override map silently rots: a key that no longer
// matches a generated id (a typo or a removed metric), and a dimension left with zero or multiple
// headlines after the merge (headlineMetric throws on zero; multiple is ambiguous on the leaderboard).
import { describe, expect, test } from "bun:test";
import { type } from "arktype";
import { metricDefSchema } from "./metrics.ts";
import { ptsGenerated } from "./pts-generated.ts";
import { ptsOverrides } from "./pts-overrides.ts";

const merged = ptsGenerated.map((def) => ({ ...def, ...ptsOverrides[def.id] }));

describe("ptsOverrides", () => {
	test("every override key matches a generated metric id", () => {
		const ids = new Set(ptsGenerated.map((def) => def.id));
		expect(Object.keys(ptsOverrides).filter((id) => !ids.has(id))).toEqual([]);
	});

	test("merged entries stay schema-valid", () => {
		// not.toBeInstanceOf prints the actual arktype error summary on failure, unlike toBe(false).
		expect(metricDefSchema.array()(merged)).not.toBeInstanceOf(type.errors);
	});

	test("each populated dimension has exactly one headline after merge", () => {
		const headlinesByDimension = new Map<string, number>();
		for (const def of merged) {
			if (def.headline)
				headlinesByDimension.set(def.dimension, (headlinesByDimension.get(def.dimension) ?? 0) + 1);
		}
		const dimensions = new Set(merged.map((def) => def.dimension));
		for (const dimension of dimensions) {
			expect([dimension, headlinesByDimension.get(dimension) ?? 0]).toEqual([dimension, 1]);
		}
	});
});
