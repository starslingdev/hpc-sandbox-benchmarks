#!/usr/bin/env bun
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadDriverModule } from "@sandbox-benchmarks/drivers";
import { observeModalCleanupApp } from "@sandbox-benchmarks/modal/cleanup-observation";
import { type } from "arktype";
import { recoverExperimentCleanup } from "../lib/cleanup-recovery.ts";
import { verifyCleanupWorkflowSource } from "../lib/cleanup-workflow.ts";
import { isDriverProviderId, openDriver } from "../lib/driver-run.ts";
import { readExperimentAttempts, readExperimentPlan } from "../lib/experiment-artifacts.ts";
import { githubExperimentStore } from "../lib/experiment-store.ts";
import { downloadExperimentPlan } from "../lib/experiment-transfer.ts";
import { githubAccountJournal, githubGitRequest } from "../lib/github-account-journal.ts";

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: { "exclusive-account": { type: "boolean", default: false } },
});
if (!values["exclusive-account"] || positionals.length !== 3)
	throw new Error(
		"usage: recover-experiment-cleanup --exclusive-account <plan.json> <attempts-root> <original-attempt-directory>; stop all local account writers first",
	);
const plan = readExperimentPlan(type("string >= 1").assert(positionals[0]));
const attempts = readExperimentAttempts(type("string >= 1").assert(positionals[1]));
const anchor = attempts.find(
	(attempt) =>
		attempt.evidence.planDigest === plan.digest &&
		attempt.evidence.sha === plan.sha &&
		attempt.execution?.provider === "modal-gvisor",
)?.execution?.sandboxId;
const request = githubGitRequest();
const operator = type("string >= 1").assert(process.env.GITHUB_ACTOR);
const signal = AbortSignal.timeout(240_000);
const result = await recoverExperimentCleanup({
	plan,
	directory: type("string >= 1").assert(positionals[2]),
	operator,
	journal: githubAccountJournal(request),
	signal,
	openDriver: async (provider) => {
		if (!isDriverProviderId(provider)) throw new Error("provider has no recovery driver");
		return (await openDriver(provider)).driver;
	},
	modalAnchor: anchor,
	observeModalApp: (id) => observeModalCleanupApp(id, signal),
	observeRuncloudName: async (name) =>
		(await loadDriverModule("runcloud")).observeNamedCleanup(name, signal),
	assertQuiescent: async (id, sha) => {
		const run = type({ status: "'completed'", head_sha: "string" }).assert(
			await request("GET", `/actions/runs/${id}`),
		);
		if (run.head_sha === sha) verifyCleanupWorkflowSource(plan, run);
		else {
			const directory = mkdtempSync(join(tmpdir(), "cleanup-repair-"));
			try {
				const frozen = await downloadExperimentPlan(githubExperimentStore(id), id, directory);
				const repair = type({ sourceRun: "string" }).assert(
					JSON.parse(readFileSync(join(directory, "repair.json"), "utf8")),
				);
				verifyCleanupWorkflowSource(plan, run, {
					plan: frozen,
					repair,
					sourceWorkflow: await request("GET", `/actions/runs/${repair.sourceRun}`),
				});
			} finally {
				rmSync(directory, { recursive: true, force: true });
			}
		}
		for (const status of ["queued", "in_progress", "waiting", "pending", "requested"]) {
			const runs = type({ total_count: "number.integer >= 0" }).assert(
				await request("GET", `/actions/runs?status=${status}&per_page=1`),
			);
			if (runs.total_count !== 0)
				throw new Error(`repository has ${status} workflows; stop writers before recovery`);
		}
	},
});
console.log(JSON.stringify(result));
