// Boot each provider's CANDIDATE artifact and run the shared smoke spec against it — the validate-only
// pass. `promote` runs this immediately before the immutable base retag so the published version
// derives from bytes verified again, closing the validate→promote drift window (the candidate tag is
// mutable, so it could have changed since `bake` last validated it). Distinct from `bake`'s loop,
// which bakes AND validates each candidate in one pass; this only validates an already-baked candidate.
import type { ProviderConfig } from "@sandbox-benchmarks/providers";
import type { ProviderRun } from "../providers-run.ts";
import { forEachProviderWithCreds } from "../providers-run.ts";
import type { SmokeOutcome } from "../smoke-run.ts";
import { bootAndSmoke, logChecks, smokeFailureReason, smokeOk } from "../smoke-run.ts";
import type { Log } from "./types.ts";
import type { CandidateRefs } from "./validate.ts";
import { candidateCreateOptions } from "./validate.ts";

/** Validate every provider's candidate artifact (boot + smoke), sharing the skip-vs-fail contract. A
 *  provider with no creds skips; one that boots and fails its smoke is `failed`. Never throws. */
export function validateCandidates(
	refs: CandidateRefs,
	log: Log,
): Promise<ProviderRun<SmokeOutcome>[]> {
	return forEachProviderWithCreds(
		(provider) => {
			log(`>>> ${provider.name}: validating candidate (boot + smoke)…`);
			// Boot the candidate artifact (override the registry adapter's version create-options).
			const validateConfig: ProviderConfig = {
				...provider,
				createOptions: {
					...provider.createOptions,
					...candidateCreateOptions(provider.name, refs),
				},
			};
			return bootAndSmoke(validateConfig);
		},
		{
			log,
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
