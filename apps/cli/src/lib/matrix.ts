// Private CLI helper: builds the provider × operation benchmark matrix.
// Imports from schema + templates so the schema → cli import chain is real, not just declared.
import type { Capability } from "@sandbox-benchmarks/schema";
import { capabilities } from "@sandbox-benchmarks/schema";
import { templateProviders } from "@sandbox-benchmarks/templates";

export interface MatrixEntry {
	provider: string;
	operation: Capability;
}

/** Build the full benchmark matrix. Stub: cross product of providers × capabilities. */
export function buildMatrix(providers: readonly string[] = templateProviders): MatrixEntry[] {
	const entries: MatrixEntry[] = [];
	for (const provider of providers) {
		for (const operation of capabilities) {
			entries.push({ provider, operation });
		}
	}
	return entries;
}
