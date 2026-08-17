// The typed join (ADR-0007 §3): a driver binds to the registry through one autocompleted id
// parameter, and everything it may touch derives from that id. This root module imports the
// registry TYPE only so the driver kit remains runtime dependency-free; ../env.ts is the explicit
// arktype boundary that evaluates the same descriptor tuple.

import type { ProviderId, ProviderInput, REGISTRY } from "@sandbox-benchmarks/schema/providers";
import type { CreateBudget, SandboxDriver } from "./port.ts";

type Prettify<T> = { [K in keyof T]: T[K] } & {};

type InputName<I extends ProviderInput> = I extends string
	? I
	: I extends { readonly name: infer N extends string }
		? N
		: never;

type IsResolvedOptional<I extends ProviderInput> = I extends string
	? false
	: I extends { readonly default: string }
		? false
		: I extends { readonly required: false }
			? true
			: false;

type IsInputOptional<I extends ProviderInput> = I extends string
	? false
	: I extends { readonly default: string }
		? true
		: I extends { readonly required: false }
			? true
			: false;

/** The raw input slice: defaulted and genuinely optional fields may both be absent. */
export type EnvInputFromInputs<I extends readonly ProviderInput[]> = Prettify<
	{
		readonly [C in I[number] as IsInputOptional<C> extends true ? never : InputName<C>]: string;
	} & {
		readonly [C in I[number] as IsInputOptional<C> extends true ? InputName<C> : never]?: string;
	}
>;

/**
 * The resolved env slice for a literal provider-input tuple.
 *
 * Required inputs and inputs with defaults are always strings in driver code. Only inputs that
 * explicitly declare `required: false` without a default remain optional after parsing.
 */
export type EnvFromInputs<I extends readonly ProviderInput[]> = Prettify<
	{
		readonly [C in I[number] as IsResolvedOptional<C> extends true ? never : InputName<C>]: string;
	} & {
		readonly [C in I[number] as IsResolvedOptional<C> extends true ? InputName<C> : never]?: string;
	}
>;

/**
 * The env slice a driver may read: exactly the variables its provider declares. Reading an
 * undeclared credential is a compile error — "never read process.env here" is unrepresentable
 * rather than a comment.
 */
export type EnvOf<P extends ProviderId> = P extends ProviderId
	? EnvFromInputs<(typeof REGISTRY)[P]["inputs"]>
	: never;

/** The provider input accepted before defaults are applied. */
export type EnvInputOf<P extends ProviderId> = P extends ProviderId
	? EnvInputFromInputs<(typeof REGISTRY)[P]["inputs"]>
	: never;

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
