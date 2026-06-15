#!/usr/bin/env bun
// `promote` — promote normalized results to the published dataset (stub).

import { normalize } from "@sandbox-benchmarks/results";
import type { RunDocument } from "@sandbox-benchmarks/schema";

if (import.meta.main) {
	const doc: RunDocument = normalize({ provider: "modal", operation: "exec", durationMs: 64 });
	console.log(JSON.stringify({ promoted: [doc] }));
}
