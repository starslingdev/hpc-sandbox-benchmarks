#!/usr/bin/env bun
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { evidenceDigest, repairAttemptsDigest } from "@sandbox-benchmarks/results";
import { experimentRepairSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { readExperimentAttempts, writeImmutableJson } from "../lib/experiment-artifacts.ts";
import { ROUND_BATCH_LIMIT } from "../lib/experiment-plan.ts";
import { planExperimentRepair } from "../lib/experiment-repair.ts";
import { githubExperimentStore } from "../lib/experiment-store.ts";
import { downloadExperimentAttempts, downloadExperimentPlan } from "../lib/experiment-transfer.ts";
import { githubAccountJournal, githubGitRequest } from "../lib/github-account-journal.ts";

const identifier = type(/^[1-9][0-9]*$/);
const sourceId = identifier.assert(process.env.SOURCE_RUN_ID);
const command = process.argv[2];
const request = githubGitRequest();
const source = type({
	status: "'completed'",
	head_sha: /^[a-f0-9]{40}$/,
	head_branch: "'main'",
	path: "'.github/workflows/bench-matrix.yml'",
}).assert(await request("GET", `/actions/runs/${sourceId}`));
const sourceStore = githubExperimentStore(sourceId);
const sourcePlan = await downloadExperimentPlan(sourceStore, sourceId, "experiment/manifest");
if (sourcePlan.sha !== source.head_sha)
	throw new Error("source workflow revision differs from frozen plan");
await downloadExperimentAttempts(
	sourceStore,
	githubAccountJournal(request),
	sourcePlan,
	"experiment/attempts",
);
const originals = readExperimentAttempts("experiment/attempts");

if (command === "plan") {
	const run = identifier.assert(process.env.GITHUB_RUN_ID);
	const { plan, repair } = planExperimentRepair(sourcePlan, originals, {
		run,
		operator: type("string >= 1").assert(process.env.GITHUB_ACTOR),
		reason: type("string >= 1").assert(process.env.REPAIR_REASON),
		createdOn: new Date().toISOString().slice(0, 10),
	});
	if (
		plan.batches.length > 256 ||
		plan.accounts.some(
			(a) => plan.batches.filter((b) => b.quotaDomain === a.quotaDomain).length > ROUND_BATCH_LIMIT,
		)
	)
		throw new Error("recovery exceeds bounded Actions matrix/account queue limits");
	mkdirSync("recovery/manifest", { recursive: true });
	writeImmutableJson("recovery/manifest/plan.json", plan);
	writeImmutableJson("recovery/manifest/repair.json", repair);
	const store = githubExperimentStore(run);
	await store.upload(`experiment-plan-${run}`, "recovery/manifest");
	const output = type("string >= 1").assert(process.env.GITHUB_OUTPUT);
	const waves = [...new Set(plan.batches.map((b) => b.wave))];
	appendFileSync(output, `waves=${JSON.stringify(waves)}\nsource_sha=${sourcePlan.sha}\n`);
	for (const [key, wave] of [
		["memory_axis", "synthetic-memory"],
		["system_axis", "synthetic-system"],
		["realworld_axis", "realworld"],
	] as const) {
		const include = plan.batches
			.filter((b) => b.wave === wave)
			.map((b) => {
				const cells = plan.cells.filter((c) => b.cells.includes(c.id));
				const suite = cells[0]?.suite;
				if (!suite || cells.some((c) => c.suite !== suite))
					throw new Error("repair batch mixes suites");
				return {
					account: b.quotaDomain,
					providers: JSON.stringify([...new Set(cells.map((c) => c.provider))]),
					suite,
					batch_id: b.id,
				};
			});
		appendFileSync(output, `${key}=${JSON.stringify({ include })}\n`);
	}
	console.log(
		`Frozen ${repair.cells.length} replacement cells; original measurements are retained for all other cells.`,
	);
} else if (command === "collect") {
	const run = identifier.assert(process.env.RECOVERY_RUN_ID);
	const info = type({
		status: "string",
		head_branch: "'main'",
		path: "'.github/workflows/recover-benchmark.yml'",
		event: "'workflow_dispatch'",
		actor: { login: "string >= 1" },
	}).assert(await request("GET", `/actions/runs/${run}`));
	if (run !== process.env.GITHUB_RUN_ID && info.status !== "completed")
		throw new Error("standalone backfill requires a completed recovery workflow");
	const store = githubExperimentStore(run);
	const plan = await downloadExperimentPlan(store, run, "recovery");
	const repair = experimentRepairSchema.assert(
		JSON.parse(readFileSync("recovery/repair.json", "utf8")),
	);
	const { digest, ...body } = repair;
	if (
		evidenceDigest(body) !== digest ||
		repair.operator !== info.actor.login ||
		repair.sourceRun !== sourceId ||
		repair.sourcePlanDigest !== sourcePlan.digest ||
		repair.sourceAttemptsDigest !== repairAttemptsDigest(originals) ||
		repair.recoveryRun !== run ||
		repair.recoveryPlanDigest !== plan.digest
	)
		throw new Error("recovery artifact does not bind approved workflow and original evidence");
	await downloadExperimentAttempts(
		store,
		githubAccountJournal(request),
		plan,
		join("recovery", "attempts"),
	);
} else throw new Error("usage: workflow-repair plan | collect");
