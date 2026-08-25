import { type } from "arktype";
import type { TargetSpec } from "./target-spec.ts";

/**
 * Process-boundary parser for the shared target resource vocabulary. Undeclared keys are rejected
 * like every other Tier-3 boundary schema, so a misspelled or drifted resource field fails here
 * instead of being silently dropped and measured as an unrequested shape. `number.safe` keeps
 * fractional resources valid while rejecting NaN, infinities, and magnitudes whose downstream
 * unit conversions could lose precision or overflow.
 */
export const targetSpecSchema = type({
	vcpus: "number.safe > 0",
	memoryGb: "number.safe > 0",
	"diskGb?": "number.safe > 0",
}).onUndeclaredKey("reject");

type Assert<T extends true> = T;
type DeepReadonly<T> = T extends readonly (infer Item)[]
	? readonly DeepReadonly<Item>[]
	: T extends object
		? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
		: T;
type Equal<Left, Right> =
	(<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
		? (<T>() => T extends Right ? 1 : 2) extends <T>() => T extends Left ? 1 : 2
			? true
			: false
		: false;
type _schemaMatchesTargetSpec = Assert<
	Equal<TargetSpec, DeepReadonly<typeof targetSpecSchema.infer>>
>;
type _exactnessRejectsOptionalDrift = Assert<
	Equal<TargetSpec, TargetSpec & { readonly gpu?: string }> extends false ? true : false
>;
