// Predict, deterministically and offline, the per-`<Result>` `<Description>` strings PTS emits at
// runtime for a profile — the disambiguator the runtime maps a result onto the catalog by, so this
// must byte-match (separators, `" - "` joins). The recipe (design §3.3):
//   1. Cartesian product of every `<TestSettings>/<Option>/<Menu>/<Entry>` (source order). A
//      menu-less virtual axis (fio's `auto-disk-mount-points`) contributes its deterministic runtime
//      default entry — see {@link virtualEntries}.
//   2. Candidate parsers per combination = each `<ResultsParser>` with no `MatchToTestArguments`
//      (always applies) or whose `MatchToTestArguments` substring appears in the combination's
//      `<Entry>/<Value>` set (the inverse link, e.g. john `--format=bcrypt`).
//   3. Base = `"{DisplayName}: {Entry/Name}"` per option, joined with `" - "`.
//   4. results-definition modifiers: `ArgumentsDescription` *replaces* the base; a single
//      `AppendToArgumentsDescription` *suffixes* it (two parsers → two metrics from one run).
// `<Entry>/<Message>` is advisory and never emitted. A profile with no options and an unmodified
// parser collapses to one description-less wildcard (`[undefined]`).
//
// Each synthesized metric also carries its parser's `<ResultScale>`/`<ResultProportion>` when
// declared: fio's four parsers scrape ONE run into TWO scales (MB/s bandwidth + IOPS) under the SAME
// description, so the scale is part of a metric's identity there. Dedup is therefore keyed on
// (description, scale) — parsers that differ only in extraction details (fio's KiB/s- and MiB/s-unit
// bandwidth variants both post as MB/s) still collapse to one metric.
import type { PtsEntry, PtsOption, PtsProfile, PtsResultsParser } from "./parse.ts";

interface Choice {
	readonly option: PtsOption;
	readonly entry: PtsEntry;
}

/** One predicted `<Result>`: its description plus any per-parser scale/direction overrides. */
export interface SynthesizedMetric {
	/** The runtime `<Description>` (`undefined` = the description-less wildcard). */
	readonly description: string | undefined;
	/** The EFFECTIVE scale: the producing parser's `<ResultScale>` if it declares one, else the profile's. */
	readonly scale?: string;
	/** The EFFECTIVE direction source: the parser's `<ResultProportion>` if it declares one, else the profile's. */
	readonly proportion?: string;
}

/** Cartesian product preserving source order; `[]` groups yield the single empty combination `[[]]`. */
export function cartesian<T>(groups: readonly (readonly T[])[]): T[][] {
	return groups.reduce<T[][]>(
		(combos, group) => combos.flatMap((combo) => group.map((item) => [...combo, item])),
		[[]],
	);
}

/**
 * The deterministic runtime entry for a menu-less axis. Two shapes land here:
 *
 *   * PTS virtual axes expanded from the machine at run time (pts_test_run_options.php): the only
 *     entry that exists on EVERY machine — and the one our producer tasks pin via PRESET_OPTIONS —
 *     is the axis's default: `auto-disk-mount-points` always lists `Default Test Directory`
 *     (value ``) first.
 *   * Free-TEXT options (iperf's Server Address / Server Port prompt for arbitrary text; the
 *     runtime `<Description>` embeds whatever was typed). Free text cannot be enumerated, so the
 *     catalogued entry is the ONE value the producer task pins via PRESET_OPTIONS — `localhost`
 *     (the network leaf's self-contained topology) and `5201` (iperf3's default port, the same
 *     leaf's pin). Exactly the fio Disk Target contract: a run pinned to any other value simply
 *     lands uncatalogued instead of silently mismapping.
 *
 * Any other menu-less identifier is machine-dependent with no stable default, so it throws rather
 * than guessing (silently enumerating a host's mount points would generate machine-dependent
 * catalog bytes and break the drift gate).
 */
function virtualEntries(option: PtsOption): readonly PtsEntry[] {
	if (option.Identifier === "auto-disk-mount-points") {
		return [{ Name: "Default Test Directory", Value: "" }];
	}
	if (option.Identifier === "server-address") {
		return [{ Name: "localhost", Value: "localhost" }];
	}
	// iperf's Server Port axis (upstream reuses the generic `positive-number` identifier for it).
	if (option.Identifier === "positive-number" && option.DisplayName === "Server Port") {
		return [{ Name: "5201", Value: "5201" }];
	}
	throw new Error(
		`option "${option.DisplayName}" has no <Menu> and no known runtime default (identifier "${option.Identifier ?? "(absent)"}") — teach virtualEntries its expansion`,
	);
}

// Parsers that apply to a combination. No `MatchToTestArguments` → always; otherwise its substring
// must appear in the combination's BUILT argument text (ArgumentPrefix + value, as PTS's own
// strpos over the run string matches it — a prefix-inclusive match like iperf's "-P 1 " never
// appears in a raw entry value). A profile with no results-definition still yields one entry per
// combination via a single implicit unmodified parser.
function candidateParsers(
	parsers: readonly PtsResultsParser[],
	argumentsText: string,
): readonly PtsResultsParser[] {
	if (parsers.length === 0) return [{}];
	const matched = parsers.filter((parser) => {
		const match = parser.MatchToTestArguments;
		return !match || argumentsText.includes(match);
	});
	// Every parser is scoped by `MatchToTestArguments` yet none matched: this combination produces no
	// description and silently contributes no metric. Usually a typo in a `MatchToTestArguments`
	// substring — warn (to stderr, so generated bytes are unaffected) rather than drop it silently.
	if (matched.length === 0) {
		console.warn(
			`synthesize: no <ResultsParser> matched arguments "${argumentsText}" — this combination yields no metric (check MatchToTestArguments)`,
		);
	}
	return matched;
}

// Apply the results-definition description modifiers to a combination's base string.
function describe(base: string, parser: PtsResultsParser): string | undefined {
	if (parser.ArgumentsDescription) return parser.ArgumentsDescription; // replaces the base entirely
	if (parser.AppendToArgumentsDescription) {
		// UNSUPPORTED SHAPE — an options-less profile (empty base) carrying an append modifier. PTS's
		// composite writer prepends " - " unconditionally, so the runtime `<Description>` would be
		// " - Total Time" while the bare-append branch below predicts "Total Time": the pin would never
		// byte-match and every result for that profile would fall to `uncatalogued`. No vendored profile
		// has this shape, so the branch is unexercised — verify against pts_test_result.php before
		// trusting it with a real profile.
		return base
			? `${base} - ${parser.AppendToArgumentsDescription}`
			: parser.AppendToArgumentsDescription;
	}
	return base || undefined; // bare base, or the description-less wildcard when there are no options
}

/**
 * The deduplicated, source-ordered predicted `<Result>`s a profile emits. Dedup is keyed on
 * (description, EFFECTIVE scale) — the parser's `<ResultScale>` falling back to the profile-level
 * one — so a parser that declares the profile's own scale explicitly still collapses with a sibling
 * that inherits it (keying on the raw parser field would emit twins that later mint the same
 * scale-suffixed id and abort generation). `JSON.stringify` is the key encoding so a description
 * containing any delimiter literal can never collide with a different (description, scale) pair.
 * Parsers that collapse onto one key must agree on their effective `<ResultProportion>`: direction
 * is part of the metric contract, and letting source order pick a winner would silently invert a
 * leaderboard ranking — so a conflict throws at generation instead.
 */
export function synthesizeResults(profile: PtsProfile): SynthesizedMetric[] {
	// An option whose <Menu> declares no <Entry> makes its cartesian group empty, collapsing the whole
	// product to `[]` — the profile would then contribute zero metrics and vanish from the catalog
	// silently. The schema permits a zero-entry <Menu>, so guard it here and surface the malformed
	// profile at generation. (Menu-LESS options take the virtualEntries path instead.)
	const emptyOption = profile.settings.find(
		(option) => option.Menu && option.Menu.Entry.length === 0,
	);
	if (emptyOption) {
		throw new Error(
			`profile ${profile.dir}: option "${emptyOption.DisplayName}" has no <Entry> values — it would drop every metric`,
		);
	}

	const combinations = cartesian(
		profile.settings.map((option) =>
			(option.Menu?.Entry ?? virtualEntries(option)).map((entry): Choice => ({ option, entry })),
		),
	);

	// key -> the effective proportion of the entry that claimed it (for the agreement check).
	const seen = new Map<string, string | undefined>();
	const results: SynthesizedMetric[] = [];
	for (const combination of combinations) {
		const base = combination
			.map(({ option, entry }) => `${option.DisplayName}: ${entry.Name}`)
			.join(" - ");
		// The argument text PTS builds for this combination: each option's ArgumentPrefix glued to
		// the entry value (a `<Value>`-less entry — iperf's TCP — contributes only its prefix, i.e.
		// nothing), space-joined, with a trailing space so a prefix-inclusive MatchToTestArguments
		// like iperf's "-P 1 " matches at the end exactly as PTS's own strpos over the run string
		// does ("-P 1 " correctly rejects "-P 10").
		const argumentsText = `${combination
			.map(({ option, entry }) => `${option.ArgumentPrefix ?? ""}${entry.Value ?? ""}`)
			.join(" ")} `;
		for (const parser of candidateParsers(profile.parsers, argumentsText)) {
			const description = describe(base, parser);
			const effectiveScale = parser.ResultScale ?? profile.info.ResultScale;
			const effectiveProportion = parser.ResultProportion ?? profile.info.Proportion;
			const key = JSON.stringify([description ?? null, effectiveScale ?? null]);
			if (seen.has(key)) {
				if (seen.get(key) !== effectiveProportion) {
					throw new Error(
						`profile ${profile.dir}: parsers collapsing onto "${description ?? "(wildcard)"}" (${effectiveScale ?? "no scale"}) disagree on direction ("${seen.get(key) ?? "absent"}" vs "${effectiveProportion ?? "absent"}") — the metric's direction would depend on parser order`,
					);
				}
				continue;
			}
			seen.set(key, effectiveProportion);
			// EFFECTIVE values, not the raw parser fields: the parser-over-profile precedence is already
			// resolved above for the dedup key, and emitting the raw fields forced every consumer to
			// re-derive the same `?? profile.info.*` fallback — three spellings of one rule, free to
			// drift apart.
			results.push({
				description,
				...(effectiveScale ? { scale: effectiveScale } : {}),
				...(effectiveProportion ? { proportion: effectiveProportion } : {}),
			});
		}
	}
	return results;
}
