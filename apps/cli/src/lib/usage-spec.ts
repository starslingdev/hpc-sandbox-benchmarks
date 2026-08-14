/**
 * `bench-local`'s interface, declared ONCE and rendered three ways: the `--help` body a human reads,
 * the [usage](https://usage.jdx.dev) spec `--usage-spec` prints, and the `#USAGE` header block the
 * mise task carries so `mise run bench-local --suites …` parses and completes.
 *
 * mise's two documented options for a file task are declaring each flag inline with `#USAGE flag …`
 * headers, or MOUNTING a spec the wrapped CLI generates (`#USAGE mount "<command>"`). Mounting is the
 * better shape on paper — one owner, nothing to drift — but it does not work: on mise 2026.8.5 a
 * mounted spec contributes only `name` and `bin`, and every `flag` node is dropped, so
 * `mise run bench-local --help` reports "This task does not accept any arguments" and no flag
 * completes. Inline headers work completely.
 *
 * So the headers are inline AND generated: {@link benchLocalMiseHeaders} renders them from this
 * table, and a drift gate in ./usage-spec.test.ts fails if the committed task file disagrees. That is
 * the repo's standard answer to a generated artifact (see the PTS catalog drift gate, ADR-0003) and
 * it keeps the single-source-of-truth property that mounting was supposed to buy.
 *
 * The `--suites` choices come from `SUITE_NAMES`, so registering a tenth suite cannot leave shell
 * completion offering nine.
 */
import { DEFAULT_LOCAL_LABEL, SUITE_NAMES } from "@sandbox-benchmarks/schema";

/** The flag that prints the usage spec — an action, dispatched rather than merely recognised. */
export const USAGE_SPEC_FLAG = "--usage-spec";

/** The token `--suites` accepts for "every registered suite". */
export const ALL_SUITES_TOKEN = "all";

/** The default suite when `--suites` is absent: the cpu dimension, and the cheapest PTS suite to try. */
export const DEFAULT_SUITE = "cpu-node";

interface FlagSpec {
	/** Long flag, e.g. `--suites`. */
	readonly flag: string;
	/** value placeholder, e.g. `suites`. Absent for a boolean flag. */
	readonly value?: string;
	/** One line, shared by `--help` and the spec's `help=`. */
	readonly help: string;
	/** Shown in `--help` and emitted as the spec's `default=`. */
	readonly default?: string;
	/** Completion choices; also the documented vocabulary. */
	readonly choices?: readonly string[];
	/** Extra `--help` lines that would be too long for a one-line `help=`. */
	readonly notes?: readonly string[];
}

/** The interface itself. Everything below renders from this. */
export const BENCH_LOCAL_FLAGS: readonly FlagSpec[] = [
	{
		flag: "--suites",
		value: "suites",
		help: `Suites to run, in order, or "${ALL_SUITES_TOKEN}"`,
		default: DEFAULT_SUITE,
		choices: [ALL_SUITES_TOKEN, ...SUITE_NAMES],
		notes: ["They run one at a time: concurrent suites would contend for the same cores."],
	},
	{
		flag: "--replicates",
		value: "indices",
		help: "Repeat the whole selection once per index, one shard each",
		default: "0",
		notes: [
			'Accepts "0,1,2" or "[0,1,2]". The shards are aggregated into one Run carrying',
			"per-metric replicates[], exactly as the CI matrix produces. On ONE machine these",
			"are repeats over TIME, not between-machine replicates — see docs/methodology.md.",
		],
	},
	{
		flag: "--as",
		value: "label",
		help: "providerId written into the Run",
		default: DEFAULT_LOCAL_LABEL,
		notes: ["Must match ^local(-[a-z0-9][a-z0-9-]*)?$ — it names a directory and a marker file."],
	},
	{ flag: "--run-id", value: "id", help: "Run identifier (default: local-<epoch-ms>)" },
	{ flag: "--out", value: "file", help: "Write the Run JSON here instead of stdout" },
	{
		flag: "--promote",
		help: "Publish into the local dataset (gate: >=1 validated provider)",
		notes: ["Never touches data/dataset/, which only the CI matrix publishes to."],
	},
	{
		flag: "--dataset",
		value: "dir",
		help: "Local dataset root for --promote",
		default: "data/local",
	},
	{
		flag: "--keep-going",
		help: "Record an unmet precondition or failed suite as a gap and continue",
	},
	{ flag: USAGE_SPEC_FLAG, help: "Print this command's usage spec as KDL" },
];

/**
 * The bin's vocabulary for `handleDiscovery`, split by arity from the one table above — so a flag
 * added there is recognised without a second list to remember.
 */
export const BENCH_LOCAL_VALUE_FLAGS: readonly string[] = BENCH_LOCAL_FLAGS.filter(
	(spec) => spec.value !== undefined,
).map((spec) => spec.flag);

/** Boolean flags, minus `--usage-spec`, which the bin registers as a discovery ACTION instead. */
export const BENCH_LOCAL_BOOLEAN_FLAGS: readonly string[] = BENCH_LOCAL_FLAGS.filter(
	(spec) => spec.value === undefined && spec.flag !== USAGE_SPEC_FLAG,
).map((spec) => spec.flag);

/** Escape a value for a KDL double-quoted string. */
function kdl(value: string): string {
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * The usage spec as standalone KDL, printed by `--usage-spec`.
 *
 * Not consumed by the mise task (see the module header: mounting drops flag nodes on 2026.8.5); kept
 * because it is the machine-readable form of this interface for anything else that wants it, and
 * because it is what the header block below is checked against.
 */
export function benchLocalUsageSpec(): string {
	const lines = [
		'name "bench-local"',
		'bin "bench-local"',
		`about ${kdl("Run one or more benchmark suites on this machine and emit the dataset Run JSON")}`,
	];
	for (const spec of BENCH_LOCAL_FLAGS) {
		const name = spec.value ? `${spec.flag} <${spec.value}>` : spec.flag;
		const parts = [`flag ${kdl(name)}`, `help=${kdl(spec.help)}`];
		if (spec.default !== undefined) parts.push(`default=${kdl(spec.default)}`);
		if (spec.choices) {
			lines.push(`${parts.join(" ")} {`);
			lines.push(`    choices ${spec.choices.map(kdl).join(" ")}`);
			lines.push("}");
		} else {
			lines.push(parts.join(" "));
		}
	}
	return `${lines.join("\n")}\n`;
}

/**
 * The `#USAGE` header block for `.mise/tasks/bench-local`, from the same table.
 *
 * Inline rather than mounted because mounting drops every flag node (module header). Generated rather
 * than hand-written because a hand-written copy drifts SILENTLY — a stale header block still parses,
 * it just stops offering the new flag — so ./usage-spec.test.ts asserts the committed task file
 * matches this exactly, and prints this block when it does not.
 *
 * `choices` is deliberately omitted from the headers: mise's inline grammar takes it as a child
 * block, and a multi-line child inside `#USAGE` comments is fragile to reproduce byte-for-byte. The
 * suite vocabulary is still enforced where it matters — `localRunRequestSchema` rejects an
 * unregistered name — so this costs completion candidates, never correctness.
 */
export function benchLocalMiseHeaders(): string {
	return BENCH_LOCAL_FLAGS.map((spec) => {
		const name = spec.value ? `${spec.flag} <${spec.value}>` : spec.flag;
		const parts = [`#USAGE flag ${kdl(name)}`, `help=${kdl(spec.help)}`];
		if (spec.default !== undefined) parts.push(`default=${kdl(spec.default)}`);
		return parts.join(" ");
	}).join("\n");
}

/** The flag block of `--help`, aligned, from the same table the spec is built from. */
export function benchLocalFlagHelp(): string {
	const rendered = BENCH_LOCAL_FLAGS.map((spec) => ({
		left: spec.value ? `${spec.flag} <${spec.value}>` : spec.flag,
		spec,
	}));
	const width = Math.max(...rendered.map((entry) => entry.left.length));
	return rendered
		.flatMap(({ left, spec }) => {
			const suffix = spec.default === undefined ? "" : ` (default: ${spec.default})`;
			const head = `  ${left.padEnd(width)}  ${spec.help}${suffix}.`;
			const notes = (spec.notes ?? []).map((note) => `  ${" ".repeat(width)}  ${note}`);
			return [head, ...notes];
		})
		.join("\n");
}
