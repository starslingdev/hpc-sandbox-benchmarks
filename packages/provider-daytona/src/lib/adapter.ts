// The daytona ProviderAdapter: the account API key at construction; the toolchain snapshot and
// runner target pinned per-create. `target` rides the wrapper's create-options passthrough into
// Daytona's createParams. No requiredEnvVars override needed — the schema meta's static
// ["DAYTONA_API_KEY"] stands, so a missing credential skips (not errors).
import { daytona } from "@computesdk/daytona";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { daytonaConfig } from "./config.ts";

export const daytonaAdapter: ProviderAdapter = {
	createCompute: () => daytona({ apiKey: daytonaConfig.apiKey }),
	createOptions: {
		snapshotId: daytonaConfig.snapshot,
		...(daytonaConfig.target ? { target: daytonaConfig.target } : {}),
	},
};
