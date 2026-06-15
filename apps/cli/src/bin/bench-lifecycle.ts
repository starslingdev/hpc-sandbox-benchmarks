#!/usr/bin/env bun
// `bench-lifecycle` — benchmark a single provider's spawn→exec→teardown lifecycle (stub).

import { timeOperation } from "@sandbox-benchmarks/harness";
import { createStubAdapter } from "@sandbox-benchmarks/providers";

if (import.meta.main) {
	const adapter = createStubAdapter("e2b", "E2B");
	const run = await timeOperation(adapter, "spawn", () => {});
	console.log(JSON.stringify(run));
}
