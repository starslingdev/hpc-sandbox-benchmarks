import { type } from "arktype";
import type { ProviderId } from "./provider-ids.ts";
import { PROVIDER_IDS, RETIRED_PROVIDER_IDS } from "./provider-ids.ts";

/** Process-boundary parser for the canonical provider vocabulary. */
export const providerIdSchema = type.enumerated(...PROVIDER_IDS);

type Assert<T extends true> = T;
type _schemaMatchesIdentity = Assert<
	[typeof providerIdSchema.infer] extends [ProviderId]
		? [ProviderId] extends [typeof providerIdSchema.infer]
			? true
			: false
		: false
>;

/** Whether a recorded provider id is still registered (not retired). */
export const isProviderId = (value: string): value is ProviderId =>
	(PROVIDER_IDS as readonly string[]).includes(value);

/** A provider id a committed Run may record: a registered one, or one since retired. */
export const recordedProviderIdSchema = providerIdSchema.or(
	type.enumerated(...RETIRED_PROVIDER_IDS),
);

/** Parse argv, environment, workflow, or persisted input into a canonical provider id. */
export function parseProviderId(value: unknown): ProviderId {
	const parsed = providerIdSchema(value);
	if (parsed instanceof type.errors) {
		throw new Error(`invalid provider id: ${parsed.summary}`);
	}
	return parsed;
}
