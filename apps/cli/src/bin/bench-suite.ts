#!/usr/bin/env bun
// `bench-suite` — run the full benchmark suite across the matrix (stub).

import { timeOperation } from "@sandbox-benchmarks/harness";
import type { ProviderConfig } from "@sandbox-benchmarks/providers";
import { providers } from "@sandbox-benchmarks/providers";
import { buildMatrix } from "../lib/matrix.ts";

if (import.meta.main) {
	// Keyed by string: the matrix yields arbitrary provider names, and the guard below rejects any
	// that isn't registered (the providers list is keyed by ProviderId, the matrix is not).
	const byName = new Map<string, ProviderConfig>(providers.map((p) => [p.name, p]));
	const runs = [];
	for (const { provider, operation } of buildMatrix()) {
		const config = byName.get(provider);
		if (!config) throw new Error(`provider "${provider}" is not registered`);
		runs.push(await timeOperation(config, operation, () => {}));
	}
	console.log(JSON.stringify({ runs }));
}
