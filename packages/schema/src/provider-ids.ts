/**
 * Canonical provider identity.
 *
 * This is intentionally a dependency-free leaf: code that only needs to name a provider must not
 * evaluate arktype, the provider registry, or the Run schema graph. Runtime parsing belongs in
 * `provider-parsers.ts`.
 */
export const PROVIDER_IDS = [
	"e2b",
	"daytona-vm",
	"daytona-container",
	"blaxel",
	"microsandbox-cloud",
	"modal-gvisor",
	"modal-vm",
	"novita",
	"namespace",
	"vercel",
	"runcloud",
	"tama",
	"boat",
	"freestyle",
	"brezel",
	"digitalocean",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * Providers removed from the registry whose evidence committed Run documents still carry. Those
 * Runs stay published as historical snapshots, so their per-cell evidence must keep parsing; nothing
 * can create a new cell for one.
 */
export const RETIRED_PROVIDER_IDS = ["runloop"] as const;
