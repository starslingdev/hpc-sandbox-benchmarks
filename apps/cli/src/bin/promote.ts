#!/usr/bin/env bun
// `promote` — validate a candidate Run and publish it into the committed dataset. The promote half of
// candidate→promote: it gates on at least one validated provider (so a partial collection with no real
// metrics can't publish an empty run), then writes the Run into the published dataset + its index. With
// no publish target it stays a pure validation gate (the original behavior).
// Uses @actions/core for groups, annotations, and a job summary in CI.

import { readFileSync } from "node:fs";
import * as core from "@actions/core";
import { parseRun } from "@sandbox-benchmarks/schema";
import {
	fail,
	inActions,
	logInfo,
	logProviderStatuses,
	providerSummaryRows,
	withGroup,
	writeJobSummary,
} from "../lib/actions-log.ts";
import { promoteRun, validatedProviderCount } from "../lib/promote-run.ts";

if (import.meta.main) {
	const [runFile, datasetDir] = process.argv.slice(2);
	if (!runFile) {
		fail("usage: promote <candidateRun.json> [datasetDir]", {
			properties: { title: "promote usage" },
			exitCode: 2,
		});
	}

	logInfo(`Promoting candidate ${runFile}`);
	if (inActions()) core.debug(JSON.stringify({ runFile, datasetDir: datasetDir ?? null }));

	const run = await withGroup("Load candidate Run", async () => {
		const parsed = parseRun(JSON.parse(readFileSync(runFile, "utf8")));
		logInfo(`runId=${parsed.runId} sha=${parsed.sha} providers=${parsed.providers.length}`);
		// Already inside withGroup — don't nest another ::group::.
		await logProviderStatuses(parsed, { grouped: false });
		return parsed;
	});

	// The gate itself lives in ../lib/promote-run.ts, shared with `bench-local --promote`; this bin
	// owns only the Actions-facing report around it. Counted here too so the failure summary below can
	// state it before `promoteRun` is ever reached.
	const validated = validatedProviderCount(run);

	if (validated === 0) {
		await writeJobSummary({
			heading: `Promote ${run.runId}`,
			fields: [
				["Status", "failure", "plain"],
				["Run id", run.runId, "code"],
				["Candidate", runFile, "code"],
				["Validated", "0", "plain"],
			],
			tables: [{ heading: "Provider status", rows: providerSummaryRows(run) }],
			detail: "Refusing to promote a Run with zero validated providers",
			annotation: {
				failed: true,
				title: `Promote ${run.runId}`,
				message: "refusing to promote a Run with zero validated providers",
			},
		});
		// Annotation already written above — exit without a second ::error::.
		fail("promote: refusing to promote a Run with zero validated providers", {
			annotate: false,
		});
	}

	let outFile = "";
	// Publish into the committed dataset (data/dataset/runs/<id>.json + index.json), newest-first index.
	if (datasetDir) {
		await withGroup(`Publish ${run.runId}`, async () => {
			outFile = promoteRun(run, datasetDir).outFile;
			logInfo(`Published ${run.runId} → ${outFile}`);
		});
	} else {
		logInfo(`Validation-only promote for ${run.runId} (${validated} validated provider(s))`);
	}

	await writeJobSummary({
		heading: `Promote ${run.runId}`,
		fields: [
			["Status", "success", "plain"],
			["Run id", run.runId, "code"],
			["Validated", String(validated), "plain"],
			["Providers", String(run.providers.length), "plain"],
			["SHA", run.sha, "code"],
			["Dataset", outFile || "(validation only)", "code"],
		],
		tables: [{ heading: "Provider status", rows: providerSummaryRows(run) }],
		annotation: {
			failed: false,
			title: `Promote ${run.runId}`,
			message: `promoted=${run.runId} validatedProviders=${validated}`,
		},
	});

	// Machine-readable line for any caller that greps stdout — always on stdout (local and Actions)
	// so `result=$(bun promote …)` keeps working in CI wrappers. Mirror to the step log in Actions.
	const resultLine = JSON.stringify({
		promoted: run.runId,
		validatedProviders: validated,
	});
	process.stdout.write(`${resultLine}\n`);
	if (inActions()) core.info(resultLine);
}
