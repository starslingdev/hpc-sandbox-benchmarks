// Prototype of the generated fleet joins in packages/drivers: DRIVERS (rendered by the existing
// generator) plus ARTIFACT_BUILDERS. The generator checks `./artifact` exactness against the
// registry: a provider whose artifact bakes from the OCI base must export it, and no other may.
// Native-snapshot bakers get a builder derived from their driver's snapshot capability instead.

import type { ProviderId } from "@sandbox-benchmarks/schema/provider-ids";
import { baseImageUse } from "@sandbox-benchmarks/schema/providers";
import { renderDriversIndex } from "../../../../../packages/schema/scripts/generate-provider-wiring.ts";
import { artifactLocation, memoize } from "../../../registry/src/projections.ts";

export interface FleetEntry {
	readonly id: ProviderId;
	/** Present exactly when the provider bakes from the OCI base. */
	readonly artifact?: string;
}

// Mirrors the generator's private tsProperty; export that one when this moves into the generator.
const tsKey = (id: string) => (/^[A-Za-z_$][\w$]*$/.test(id) ? id : JSON.stringify(id));

export function fleetProjection(
	ids: readonly ProviderId[],
	exportsOf: (directory: string) => Readonly<Record<string, string>>,
): { readonly entries: FleetEntry[]; readonly failures: string[] } {
	const exportsFor = memoize(exportsOf);
	const entries: FleetEntry[] = [];
	const failures: string[] = [];
	for (const id of ids) {
		const location = artifactLocation(id);
		const needsBuilder = baseImageUse(id) === "bakes";
		const exported = location.subpath in exportsFor(location.directory);
		if (needsBuilder && !exported)
			failures.push(
				`${id}: baked artifact needs ${location.packageName} to export ${location.subpath}`,
			);
		if (!needsBuilder && exported)
			failures.push(
				`${id}: ${location.packageName} exports ${location.subpath} but ${id} does not bake one`,
			);
		entries.push({ id, ...(needsBuilder && { artifact: location.specifier }) });
	}
	return { entries, failures };
}

export function renderFleetJoins(entries: readonly FleetEntry[]): string {
	const builders = entries.flatMap((entry) =>
		entry.artifact
			? [
					`\t${tsKey(entry.id)}: () => import("${entry.artifact}").then((module) => module.default),`,
				]
			: [],
	);
	return [
		renderDriversIndex(entries.map((entry) => entry.id)),
		"/** Exhaustive over baked providers; loading one never evaluates any driver. */",
		"export const ARTIFACT_BUILDERS = Object.freeze({",
		...builders,
		"});",
		"",
	].join("\n");
}
