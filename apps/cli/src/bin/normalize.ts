#!/usr/bin/env bun
// `normalize` — read raw runs and emit normalized run documents (stub).

import { normalize } from "@sandbox-benchmarks/results";
import { parseRawRun } from "@sandbox-benchmarks/schema";

if (import.meta.main) {
	const raw = parseRawRun({ provider: "e2b", operation: "spawn", durationMs: 1280 });
	console.log(JSON.stringify(normalize(raw)));
}
