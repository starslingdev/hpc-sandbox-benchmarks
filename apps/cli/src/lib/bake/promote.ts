// Promote the validated candidate to the immutable public version — the ONLY step that writes
// public-facing artifacts. Run after `bake` validates the candidate.
//
// The order makes the immutable base tag the COMMIT POINT, so a mid-promote failure is clean — with one
// documented exception under `--force`, called out at step 3 and in the step-3 abort:
//   1. Refuse if the public version tag already exists — it is immutable; bump to republish (or pass
//      `--force`, wired only to a manual force_republish dispatch, to deliberately regenerate in place).
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
// is refused at step 1 — bump the version, or force_republish, to publish again. Under `--force` the
// version's artifacts already exist, and step 3 regenerates them in place: the image retag and e2b
// `template create` publish a new artifact over the old name (the prior one stands until the new one
// lands), but daytona has no snapshot overwrite — it deletes, then creates. So a forced republish whose
// daytona create fails leaves that snapshot ABSENT, not stale. Recovery is a rerun with force_republish
// (a plain rerun is refused at step 1, since the base image is still there).
import { requiredProviders, unmetRequirements } from "@sandbox-benchmarks/harness";
import { config } from "@sandbox-benchmarks/providers";
import { forEachProviderWithCreds } from "../providers-run.ts";
import { bakeBlaxelImage } from "./blaxel.ts";
import { bakeDaytonaSnapshot } from "./daytona.ts";
import { bakeE2bTemplate } from "./e2b.ts";
import {
	buildCandidateRefs,
	imageExistsInRegistry,
	promoteImage,
	resolveImageDigestRef,
} from "./image.ts";
import { bakeNovitaTemplate } from "./novita.ts";
import type { BakeReport, Log } from "./types.ts";
import { validateCandidates } from "./validate-run.ts";

export async function promoteAll(log: Log, force = false): Promise<BakeReport[]> {
	const reports: BakeReport[] = [];

	// 1. Refuse to overwrite the immutable public version (D2b). Checked first, before any mutation, so
	//    a refused promote leaves everything untouched. A registry error here (auth/network) is NOT
	//    "not published" — refuse rather than risk overwriting an existing :v1 we couldn't see.
	//    `force` (manual dispatch only — see toolchain-image.yml) deliberately republishes over an
	//    existing version for dev iteration; automated push-to-main never sets it, so the invariant
	//    holds in production. The image retag and e2b `template create` overwrite by name, replacing
	//    the artifact only once the new one is built. Daytona does NOT: it deletes the existing
	//    snapshot before creating, so a forced republish drops the published snapshot for the length
	//    of the rebuild, and leaves it absent if the rebuild fails. Forced republish is therefore a
	//    destructive regenerate, and is why `force` is manual-dispatch-only.
	if (force) {
		log(
			`>>> force-republish: regenerating ${config.toolchainImageVersion}, overwriting if present ` +
				`(daytona: ${config.daytonaSnapshotDefault} is deleted and rebuilt, so it is briefly absent)`,
		);
	} else {
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
			const reason = `${config.toolchainImageVersion} already exists — the public version is immutable; bump the version or dispatch with force_republish to publish again`;
			log(`<<< promote refused — ${reason}`);
			reports.push({ provider: "image", status: "failed", reason });
			return reports;
		}
	}

	// 2. Re-validate the candidate immediately before publishing, so the bytes we promote are verified
	//    again (the candidate tag is mutable). Abort the whole promote if any provider fails to validate.
	let pinnedCandidateImage: string;
	try {
		pinnedCandidateImage = await resolveImageDigestRef(config.toolchainImageCandidate);
	} catch (err) {
		const reason = `could not resolve immutable digest for ${config.toolchainImageCandidate}: ${err instanceof Error ? err.message : String(err)}`;
		log(`<<< promote aborted — ${reason} (nothing published)`);
		reports.push({ provider: "image", status: "failed", reason });
		return reports;
	}
	const candidateRefs = buildCandidateRefs(pinnedCandidateImage);
	log(`>>> re-validating candidate ${pinnedCandidateImage} before promote…`);
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
	//    Under `--force` these names already exist and are live. e2b/image/blaxel replace on success (a
	//    registry tag push, like the base); daytona deletes first (no snapshot overwrite in the SDK), so
	//    a failed daytona create removes the published snapshot — `bakeDaytonaSnapshot` says so in its
	//    error, which lands in the report's `reason`. The base is still never written, so the version
	//    tag itself stays consistent.
	const runs = await forEachProviderWithCreds(
		async (provider) => {
			log(`>>> ${provider.name}: building version artifact from candidate…`);
			switch (provider.name) {
				case "e2b":
					await bakeE2bTemplate(config.e2bTemplateVersion, pinnedCandidateImage, (m) =>
						log(`    ${m}`),
					);
					break;
				case "daytona":
					await bakeDaytonaSnapshot(config.daytonaSnapshotDefault, pinnedCandidateImage, (m) =>
						log(`    ${m}`),
					);
					break;
				case "modal":
					log("    modal boots the published version image — nothing to build");
					break;
				case "blaxel":
					await bakeBlaxelImage(config.toolchainImageBlaxelVersion, pinnedCandidateImage, (m) =>
						log(`    ${m}`),
					);
					break;
				case "novita":
					await bakeNovitaTemplate(config.novitaTemplateVersion, pinnedCandidateImage, (m) =>
						log(`    ${m}`),
					);
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

	// After a forced republish aborts, the previous version's base image is still tagged, so step 1 would
	// refuse a plain rerun — recovery has to re-force. Shared by both pre-publish aborts below.
	const rerunHint = force
		? "Fix the cause and rerun with force_republish — a plain rerun is refused because the base image already exists."
		: "Fix the cause and rerun `bake --promote`.";

	// A provider artifact failed → do NOT publish the base. The version tag stays unwritten, so a rerun
	// (after fixing the cause) reconciles cleanly. Nothing public was half-written — EXCEPT under
	// `--force`, where step 3 regenerates already-published artifacts in place and daytona's
	// delete-then-create can leave its published snapshot absent (the report's `reason` says so).
	if (reports.some((r) => r.status === "failed")) {
		log(
			`!!! promote aborted before publish: a ${config.toolchainImageVersion} provider artifact failed; ` +
				"the public base was NOT written. " +
				(force
					? "This was a forced republish, so the failed provider's already-published artifact may have " +
						"been regenerated — or, for daytona, deleted and not recreated (see its reason above). "
					: "") +
				rerunHint,
		);
		return reports;
	}

	// Required-providers gate (D1), enforced HERE — before step 4 writes the immutable base — not
	// post-hoc in bake.ts. At the publish boundary CI passes `--require e2b,daytona,modal`; a required
	// provider whose version artifact was skipped (missing/misnamed secret) or failed is `skipped`/
	// `failed`, so `reports.some(failed)` above does NOT catch a pure skip. Were the base published
	// first and the gap detected only in bake.ts, the immutable `:v1` would already be tagged and a
	// fixed rerun would be refused at step 1 — forcing a version bump to recover. Gating before publish
	// keeps the base unwritten so a rerun reconciles cleanly. (Lenient locally: nothing required.)
	const required = requiredProviders();
	const unmet = unmetRequirements(reports, required);
	if (required.length > 0 && unmet.length > 0) {
		const reason = `required providers did not promote: ${unmet.join(", ")} (--require / REQUIRE_PROVIDERS)`;
		// A required provider that merely *skipped* never built anything, so unlike the artifact-failed
		// abort above there is no half-regenerated artifact to warn about — only the rerun differs.
		log(
			`!!! promote aborted before publish: ${reason}; the public base was NOT written. ${rerunHint}`,
		);
		// Push a structured failure (like the step-1 and step-4 aborts) so the emitted JSON is
		// self-describing — a consumer sees the failed promote without re-deriving it from `--require`.
		reports.push({ provider: "image", status: "failed", reason });
		return reports;
	}

	// 4. LAST: publish the candidate base as the immutable public version — the commit point.
	log(`>>> promoting image ${pinnedCandidateImage} → ${config.toolchainImageVersion}…`);
	const imageStart = performance.now();
	try {
		await promoteImage(log, pinnedCandidateImage);
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
