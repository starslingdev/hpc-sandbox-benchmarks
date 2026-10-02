// Prototype: the three remaining hand-maintained provider switches, derived from metadata.
//
// Each table below is what would move INTO the provider's metadata file (one field each). The
// derivation functions replace, respectively, renderDriversProvenance's entry table,
// apps/cli/src/lib/bake/validate.ts#candidateLaunch, and release-plan's RELEASE_UNSCOPABLE_PROVIDERS.
// A new provider adds zero lines to any of them when it follows the defaults.

import type { ProviderId } from "@sandbox-benchmarks/schema/provider-ids";
import { PROVIDER_IDS } from "@sandbox-benchmarks/schema/provider-ids";
import { REGISTRY } from "@sandbox-benchmarks/schema/providers";

/* -------------------------------- provenance -------------------------------- */

export interface ProvenanceEntry {
	readonly constant: string;
	readonly packageName: string;
	readonly versionFrom: "catalog" | { readonly action: string };
	readonly directory: string;
}

/**
 * Proposed meta field `provenance?: { constant?, extra? }`. Only today's irregular cases need it;
 * two are stale metadata (`sdkPackage` still names the ComputeSDK wrapper the driver no longer uses),
 * which the derivation surfaces instead of hiding behind a hand-written table.
 */
export const PROVENANCE_OVERRIDES: Partial<
	Record<ProviderId, { readonly constant?: string; readonly packageName?: string }>
> = {
	"microsandbox-cloud": { constant: "MICROSANDBOX" },
	namespace: { packageName: "@namespacelabs/sdk" }, // stale meta: "@computesdk/namespace"
	runloop: { packageName: "@runloop/api-client" }, // stale meta: "@computesdk/runloop"
};

/** Extra aliases a package exports beside its primary constant (cost-evidence consumers). */
export const PROVENANCE_ALIASES: readonly ProvenanceEntry[] = [
	{ constant: "MODAL_NATIVE", packageName: "modal", versionFrom: "catalog", directory: "modal" },
];

export function provenanceEntries(directoryOf: (id: ProviderId) => string): ProvenanceEntry[] {
	const seen = new Set<string>();
	const entries: ProvenanceEntry[] = [];
	for (const id of PROVIDER_IDS) {
		const directory = directoryOf(id);
		if (seen.has(directory)) continue; // isolation variants share one package and one pin
		seen.add(directory);
		const meta = REGISTRY[id];
		const override = PROVENANCE_OVERRIDES[id];
		const cli = meta.sdkPackage.endsWith(" CLI");
		entries.push({
			constant: override?.constant ?? directory.toUpperCase().replaceAll("-", "_"),
			packageName: override?.packageName ?? meta.sdkPackage,
			// A CLI has no npm pin; its checksum-pinned setup action is the single version source.
			versionFrom: cli ? { action: `.github/actions/setup-${directory}/action.yml` } : "catalog",
			directory,
		});
	}
	return [...entries, ...PROVENANCE_ALIASES];
}

/* ------------------------------ candidate launch ------------------------------ */

/**
 * Proposed meta field `artifact.boot`. The create option key that points a sandbox at an artifact
 * ref, plus the two irregularities the fleet actually has (a tag suffix and a region input).
 */
export const BOOT: Partial<
	Record<ProviderId, { readonly key: string; readonly suffix?: string; readonly target?: string }>
> = {
	e2b: { key: "snapshotId" },
	novita: { key: "snapshotId" },
	freestyle: { key: "snapshotId" },
	"daytona-vm": { key: "snapshotId", target: "daytonaVmTarget" },
	"daytona-container": { key: "snapshotId", target: "daytonaContainerTarget" },
	runloop: { key: "blueprint_name" },
	blaxel: { key: "image", suffix: ":latest" },
	"modal-gvisor": { key: "templateId" },
	"modal-vm": { key: "templateId" },
	"microsandbox-cloud": { key: "templateId" },
	vercel: { key: "templateId" },
	namespace: { key: "image" },
	runcloud: { key: "image" },
	tama: { key: "image" },
};

export function deriveCandidateLaunch(
	id: ProviderId,
	ref: string | undefined,
	targets: Readonly<Record<string, string | undefined>> = {},
) {
	const kind = REGISTRY[id].artifact.kind;
	const boot = BOOT[id];
	if (kind === "none" || boot === undefined)
		return { artifact: { kind: "none" as const }, createOptions: {} };
	if (!ref) throw new Error(`${id} candidate ref was not resolved`);
	const target = boot.target ? targets[boot.target] : undefined;
	return {
		artifact: { kind, ref },
		createOptions: {
			[boot.key]: `${ref}${boot.suffix ?? ""}`,
			...(target ? { target } : {}),
		},
	};
}

/* ------------------------------- release scope ------------------------------- */

/** A stock-image provider has nothing to publish, so a scoped release cannot ship it. */
export function deriveReleaseUnscopable(): Partial<Record<ProviderId, string>> {
	return Object.fromEntries(
		PROVIDER_IDS.filter((id) => REGISTRY[id].artifact.kind === "none").map((id) => [
			id,
			`${REGISTRY[id].displayName} boots an image this repository does not build or publish`,
		]),
	);
}
