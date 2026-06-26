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
	Menu: { Entry: entrySchema.array() },
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
	ResultScale: "string >= 1",
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

/** Parse one vendored profile. `resultsXml` may be empty when no results-definition.xml is vendored. */
export function parseProfile(dir: string, testXml: string, resultsXml: string): PtsProfile {
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
		dir,
		info: test.PhoronixTestSuite.TestInformation,
		profile: test.PhoronixTestSuite.TestProfile,
		settings: test.PhoronixTestSuite.TestSettings?.Option ?? [],
		parsers,
	};
}
