// E2B's vendor adapter: the shared E2B-protocol adapter over the pinned `e2b` SDK, which honours
// the caller's signal on every call. Readiness, cleanup confirmation, recovery, inventory and the
// disk proof live in the driver kit (`@sandbox-benchmarks/driver/vendor`).

import type { DriverContext } from "@sandbox-benchmarks/driver";
import { e2bProtocolVendor } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import { type } from "arktype";
import type { Sandbox } from "e2b";

/** The SDK surface the adapter translates; the package entry passes the real module. */
export type E2bSdk = Pick<
	typeof import("e2b"),
	| "Sandbox"
	| "SandboxNotFoundError"
	| "AuthenticationError"
	| "InvalidArgumentError"
	| "RateLimitError"
>;

export const E2B_SANDBOX_ID = type(/^i[a-z0-9]+$/);

export const e2bVendor = (
	sdk: E2bSdk,
	{ env, resolvedArtifact }: Pick<DriverContext<"e2b">, "env" | "resolvedArtifact">,
) =>
	e2bProtocolVendor<Sandbox>(sdk, {
		vendor: "E2B",
		apiKey: env.E2B_API_KEY,
		template: resolvedArtifact.ref,
		signals: true,
	});
