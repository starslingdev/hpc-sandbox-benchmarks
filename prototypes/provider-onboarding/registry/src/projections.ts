// Prototype of the provider registry answering the facts that are restated elsewhere today.
// Every projection is pure and Tier 1 (no arktype, no filesystem). The only metadata changes are
// listed in PROPOSED_META: two stale `sdkPackage` values fixed, `sdkPackage` retyped for CLI
// vendors, `package` for isolation variants, and `figureLabel` where a chart label differs.

import type { ProviderId } from "@sandbox-benchmarks/schema/provider-ids";
import { PROVIDER_IDS } from "@sandbox-benchmarks/schema/provider-ids";
import type { IsolationClass, ProviderArtifact } from "@sandbox-benchmarks/schema/provider-meta";
import type { BakedProviderId, MirroredProviderId } from "@sandbox-benchmarks/schema/providers";
import {
	bakedArtifactName,
	baseImageUse,
	isBakedProviderId,
	REGISTRY,
} from "@sandbox-benchmarks/schema/providers";

/** Retyped `sdkPackage`: an npm package, a pinned CLI, or an HTTP-only vendor's API version. */
export type SdkPackage = string | { readonly cli: string } | { readonly http: string };

/** The proposed metadata fields, as an overlay on today's provider-meta files. */
export interface ProposedMeta {
	readonly sdkPackage?: SdkPackage;
	readonly package?: { readonly directory: string; readonly entry: string };
	readonly figureLabel?: string;
}

export const PROPOSED_META: Readonly<Partial<Record<ProviderId, ProposedMeta>>> = {
	runloop: { sdkPackage: "@runloop/api-client" }, // stale today: "@computesdk/runloop"
	namespace: { sdkPackage: "@namespacelabs/sdk" }, // stale today: "@computesdk/namespace"
	tama: { sdkPackage: { cli: "tama" } }, // today: the string "tama CLI", sniffed by suffix
	"daytona-vm": { package: { directory: "daytona", entry: "vm" } },
	"daytona-container": { package: { directory: "daytona", entry: "container" } },
	"modal-gvisor": { package: { directory: "modal", entry: "gvisor" } },
	"modal-vm": { package: { directory: "modal", entry: "vm" } },
	"microsandbox-cloud": { figureLabel: "microsandbox" },
	vercel: { figureLabel: "Vercel" },
};

const proposed = (id: ProviderId): ProposedMeta => PROPOSED_META[id] ?? {};

export function sdkPackage(id: ProviderId): SdkPackage {
	return proposed(id).sdkPackage ?? REGISTRY[id].sdkPackage;
}

/** Replaces the variant table inside driverModuleLocation. */
export function providerPackage(id: ProviderId) {
	const { directory, entry } = proposed(id).package ?? { directory: id, entry: "index" };
	const packageName = `@sandbox-benchmarks/${directory}`;
	return {
		directory,
		packageName,
		subpath: entry === "index" ? "." : `./${entry}`,
		specifier: entry === "index" ? packageName : `${packageName}/${entry}`,
		file: `packages/${directory}/src/${entry}.ts`,
	};
}

/** Where a baking provider's artifact builder lives (`./artifact`, or `./<variant>/artifact`). */
export function artifactLocation(id: ProviderId) {
	const { directory, packageName, subpath } = providerPackage(id);
	const artifactSubpath = subpath === "." ? "./artifact" : `${subpath}/artifact`;
	return {
		directory,
		packageName,
		subpath: artifactSubpath,
		specifier: `${packageName}/${artifactSubpath.slice(2)}`,
	};
}

/** Read each package manifest once, however many isolation variants share it. */
export function memoize<V>(load: (key: string) => V): (key: string) => V {
	const cache = new Map<string, V>();
	return (key) => {
		if (!cache.has(key)) cache.set(key, load(key));
		return cache.get(key) as V;
	};
}

export const provenanceConstant = (directory: string) =>
	`${directory.toUpperCase().replaceAll("-", "_")}_PROVENANCE`;

/** Candidate refs keyed by artifact kind, so the bag no longer grows one field per provider. */
export interface CandidateRefs {
	readonly toolchainImage: string;
	readonly mirrored: Readonly<Partial<Record<MirroredProviderId, string>>>;
	/** Immutable ids returned by builders whose artifact name is not the boot ref (native snapshots). */
	readonly buildResults: Readonly<Partial<Record<BakedProviderId, string>>>;
}

/** Replaces validate.ts#candidateLaunch; create options stay the driver's business. */
export function candidateArtifact(
	id: ProviderId,
	refs: CandidateRefs,
): { readonly kind: "none" } | { readonly kind: string; readonly ref: string } {
	const artifact: ProviderArtifact = REGISTRY[id].artifact;
	switch (artifact.kind) {
		case "none":
			return { kind: "none" };
		case "image":
			return { kind: "image", ref: refs.toolchainImage };
		case "mirror": {
			const ref = refs.mirrored[id as MirroredProviderId];
			if (!ref) throw new Error(`${id} mirrored candidate ref was not resolved`);
			return { kind: "mirror", ref };
		}
		case "baked": {
			if (!isBakedProviderId(id)) throw new Error(`${id} is not a baked provider`);
			if (baseImageUse(id) !== "bakes") {
				// Native snapshots: the boot ref is the builder's immutable result, not the name.
				const ref = refs.buildResults[id];
				if (!ref) throw new Error(`${id} candidate snapshot ID was not resolved`);
				return { kind: "baked", ref };
			}
			return { kind: "baked", ref: bakedArtifactName(id, "candidate") };
		}
	}
}

/** Replaces RELEASE_UNSCOPABLE_PROVIDERS: a stock-image provider has nothing to publish. */
export function releaseUnscopable(): Partial<Record<ProviderId, string>> {
	return Object.fromEntries(
		PROVIDER_IDS.filter((id) => REGISTRY[id].artifact.kind === "none").map((id) => [
			id,
			`${REGISTRY[id].displayName} boots an image this repository does not build or publish`,
		]),
	);
}

/** Replaces figures' id-prefix map. */
export function figureLabel(id: ProviderId): string {
	const override = proposed(id).figureLabel;
	if (override) return override;
	// Isolation variants sharing one package are one vendor on a chart.
	const { directory } = providerPackage(id);
	const shared = PROVIDER_IDS.some(
		(other) => other !== id && providerPackage(other).directory === directory,
	);
	return shared ? REGISTRY[id].vendor : REGISTRY[id].displayName;
}

/** Replaces the leaderboard's substring sniffing over the technology string. */
export function declaredIsolationClass(id: ProviderId): "gvisor" | "container" | "vm" | undefined {
	const declared: IsolationClass = REGISTRY[id].isolation.class;
	switch (declared) {
		case "userspace":
			return "gvisor";
		case "vm":
		case "microVM":
			return "vm";
		case "container":
			return "container";
		default:
			return undefined;
	}
}

/** Replaces renderDriversProvenance's hand-written entry table. One constant per package. */
export function provenanceEntries() {
	const byDirectory = new Map<string, { constant: string; source: SdkPackage }>();
	for (const id of PROVIDER_IDS) {
		const { directory } = providerPackage(id);
		if (byDirectory.has(directory)) continue;
		byDirectory.set(directory, {
			constant: provenanceConstant(directory),
			source: sdkPackage(id),
		});
	}
	return byDirectory;
}

/**
 * Tier 3 (generator-time, reads package manifests): an npm `sdkPackage` must be a runtime
 * dependency of the provider's own package. This is the check that would have caught the stale
 * Runloop and Namespace metadata.
 */
export function sdkPackageFailures(
	dependenciesOf: (directory: string) => Readonly<Record<string, string>>,
	sdkPackageOf: (id: ProviderId) => SdkPackage = sdkPackage,
): string[] {
	const dependenciesFor = memoize(dependenciesOf);
	const failures: string[] = [];
	for (const id of PROVIDER_IDS) {
		const source = sdkPackageOf(id);
		if (typeof source !== "string" || source.endsWith(" CLI")) continue;
		const { directory } = providerPackage(id);
		if (!(source in dependenciesFor(directory)))
			failures.push(`${id}: sdkPackage ${source} is not a dependency of packages/${directory}`);
	}
	return failures;
}
