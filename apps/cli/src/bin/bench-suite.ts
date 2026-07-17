#!/usr/bin/env bun
// `bench-suite` — run a benchmark suite on a provider sandbox, collect the raw results into a
// data/raw tree, and normalize them into a validated Run document. Missing provider credentials are
// recorded as a skip (the provider stays `pending` in the Run), so this is runnable without secrets.
// Logging and results go through @actions/core (groups, debug, annotations, job summary) so the
// nested "<suite> / <provider>" cell is metadata-rich in the Actions UI.

import { join } from "node:path";
import * as core from "@actions/core";
import {
	requiredProviders,
	runSuite,
	SuiteUsageError,
	unmetRequirements,
} from "@sandbox-benchmarks/harness";
import { writeNormalizedRun } from "@sandbox-benchmarks/results";
import type { Run } from "@sandbox-benchmarks/schema";
import {
	fail,
	inActions,
	logInfo,
	logProviderStatuses,
	logWarning,
	providerSummaryRows,
	withGroup,
	writeJobSummary,
} from "../lib/actions-log.ts";
import { handleDiscovery } from "../lib/discovery.ts";
import { suiteMetricSummaryRows, suiteTaskSummaryRows } from "../lib/suite-summary.ts";
import type { SuiteTaskPlan } from "../lib/suite-tasks.ts";
import { describeSuiteTasks } from "../lib/suite-tasks.ts";

function plural(n: number, singular: string, pluralForm: string = `${singular}s`): string {
	return `${n} ${n === 1 ? singular : pluralForm}`;
}

function miseTaskSummary(plan: SuiteTaskPlan): string {
	const commands = plan.tasks.filter((t) => t.role === "command").length;
	const leaves = plan.tasks.filter((t) => t.role === "leaf").length;
	if (leaves === 0) return plural(commands, "task");
	return `${plural(commands, "command")} → ${plural(leaves, "leaf task")}`;
}

/** Agent-facing usage; bare invocation keeps the daytona/cpu-node local-dev default. */
export const HELP = `bench-suite — run a benchmark suite on a provider sandbox and normalize it into a Run document.

usage: bench-suite [provider] [suite] [runId]
       bench-suite [--help] [--list-providers] [--list-suites] [--json]

  provider           Provider to run on (default: daytona). See --list-providers.
  suite              Suite to run (default: cpu-node). See --list-suites.
  runId              Run identifier for the data/ tree (default: local-<timestamp>).
  --replicate <idx>  Replicate sandbox index this shard represents (a non-negative integer). Stamped
                     onto the shard Run so the aggregate folds ≥2 replicates of one suite together.
  --require <ids>    Comma-separated providers that MUST reach "validated"; exit 1 otherwise.
                     Also read from REQUIRE_PROVIDERS. CI sets this so a missing secret fails loudly.
  --list-providers   List the registered providers.
  --list-suites      List the registered suites and their dimensions/metrics.
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

Missing provider credentials are recorded as a skip (the provider stays "pending"), so this is
runnable without secrets. Writes data/runs/<runId>.json and updates data/runs/index.json.

examples:
  bench-suite daytona cpu-node            # one suite locally, auto runId
  bench-suite modal memory ci-1234        # a specific cell + runId
  bench-suite e2b memory --require e2b    # fail (don't skip) if E2B_API_KEY is absent
  bench-suite --list-suites               # discover the suite names first

Next: render the Run with \`leaderboard data/runs/<runId>.json\`.`;

/** One exit path for every cell outcome — success, usage error, normalize failure, suite gap, require. */
async function reportCell(opts: {
	provider: string;
	suite: string;
	runId: string;
	sha?: string;
	outFile?: string;
	run?: Run;
	failed: boolean;
	detail?: string;
	taskPlan?: SuiteTaskPlan;
}): Promise<void> {
	const title = `${opts.suite} / ${opts.provider}`;
	const status = opts.failed ? "failure" : "success";
	const provider = opts.run?.providers.find((p) => p.providerId === opts.provider);
	const annotationMessage =
		opts.detail ??
		(provider
			? `${provider.providerId} ${provider.validationStatus} metrics=${provider.metrics.length}`
			: title);
	const taskTables = opts.taskPlan
		? [
				{ heading: "Mise tasks", rows: suiteTaskSummaryRows(opts.taskPlan) },
				{ heading: "Declared metrics", rows: suiteMetricSummaryRows(opts.taskPlan) },
			]
		: [];
	await writeJobSummary({
		heading: title,
		fields: [
			["Status", status, "plain"],
			["Suite", opts.suite, "code"],
			["Provider", opts.provider, "code"],
			["Run id", opts.runId, "code"],
			["SHA", opts.sha ?? "", "code"],
			["Artifact", opts.outFile ?? "", "code"],
			["Harness commands", opts.taskPlan?.commands.join(" · ") ?? "", "code"],
			["Mise tasks", opts.taskPlan ? miseTaskSummary(opts.taskPlan) : "", "plain"],
			["Validation", provider?.validationStatus ?? (opts.run ? "absent" : ""), "plain"],
			["Metrics", provider ? String(provider.metrics.length) : "", "plain"],
			["Suites covered", provider ? String(provider.suitesCovered.length) : "", "plain"],
			["Gaps", provider ? String(provider.gaps.length) : "", "plain"],
			["Observed CPU", provider?.observedSpecs.cpuModel ?? "", "code"],
			[
				"Spec matched",
				provider?.specMatched === undefined ? "" : String(provider.specMatched),
				"plain",
			],
		],
		tables: [
			...taskTables,
			...(opts.run ? [{ heading: "Provider status", rows: providerSummaryRows(opts.run) }] : []),
		],
		detail: opts.detail,
		annotation: {
			failed: opts.failed,
			title,
			message: annotationMessage,
		},
	});
}

type CellReport = Parameters<typeof reportCell>[0];

/** Write the cell summary then fail without a second annotation. */
async function failCell(opts: Omit<CellReport, "failed"> & { detail: string }): Promise<never> {
	await reportCell({ ...opts, failed: true });
	return fail(opts.detail, { annotate: false });
}

/**
 * Parse `--replicate <idx>` / `--replicate=<idx>` into a non-negative integer, or `undefined` when the
 * flag is absent. A dangling or non-integer value fails loudly rather than silently defaulting the shard
 * to replicate 0 — a wrong index would collide two sandboxes into one replicate slot at aggregate time.
 * Exported so the parsing is unit-testable without spawning a process.
 */
export function parseReplicateFlag(argv: readonly string[]): number | undefined {
	let raw: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--replicate") {
			raw = argv[i + 1];
			if (raw === undefined) throw new Error("--replicate requires an index argument");
		} else if (arg?.startsWith("--replicate=")) {
			raw = arg.slice("--replicate=".length);
		}
	}
	if (raw === undefined) return undefined;
	const idx = Number(raw);
	// Number("")/Number("  ")/Number("\n") all coerce to 0, so `--replicate=` (or `--replicate ""`) would
	// slip through as replicate 0 — guard the blank operand explicitly, else it silently collides two
	// sandboxes into one replicate slot at aggregate time (the exact failure this function documents).
	if (raw.trim() === "" || !Number.isInteger(idx) || idx < 0) {
		throw new Error(`--replicate must be a non-negative integer; got "${raw}"`);
	}
	return idx;
}

if (import.meta.main) {
	const argv = process.argv.slice(2);
	// Flags that consume a separate operand — one source of truth so the discovery filter and the
	// positional-skip loop below can never enumerate different sets.
	const VALUE_FLAGS = ["--require", "--replicate"];
	const discovery = handleDiscovery(argv, HELP, VALUE_FLAGS);
	if (discovery !== null) {
		if (discovery.ok) {
			process.stdout.write(`${discovery.text}\n`);
			process.exit(0);
		}
		fail(discovery.text, { properties: { title: "bench-suite discovery" }, exitCode: 2 });
	}

	// Filter flags out before positional resolution so a trailing/misplaced flag (e.g.
	// `bench-suite daytona cpu-node --json`) never gets captured as the runId. `--require` is the one
	// flag that takes a separate operand, so consume that operand too — otherwise `--require daytona`
	// would leave `daytona` behind to be read as the runId.
	const positionals: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;
		// Only the space-separated spelling needs the skip: `--require=<ids>`/`--replicate=<idx>` are
		// single tokens already dropped by the leading-`-` guard below. Both flags take a separate operand.
		if (VALUE_FLAGS.includes(arg)) {
			i++;
			continue;
		}
		if (arg.startsWith("-")) continue;
		positionals.push(arg);
	}
	const provider = positionals[0] ?? "daytona";
	const suite = positionals[1] ?? "cpu-node";
	const runId = positionals[2] ?? `local-${Date.now()}`;
	const sha = process.env.GITHUB_SHA ?? "local";
	const cell = `${suite} / ${provider}`;
	const replicateIndex = parseReplicateFlag(argv);

	const rawRoot = join("data", "raw", runId);
	const outFile = join("data", "runs", `${runId}.json`);
	const indexFile = join("data", "runs", "index.json");

	logInfo(`Benchmark cell ${cell}`);
	if (inActions()) {
		core.debug(
			JSON.stringify({
				provider,
				suite,
				runId,
				sha,
				rawRoot,
				outFile,
				require: requiredProviders(argv),
			}),
		);
	}

	// Resolve the precise mise tasks + PTS pins before the sandbox run so the job summary can name
	// what this cell planned to execute (schema commands → mise task info → run_task leaves).
	let taskPlan: SuiteTaskPlan | undefined;
	await withGroup(`Discover suite tasks (${suite})`, async () => {
		try {
			taskPlan = await describeSuiteTasks(suite);
			logInfo(`commands: ${taskPlan.commands.join(" · ")}`);
			for (const task of taskPlan.tasks) {
				const pts = task.ptsProfile ? ` pts=${task.ptsProfile}` : "";
				const prefix = task.resultsPrefix ? ` prefix=${task.resultsPrefix}` : "";
				logInfo(
					`${task.role} ${task.task}${task.description ? ` — ${task.description}` : ""}${pts}${prefix}`,
				);
			}
			if (inActions()) {
				for (const metric of taskPlan.metrics) {
					core.debug(
						`metric ${metric.id} label=${metric.label}` +
							(metric.ptsTest ? ` pts.test=${metric.ptsTest}` : ""),
					);
				}
			}
		} catch (err) {
			const msg = `Could not describe suite tasks for "${suite}": ${err instanceof Error ? err.message : String(err)}`;
			logWarning(msg, { title: cell });
		}
	});

	// A suite that RAN AND BROKE is a result — the harness has already written its `--failed.json` marker
	// into the raw tree — so the error is held, not thrown. Normalizing anyway is what turns that marker
	// into a recorded `failed` gap on this shard's Run document; rethrowing here would skip the write, the
	// shard would contribute nothing for the aggregate to merge, and the only trace of the failure would
	// die inside the CI artifact. The job still goes red at the bottom of this block.
	let suiteError: unknown;
	await withGroup(`Run suite ${suite} on ${provider}`, async () => {
		try {
			await runSuite({
				providerName: provider,
				suiteName: suite,
				// Tag the raw tree by suite: `<rawRoot>/<provider>/<suite>/`. The normalizer reads each suite
				// subdirectory independently and rejects any catalogued metric a suite emits off its declared
				// Dimensions (the runtime half of the suite↔dimension↔metric contract).
				resultsDir: join(rawRoot, provider, suite),
			});
			logInfo(`Suite "${suite}" completed on ${provider}`);
		} catch (err) {
			// A usage error (unknown provider/suite) produced no raw tree and no marker: there is nothing to
			// normalize, and pretending otherwise would write an empty Run for a cell that never existed.
			if (err instanceof SuiteUsageError) {
				await failCell({
					provider,
					suite,
					runId,
					sha,
					outFile,
					detail: err.message,
					taskPlan,
				});
			}
			suiteError = err;
			logWarning(
				`Suite "${suite}" threw on ${provider} — will normalize the failed marker into a gap: ${
					err instanceof Error ? err.message : String(err)
				}`,
				{ title: cell },
			);
		}
	});

	let run: Run | undefined;
	let normalizeError: unknown;
	await withGroup("Normalize Run document", async () => {
		try {
			run = writeNormalizedRun({
				rawRoot,
				runId,
				sha,
				outFile,
				updateIndexFile: indexFile,
				...(replicateIndex !== undefined ? { replicateIndex } : {}),
			});
			logInfo(`Normalized Run ${runId} → ${outFile}`);
			// Already inside withGroup — don't nest another ::group::.
			await logProviderStatuses(run, { grouped: false });
		} catch (err) {
			// Prefer the suite failure that caused a bad tree; otherwise keep the normalize error.
			normalizeError = suiteError ?? err;
		}
	});
	if (!run) {
		const detail =
			normalizeError instanceof Error
				? normalizeError.message
				: normalizeError
					? String(normalizeError)
					: "normalize produced no Run document";
		await reportCell({
			provider,
			suite,
			runId,
			sha,
			outFile,
			failed: true,
			detail,
			taskPlan,
		});
		// Synchronous `never` so TypeScript narrows `run` for the paths below.
		fail(detail, { annotate: false });
	}
	const normalized = run;

	if (suiteError) {
		const detail =
			`Suite "${suite}" failed on ${provider} — recorded as a failed gap in ${outFile}: ` +
			`${suiteError instanceof Error ? suiteError.message : String(suiteError)}`;
		await failCell({
			provider,
			suite,
			runId,
			sha,
			outFile,
			run: normalized,
			detail,
			taskPlan,
		});
	}

	// Missing credentials (and an unusable sandbox) are recorded as a skip, not a throw — the lenient
	// local-dev default. That would make a smoke run whose secret is missing/misnamed exit 0 having
	// benchmarked nothing, so CI passes `--require <provider>` (or REQUIRE_PROVIDERS) to assert the
	// provider actually reached `validated` — i.e. produced at least one catalogued metric.
	// Pass the sliced argv explicitly rather than letting it default to `process.argv` (which also
	// carries the bun executable and script path), so the flag this bin parses is the flag this gate reads.
	const required = requiredProviders(argv);
	if (required.length > 0) {
		const reports = normalized.providers.map((p) => ({
			provider: p.providerId,
			status: p.validationStatus === "validated" ? "ok" : p.validationStatus,
		}));
		const unmet = unmetRequirements(reports, required);
		if (unmet.length > 0) {
			const details: string[] = [];
			for (const providerId of unmet) {
				// The gaps ARE the explanation for "no metrics", and their outcome is the important half of
				// it: a required provider that skipped on a precondition is a configuration problem, one that
				// failed is an outage, and the operator reading this line needs to know which they have.
				const gaps = normalized.providers.find((p) => p.providerId === providerId)?.gaps ?? [];
				const gapDetail = gaps.map((g) => `${g.id} ${g.outcome}: ${g.reason}`).join("; ");
				const line = `Required provider "${providerId}" produced no metrics${gapDetail ? ` — ${gapDetail}` : " and was absent from the Run"}`;
				details.push(line);
			}
			await failCell({
				provider,
				suite,
				runId,
				sha,
				outFile,
				run: normalized,
				detail: details.join("\n"),
				taskPlan,
			});
		}
	}

	await reportCell({
		provider,
		suite,
		runId,
		sha,
		outFile,
		run: normalized,
		failed: false,
		taskPlan,
	});
	logInfo(`Cell ${cell} succeeded → ${outFile}`);
}
