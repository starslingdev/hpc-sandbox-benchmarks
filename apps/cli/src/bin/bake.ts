#!/usr/bin/env bun
// `bake` — create each provider's CANDIDATE toolchain artifact and immediately validate it end-to-end
// by booting a sandbox from the just-baked artifact and running the shared smoke spec. This is the
// iteration loop: edit Dockerfile/templates → `bake --build-push` → `bake` → repeat. Everything hits
// the mutable candidate (`:v1-candidate`, `…-v1-candidate`); the public `:v1` is untouched until
// `promote` (next PR). Providers without credentials are skipped; exits non-zero iff a baked provider
// failed to validate. bun auto-loads .env, so local creds are picked up.
//
// The provider loop + skip-vs-fail contract is shared with bench-smoke/promote (providers-run.ts);
// the boot+smoke lifecycle (probe results captured before teardown) is shared too (smoke-run.ts).
import { requiredProviders, unmetRequirements } from "@sandbox-benchmarks/harness";
import type { ProviderConfig } from "@sandbox-benchmarks/providers";
import { config } from "@sandbox-benchmarks/providers";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { bakeDaytonaSnapshot } from "../lib/bake/daytona.ts";
import { bakeE2bTemplate } from "../lib/bake/e2b.ts";
import { buildAndPushCandidate, resolveImageDigestRef } from "../lib/bake/image.ts";
import { bakeModalImage } from "../lib/bake/modal.ts";
import { bakeNovitaTemplate } from "../lib/bake/novita.ts";
import { promoteAll } from "../lib/bake/promote.ts";
import type { BakeReport, Log } from "../lib/bake/types.ts";
import { candidateCreateOptions } from "../lib/bake/validate.ts";
import { anyFailed, forEachProviderWithCreds } from "../lib/providers-run.ts";
import { bootAndSmoke, logChecks, smokeFailureReason, smokeOk } from "../lib/smoke-run.ts";

// Each provider's candidate bake, bound to the candidate artifact name but NOT the mutable image
// tag. The caller resolves that tag once and passes the same immutable digest to every baker.
const bakers: Record<ProviderId, (image: string, log: Log) => Promise<void>> = {
	e2b: (image, log) => bakeE2bTemplate(config.e2bTemplateCandidate, image, log),
	daytona: (image, log) => bakeDaytonaSnapshot(config.daytonaSnapshotCandidate, image, log),
	modal: bakeModalImage,
	blaxel: async (_image, log) => {
		log("blaxel boots the stock base image — no candidate artifact to bake");
	},
	novita: (image, log) => bakeNovitaTemplate(config.novitaTemplateCandidate, image, log),
};

if (import.meta.main) {
	const log: Log = (m) => console.error(m);

	// Promote is the release step: publish the already-validated candidate as the public version.
	if (process.argv.includes("--promote")) {
		// `--force` republishes over an existing (immutable) version — dev regeneration, set only by a
		// manual toolchain-image.yml dispatch. Automated pushes never pass it, so :v1 stays immutable there.
		const promoted = await promoteAll(log, process.argv.includes("--force"));
		console.log(
			JSON.stringify(
				{
					version: {
						image: config.toolchainImageVersion,
						e2bTemplate: config.e2bTemplateVersion,
						daytonaSnapshot: config.daytonaSnapshotDefault,
						novitaTemplate: config.novitaTemplateVersion,
					},
					reports: promoted,
				},
				null,
				2,
			),
		);
		// promoteAll is self-gating: the D1 required-providers gate (CI passes `--require e2b,daytona,modal`)
		// runs INSIDE promoteAll before the immutable base is written, and every abort path (version already
		// published, candidate re-validation failed, artifact failed, unmet requirements) pushes a structured
		// `{ status: "failed" }` report. So a single `some(failed)` is the whole exit contract — re-deriving
		// `unmet` here would mislabel an early abort (e.g. "version already exists") as a provider-credentials
		// failure, since the early `reports` carry no provider "ok" entries.
		process.exit(promoted.some((r) => r.status === "failed") ? 1 : 0);
	}

	if (process.argv.includes("--build-push")) {
		log(">>> building + pushing candidate image…");
		try {
			await buildAndPushCandidate(log);
		} catch (err) {
			log(`<<< build/push failed — ${err instanceof Error ? err.message : String(err)}`);
			process.exit(1);
		}
	}

	// Modal's registry importer, like the remote E2B-compatible builders, may cache a mutable tag.
	// Resolve once after the push and validate the exact candidate bytes by immutable digest. This also
	// makes a tag change between provider bakes unable to redirect Modal's validation to different bytes.
	let pinnedCandidateImage: string;
	try {
		pinnedCandidateImage = await resolveImageDigestRef(config.toolchainImageCandidate);
		log(`>>> candidate image pinned for validation: ${pinnedCandidateImage}`);
	} catch (err) {
		log(
			`<<< could not resolve candidate image digest — ${err instanceof Error ? err.message : String(err)}`,
		);
		process.exit(1);
	}
	const candidateRefs = {
		e2bTemplateCandidate: config.e2bTemplateCandidate,
		daytonaSnapshotCandidate: config.daytonaSnapshotCandidate,
		novitaTemplateCandidate: config.novitaTemplateCandidate,
		toolchainImageCandidate: pinnedCandidateImage,
		daytonaTarget: config.daytona.target,
	};

	const runs = await forEachProviderWithCreds(
		async (provider) => {
			log(`>>> ${provider.name}: baking candidate…`);
			await bakers[provider.name](pinnedCandidateImage, (m) => log(`    ${m}`));

			log(`>>> ${provider.name}: validating (boot + smoke)…`);
			// Boot the just-baked candidate (override the registry adapter's version create-options).
			const validateConfig: ProviderConfig = {
				...provider,
				createOptions: {
					...provider.createOptions,
					...candidateCreateOptions(provider.name, candidateRefs),
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

	const reports: BakeReport[] = runs.map((run) => ({
		provider: run.provider,
		status: run.status,
		...(run.reason ? { reason: run.reason } : {}),
		...(run.durationMs !== undefined ? { durationMs: run.durationMs } : {}),
		...(run.value && run.value.checks.length > 0 ? { checks: run.value.checks } : {}),
	}));

	console.log(
		JSON.stringify(
			{
				candidate: {
					image: pinnedCandidateImage,
					e2bTemplate: config.e2bTemplateCandidate,
					daytonaSnapshot: config.daytonaSnapshotCandidate,
					novitaTemplate: config.novitaTemplateCandidate,
				},
				reports,
			},
			null,
			2,
		),
	);

	if (anyFailed(runs)) process.exit(1);

	// D1: at the publish boundary (CI passes `--require e2b,daytona,modal`) a required provider that was
	// skipped for a missing/misnamed secret — or failed to validate — must fail the bake loudly, so a
	// candidate is never blessed while a provider was silently never built. Lenient locally (none required).
	const required = requiredProviders();
	const unmet = unmetRequirements(reports, required);
	if (required.length > 0 && unmet.length > 0) {
		log(
			`error: required providers did not pass: ${unmet.join(", ")} (--require / REQUIRE_PROVIDERS)`,
		);
		process.exit(1);
	}
}
