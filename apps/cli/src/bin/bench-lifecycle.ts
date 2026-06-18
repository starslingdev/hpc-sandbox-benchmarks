#!/usr/bin/env bun
// `bench-lifecycle` — benchmark a single provider's spawn→exec→teardown lifecycle (stub).

import { timeOperation } from "@sandbox-benchmarks/harness";
import { providers } from "@sandbox-benchmarks/providers";

if (import.meta.main) {
	const config = providers.find((p) => p.name === "e2b");
	if (!config) throw new Error('provider "e2b" is not registered');
	const run = await timeOperation(config, "spawn", () => {});
	console.log(JSON.stringify(run));
}
