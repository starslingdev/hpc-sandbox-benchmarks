// Artifact provenance for a published Run (ADR-0007 §2, ADR-0008 §2's artifact-identity row).
//
// The benchmark's headline claim is "this provider, running THIS toolchain, produced these numbers".
// Until now the document recorded the numbers and the provider but never the third term: which
// artifact actually booted. The requested ref was the only thing written down, and a requested ref is
// not an observation — it is the instruction we gave, restated.
//
// So the evidence is a discriminated union over HOW the effective artifact was established, not a
// bag of optional fields plus a label that could disagree with them. `{ source: "guest-fingerprint" }`
// without a fingerprint is unrepresentable rather than merely invalid, which is the same discipline
// ADR-0007 applies to `ExecutionPolicy` and `Exit`.

import { type } from "arktype";
import { providerCostCellSchema } from "./cost-evidence.ts";
import type { DriverResolvedArtifact } from "./driver-schemas.ts";
import { resolvedArtifactSchema } from "./driver-schemas.ts";
import { bakedArtifactName, isBakedProviderId } from "./provider-artifacts.ts";
import type { ProviderId } from "./provider-ids.ts";
import { REGISTRY } from "./provider-meta/index.ts";
import {
	TOOLCHAIN_IMAGE_NAME,
	TOOLCHAIN_IMAGE_REPOSITORY,
	TOOLCHAIN_VERSION,
	toolchainImageRef,
	VERCEL_PROJECT_NAME_DEFAULT,
	VERCEL_TEAM_SLUG_DEFAULT,
	vercelVcrImageRefs,
} from "./toolchain.ts";

const boundedString = (maximum: number) =>
	type("string >= 1").narrow(
		(value, ctx) =>
			value.length <= maximum || ctx.mustBe(`a non-empty string of at most ${maximum} characters`),
	);

/** One bounded field read from the in-guest toolchain manifest. */
const fingerprintString = boundedString(256);

/**
 * What the guest actually reported from the release-owned manifest.
 *
 * The expected value is deliberately NOT persisted beside it: letting a producer supply both
 * `expected` and `observed` permits any internally consistent pair. The provider/artifact mapping
 * below derives the expectation from release constants, then the evidence schema performs the
 * comparison. That is what makes `guest-fingerprint` an observation rather than two matching claims.
 */
export const guestFingerprintSchema = type({
	authority: "'toolchain-manifest-v1'",
	imageName: fingerprintString,
	imageVersion: fingerprintString,
}).onUndeclaredKey("reject");
export type GuestFingerprint = typeof guestFingerprintSchema.infer;
const sandboxIdString = boundedString(256);

const EXPECTED_TOOLCHAIN_FINGERPRINT: GuestFingerprint = Object.freeze({
	authority: "toolchain-manifest-v1",
	imageName: TOOLCHAIN_IMAGE_NAME,
	imageVersion: TOOLCHAIN_VERSION,
});

/**
 * Release-owned fingerprint for a canonical provider artifact.
 *
 * Returning `undefined` is intentional for stock boots and arbitrary overrides: those can still be
 * recorded as request fallback (or driver-reported), but a producer cannot upgrade them to guest
 * verification without first adding an authoritative release mapping here.
 */
export function expectedToolchainFingerprint(
	providerId: ProviderId,
	requested: DriverResolvedArtifact,
): GuestFingerprint | undefined {
	const descriptor = REGISTRY[providerId].artifact;
	if (descriptor.kind !== requested.kind || requested.kind === "none") return;
	let canonical = false;
	switch (requested.kind) {
		case "image":
			canonical =
				requested.ref === toolchainImageRef("version") ||
				requested.ref === toolchainImageRef("candidate") ||
				isRepositoryDigest(requested.ref, TOOLCHAIN_IMAGE_REPOSITORY);
			break;
		case "baked":
			if (isBakedProviderId(providerId)) {
				canonical =
					requested.ref === bakedArtifactName(providerId, "version") ||
					requested.ref === bakedArtifactName(providerId, "candidate");
			}
			break;
		case "mirror": {
			const refs = vercelVcrImageRefs(VERCEL_TEAM_SLUG_DEFAULT, VERCEL_PROJECT_NAME_DEFAULT);
			canonical =
				requested.ref === refs.version ||
				requested.ref === refs.candidate ||
				isRepositoryDigest(requested.ref, refs.repository);
			break;
		}
	}
	return canonical ? EXPECTED_TOOLCHAIN_FINGERPRINT : undefined;
}

/** A content-addressed image inside a release-owned repository (the bake validation path). */
function isRepositoryDigest(ref: string, repository: string): boolean {
	const prefix = `${repository}@sha256:`;
	return ref.startsWith(prefix) && /^[a-f0-9]{64}$/.test(ref.slice(prefix.length));
}

/**
 * How the effective boot artifact was established, strongest evidence last.
 *
 * - `request-fallback` — nobody observed the boot. The vendor exposes no report and no fingerprint
 *   was taken, so all we can honestly say is what we asked for. ADR-0008 §5 treats this as
 *   `unverified` for matrix admission: it is the absence of evidence, not weak evidence.
 * - `driver-reported` — the control plane confirmed what it booted. `reported` must equal
 *   `requested`, because ADR-0007 makes a differing report a create-time contradiction that tears
 *   down the orphan; a persisted disagreement would mean that teardown did not happen.
 * - `guest-fingerprint` — the strongest form: the guest itself identified the artifact from inside
 *   the sandbox, so the claim no longer depends on the control plane being truthful. Only the
 *   observed manifest identity is recorded; the schema derives the expected identity from release
 *   constants and the provider's canonical requested artifact.
 */
export const artifactProvenanceSchema = type
	.or(
		{ source: "'request-fallback'", requested: resolvedArtifactSchema },
		{
			source: "'driver-reported'",
			requested: resolvedArtifactSchema,
			reported: resolvedArtifactSchema,
		},
		{
			source: "'guest-fingerprint'",
			requested: resolvedArtifactSchema,
			fingerprint: guestFingerprintSchema,
			"reported?": resolvedArtifactSchema,
		},
	)
	.onUndeclaredKey("reject")
	.narrow((provenance, ctx) => {
		if (!("reported" in provenance) || provenance.reported === undefined) return true;
		const { requested, reported } = provenance;
		if (reported.kind !== requested.kind) {
			return ctx.mustBe(
				`a driver-reported artifact whose kind matches the request (requested ${requested.kind}, reported ${reported.kind})`,
			);
		}
		// `kind: "none"` carries no ref on either side, so the refs agree by construction.
		if ("ref" in requested && "ref" in reported && requested.ref !== reported.ref) {
			return ctx.mustBe(
				`a driver-reported artifact whose ref matches the request (requested ${requested.ref}, reported ${reported.ref})`,
			);
		}
		return true;
	});
export type ArtifactProvenance = typeof artifactProvenanceSchema.infer;

/** One sandbox's artifact attribution, written before teardown so a destroyed sandbox still has it. */
export const providerArtifactEvidenceSchema = type({
	/** Complete benchmark cell identity, so aggregate evidence cannot drift across shards. */
	cell: providerCostCellSchema,
	/** The vendor's sandbox id, so evidence joins to the sandbox that produced the measurements. */
	sandboxId: sandboxIdString,
	provenance: artifactProvenanceSchema,
})
	.onUndeclaredKey("reject")
	.narrow((evidence, ctx) => {
		const { providerId } = evidence.cell;
		const { requested } = evidence.provenance;
		const declaredKind = REGISTRY[providerId].artifact.kind;
		if (requested.kind !== declaredKind) {
			return ctx.mustBe(
				`artifact evidence whose requested kind matches ${providerId}'s registry declaration (${declaredKind})`,
			);
		}
		if (evidence.provenance.source !== "guest-fingerprint") return true;
		const expected = expectedToolchainFingerprint(providerId, requested);
		if (expected === undefined) {
			return ctx.mustBe(
				`guest fingerprint evidence for a canonical ${providerId} release artifact (got ${JSON.stringify(requested)})`,
			);
		}
		const observed = evidence.provenance.fingerprint;
		if (
			observed.authority !== expected.authority ||
			observed.imageName !== expected.imageName ||
			observed.imageVersion !== expected.imageVersion
		) {
			return ctx.mustBe(
				`a ${expected.authority} fingerprint matching ${expected.imageName}@${expected.imageVersion}`,
			);
		}
		return true;
	});
export type ProviderArtifactEvidence = typeof providerArtifactEvidenceSchema.infer;

/**
 * Whether this attribution rests on an observation rather than on the request alone.
 *
 * ADR-0008 §5 admits a provider to the published matrix only on observed evidence, so this is the
 * predicate the admission gate reads. Kept as a function beside the union rather than as a stored
 * boolean: a persisted flag could contradict its own `source`, and there would be no way to tell
 * which of the two was the lie.
 */
export function artifactVerified(evidence: ProviderArtifactEvidence): boolean {
	return evidence.provenance.source !== "request-fallback";
}

/** The artifact a sandbox effectively booted, whatever established it. */
export function effectiveArtifact(provenance: ArtifactProvenance): ArtifactProvenance["requested"] {
	return "reported" in provenance && provenance.reported !== undefined
		? provenance.reported
		: provenance.requested;
}
