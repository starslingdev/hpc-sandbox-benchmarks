// Tier-1 provider metadata authoring contract (ADR-0006). This module is intentionally runtime
// dependency-free: committed metadata is trusted, type-checked source. Arktype validation belongs to
// generators and process boundaries, not to provider registration imports.

import type { ProviderId } from "./provider-ids.ts";
import type { ProviderPricing } from "./provider-pricing.ts";
import type {
	ProviderMaturity,
	ProviderRuntimeIdentity,
	ProviderTransport,
	SpecPinning,
} from "./providers.ts";

export type IsolationClass = "microVM" | "container" | "userspace" | "unknown";

export type ProviderArtifact =
	| { readonly kind: "none" }
	| { readonly kind: "image" }
	| { readonly kind: "baked"; readonly nameSuffix?: string }
	| { readonly kind: "mirror"; readonly repository: string }
	| { readonly kind: "built"; readonly recipe: string };

export type ProviderInputSource =
	| { readonly kind: "secret" }
	| { readonly kind: "variable" }
	| { readonly kind: "step-output"; readonly step: string; readonly output: string };

export interface ProviderInputDescriptor {
	readonly name: string;
	readonly source?: ProviderInputSource;
	readonly required?: boolean;
	readonly default?: string;
}

/** String shorthand means a required secret. */
export type ProviderInput = string | ProviderInputDescriptor;

export interface NormalizedProviderInput {
	readonly name: string;
	readonly source: ProviderInputSource;
	readonly required: boolean;
	readonly default?: string;
}

export type ProviderPreAuth = "namespace-token" | "vercel-auth";

/** The inert object authored in `provider-meta/<id>.ts`. */
export interface ProviderMetaSource {
	readonly displayName: string;
	readonly vendor: string;
	readonly website: string;
	readonly sdkPackage: string;
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
	readonly transport: ProviderTransport;
	readonly runtimeIdentity?: ProviderRuntimeIdentity;
	readonly runner?: string;
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

export function normalizeProviderInput(input: ProviderInput): NormalizedProviderInput {
	if (typeof input === "string") {
		return { name: input, source: { kind: "secret" }, required: true };
	}
	return {
		name: input.name,
		source: input.source ?? { kind: "secret" },
		required: input.required ?? input.default === undefined,
		...(input.default === undefined ? {} : { default: input.default }),
	};
}
