// Tier-1 provider metadata authoring contract (ADR-0006). This module is intentionally runtime
// dependency-free: committed metadata is trusted, type-checked source. Arktype validation belongs to
// generators and process boundaries, not to provider registration imports.

import type { ProviderId } from "./provider-ids.ts";
import type { ProviderPricing } from "./provider-pricing.ts";
import type { ProviderMaturity, ProviderRuntimeIdentity, SpecPinning } from "./providers.ts";

export type IsolationClass = "vm" | "microVM" | "container" | "userspace" | "unknown";

export type ProviderArtifact =
	| { readonly kind: "none" }
	| { readonly kind: "image" }
	| {
			readonly kind: "baked";
			readonly nameSuffix?: `-${string}`;
			readonly source?: "native-snapshot";
	  }
	| { readonly kind: "mirror"; readonly repository: string }
	| { readonly kind: "built"; readonly recipe: string };

export type ProviderInputSource =
	| { readonly kind: "secret" }
	| { readonly kind: "variable" }
	| { readonly kind: "step-env"; readonly step: string }
	| { readonly kind: "step-output"; readonly step: string; readonly output: string };

export interface ProviderInputDescriptor {
	readonly name: string;
	readonly source?: ProviderInputSource;
	readonly required?: boolean;
	readonly default?: string;
	/** Operator guidance for configuration whose requiredness depends on the lane. */
	readonly description?: string;
	/** Fixed value injected only by generated CI wiring (for runner capability opt-ins). */
	readonly ciValue?: string;
}

/** String shorthand means a required secret. */
export type ProviderInput = string | ProviderInputDescriptor;

export interface NormalizedProviderInput {
	readonly name: string;
	readonly source: ProviderInputSource;
	readonly required: boolean;
	readonly default?: string;
	readonly description?: string;
	readonly ciValue?: string;
}

/** Supported pre-auth actions and the exact provider input each one produces. */
export const PROVIDER_PRE_AUTH_CONTRACTS = {
	"namespace-token": {
		step: "namespace",
		input: {
			name: "NSC_TOKEN_FILE",
			source: { kind: "step-output", output: "token-file" },
		},
	},
	"vercel-auth": {
		step: "vercel-auth",
		input: {
			name: "VERCEL_OIDC_TOKEN",
			source: { kind: "step-env" },
		},
	},
} as const;

export type ProviderPreAuth = keyof typeof PROVIDER_PRE_AUTH_CONTRACTS;

export const PROVIDER_PRE_AUTH_POLICIES = Object.freeze(
	Object.keys(PROVIDER_PRE_AUTH_CONTRACTS) as ProviderPreAuth[],
);

export interface ProviderRunnerPolicy {
	readonly label: string;
	/** setup-bun cache policy for this runner label; explicit so routing cannot drift from setup. */
	readonly noCache: boolean;
	/** Hard runner reaping window, when shorter than the Actions job timeout. */
	readonly lifetimeMinutes?: number;
}

/**
 * The vendor library a provider package pins, which generated provenance reports at runtime.
 *
 * A string is an npm package that must be a runtime dependency of the provider's own package (the
 * generator checks it). `cli` names a vendor CLI whose exact version is pinned by its setup action
 * (`.github/actions/setup-<cli>/action.yml`); `http` is, for a vendor reached over plain HTTP with
 * no library to pin, the version of the API contract its adapter speaks, as an exact semantic
 * version like every other provenance pin (bump it when the adapter's translation changes).
 */
export type ProviderSdkPackage = string | { readonly cli: string } | { readonly http: string };

/**
 * Where an isolation variant's driver lives: `packages/<directory>/src/<entry>.ts`, exported as
 * `@sandbox-benchmarks/<directory>/<entry>`. Omitted means the provider owns
 * `packages/<id>/src/index.ts`; ids that share a directory are variants of one provider package.
 */
export interface ProviderPackageLocation {
	readonly directory: string;
	readonly entry: string;
}

/** The generated provenance constant for one provider package: `<DIRECTORY>_PROVENANCE`. */
export function provenanceConstant(directory: string): string {
	return `${directory.toUpperCase().replaceAll("-", "_")}_PROVENANCE`;
}

/** The inert object authored in `provider-meta/<id>.ts`. */
export interface ProviderMetaSource {
	readonly displayName: string;
	readonly vendor: string;
	/**
	 * The vendor account whose quota and credentials this provider consumes. Isolation variants that
	 * share credentials share one domain (ADR-0010) — it names the Actions concurrency group, the
	 * account journal branch and the plan's batches, so it must stay stable once provisioned.
	 * Omitted means the provider id is its own domain.
	 */
	readonly quotaDomain?: string;
	readonly website: string;
	readonly sdkPackage: ProviderSdkPackage;
	/** Declared only for isolation variants that share one provider package. */
	readonly package?: ProviderPackageLocation;
	/**
	 * Chart label, declared only where it differs from the derived default: the vendor for isolation
	 * variants sharing a package (one vendor on a chart), otherwise the display name.
	 */
	readonly figureLabel?: string;
	readonly artifact: ProviderArtifact;
	readonly inputs: readonly ProviderInput[];
	readonly isolation: {
		readonly technology: string;
		readonly class: IsolationClass;
		readonly notes?: string;
	};
	readonly pricing: ProviderPricing;
	readonly maturity: ProviderMaturity;
	readonly specPinning: SpecPinning;
	readonly runtimeIdentity?: ProviderRuntimeIdentity;
	readonly runner?: ProviderRunnerPolicy;
	readonly preAuth?: ProviderPreAuth;
}

export interface ProviderMetaModule<
	P extends ProviderId,
	M extends ProviderMetaSource = ProviderMetaSource,
> {
	readonly id: P;
	readonly meta: M;
}

/** Preserve provider and metadata literals; validation is deliberately a generator concern. */
export function defineProviderMeta<const P extends ProviderId, const M extends ProviderMetaSource>(
	id: P,
	meta: M,
): ProviderMetaModule<P, M> {
	return { id, meta };
}

declare const UNFILLED: unique symbol;

/**
 * A value `bun run new-provider` leaves for a provider's author to state. It is assignable to no
 * metadata field or port signature, so typecheck names every one still open by its hint.
 */
export interface UnfilledValue<Hint extends string> {
	readonly [UNFILLED]: Hint;
}

/**
 * A type `bun run new-provider` leaves for a provider's author to state. No hint satisfies its
 * constraint, so typecheck names every one still open by its hint wherever it is written, used or
 * not.
 */
export type Unfilled<Hint extends never> = Hint;

/**
 * Mark a value the author must still state. Evaluating it throws with its hint, so the registry's
 * validation (and any adapter call that reaches one) fails rather than running on a placeholder.
 */
export function unfilled<const Hint extends string>(hint: Hint): UnfilledValue<Hint> {
	throw new Error(`unfilled: ${hint} (left by \`bun run new-provider\`)`);
}

export function normalizeProviderInput(input: ProviderInput): NormalizedProviderInput {
	if (typeof input === "string") {
		return { name: input, source: { kind: "secret" }, required: true };
	}
	return {
		name: input.name,
		source: input.source ?? { kind: "secret" },
		required: input.required ?? input.default === undefined,
		...(input.default === undefined ? {} : { default: input.default }),
		...(input.description === undefined ? {} : { description: input.description }),
		...(input.ciValue === undefined ? {} : { ciValue: input.ciValue }),
	};
}
