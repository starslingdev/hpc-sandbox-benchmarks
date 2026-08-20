import { type } from "arktype";

// Compatibility re-exports. New lightweight consumers should import `./provider-ids`; process
// boundaries should import `./provider-parsers` explicitly.
export type { ProviderId } from "./provider-ids.ts";
export { providerIdSchema } from "./provider-parsers.ts";

/** A filename-safe Run identity. GitHub numeric ids and aggregate `id+id` forms are both canonical. */
export const runIdSchema = type("string >= 1").matching("^[A-Za-z0-9][A-Za-z0-9._+-]*$");
export type RunId = typeof runIdSchema.infer;
