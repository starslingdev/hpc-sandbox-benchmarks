import { type } from "arktype";
import { canonicalJsonString, PROVIDER_RESPONSE_LIMITS } from "./canonical-json.ts";
import { providerIdSchema, runIdSchema } from "./identifiers.ts";
import { suiteNameSchema } from "./suites.ts";

const boundedString = (maximum: number) =>
	type("string >= 1").narrow(
		(value, ctx) =>
			value.length <= maximum || ctx.mustBe(`a non-empty string of at most ${maximum} characters`),
	);
const identifierString = boundedString(256);
const detailString = boundedString(512);
const urlString = type("string.url").narrow(
	(value, ctx) => value.length <= 2_048 || ctx.mustBe("a URL of at most 2048 characters"),
);
const finiteNonNegativeNumber = type("number >= 0").narrow(
	(value, ctx) => Number.isFinite(value) || ctx.mustBe("a finite non-negative number"),
);

/** Identity of one benchmark sandbox cell. */
export const providerCostCellSchema = type({
	runId: runIdSchema,
	providerId: providerIdSchema,
	suite: suiteNameSchema,
	"replicateIndex?": "number.integer >= 0",
}).onUndeclaredKey("reject");
export type ProviderCostCell = typeof providerCostCellSchema.infer;

/** The benchmark sandbox is the only billable subject evidence may claim. Other ids are context only. */
export const providerCostSubjectSchema = type({
	kind: "'sandbox'",
	"sandboxId?": identifierString,
	"appId?": identifierString,
	"appName?": identifierString,
	"organizationId?": identifierString,
	"workspaceId?": identifierString,
	"accountId?": identifierString,
}).onUndeclaredKey("reject");
export type ProviderCostSubject = typeof providerCostSubjectSchema.infer;

export const sdkProvenanceSchema = type({
	packageName: identifierString,
	version: identifierString,
}).onUndeclaredKey("reject");
export type SdkProvenance = typeof sdkProvenanceSchema.infer;

export const providerUsageQuantitySchema = type({
	resource: identifierString,
	quantity: finiteNonNegativeNumber,
	unit: identifierString,
}).onUndeclaredKey("reject");
export type ProviderUsageQuantity = typeof providerUsageQuantitySchema.infer;

export const calculationProvenanceSchema = type({
	componentIds: identifierString.array().atLeastLength(1).atMostLength(64),
	rateVerifiedAt: "string.date.iso",
	sourceUrls: urlString.array().atLeastLength(1).atMostLength(64),
}).onUndeclaredKey("reject");
export type CalculationProvenance = typeof calculationProvenanceSchema.infer;

/** Canonical bounded JSON text. Provider code additionally owns credential redaction. */
export const providerResponseJsonSchema = type("string >= 1").narrow((value, ctx) => {
	try {
		if (new TextEncoder().encode(value).byteLength > PROVIDER_RESPONSE_LIMITS.maxBytes) {
			return ctx.mustBe("canonical provider response JSON of at most 64 KiB");
		}
		const parsed: unknown = JSON.parse(value);
		if (canonicalJsonString(parsed) !== value) {
			return ctx.mustBe("a canonical JSON string containing an object or array");
		}
		return true;
	} catch {
		return ctx.mustBe("a canonical JSON string containing an object or array");
	}
});

const observedBaseSchema = type({
	kind: "'observed'",
	cell: providerCostCellSchema,
	subject: providerCostSubjectSchema,
	capturedAt: "string.date.iso",
	sdk: sdkProvenanceSchema,
	apiOperation: identifierString,
	usage: providerUsageQuantitySchema.array().atLeastLength(1).atMostLength(128),
	amount: finiteNonNegativeNumber,
	currency: type("string").matching("^[A-Z]{3}$"),
	source: "'provider_reported' | 'calculated_from_provider_usage'",
	responseJson: providerResponseJsonSchema,
	"calculation?": calculationProvenanceSchema,
}).onUndeclaredKey("reject");

export const observedProviderCostEvidenceSchema = observedBaseSchema.narrow((record, ctx) => {
	if (record.subject.sandboxId === undefined) {
		return ctx.mustBe("sandbox-scoped observed evidence with a sandboxId");
	}
	if (record.source === "calculated_from_provider_usage" && record.calculation === undefined) {
		return ctx.mustBe("calculated evidence with calculation provenance");
	}
	if (record.source === "provider_reported" && record.calculation !== undefined) {
		return ctx.mustBe("provider-reported evidence without calculation provenance");
	}
	return true;
});
export type ObservedProviderCostEvidence = typeof observedProviderCostEvidenceSchema.infer;

export const missingProviderCostEvidenceSchema = type({
	kind: "'missing'",
	cell: providerCostCellSchema,
	subject: providerCostSubjectSchema,
	capturedAt: "string.date.iso",
	sdk: sdkProvenanceSchema,
	reason:
		"'unsupported_public_api' | 'not_sandbox_scoped' | 'provider_api_error' | 'invalid_provider_response' | 'sandbox_teardown_unconfirmed'",
	detail: detailString,
	"apiOperation?": identifierString,
	"responseJson?": providerResponseJsonSchema,
}).onUndeclaredKey("reject");
export type MissingProviderCostEvidence = typeof missingProviderCostEvidenceSchema.infer;

export const providerCostEvidenceSchema = observedProviderCostEvidenceSchema.or(
	missingProviderCostEvidenceSchema,
);
export type ProviderCostEvidence = typeof providerCostEvidenceSchema.infer;

/** Deterministic identity of one Run/provider/suite/replicate cell. */
export function providerCostCellKey(record: Pick<ProviderCostEvidence, "cell">): string {
	const { runId, providerId, suite, replicateIndex } = record.cell;
	return [
		runId,
		providerId,
		suite,
		replicateIndex === undefined ? "single" : String(replicateIndex),
	].join("\u0000");
}

/** Exact total relative only to the authoritative expected cells supplied by the caller. */
export function providerCostTotal(
	records: readonly ProviderCostEvidence[],
	expectedCells: readonly ProviderCostCell[],
): { amount: number; currency: string } | null {
	if (records.length === 0 || expectedCells.length === 0) return null;
	const expected = new Set<string>();
	for (const input of expectedCells) {
		const cell = providerCostCellSchema(input);
		if (cell instanceof type.errors) return null;
		const key = providerCostCellKey({ cell });
		if (expected.has(key)) return null;
		expected.add(key);
	}
	if (records.length !== expected.size) return null;
	const cells = new Set<string>();
	const sandboxes = new Set<string>();
	let currency: string | undefined;
	let amount = 0;
	for (const input of records) {
		const record = providerCostEvidenceSchema(input);
		if (record instanceof type.errors) return null;
		if (record.kind !== "observed") return null;
		const cell = providerCostCellKey(record);
		const sandboxId = record.subject.sandboxId;
		if (
			!expected.has(cell) ||
			sandboxId === undefined ||
			cells.has(cell) ||
			sandboxes.has(sandboxId)
		) {
			return null;
		}
		cells.add(cell);
		sandboxes.add(sandboxId);
		if (currency !== undefined && currency !== record.currency) return null;
		currency = record.currency;
		amount += record.amount;
		if (!Number.isFinite(amount)) return null;
	}
	return currency === undefined || cells.size !== expected.size ? null : { amount, currency };
}
