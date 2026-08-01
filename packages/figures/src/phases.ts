/**
 * The pipeline phase vocabulary — every phase defined ONCE, with its id and printed label —
 * and the ordinal colour ramp the charts index into it.
 *
 * The colour is deliberately NOT a property of the phase: a suite's REAL execution order is
 * its own (openclaw runs its `check` before its `test`s; better-auth has no `check` at all),
 * so a fixed phase→colour map cannot keep "color order = execution order" true — a chart
 * whose late phase wore an early phase's shade would draw that claim false. Instead the ramp
 * is indexed by a phase's position IN THE SUITE BEING DRAWN: later-in-this-suite is always
 * darker, so the legend's claim holds by construction, per chart, forever. The cost is that
 * one phase may wear different shades in different charts — accepted, because every chart
 * carries its own legend and no surface claims cross-chart colour identity (the shared TIME
 * scale is the cross-chart claim, and it is unaffected).
 *
 * The ramp is one shade per vocabulary entry (the first five are the upstream site's
 * `--bench-ramp-N` readings; the last two extend the same teal-to-deep-sea progression), so
 * it can never run out: a suite cannot exercise more phases than the vocabulary names.
 */
import { match } from "arktype";

export const PHASES = [
	{ id: "clone", label: "git clone" },
	{ id: "install", label: "cold install" },
	{ id: "lint", label: "lint" },
	{ id: "typecheck", label: "typecheck" },
	{ id: "build", label: "build" },
	{ id: "test", label: "test" },
	{ id: "check", label: "check" },
] as const;

export type PhaseId = (typeof PHASES)[number]["id"];

/** Ordinal shades, indexed by a phase's position in the suite being drawn — see above. */
export const PHASE_RAMP = [
	"#34c9bc",
	"#16a8ac",
	"#0b8794",
	"#07687b",
	"#054a5f",
	"#033344",
	"#02202e",
] as const;

const byId = new Map(PHASES.map((phase) => [phase.id, phase]));

/** The vocabulary entry for a phase id — total, because `PhaseId` is the closed set above. */
export function phaseOf(id: PhaseId): (typeof PHASES)[number] {
	// The map lookup cannot miss on a well-typed id; the throw guards the untyped edges
	// (a fixture cast, a future string-typed caller) with a named error instead of undefined.
	const phase = byId.get(id);
	if (!phase) throw new Error(`unknown pipeline phase "${id}"`);
	return phase;
}

/**
 * The task-key → phase classification, first-matching-case wins (arktype `match` respects
 * case order). This is the one real INPUT boundary in the phase machinery: `parseRun` proves
 * a metric id is a string, not that it belongs to the phase vocabulary — so an id minted by
 * a newer suite registry crosses into the closed `PhaseId` set exactly here, and a key the
 * table has never met must FAIL, loudly, naming itself. `default: "assert"` does that
 * (a silent fallthrough once bucketed every unknown key into `check`, publishing a
 * miscoloured segment instead of an error).
 */
const phaseOfKey = match.in<string>().match({
	"'git_clone'": () => "clone" as const,
	"'cold_install'": () => "install" as const,
	"'typecheck'": () => "typecheck" as const,
	"/^lint/": () => "lint" as const,
	"/^build/": () => "build" as const,
	"/^test/": () => "test" as const,
	// The real `check` family: `shrinkwrap_check` today. Suffix-matched, not defaulted —
	// `docs_build_check` would be a deliberate naming, `docs_publish` an error.
	"/_check$/": () => "check" as const,
	default: "assert",
});

/**
 * Which phase a realworld task metric belongs to, from the id convention the schema's suite
 * registry uses (`realworld_<repo>_task_<key>`). The catalog does not carry a phase field, so
 * the derivation lives here, next to the vocabulary it maps into — and a test pins it against
 * the real `SUITES` ids. If the prefix strip misses, the whole metric id flows into the
 * classifier and the throw names it verbatim.
 */
export function phaseOfTask(metricId: string): PhaseId {
	return phaseOfKey(metricId.replace(/^realworld_[a-z0-9_]+?_task_/, ""));
}
