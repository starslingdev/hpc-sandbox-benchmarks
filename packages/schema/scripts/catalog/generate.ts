// The PTS catalog generator core: a parsed {@link PtsProfile} → draft `MetricDef[]`, per the design
// doc field-map (§3.2). The output is a *draft* — `headline:false`, verbose `label`, a best-effort
// `dimension` — refined by the hand-authored override map (pts-overrides.ts) at import time; the
// generator owns the XML-derived fields (`id`, `unit`, `direction`, `pts`) and id-uniqueness.
//
// Multi-result option matrices are predicted by {@link synthesizeResults} (./synthesize.ts): the
// cartesian product of `<TestSettings>` × results-parser inverse matching, reproducing each runtime
// `<Result>`'s `<Description>` (plus any per-parser scale/direction override). A single-metric
// profile collapses to one description-less wildcard.
import { type } from "arktype";
import type { Dimension, Direction, MetricDef } from "../../src/metrics.ts";
import { directionSchema } from "../../src/metrics.ts";
import type { PtsProfile } from "./parse.ts";
import { synthesizeResults } from "./synthesize.ts";

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

/**
 * `<Proportion>` → Direction, with a per-parser `<ResultProportion>` override taking precedence.
 * Guards a missing/invalid value rather than assuming `HIB` (§7): fio declares NO profile-level
 * Proportion at all — each of its parsers carries `ResultProportion` — so a metric whose parser also
 * declares none has no direction anywhere and must be curated, not defaulted.
 */
export function directionFor(profile: PtsProfile, parserProportion?: string): Direction {
	const source = parserProportion ?? profile.info.Proportion;
	const out = directionSchema(source);
	if (out instanceof type.errors) {
		throw new Error(
			`profile ${profile.dir}: missing/invalid <Proportion>/<ResultProportion> ("${source ?? "absent"}") — curate the direction explicitly`,
		);
	}
	return out;
}

/** One profile → its draft `MetricDef[]` (one per synthesized description). */
export function generateProfile(profile: PtsProfile): MetricDef[] {
	const name = versionless(profile.dir);
	// `pts.test` = `<repo>/<name>` — the versionless runtime `<Identifier>` join key, whose prefix is the
	// profile's source segment (`pts` upstream, `local` for repo-local). Guard: an empty name routes
	// every metric to uncatalogued, and a name that already embeds a slash would double the prefix.
	if (!name || name.includes("/")) {
		throw new Error(`invalid versionless profile dir "${profile.dir}" → name "${name}"`);
	}
	if (!profile.repo || profile.repo.includes("/")) {
		throw new Error(`invalid profile repo segment "${profile.repo}" for dir "${profile.dir}"`);
	}
	const ptsTest = `${profile.repo}/${name}`;

	const base = slug(name);
	const dimension = dimensionForTestType(profile.profile.TestType);
	// `unit` is `<ResultScale>`, which is already the post-transform scale: the results-definition
	// numeric transforms (DivideResultBy/MultiplyResultBy/StripResultPostfix) rescale the runtime
	// value, not the unit, so they're deliberately not applied here (c-ray's template reads
	// "milliseconds" but ResultScale — and thus the unit — is "Seconds").
	const { Title, SubTitle, Description, ResultScale } = profile.info;
	const sourceUrl = profile.profile.ProjectURL;

	const synthesized = synthesizeResults(profile);

	// Descriptions that appear on MORE than one scale (fio: bandwidth + IOPS from one run). Those
	// metrics get a scale-suffixed id and a `pts.scale` pin so the runtime mapping can tell the twin
	// `<Result>`s apart; a description unique to one scale keeps today's id and description-only pin
	// (byte-stability for every existing profile). Keyed with JSON.stringify so a crafted description
	// can't collide with the wildcard sentinel.
	const scalesPerDescription = new Map<string, number>();
	for (const s of synthesized) {
		const key = JSON.stringify(s.description ?? null);
		scalesPerDescription.set(key, (scalesPerDescription.get(key) ?? 0) + 1);
	}

	const defs = synthesized.map((s): MetricDef => {
		const { description } = s;
		const unit = s.scale ?? ResultScale;
		if (!unit) {
			throw new Error(
				`profile ${profile.dir}: no <ResultScale> in TestInformation and none on the parser for "${description ?? "(wildcard)"}" — the metric has no unit`,
			);
		}
		const ambiguous = (scalesPerDescription.get(JSON.stringify(description ?? null)) ?? 0) > 1;
		if (ambiguous && description === undefined) {
			// Two wildcard entries for one test would violate the catalog's at-most-one-wildcard
			// invariant, and the runtime has no description to tell them apart anyway.
			throw new Error(
				`profile ${profile.dir}: multiple result scales on the description-less wildcard — vendor a results-definition that disambiguates the descriptions`,
			);
		}
		return {
			id: ambiguous
				? `${base}_${slug(description ?? unit)}_${slug(unit)}`
				: `${base}_${slug(description ?? unit)}`,
			dimension,
			unit,
			direction: directionFor(profile, s.proportion),
			headline: false,
			label: description
				? ambiguous
					? `${Title} - ${description} (${unit})`
					: `${Title} - ${description}`
				: SubTitle
					? `${Title} - ${SubTitle}`
					: Title,
			description: Description,
			pts:
				description === undefined
					? { test: ptsTest }
					: ambiguous
						? { test: ptsTest, description, scale: unit }
						: { test: ptsTest, description },
			...(sourceUrl ? { sourceUrl } : {}),
		};
	});

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
