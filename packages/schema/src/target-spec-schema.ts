import { type } from "arktype";
import type { TargetSpec } from "./target-spec.ts";

/** Process-boundary parser for the shared target resource vocabulary. */
export const targetSpecSchema = type({
	vcpus: "number > 0",
	memoryGb: "number > 0",
	"diskGb?": "number > 0",
});

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
