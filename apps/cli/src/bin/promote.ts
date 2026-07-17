#!/usr/bin/env bun
// `promote` — validate a candidate Run and publish it into the committed dataset. The promote half of
// candidate→promote: it gates on at least one validated provider (so a partial collection with no real
// metrics can't publish an empty run), then writes the Run into the published dataset + its index. With
// no publish target it stays a pure validation gate (the original behavior).
// Uses @actions/core for groups, annotations, and a job summary in CI.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@actions/core";
import { writeRunDocument } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import {
	fail,
	inActions,
	logProviderStatuses,
	providerSummaryRows,
	withGroup,
	writeJobSummary,
} from "../lib/actions-log.ts";

function logInfo(message: string): void {
	if (inActions()) core.info(message);
	else console.error(message);
}

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
		logProviderStatuses(parsed, { grouped: false });
		return parsed;
	});

	const validated = run.providers.filter((p) => p.validationStatus === "validated").length;

	// Gate FIRST: a Run with nothing validated (e.g. a partial collection with no PTS XML) must never
	// reach the published dataset.
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
		outFile = join(datasetDir, "runs", `${run.runId}.json`);
		const indexFile = join(datasetDir, "index.json");
		await withGroup(`Publish ${outFile}`, async () => {
			writeRunDocument(run, outFile, indexFile);
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

	// Machine-readable line for any caller that still greps stdout (kept after the summary write).
	const resultLine = JSON.stringify({
		promoted: run.runId,
		validatedProviders: validated,
	});
	if (inActions()) core.info(resultLine);
	else process.stdout.write(`${resultLine}\n`);
}
