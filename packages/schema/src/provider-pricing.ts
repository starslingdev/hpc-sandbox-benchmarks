// Provider-pricing boundary schemas shared by the public registry and the Tier-3 metadata generator.
import { type } from "arktype";
import { targetSpecSchema } from "./target-spec-schema.ts";

const nonemptyStringSchema = type("string >= 1");
const finiteNonnegativeNumberSchema = type("number >= 0").narrow(Number.isFinite);
const finitePositiveNumberSchema = type("number > 0").narrow(Number.isFinite);

/** A strict Gregorian calendar date, not merely an ISO-shaped string. */
export const isoDateSchema = type("string")
	.matching("^\\d{4}-\\d{2}-\\d{2}$")
	.narrow((value) => {
		const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
		const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
		const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		return month >= 1 && month <= 12 && day >= 1 && day <= (daysInMonth[month - 1] ?? 0);
	});
export type IsoDate = typeof isoDateSchema.infer;

/** An absolute public evidence URL using the only protocols accepted by the registry. */
export const pricingUrlSchema = type("string.url").narrow((value) => {
	const protocol = new URL(value).protocol;
	return protocol === "http:" || protocol === "https:";
});

export const pricingResourceSchema = type("'cpu' | 'memory' | 'cpu_memory' | 'disk'");
export type PricingResource = typeof pricingResourceSchema.infer;

export const pricingQuantityDimensionSchema = targetSpecSchema.keyof();
export type PricingQuantityDimension = typeof pricingQuantityDimensionSchema.infer;

/** One conversion from a Run target dimension to vendor billing units. */
export const pricingQuantityTermSchema = type({
	dimension: pricingQuantityDimensionSchema,
	unitsPerTargetUnit: finitePositiveNumberSchema,
}).onUndeclaredKey("reject");
export type PricingQuantityTerm = typeof pricingQuantityTermSchema.infer;

/** How a component's vendor-unit quantity is derived from the Run's requested target shape. */
const linearPricingQuantityRuleSchema = type({
	kind: "'linear'",
	dimension: pricingQuantityDimensionSchema,
	unitsPerTargetUnit: finitePositiveNumberSchema,
}).onUndeclaredKey("reject");
const maxPricingQuantityRuleSchema = type({
	kind: "'max'",
	terms: pricingQuantityTermSchema.array().atLeastLength(2),
}).onUndeclaredKey("reject");
export const pricingQuantityRuleSchema = linearPricingQuantityRuleSchema.or(
	maxPricingQuantityRuleSchema,
);
export type PricingQuantityRule = typeof pricingQuantityRuleSchema.infer;

/** A published rate normalized to one vendor unit-hour, without erasing its original unit. */
export const pricingComponentSchema = type({
	id: nonemptyStringSchema,
	resource: pricingResourceSchema,
	billingBasis: "'provisioned' | 'active' | 'max_request_or_usage' | 'provisioned_plus_burst'",
	vendorUnit: nonemptyStringSchema,
	usdPerUnitHour: finiteNonnegativeNumberSchema,
	quantityRule: pricingQuantityRuleSchema,
	"tier?": nonemptyStringSchema,
	"notes?": nonemptyStringSchema,
}).onUndeclaredKey("reject");
export type PricingComponent = typeof pricingComponentSchema.infer;

/** A plan charge or included quantity. These are cited metadata and never discount the headline. */
export const pricingAdjustmentSchema = type({
	kind: "'allowance' | 'fee'",
	plan: nonemptyStringSchema,
	resource: pricingResourceSchema.or("'plan'"),
	quantity: finiteNonnegativeNumberSchema,
	unit: nonemptyStringSchema,
	scope: "'per_sandbox' | 'monthly'",
	"notes?": nonemptyStringSchema,
});
export type PricingAdjustment = typeof pricingAdjustmentSchema.infer;

/** Official evidence for a rate or billing rule, checked on the issue's research date. */
export const pricingSourceSchema = type({
	label: nonemptyStringSchema,
	url: pricingUrlSchema,
	checkedAt: isoDateSchema,
});
export type PricingSource = typeof pricingSourceSchema.infer;

export const exactTargetHourlyCostSchema = type({
	kind: "'exact'",
	componentIds: nonemptyStringSchema.array().atLeastLength(1),
});
export const usageDependentTargetHourlyCostSchema = type({
	kind: "'usage_dependent'",
	reason: nonemptyStringSchema,
});
export const planDependentTargetHourlyCostSchema = type({
	kind: "'plan_dependent'",
	reason: nonemptyStringSchema,
});
export const targetHourlyCostSchema = exactTargetHourlyCostSchema
	.or(usageDependentTargetHourlyCostSchema)
	.or(planDependentTargetHourlyCostSchema);
export type TargetHourlyCost = typeof targetHourlyCostSchema.infer;

/** Published pricing with component identity and exact-cost references enforced together. */
export const publishedProviderPricingSchema = type({
	model: "'published'",
	components: pricingComponentSchema.array().atLeastLength(1),
	"adjustments?": pricingAdjustmentSchema.array(),
	targetHourlyCost: targetHourlyCostSchema,
	notes: nonemptyStringSchema,
	sources: pricingSourceSchema.array().atLeastLength(1),
}).narrow((pricing, ctx) => {
	const componentIds = new Set<string>();
	for (const component of pricing.components) {
		if (componentIds.has(component.id)) {
			return ctx.mustBe("published pricing whose component ids are unique");
		}
		componentIds.add(component.id);
	}
	if (pricing.targetHourlyCost.kind === "exact") {
		const exactIds = new Set<string>();
		for (const id of pricing.targetHourlyCost.componentIds) {
			if (exactIds.has(id)) {
				return ctx.mustBe("published pricing whose exact component ids are unique");
			}
			exactIds.add(id);
			if (!componentIds.has(id)) {
				return ctx.mustBe(
					`published pricing whose exact cost references a component (unknown: ${id})`,
				);
			}
		}
	}
	return true;
});

export const unavailableProviderPricingSchema = type({
	model: "'unavailable'",
	reason: "'self_hosted' | 'unpublished'",
	notes: nonemptyStringSchema,
	"sources?": pricingSourceSchema.array(),
});

export const providerPricingSchema = publishedProviderPricingSchema.or(
	unavailableProviderPricingSchema,
);
export type ProviderPricing = typeof providerPricingSchema.infer;
