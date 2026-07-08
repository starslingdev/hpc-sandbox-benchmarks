// Promote the validated candidate to the immutable public version — the ONLY step that writes
// public-facing artifacts. Run after `bake` validates the candidate.
//
// The order makes the immutable base tag the COMMIT POINT, so a mid-promote failure is always clean:
//   1. Refuse if the public version tag already exists — it is immutable (no --force; bump to republish).
//   2. Re-validate the candidate (boot + smoke) right now, so the bytes we publish are verified again
//      (the candidate tag is mutable and may have changed since `bake`). Abort on any failure.
//   3. Build each provider's version-named artifact FROM the candidate base (the just-revalidated
//      bytes), so the public artifact provably derives from validated bytes — BEFORE touching the base.
//   3b. Required-providers gate: if `--require`/`REQUIRE_PROVIDERS` names providers a skipped one
//      did not promote (a pure skip is not a `failed`), abort BEFORE the base is written — so the
//      gap can't be detected only post-hoc in bake.ts after the immutable base is already tagged.
//   4. LAST: retag the candidate base → the public version (registry-side). Reached only when every
//      prior step succeeded, so a failure never leaves a published version with missing/stale artifacts.
// A rerun after a mid-promote failure is clean (the version tag was never written); once published it
// is refused at step 1 — bump the version to publish again.
import { requiredProviders, unmetRequirements } from "@sandbox-benchmarks/harness";
import { config } from "@sandbox-benchmarks/providers";
import { forEachProviderWithCreds } from "../providers-run.ts";
import { bakeDaytonaSnapshot } from "./daytona.ts";
import { bakeE2bTemplate } from "./e2b.ts";
import { imageExistsInRegistry, promoteImage } from "./image.ts";
import type { BakeReport, Log } from "./types.ts";
import type { CandidateRefs } from "./validate.ts";
import { validateCandidates } from "./validate-run.ts";

export async function promoteAll(log: Log): Promise<BakeReport[]> {
	const reports: BakeReport[] = [];

	// 1. Refuse to overwrite the immutable public version (D2b). Checked first, before any mutation, so
	//    a refused promote leaves everything untouched. A registry error here (auth/network) is NOT
	//    "not published" — refuse rather than risk overwriting an existing :v1 we couldn't see.
	let alreadyPublished: boolean;
	try {
		alreadyPublished = await imageExistsInRegistry(config.toolchainImageVersion);
	} catch (err) {
		const reason = `could not verify whether ${config.toolchainImageVersion} is already published, so refusing to publish: ${err instanceof Error ? err.message : String(err)}`;
		log(`<<< promote refused — ${reason}`);
		reports.push({ provider: "image", status: "failed", reason });
		return reports;
	}
	if (alreadyPublished) {
		const reason = `${config.toolchainImageVersion} already exists — the public version is immutable; bump the version to publish again`;
		log(`<<< promote refused — ${reason}`);
		reports.push({ provider: "image", status: "failed", reason });
		return reports;
	}

	// 2. Re-validate the candidate immediately before publishing, so the bytes we promote are verified
	//    again (the candidate tag is mutable). Abort the whole promote if any provider fails to validate.
	const candidateRefs: CandidateRefs = {
		e2bTemplateCandidate: config.e2bTemplateCandidate,
		daytonaSnapshotCandidate: config.daytonaSnapshotCandidate,
		toolchainImageCandidate: config.toolchainImageCandidate,
		daytonaTarget: config.daytonaRegion.target,
	};
	log(`>>> re-validating candidate ${config.toolchainImageCandidate} before promote…`);
	const validateRuns = await validateCandidates(candidateRefs, log);
	if (validateRuns.some((r) => r.status === "failed")) {
		log("<<< promote aborted — candidate re-validation failed (nothing published)");
		for (const run of validateRuns) {
			reports.push({
				provider: run.provider,
				status: run.status,
				...(run.reason ? { reason: run.reason } : {}),
				...(run.durationMs !== undefined ? { durationMs: run.durationMs } : {}),
			});
		}
		return reports;
	}

	// 3. Build each provider's version-named artifact FROM the candidate base (the bytes we just
	//    revalidated). Built BEFORE the base retag, so a failure here leaves the version base unwritten
	//    and a rerun is clean. Shares the skip-vs-fail loop with bake.
	const runs = await forEachProviderWithCreds(
		async (provider) => {
			log(`>>> ${provider.name}: building version artifact from candidate…`);
			switch (provider.name) {
				case "e2b":
					await bakeE2bTemplate(config.e2bTemplateVersion, config.toolchainImageCandidate, (m) =>
						log(`    ${m}`),
					);
					break;
				case "daytona":
					await bakeDaytonaSnapshot(
						config.daytonaSnapshotDefault,
						config.toolchainImageCandidate,
						(m) => log(`    ${m}`),
					);
					break;
				case "modal":
					log("    modal boots the published version image — nothing to build");
					break;
				case "blaxel":
					log("    blaxel boots the stock base image — nothing to promote");
					break;
				default: {
					// Exhaustiveness: a new ProviderId must add a promote branch above (compile error here).
					const unhandled: never = provider.name;
					throw new Error(`unhandled provider: ${String(unhandled)}`);
				}
			}
		},
		{
			log,
			onComplete: (run) => {
				const time = run.durationMs !== undefined ? ` (${run.durationMs.toFixed(0)}ms)` : "";
				log(`<<< ${run.provider}: ${run.status}${time}${run.reason ? ` — ${run.reason}` : ""}`);
			},
		},
	);

	for (const run of runs) {
		reports.push({
			provider: run.provider,
			status: run.status,
			...(run.reason ? { reason: run.reason } : {}),
			...(run.durationMs !== undefined ? { durationMs: run.durationMs } : {}),
		});
	}

	// A provider artifact failed → do NOT publish the base. The version tag stays unwritten, so a rerun
	// (after fixing the cause) reconciles cleanly — nothing public was half-written.
	if (reports.some((r) => r.status === "failed")) {
		log(
			`!!! promote aborted before publish: a ${config.toolchainImageVersion} provider artifact failed; ` +
				"the public base was NOT written. Fix the cause and rerun `bake --promote`.",
		);
		return reports;
	}

	// Required-providers gate (D1), enforced HERE — before step 4 writes the immutable base — not
	// post-hoc in bake.ts. At the publish boundary CI passes `--require e2b,daytona`; a required
	// provider whose version artifact was skipped (missing/misnamed secret) or failed is `skipped`/
	// `failed`, so `reports.some(failed)` above does NOT catch a pure skip. Were the base published
	// first and the gap detected only in bake.ts, the immutable `:v1` would already be tagged and a
	// fixed rerun would be refused at step 1 — forcing a version bump to recover. Gating before publish
	// keeps the base unwritten so a rerun reconciles cleanly. (Lenient locally: nothing required.)
	const required = requiredProviders();
	const unmet = unmetRequirements(reports, required);
	if (required.length > 0 && unmet.length > 0) {
		const reason = `required providers did not promote: ${unmet.join(", ")} (--require / REQUIRE_PROVIDERS)`;
		log(
			`!!! promote aborted before publish: ${reason}; the public base was NOT written. ` +
				"Fix the cause and rerun `bake --promote`.",
		);
		// Push a structured failure (like the step-1 and step-4 aborts) so the emitted JSON is
		// self-describing — a consumer sees the failed promote without re-deriving it from `--require`.
		reports.push({ provider: "image", status: "failed", reason });
		return reports;
	}

	// 4. LAST: publish the candidate base as the immutable public version — the commit point.
	log(`>>> promoting image ${config.toolchainImageCandidate} → ${config.toolchainImageVersion}…`);
	const imageStart = performance.now();
	try {
		await promoteImage(log);
		reports.push({ provider: "image", status: "ok", durationMs: performance.now() - imageStart });
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		log(`<<< image: promote failed — ${reason}`);
		reports.push({
			provider: "image",
			status: "failed",
			reason,
			durationMs: performance.now() - imageStart,
		});
	}

	return reports;
}
