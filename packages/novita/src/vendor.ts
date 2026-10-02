// Novita's vendor adapter: the shared E2B-protocol adapter over the loaded novita-sandbox SDK, which
// it receives and never loads. Readiness, cleanup confirmation, recovery, inventory and the disk
// proof live in the driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// Novita's E2B-compatible SDK owns its regional control plane and credential channel. The account
// key rides only the SDK's `apiKey` option, never custom headers, which the SDK would also forward
// to the guest daemon on every data-plane call. The SDK takes no signal, so guest calls are bounded
// by the control-plane timeout instead, and its 60s command timeout is stated explicitly.

import type { DriverContext } from "@sandbox-benchmarks/driver";
import { e2bProtocolVendor } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import { type } from "arktype";
import type { Sandbox } from "novita-sandbox";

/** The SDK surface the adapter translates; the package entry passes the loaded module. */
export type NovitaSdk = Pick<
	typeof import("novita-sandbox"),
	| "Sandbox"
	| "SandboxNotFoundError"
	| "AuthenticationError"
	| "InvalidArgumentError"
	| "RateLimitError"
>;

export const NOVITA_DOMAIN = "us-phx-1.sandbox.novita.ai";
export const NOVITA_SANDBOX_ID = type(/^[A-Za-z0-9_-]+$/);

export const novitaVendor = (
	sdk: NovitaSdk,
	{ env, resolvedArtifact }: Pick<DriverContext<"novita">, "env" | "resolvedArtifact">,
) =>
	e2bProtocolVendor<Sandbox>(sdk, {
		vendor: "Novita",
		apiKey: env.NOVITA_API_KEY,
		template: resolvedArtifact.ref,
		domain: NOVITA_DOMAIN,
		signals: false,
		// A cold template boot can outlast the control-plane bound.
		createRequestTimeoutMs: 300_000,
		execTimeoutMs: 60_000,
	});
