#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { providerIdSchema, suiteNameSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { recoverRejectedCreate } from "../lib/rejected-create-recovery.ts";

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: { "exclusive-account": { type: "boolean", default: false } },
});
if (!values["exclusive-account"] || positionals.length !== 3)
	throw new Error(
		"usage: recover-rejected-create --exclusive-account <provider> <suite> <original-attempt-directory>; stop all local account writers first",
	);
const provider = providerIdSchema.assert(positionals[0]);
const suite = suiteNameSchema.assert(positionals[1]);
const directory = type("string >= 1").assert(positionals[2]);
// Legacy markers cannot establish rejection. Validate the original artifact and fail closed
// before opening a provider or obtaining journal credentials.
await recoverRejectedCreate({ directory, provider, suite });
