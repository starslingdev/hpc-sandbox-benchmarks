// One-shot equivalence proofs: each projection reproduces the hand-maintained code it replaces,
// for the whole fleet. In the real migration these run in the migration PR and are then deleted
// together with the code they compare against.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ProviderId } from "@sandbox-benchmarks/schema/provider-ids";
import { PROVIDER_IDS } from "@sandbox-benchmarks/schema/provider-ids";
import { bakedArtifactName, REGISTRY } from "@sandbox-benchmarks/schema/providers";
import { RELEASE_UNSCOPABLE_PROVIDERS } from "../../../../apps/cli/src/bin/release-plan.ts";
import { candidateResolvedArtifact } from "../../../../apps/cli/src/lib/bake/validate.ts";
import {
	driverModuleLocation,
	renderDriversProvenance,
} from "../../../../packages/schema/scripts/generate-provider-wiring.ts";
import {
	candidateArtifact,
	declaredIsolationClass,
	figureLabel,
	provenanceEntries,
	providerPackage,
	releaseUnscopable,
	sdkPackageFailures,
} from "./projections.ts";

const ROOT = resolve(import.meta.dir, "../../../..");

// Verbatim copies of two unexported functions, as oracles (packages/figures/src/model.ts and
// packages/results/src/lib/leaderboard.ts).
function legacyFigureProviderName(providerId: string, displayName: string): string {
	if (providerId.startsWith("daytona")) return "Daytona";
	if (providerId.startsWith("modal")) return "Modal";
	if (providerId.startsWith("microsandbox")) return "microsandbox";
	if (providerId.startsWith("vercel")) return "Vercel";
	return displayName;
}
function legacyIsolationClass(
	declared: string | undefined,
): "gvisor" | "container" | "vm" | undefined {
	if (!declared) return undefined;
	const lower = declared.toLowerCase();
	if (lower.includes("gvisor")) return "gvisor";
	if (lower.includes("vm")) return "vm";
	if (lower.includes("container")) return "container";
	return undefined;
}

describe("registry projections reproduce today's restatements", () => {
	test("package location (driverModuleLocation's variant table)", () => {
		for (const id of PROVIDER_IDS) expect(providerPackage(id)).toEqual(driverModuleLocation(id));
	});

	test("candidate artifact (validate.ts#candidateLaunch and the per-provider CandidateRefs)", () => {
		const legacyRefs = {
			freestyleSnapshotCandidate: "sc-123",
			e2bTemplateCandidate: bakedArtifactName("e2b", "candidate"),
			daytonaSnapshotCandidate: bakedArtifactName("daytona-vm", "candidate"),
			daytonaContainerSnapshotCandidate: bakedArtifactName("daytona-container", "candidate"),
			novitaTemplateCandidate: bakedArtifactName("novita", "candidate"),
			runloopBlueprintCandidate: bakedArtifactName("runloop", "candidate"),
			blaxelImageCandidate: bakedArtifactName("blaxel", "candidate"),
			toolchainImageCandidate: "ghcr.io/x/toolchain:candidate",
			vercelImageCandidate: "vcr.example/toolchain:candidate",
		};
		const refs = {
			toolchainImage: legacyRefs.toolchainImageCandidate,
			mirrored: { vercel: legacyRefs.vercelImageCandidate },
			buildResults: { freestyle: legacyRefs.freestyleSnapshotCandidate },
		};
		for (const id of PROVIDER_IDS)
			expect({ id, ...candidateArtifact(id, refs) }).toEqual({
				id,
				...candidateResolvedArtifact(id, legacyRefs),
			} as never);
	});

	test("release scope refusals", () => {
		expect(Object.keys(releaseUnscopable()).sort()).toEqual(
			Object.keys(RELEASE_UNSCOPABLE_PROVIDERS).sort(),
		);
	});

	test("chart labels", () => {
		for (const id of PROVIDER_IDS)
			expect(figureLabel(id)).toBe(legacyFigureProviderName(id, REGISTRY[id].displayName));
	});

	test("declared isolation class", () => {
		for (const id of PROVIDER_IDS)
			expect({ id, cls: declaredIsolationClass(id) }).toEqual({
				id,
				cls: legacyIsolationClass(REGISTRY[id].isolation.technology),
			});
	});

	test("provenance: same packages per file; two deliberate renames", () => {
		const current = [...renderDriversProvenance().entries()].flatMap(([file, source]) =>
			[
				...source.matchAll(/export const (\w+) = Object\.freeze\(\{\n\tpackageName: "([^"]+)"/g),
			].map((match) => [file, match[1] ?? "", match[2] ?? ""] as const),
		);
		const derived = [...provenanceEntries()].map(([directory, entry]) => [
			`packages/${directory}/src/provenance.ts`,
			entry.constant,
			typeof entry.source === "string"
				? entry.source
				: "cli" in entry.source
					? `${entry.source.cli} CLI`
					: entry.source.http,
		]);
		const renamed = current
			.filter(([, constant]) => constant !== "MODAL_NATIVE_PROVENANCE") // alias of MODAL_PROVENANCE
			.map(([file, constant, pkg]) => [
				file,
				constant === "MICROSANDBOX_PROVENANCE" ? "MICROSANDBOX_CLOUD_PROVENANCE" : constant,
				pkg,
			]);
		expect(derived.sort()).toEqual(renamed.sort());
	});
});

describe("Tier-3 metadata check", () => {
	const dependenciesOf = (directory: string) =>
		(
			JSON.parse(readFileSync(resolve(ROOT, `packages/${directory}/package.json`), "utf8")) as {
				dependencies?: Record<string, string>;
			}
		).dependencies ?? {};

	test("catches today's stale sdkPackage values", () => {
		expect(sdkPackageFailures(dependenciesOf, (id: ProviderId) => REGISTRY[id].sdkPackage)).toEqual(
			[
				"runloop: sdkPackage @computesdk/runloop is not a dependency of packages/runloop",
				"namespace: sdkPackage @computesdk/namespace is not a dependency of packages/namespace",
			],
		);
	});

	test("passes for the proposed metadata", () => {
		expect(sdkPackageFailures(dependenciesOf)).toEqual([]);
	});
});
