// Novita's control plane speaks the E2B protocol through `novita-sandbox`, Novita's own fork of the
// e2b SDK. The fork accepts `nvta_…` keys natively, so the credential rides the SDK's own `apiKey`
// channel: it becomes an `X-API-KEY` header inside the control-plane ApiClient ONLY, and never
// reaches the data plane. (An earlier revision cleared the stock SDK's key-format guard with a
// placeholder `apiKey` plus a real-key `headers` override — but the SDK spreads connection `headers`
// into the envd RPC transport too, so every command/filesystem call delivered the ACCOUNT-level key
// to the envd daemon inside the guest. See the no-headers pin in index.test.ts.)
import type { SandboxConnectOpts } from "novita-sandbox";

/** Novita's E2B-compatible control-plane domain. REGIONAL, not the bare `sandbox.novita.ai` their
 *  docs open with: the bare domain serves only a legacy slice of the API (template list works; the
 *  v2 template-build routes 404 with "no matching operation was found"), while the regional domain
 *  serves the full surface (probed 2026-07-11; the novita-sandbox SDK's own default agrees, and
 *  names the bare domain legacy). Pinned explicitly rather than trusting the SDK default so a
 *  NOVITA_DOMAIN env var or an SDK-default change can't silently split the bake and the harness
 *  across regions — templates and sandboxes are region-scoped, so the two must agree. */
export const NOVITA_E2B_DOMAIN = "us-phx-1.sandbox.novita.ai";

/** The connection options every Novita control-plane call rides: the real key in the SDK's own
 *  `apiKey` channel (control-plane `X-API-KEY` only — NEVER a custom `headers` entry, which the
 *  SDK would replay to the envd daemon inside the guest on every data-plane call), and the region
 *  pinned. */
export function novitaConnection(apiKey: string): SandboxConnectOpts {
	return {
		apiKey,
		domain: NOVITA_E2B_DOMAIN,
	};
}
