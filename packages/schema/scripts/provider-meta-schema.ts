// Tier-3 provider metadata validation. This deliberately lives beside the generator: committed
// descriptor modules stay inert and arktype-free, while generation pays the boundary-schema cost
// once and refuses to emit wiring from malformed metadata (ADR-0006).
import { type } from "arktype";
import type { ProviderId } from "../src/provider-ids.ts";
import { PROVIDER_IDS } from "../src/provider-ids.ts";
import type { ProviderMetaModule } from "../src/provider-meta.ts";
import { providerPricingSchema } from "../src/provider-pricing.ts";

const nonemptyStringSchema = type("string >= 1");
const finitePositiveNumberSchema = type("number > 0").narrow(Number.isFinite);
const httpUrlSchema = type("string.url").narrow((value) => {
	const protocol = new URL(value).protocol;
	return protocol === "http:" || protocol === "https:";
});

const secretInputSourceSchema = type({ kind: "'secret'" }).onUndeclaredKey("reject");
const variableInputSourceSchema = type({ kind: "'variable'" }).onUndeclaredKey("reject");
const stepOutputInputSourceSchema = type({
	kind: "'step-output'",
	step: nonemptyStringSchema,
	output: nonemptyStringSchema,
}).onUndeclaredKey("reject");
const inputSourceSchema = secretInputSourceSchema
	.or(variableInputSourceSchema)
	.or(stepOutputInputSourceSchema);
const inputDescriptorSchema = type({
	name: nonemptyStringSchema,
	"source?": inputSourceSchema,
	"required?": "boolean",
	"default?": nonemptyStringSchema,
}).onUndeclaredKey("reject");
const providerInputSchema = nonemptyStringSchema.or(inputDescriptorSchema);

const noArtifactSchema = type({ kind: "'none'" }).onUndeclaredKey("reject");
const imageArtifactSchema = type({ kind: "'image'" }).onUndeclaredKey("reject");
const bakedNameSuffixSchema = nonemptyStringSchema.narrow((suffix, ctx) => {
	if (!/^-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suffix)) {
		return ctx.mustBe("a lowercase kebab-case suffix beginning with '-' (for example -container)");
	}
	if (suffix.endsWith("-candidate")) {
		return ctx.mustBe("a suffix whose final segment is not the reserved word 'candidate'");
	}
	return true;
});
const bakedArtifactSchema = type({
	kind: "'baked'",
	"nameSuffix?": bakedNameSuffixSchema,
}).onUndeclaredKey("reject");
const mirrorArtifactSchema = type({
	kind: "'mirror'",
	repository: nonemptyStringSchema,
}).onUndeclaredKey("reject");
const builtArtifactSchema = type({
	kind: "'built'",
	recipe: nonemptyStringSchema,
}).onUndeclaredKey("reject");
const providerArtifactSchema = noArtifactSchema
	.or(imageArtifactSchema)
	.or(bakedArtifactSchema)
	.or(mirrorArtifactSchema)
	.or(builtArtifactSchema);

export const providerMetaSourceSchema = type({
	displayName: nonemptyStringSchema,
	vendor: nonemptyStringSchema,
	website: httpUrlSchema,
	sdkPackage: nonemptyStringSchema,
	artifact: providerArtifactSchema,
	inputs: providerInputSchema.array().atLeastLength(1),
	isolation: type({
		technology: nonemptyStringSchema,
		class: "'microVM' | 'container' | 'userspace' | 'unknown'",
		"notes?": nonemptyStringSchema,
	}).onUndeclaredKey("reject"),
	pricing: providerPricingSchema,
	maturity: type({
		status: "'ga' | 'beta' | 'unknown'",
		"notes?": nonemptyStringSchema,
	}).onUndeclaredKey("reject"),
	specPinning: "'settable' | 'fixed' | 'unknown'",
	transport: type({
		streaming: "boolean",
		syncCapMs: finitePositiveNumberSchema.or("null"),
		detachedPoll: "boolean",
	}).onUndeclaredKey("reject"),
	"runtimeIdentity?": "'root' | 'unprivileged'",
	"runner?": nonemptyStringSchema,
	"preAuth?": "'namespace-token' | 'vercel-auth'",
})
	.onUndeclaredKey("reject")
	.narrow((meta, ctx) => {
		const names = new Set<string>();
		for (const raw of meta.inputs) {
			const name = typeof raw === "string" ? raw : raw.name;
			if (names.has(name)) {
				return ctx.mustBe(`provider inputs whose names are unique (duplicate: ${name})`);
			}
			names.add(name);
			if (typeof raw === "string" || raw.default === undefined) continue;
			if ((raw.source?.kind ?? "secret") !== "variable") {
				return ctx.mustBe(
					`provider inputs whose defaults belong only to variable sources (${name})`,
				);
			}
			if (raw.required === true) {
				return ctx.mustBe(`provider inputs that are not both required and defaulted (${name})`);
			}
		}
		return true;
	});

const providerMetaModuleSchema = type({
	id: type.enumerated(...PROVIDER_IDS),
	meta: providerMetaSourceSchema,
}).onUndeclaredKey("reject");

export type CorrelatedProviderModules = {
	[P in ProviderId]: ProviderMetaModule<P>;
};

const SHARED_VARIANT_GROUPS = [
	["daytona-vm", "daytona-container"],
	["modal-gvisor", "modal-vm"],
] as const;

/** Parse all discovered modules and enforce the few cross-module invariants identity cannot express. */
export function validateProviderModules(
	modules: Readonly<Record<ProviderId, unknown>>,
): CorrelatedProviderModules {
	const parsed = {} as Record<ProviderId, ProviderMetaModule<ProviderId>>;
	for (const expectedId of PROVIDER_IDS) {
		const result = providerMetaModuleSchema(modules[expectedId]);
		if (result instanceof type.errors) {
			throw new Error(`${expectedId}: invalid provider metadata: ${result.summary}`);
		}
		if (result.id !== expectedId) {
			throw new Error(
				`${expectedId}: metadata module declares id ${result.id}; filename, generated key, and id must match`,
			);
		}
		parsed[expectedId] = result as ProviderMetaModule<ProviderId>;
	}

	for (const group of SHARED_VARIANT_GROUPS) {
		const [first, ...rest] = group;
		for (const id of rest) {
			if (parsed[first].meta.pricing !== parsed[id].meta.pricing) {
				throw new Error(`${group.join("/")}: isolation variants must share one pricing object`);
			}
		}
	}

	// Baked artifacts share one canonical base name. Separate vendors own separate control-plane
	// namespaces and may safely reuse it (e2b/Novita/Runloop do); variants of the same vendor do not.
	// Their declared suffix is therefore the collision key that keeps bake/promote from overwriting a
	// sibling artifact while validating a different one.
	const bakedNamesByVendor = new Map<string, Map<string, ProviderId>>();
	for (const id of PROVIDER_IDS) {
		const { artifact, vendor } = parsed[id].meta;
		if (artifact.kind !== "baked") continue;
		const suffix = artifact.nameSuffix ?? "";
		const names = bakedNamesByVendor.get(vendor) ?? new Map<string, ProviderId>();
		const existing = names.get(suffix);
		if (existing !== undefined) {
			throw new Error(
				`${existing}/${id}: baked artifacts for vendor ${vendor} derive the same release name; ` +
					`give ${id} a unique artifact.nameSuffix`,
			);
		}
		names.set(suffix, id);
		bakedNamesByVendor.set(vendor, names);
	}
	return parsed as CorrelatedProviderModules;
}
