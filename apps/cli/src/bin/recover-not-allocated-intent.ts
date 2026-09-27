#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { type } from "arktype";
import { githubAccountJournal, githubGitRequest } from "../lib/github-account-journal.ts";
import { recoverNotAllocatedIntent } from "../lib/not-allocated-intent-recovery.ts";

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: { "exclusive-account": { type: "boolean", default: false } },
});
if (!values["exclusive-account"] || positionals.length !== 1)
	throw new Error(
		"usage: recover-not-allocated-intent --exclusive-account <original-attempt-directory>; stop all local account writers first",
	);
const directory = type("string >= 1").assert(positionals[0]);
const request = githubGitRequest();
const workflow = type({ status: "'completed'", head_sha: /^[a-f0-9]{40}$/ });
const activeRuns = type({ total_count: "number.integer >= 0" });
const attempt = await recoverNotAllocatedIntent({
	directory,
	journal: githubAccountJournal(request),
	signal: AbortSignal.timeout(240_000),
	assertQuiescent: async (id, sha) => {
		const run = workflow.assert(await request("GET", `/actions/runs/${id}`));
		if (run.head_sha !== sha) throw new Error("original workflow source mismatch");
		for (const status of ["queued", "in_progress", "waiting", "pending", "requested"]) {
			const runs = activeRuns.assert(
				await request("GET", `/actions/runs?status=${status}&per_page=1`),
			);
			if (runs.total_count !== 0)
				throw new Error(`repository has ${status} workflows; stop writers before recovery`);
		}
	},
});
console.log(
	`Released ${attempt} as not-allocated; create never started and the original attempt remains failed.`,
);
