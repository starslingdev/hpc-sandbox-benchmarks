#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { loadDriverModule } from "@sandbox-benchmarks/drivers";
import { providerIdSchema, suiteNameSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import {
	recoverAmbiguousCreateInventory,
	verifyAmbiguousCreateInventory,
} from "../lib/ambiguous-create-inventory-recovery.ts";
import { openDriver } from "../lib/driver-run.ts";
import { githubAccountJournal, githubGitRequest } from "../lib/github-account-journal.ts";

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: {
		"exclusive-account": { type: "boolean", default: false },
		"vendor-attestation": { type: "string" },
	},
});
if (!values["exclusive-account"] || positionals.length !== 3)
	throw new Error(
		"usage: recover-ambiguous-create-inventory --exclusive-account [--vendor-attestation <private-file>] <provider> <suite> <original-attempt-directory>; stop all local account writers first",
	);
const provider = providerIdSchema.assert(positionals[0]);
const suite = suiteNameSchema.assert(positionals[1]);
const directory = type("string >= 1").assert(positionals[2]);
// Only the reviewed ADR-0028 attempts qualify. Validate the original artifact and fail
// closed before opening a provider or obtaining journal credentials.
const attestation = values["vendor-attestation"];
const original = {
	directory,
	provider,
	suite,
	...(attestation && { vendorAttestation: attestation }),
};
verifyAmbiguousCreateInventory(original);
const request = githubGitRequest();
const workflow = type({ status: "'completed'", head_sha: /^[a-f0-9]{40}$/ });
const activeRuns = type({ total_count: "number.integer >= 0" });
const tangleKey =
	provider === "tangle" ? type("string >= 1").assert(process.env.TANGLE_API_KEY) : undefined;
const { driver } = await openDriver(
	provider,
	tangleKey ? { env: { TANGLE_API_KEY: tangleKey } } : {},
);
const attempt = await recoverAmbiguousCreateInventory({
	...original,
	...(tangleKey && {
		observeTangleCustomer: async () =>
			(await loadDriverModule("tangle")).observeCustomer(tangleKey),
	}),
	drivers: [{ id: provider, driver }],
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
	`Released ${attempt} after the reviewed account checks (ADR-0028). The original attempt remains failed.`,
);
