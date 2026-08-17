// The typed join (ADR-0007 §3): a driver binds to the registry through one autocompleted id
// parameter, and everything it may touch derives from that id — its env slice at the type
// level here, its runtime env parser in ../env.ts (the runtime dual, built from the SAME
// declaration so the two cannot drift).

import type { ProviderId } from "@sandbox-benchmarks/schema/providers";
import type { CreateBudget, SandboxDriver } from "./port.ts";

type Prettify<T> = { [K in keyof T]: T[K] } & {};

export interface CredentialSpec {
	readonly name: string;
	readonly optional?: true;
}

/**
 * Per-provider credential declarations, literal-typed so {@link EnvOf} is exact.
 *
 * This table is a projection of the registry's `requiredEnvVars` — `define.test.ts` pins the
 * two together, so drift is a red test. Its planned home is the registry itself (ADR-0006's
 * credential descriptors, whose annotation-free `as const satisfies` shape preserves the
 * literals this derivation needs); the shape and every derivation below are final, only the
 * declaration moves.
 */
export const DRIVER_CREDENTIALS = {
	e2b: [{ name: "E2B_API_KEY" }],
	"daytona-vm": [{ name: "DAYTONA_API_KEY" }],
	"daytona-container": [{ name: "DAYTONA_API_KEY" }],
	blaxel: [{ name: "BL_API_KEY" }, { name: "BL_WORKSPACE" }],
	"microsandbox-local": [{ name: "MICROSANDBOX_LOCAL_BENCH" }],
	"microsandbox-cloud": [{ name: "MSB_API_KEY" }],
	"modal-gvisor": [{ name: "MODAL_TOKEN_ID" }, { name: "MODAL_TOKEN_SECRET" }],
	"modal-vm": [{ name: "MODAL_TOKEN_ID" }, { name: "MODAL_TOKEN_SECRET" }],
	novita: [{ name: "NOVITA_API_KEY" }],
	runloop: [{ name: "RUNLOOP_API_KEY" }],
	namespace: [{ name: "NSC_TOKEN_FILE" }],
	vercel: [{ name: "VERCEL_OIDC_TOKEN" }],
	runcloud: [{ name: "RUN_CLOUD_API_KEY" }],
	tama: [{ name: "TAMA_TOKEN" }],
} as const satisfies Record<ProviderId, readonly CredentialSpec[]>;

/** The env slice a credentials tuple declares: required → `string`, optional → absent-able. */
export type EnvFromCreds<C extends readonly CredentialSpec[]> = Prettify<
	{ readonly [S in Extract<C[number], { optional: true }> as S["name"]]?: string } & {
		readonly [S in Exclude<C[number], { optional: true }> as S["name"]]: string;
	}
>;

/**
 * The env slice a driver may read: exactly the variables its provider declares. Reading an
 * undeclared credential is a compile error — "never read process.env here" is unrepresentable
 * rather than a comment.
 */
export type EnvOf<P extends ProviderId> = EnvFromCreds<(typeof DRIVER_CREDENTIALS)[P]>;

export interface DriverContext<P extends ProviderId> {
	readonly env: EnvOf<P>;
}

export interface DriverSpec<P extends ProviderId, Handle = unknown> {
	/** Who owns the create attempt's budget. Omitted ⇒ the harness races create (the default). */
	readonly createBudget?: CreateBudget;
	readonly driver: (context: DriverContext<P>) => SandboxDriver<Handle>;
}

export interface DriverModule<P extends ProviderId, Handle = unknown>
	extends DriverSpec<P, Handle> {
	readonly id: P;
}

/**
 * Define a provider's driver. The id is the whole join: it is autocompleted against
 * {@link ProviderId}, an unregistered id fails compile, and the spec can never bend `P`
 * (`NoInfer`) — only the id names the binding. One generic signature, deliberately not
 * overloads: overloads prefix every mistake with a signature dump, while a single signature
 * lands the error on the field the author got wrong.
 *
 * The spec literal stays inline in this call (or flows through a `DriverSpec<…>`-typed
 * factory); an untyped extracted const severs contextual typing (ADR-0007 §9). Anything you
 * want to extract and unit-test belongs in a `satisfies MethodTable<…>` table instead.
 */
export function defineDriver<P extends ProviderId, Handle = unknown>(
	id: P,
	spec: DriverSpec<NoInfer<P>, Handle>,
): DriverModule<P, Handle> {
	return { ...spec, id };
}
