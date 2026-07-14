// Typed parsing of a vendored PTS profile (`test-definition.xml` + `results-definition.xml`) into a
// {@link PtsProfile} the catalog generator maps onto `MetricDef[]`. Mirrors the composite parser in
// `@sandbox-benchmarks/results` (`lib/pts.ts`): the XML builder stays "dumb" — entity-decoded string
// text, no number/boolean coercion — and forces the repeatable nodes to arrays so a single-option
// profile doesn't collapse them to objects. Undeclared XML fields (TimesToRun, License, …) are
// tolerated; we declare only what the field map (./generate.ts) and synthesis read.
import { CompactBuilderFactory } from "@nodable/compact-builder";
import XMLParser, { type X2jOptions } from "@nodable/flexible-xml-parser";
import { type } from "arktype";

// Force `..Option`/`..Entry`/`..ResultsParser` to arrays (a profile may have one or many of each) and
// entity-decode text only. CompactBuilderFactory extends BaseOutputBuilderFactory at runtime, but
// compact-builder@1.0.9's types declare `implements OutputBuilderFactory` and omit `resetValueParsers`
// — a types-only skew bridged by the same cast `lib/pts.ts` carries; do not "clean it up" by aligning
// compact-builder (the supply-chain gate pins it at 1.0.9).
const outputBuilder = new CompactBuilderFactory({
	tags: { valueParsers: ["entity"] },
	alwaysArray: ["..Option", "..Entry", "..ResultsParser"],
}) as unknown as X2jOptions["OutputBuilder"];
const parser = new XMLParser({ OutputBuilder: outputBuilder });

/** One `<Option>/<Menu>/<Entry>`: a selectable benchmark argument value. `Message` is advisory. */
export const entrySchema = type({ Name: "string", Value: "string", "Message?": "string" });
export type PtsEntry = typeof entrySchema.infer;

/** One `<TestSettings>/<Option>`: a tunable axis (e.g. Resolution) with its menu of `<Entry>` values. */
export const optionSchema = type({
	DisplayName: "string",
	"Identifier?": "string",
	"ArgumentPrefix?": "string",
	// Optional: PTS's virtual axes (fio's `auto-disk-mount-points` Disk Target) ship NO <Menu> in the
	// profile XML — the runtime expands the entries from the machine. The synthesizer substitutes the
	// deterministic runtime default for the identifiers it supports and throws on any other menu-less
	// option, so an unhandled virtual axis fails generation instead of silently dropping every metric.
	"Menu?": { Entry: entrySchema.array() },
});
export type PtsOption = typeof optionSchema.infer;

/** `<TestInformation>`: the human-facing blurb plus the post-transform result scale and direction. */
export const testInformationSchema = type({
	// Tightened to `>= 1`: these feed MetricDef.label/description/unit, all of which metricDefSchema
	// requires non-empty. Failing here turns an empty `<Description/>` into a clear "invalid
	// test-definition.xml" at generation time instead of a late metricDefSchema violation at load.
	Title: "string >= 1",
	"SubTitle?": "string",
	Description: "string >= 1",
	// Post-transform unit (matches the numeric transforms in results-definition), not the raw template.
	// Optional: fio declares NO profile-level scale — each <ResultsParser> carries its own
	// <ResultScale> (MB/s vs IOPS from one run). ./generate.ts requires one of the two per metric.
	"ResultScale?": "string >= 1",
	// `HIB`/`LIB`; may be absent (PTS defaults apply) — ./generate.ts guards rather than assuming.
	"Proportion?": "string",
});
export type PtsTestInformation = typeof testInformationSchema.infer;

/** `<TestProfile>`: provenance metadata; `TestType` seeds the dimension default, `ProjectURL` sourceUrl. */
export const testProfileSchema = type({
	"Version?": "string",
	"TestType?": "string",
	"ProjectURL?": "string",
});
export type PtsTestProfile = typeof testProfileSchema.infer;

/** One `<ResultsParser>`: how PTS scrapes a value, and the per-result description modifiers we invert. */
export const resultsParserSchema = type({
	"OutputTemplate?": "string",
	"LineHint?": "string",
	"MatchToTestArguments?": "string",
	"ArgumentsDescription?": "string",
	"AppendToArgumentsDescription?": "string",
	"DivideResultBy?": "string",
	"MultiplyResultBy?": "string",
	"StripResultPostfix?": "string",
	// Per-parser scale/direction overrides (fio: bandwidth and IOPS parsers on one profile). When
	// present they win over the profile-level <TestInformation> values for the metrics they produce.
	// Both `>= 1`: an empty <ResultProportion/> would otherwise parse to "" and split the consumers —
	// the synthesizer's ??-based agreement check treats "" as a declared direction while the
	// truthiness-based emission drops it (spurious aborts, or a silently swallowed invalid override).
	"ResultScale?": "string >= 1",
	"ResultProportion?": "string >= 1",
});
export type PtsResultsParser = typeof resultsParserSchema.infer;

const testDefinitionSchema = type({
	PhoronixTestSuite: {
		TestInformation: testInformationSchema,
		TestProfile: testProfileSchema,
		// `Option` is optional: a profile may carry a <TestSettings> with only a <Default> (fixed
		// arguments, no tunable menu) — a single-result profile, like one with no <TestSettings> at all.
		// Both collapse to one description-less wildcard (settings: [] below).
		"TestSettings?": { "Option?": optionSchema.array() },
	},
});

const resultsDefinitionSchema = type({
	PhoronixTestSuite: { "ResultsParser?": resultsParserSchema.array() },
});

/** A vendored profile, fully parsed: its dir (the version pin) plus the nodes the generator reads. */
export interface PtsProfile {
	/**
	 * The profile's source repo segment — the prefix of the runtime `<Result><Identifier>` and thus of
	 * `pts.test`: `pts` for upstream phoronix profiles, `local` for repo-local ones (PTS reports
	 * `local/hardlink-1.0.0`). Derived from the vendored layout (a profile under `pts-profiles/<repo>/…`
	 * carries that `<repo>`; a flat `pts-profiles/<name>-<ver>` defaults to `pts`).
	 */
	readonly repo: string;
	/** The `<name>-<ver>` directory name — the version pin and the source of `pts.test`. */
	readonly dir: string;
	readonly info: PtsTestInformation;
	readonly profile: PtsTestProfile;
	/** `<TestSettings>/<Option>` axes; empty for single-metric profiles (no option matrix). */
	readonly settings: readonly PtsOption[];
	/** `<ResultsParser>` entries from results-definition.xml; empty when none is vendored. */
	readonly parsers: readonly PtsResultsParser[];
}

function assertValid<T>(out: T | type.errors, what: string): T {
	if (out instanceof type.errors) throw new Error(`invalid ${what}: ${out.summary}`);
	return out;
}

/**
 * Parse one vendored profile. `repo` is the source segment (`pts` upstream, `local` for repo-local) the
 * generator uses as the `pts.test` prefix. `resultsXml` may be empty when no results-definition.xml is
 * vendored.
 */
export function parseProfile(
	repo: string,
	dir: string,
	testXml: string,
	resultsXml: string,
): PtsProfile {
	const test = assertValid(
		testDefinitionSchema(parser.parse(testXml)),
		`${dir}/test-definition.xml`,
	);
	const parsers = resultsXml.trim()
		? (assertValid(
				resultsDefinitionSchema(parser.parse(resultsXml)),
				`${dir}/results-definition.xml`,
			).PhoronixTestSuite.ResultsParser ?? [])
		: [];
	return {
		repo,
		dir,
		info: test.PhoronixTestSuite.TestInformation,
		profile: test.PhoronixTestSuite.TestProfile,
		settings: test.PhoronixTestSuite.TestSettings?.Option ?? [],
		parsers,
	};
}
