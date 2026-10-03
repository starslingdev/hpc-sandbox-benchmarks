// The registry's answers to every fact other packages used to restate by hand. Two layers: invariants
// that never need an edit when a provider is added, and ONE reviewed snapshot of the projection.
// `bun run generate-providers` refreshes the snapshot, so adding a provider is a one-file snapshot
// diff, which keeps the "a human must look at the new row" property the hand-maintained id lists
// existed for.

import { describe, expect, test } from "bun:test";
import { candidateArtifact, releaseUnscopable } from "./provider-artifacts.ts";
import { PROVIDER_IDS } from "./provider-ids.ts";
import type { ProviderMetaSource, ProviderSdkPackage } from "./provider-meta.ts";
import {
	declaredIsolationClass,
	figureLabel,
	PROVIDERS,
	provenanceConstant,
	providerPackage,
	quotaDomain,
	REGISTRY,
} from "./providers.ts";

const meta = (id: (typeof PROVIDER_IDS)[number]): ProviderMetaSource => REGISTRY[id];

/** What a release validates for a provider, without the version-specific names it resolves to. */
function candidateBoots(id: (typeof PROVIDER_IDS)[number]): string {
	const artifact = meta(id).artifact;
	if (artifact.kind === "mirror") return "the ref mirrored by the release lane";
	if (artifact.kind === "baked" && artifact.source === "native-snapshot")
		return "the snapshot id its builder returns";
	const candidate = candidateArtifact(id, {
		toolchainImage: "<toolchain>",
		mirrored: {},
		buildResults: {},
	});
	if (candidate.kind === "none")
		return "nothing: an image this repository does not build or publish";
	return candidate.ref === "<toolchain>"
		? "the toolchain image candidate"
		: `the derived baked name${"nameSuffix" in artifact && artifact.nameSuffix ? ` (suffix ${artifact.nameSuffix})` : ""}`;
}

const sdkLabel = (source: ProviderSdkPackage): string =>
	typeof source === "string" ? source : "cli" in source ? `${source.cli} CLI` : source.http;

describe("registry invariants (never edited per provider)", () => {
	test("isolation variants are exactly the ids sharing a provider package, and share its vendor", () => {
		const byDirectory = Map.groupBy(PROVIDER_IDS, (id) => providerPackage(id).directory);
		for (const [directory, ids] of byDirectory) {
			expect(new Set(ids.map((id) => meta(id).vendor)).size).toBe(1);
			expect(new Set(ids.map((id) => providerPackage(id).specifier)).size).toBe(ids.length);
			// One package reports one provenance, so its variants declare one vendor library.
			expect(new Set(ids.map((id) => sdkLabel(meta(id).sdkPackage))).size).toBe(1);
			if (ids.length === 1) expect(directory).toBe(ids[0] as string);
		}
	});

	test("chart labels default to the vendor for variants and the display name otherwise", () => {
		for (const id of PROVIDER_IDS) {
			const { directory } = providerPackage(id);
			const shared = PROVIDER_IDS.some(
				(other) => other !== id && providerPackage(other).directory === directory,
			);
			const fallback = shared ? meta(id).vendor : meta(id).displayName;
			expect(figureLabel(id)).toBe(meta(id).figureLabel ?? fallback);
		}
	});

	test("every provider package has one distinct provenance constant", () => {
		const directories = new Set(PROVIDER_IDS.map((id) => providerPackage(id).directory));
		const constants = new Set([...directories].map(provenanceConstant));
		expect(constants.size).toBe(directories.size);
		for (const constant of constants) expect(constant).toMatch(/^[A-Z][A-Z0-9_]*_PROVENANCE$/);
	});

	test("a declared isolation class always maps to a probe class unless it is unknown", () => {
		for (const id of PROVIDER_IDS) {
			const declared = meta(id).isolation.class;
			expect(declaredIsolationClass(id) === undefined).toBe(declared === "unknown");
		}
	});
});

test("registry projection (review this snapshot when adding or changing a provider)", () => {
	const unscopable = releaseUnscopable();
	const projection = Object.fromEntries(
		PROVIDERS.map((provider) => {
			const { id } = provider;
			const location = providerPackage(id);
			return [
				id,
				{
					artifact: provider.artifact.kind,
					candidateBoots: candidateBoots(id),
					requiredInputs: provider.requiredEnvVars,
					isolation: { declared: provider.isolation.class, probe: declaredIsolationClass(id) },
					runtimeIdentity: provider.runtimeIdentity ?? "root",
					quotaDomain: quotaDomain(id),
					package: { specifier: location.specifier, file: location.file },
					provenance: {
						constant: provenanceConstant(location.directory),
						sdkPackage: provider.sdkPackage,
					},
					figureLabel: figureLabel(id),
					releaseScopable: unscopable[id] === undefined,
				},
			];
		}),
	);
	expect(projection).toMatchSnapshot();
});
