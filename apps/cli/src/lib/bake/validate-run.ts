// Boot each provider's CANDIDATE artifact and run the shared smoke spec against it — the validate-only
// pass. `promote` runs this immediately before the immutable base retag so the published version
// derives from bytes verified again, closing the validate→promote drift window (the candidate tag is
// mutable, so it could have changed since `bake` last validated it). Distinct from `bake`'s loop,
// which bakes AND validates each candidate in one pass; this only validates an already-baked candidate.
import type { CandidateArtifactRefs, ProviderId } from "@sandbox-benchmarks/schema";
import { candidateArtifact } from "@sandbox-benchmarks/schema";
import type { ArtifactResolution } from "../driver-run.ts";
import type { ProviderRun, ProviderTarget } from "../providers-run.ts";
import { forEachProviderWithCreds } from "../providers-run.ts";
import type { SmokeOutcome } from "../smoke-run.ts";
import { bootAndSmoke, logChecks, smokeFailureReason, smokeOk } from "../smoke-run.ts";
import type { Log } from "./types.ts";

/**
 * The candidate ref as a driver artifact override. A provider that boots stock has no ref to
 * override, and asking the composition root to resolve one would be rejected as a lie about its
 * registry descriptor — so that case resolves the registry default instead.
 */
function candidateArtifactResolution(
	id: ProviderId,
	refs: CandidateArtifactRefs,
): ArtifactResolution {
	const candidate = candidateArtifact(id, refs);
	return candidate.kind === "none" ? {} : { ref: candidate.ref };
}

/** Boot the candidate artifact through the same driver `bench-suite` would open. */
export function bootAndSmokeCandidate(
	target: ProviderTarget,
	refs: CandidateArtifactRefs,
): Promise<SmokeOutcome> {
	return bootAndSmoke(target, { artifact: candidateArtifactResolution(target.id, refs) });
}

/** Validate every provider's candidate artifact (boot + smoke), sharing the skip-vs-fail contract. A
 *  provider with no creds skips; one that boots and fails its smoke is `failed`. Never throws.
 *  `only` restricts the pass to a subset (a scoped promote re-validates only the providers it is
 *  about to publish); omitted → every registered provider. */
export function validateCandidates(
	refs: CandidateArtifactRefs,
	log: Log,
	only?: readonly ProviderId[],
): Promise<ProviderRun<SmokeOutcome>[]> {
	return forEachProviderWithCreds(
		(target) => {
			log(`>>> ${target.id}: validating candidate (boot + smoke)…`);
			return bootAndSmokeCandidate(target, refs);
		},
		{
			log,
			only,
			ok: smokeOk,
			failureReason: smokeFailureReason,
			onComplete: (run) => {
				if (run.value) logChecks(run.provider, run.value.checks, log);
				const time = run.durationMs !== undefined ? `${run.durationMs.toFixed(0)}ms` : "";
				const counts = run.value
					? `${run.value.checks.filter((c) => c.ok).length}/${run.value.checks.length} checks`
					: "";
				const meta = [time, counts].filter(Boolean).join(", ");
				log(
					`<<< ${run.provider}: ${run.status}${meta ? ` (${meta})` : ""}${run.reason ? ` — ${run.reason}` : ""}`,
				);
			},
		},
	);
}
