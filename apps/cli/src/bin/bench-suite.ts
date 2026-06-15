#!/usr/bin/env bun
// `bench-suite` — run the full benchmark suite across the matrix (stub).

import { timeOperation } from "@sandbox-benchmarks/harness";
import { createStubAdapter } from "@sandbox-benchmarks/providers";
import { buildMatrix } from "../lib/matrix.ts";

if (import.meta.main) {
	const runs = [];
	for (const { provider, operation } of buildMatrix()) {
		const adapter = createStubAdapter(provider, provider);
		runs.push(await timeOperation(adapter, operation, () => {}));
	}
	console.log(JSON.stringify({ runs }));
}
