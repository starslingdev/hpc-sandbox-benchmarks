#!/usr/bin/env bun
// `plan-matrix` — emit the benchmark matrix as a SINGLE LINE of compact JSON.
// This is the $GITHUB_OUTPUT contract: `matrix=<json>` must be one line, no pretty-printing.
import { buildMatrix } from "../lib/matrix.ts";

export function planMatrixJson(): string {
	return JSON.stringify({ include: buildMatrix() });
}

if (import.meta.main) {
	console.log(planMatrixJson());
}
