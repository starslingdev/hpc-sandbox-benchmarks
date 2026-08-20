import { type } from "arktype";

/** A filename-safe Run identity. GitHub numeric ids and aggregate `id+id` forms are both canonical. */
export const runIdSchema = type("string >= 1").matching("^[A-Za-z0-9][A-Za-z0-9._+-]*$");
export type RunId = typeof runIdSchema.infer;

/** Canonical provider ids shared by registries, Runs, and cost cells. */
export const providerIdSchema = type(
	"'e2b' | 'daytona-vm' | 'daytona-container' | 'modal-gvisor' | 'modal-vm' | 'blaxel' | 'microsandbox-local' | 'microsandbox-cloud' | 'novita' | 'runloop' | 'namespace' | 'vercel' | 'runcloud' | 'cursor-cloud-agent' | 'claude-cloud'",
);
export type ProviderId = typeof providerIdSchema.infer;
