// Novita's E2B-compatible SDK owns its regional control plane and credential channel. No account
// key is injected into custom headers, which the SDK would also forward to the guest daemon.
import { randomUUID } from "node:crypto";// The Novita DriverModule: the kit's driver over Novita's adapter, bound to the real SDK here and
// nowhere else. Tests lower the same module over a stub SDK through `vendorDriver`.

import { createRequire } from "node:module";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import { type } from "arktype";
import type { Sandbox as NativeSandbox } from "novita-sandbox";
import { defineVendorDriver, pinned } from "@sandbox-benchmarks/driver/vendor";
import { E2B_ATTEMPT_KEY } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import { NOVITA_PROVENANCE } from "./provenance.ts";

// Match the CJS format used by the still-unmigrated legacy adapter to avoid Bun's mixed chalk
// module-load race. This remains the native SDK; no wrapper internals are patched.
const { Sandbox, SandboxNotFoundError, AuthenticationError, InvalidArgumentError, RateLimitError } =
	createRequire(import.meta.url)("novita-sandbox") as typeof import("novita-sandbox");
export const NOVITA_DOMAIN = "us-phx-1.sandbox.novita.ai";
export const NOVITA_SANDBOX_ID = type(/^[A-Za-z0-9_-]+$/);
const CONTROL_TIMEOUT_MS = 5000;
const ATTEMPT_KEY = "sandbox-benchmarks-attempt";
const optionsSchema = type({
	template: "string >= 1",
	marker: "string >= 1",
});
const recoveryRows = type({
	sandboxId: NOVITA_SANDBOX_ID,
	metadata: { "[string]": "string" },
}).array();
/** Every benchmark create writes `${ATTEMPT_KEY}: benchmark-<uuid>`; the account sweep keys on it. */
const MARKER_PREFIX = "benchmark-";
/** A paused sandbox is still an allocation the account owns, so the sweep lists both live states. */
const INVENTORY_STATES = ["running", "paused"] as const;
const inventoryRows = type({
	sandboxId: "string >= 1",
	"metadata?": { "[string]": "string" },
}).array();

/** Drain one Novita paginator; a repeated or missing continuation token fails closed. */
async function drainNovitaList(
	lane: "recovery" | "inventory",
	listOptions: Parameters<typeof Sandbox.list>[0],
	options: { readonly signal?: AbortSignal },
	consume: (rows: unknown) => void,
): Promise<void> {
	const paginator = Sandbox.list(listOptions);
	const tokens = new Set<string>();
	for (let page = 0; ; page++) {
		options.signal?.throwIfAborted();
		if (page >= 100) throw new Error(`Novita ${lane} exceeded its page limit`);
		consume(await paginator.nextItems());
		if (!paginator.hasNext) return;
		const token = paginator.nextToken;
		if (!token || tokens.has(token))
			throw new Error(`Novita ${lane} repeated or omitted a continuation token`);
		tokens.add(token);
	}
}
import type { NovitaSdk } from "./vendor.ts";
import { NOVITA_DOMAIN, NOVITA_SANDBOX_ID, novitaVendor } from "./vendor.ts";

export { NOVITA_DOMAIN, NOVITA_SANDBOX_ID };

// The SDK's CJS build, loaded once on first use: mixing its ESM build with CJS dependents makes
// Bun's require(chalk) race. This remains the native SDK; no wrapper internals are patched.
let sdk: NovitaSdk | undefined;
const loadSdk = (): NovitaSdk => {
	sdk ??= createRequire(import.meta.url)("novita-sandbox") as NovitaSdk;
	return sdk;
};

export default defineVendorDriver("novita", {
	provenance: NOVITA_PROVENANCE,
	sandboxId: NOVITA_SANDBOX_ID,
	// E2B protocol: the baked template pins 4 vCPU / 8 GiB; disk is proven after boot.
	coverage: pinned(4, 8),
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	markerKey: E2B_ATTEMPT_KEY,
	vendor: (context) => novitaVendor(loadSdk(), context),
});
