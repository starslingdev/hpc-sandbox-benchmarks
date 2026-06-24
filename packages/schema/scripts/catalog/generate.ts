// The PTS catalog generator core: a parsed {@link PtsProfile} → draft `MetricDef[]`, per the design
// doc field-map (§3.2). The output is a *draft* — `headline:false`, verbose `label`, a best-effort
// `dimension` — refined by the hand-authored override map (pts-overrides.ts) at import time; the
// generator owns the XML-derived fields (`id`, `unit`, `direction`, `pts`) and id-uniqueness.
//
// Multi-result option matrices are handled by {@link synthesizeDescriptions}, a seam this core leaves
// at the single-metric default (`[undefined]` → one description-less wildcard). The option-matrix
// synthesis (cartesian product of `<TestSettings>`, results-parser inverse matching) fills that seam.
import { type } from "arktype";
import type { Dimension, Direction, MetricDef } from "../../src/metrics.ts";
import { directionSchema } from "../../src/metrics.ts";
import type { PtsProfile } from "./parse.ts";

/** Strip a trailing version: "node-web-tooling-1.0.1" → "node-web-tooling" (mirrors `versionlessTest`). */
export function versionless(dir: string): string {
	return dir.replace(/-\d+(\.\d+)*$/, "");
}

/**
 * Lower-case slug for stable metric ids: non-alphanumeric runs collapse to `_`, and `/` becomes
 * `_per_` so units read naturally (`runs/s` → `runs_per_s`, matching the canonical hand-authored id).
 */
export function slug(text: string): string {
	return text
		.toLowerCase()
		.replace(/\//g, "_per_")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

// TestType → Dimension: a best-effort default the curation layer (pts-overrides.ts) can override.
// Throw on an unmapped type so a newly vendored profile forces an explicit decision rather than
// silently landing on a wrong dimension.
const TEST_TYPE_DIMENSION: Record<string, Dimension> = {
	Processor: "cpu",
	Disk: "disk",
	Memory: "memory",
	Network: "network",
	System: "system",
};

export function dimensionForTestType(testType: string | undefined): Dimension {
	const dimension = testType ? TEST_TYPE_DIMENSION[testType] : undefined;
	if (!dimension) {
		throw new Error(
			`no dimension mapping for TestType "${testType ?? "(absent)"}" — add one to TEST_TYPE_DIMENSION`,
		);
	}
	return dimension;
}

/** `<Proportion>` → Direction. Guards a missing/invalid value rather than assuming `HIB` (§7). */
export function directionFor(profile: PtsProfile): Direction {
	const out = directionSchema(profile.info.Proportion);
	if (out instanceof type.errors) {
		throw new Error(
			`profile ${profile.dir}: missing/invalid <Proportion> ("${profile.info.Proportion ?? "absent"}") — curate the direction explicitly`,
		);
	}
	return out;
}

/**
 * The per-`<Result>` `<Description>` strings a profile emits at runtime, in deterministic order — the
 * disambiguator the runtime maps a result onto the catalog by. This core handles the single-metric
 * case only: one description-less wildcard. Option-matrix synthesis replaces this body; the signature
 * is the contract the rest of the generator builds on.
 */
export function synthesizeDescriptions(_profile: PtsProfile): (string | undefined)[] {
	return [undefined];
}

/** One profile → its draft `MetricDef[]` (one per synthesized description). */
export function generateProfile(profile: PtsProfile): MetricDef[] {
	const name = versionless(profile.dir);
	// `name` becomes the `pts/<name>` runtime join key: an empty slug routes every metric to
	// uncatalogued, and one already embedding `pts/` would yield `pts/pts/…`. Guard both at source.
	if (!name || name.startsWith("pts/")) {
		throw new Error(`invalid versionless profile dir "${profile.dir}" → name "${name}"`);
	}
	const ptsTest = `pts/${name}`;

	const base = slug(name);
	const dimension = dimensionForTestType(profile.profile.TestType);
	const direction = directionFor(profile);
	const { Title, SubTitle, Description, ResultScale } = profile.info;
	const sourceUrl = profile.profile.ProjectURL;

	const defs = synthesizeDescriptions(profile).map(
		(description): MetricDef => ({
			id: `${base}_${slug(description ?? ResultScale)}`,
			dimension,
			unit: ResultScale,
			direction,
			headline: false,
			label: description
				? `${Title} - ${description}`
				: SubTitle
					? `${Title} - ${SubTitle}`
					: Title,
			description: Description,
			pts: description === undefined ? { test: ptsTest } : { test: ptsTest, description },
			...(sourceUrl ? { sourceUrl } : {}),
		}),
	);

	if (new Set(defs.map((d) => d.id)).size !== defs.length) {
		throw new Error(`profile ${profile.dir}: generated duplicate metric ids`);
	}
	return defs;
}

/** All profiles → the merged draft catalog, stable-sorted by id for deterministic serialization. */
export function generateCatalog(profiles: readonly PtsProfile[]): MetricDef[] {
	const defs = profiles.flatMap(generateProfile);
	// `generateProfile` only guards ids *within* one profile; two profiles can still normalize to the
	// same id. Catch cross-profile collisions here rather than letting a later wiring overwrite by id.
	const seen = new Set<string>();
	const dupes = new Set<string>();
	for (const def of defs) {
		if (seen.has(def.id)) dupes.add(def.id);
		seen.add(def.id);
	}
	if (dupes.size > 0) {
		throw new Error(
			`generated duplicate metric ids across profiles: ${[...dupes].sort().join(", ")}`,
		);
	}
	return defs.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
