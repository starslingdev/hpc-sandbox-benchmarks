// The e2b ProviderAdapter: boot the e2b template built from the toolchain image (computesdk maps
// snapshotId → the e2b template id/name). cpu/memory are pinned in the template's e2b.toml, not
// per-create, so the template ref is the entire create-time policy. Credentials come from
// E2B_API_KEY (the factory's env fallback; the schema meta's requiredEnvVars gate skips without it).
import { e2b } from "@computesdk/e2b";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { e2bTemplate } from "./config.ts";

export const e2bAdapter: ProviderAdapter = {
	createCompute: () => e2b({}),
	createOptions: { snapshotId: e2bTemplate },
};
