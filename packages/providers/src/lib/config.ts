// The runtime configuration surface. The `config` object below is the single object the bake
// pipeline and templates import; the actual env reading/validation happens in provider-core and
// the per-provider packages (each owns its slice), so no unvalidated environment data reaches
// business logic anywhere. Static identity/spec come from the schema (the shared source of truth).
import {
	toolchainImage,
	toolchainImageCandidate,
	toolchainImageVersion,
} from "@sandbox-benchmarks/provider-core";
import {
	daytonaConfig,
	daytonaSnapshotCandidate,
	daytonaSnapshotDefault,
} from "@sandbox-benchmarks/provider-daytona";
import { e2bTemplateCandidate, e2bTemplateVersion } from "@sandbox-benchmarks/provider-e2b";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";

// The single, fully-typed config object. Everything that needs config imports THIS — and nothing
// else: every field below has a real consumer in the bake pipeline (apps/cli) or templates. No env
// is read here any more: every provider package reads its own slice through provider-core's
// validated env gate (E2B_TEMPLATE, DAYTONA_*, CLOUD_RUN_*, NOVITA_API_KEY, …), and the
// toolchain-image identity (with its BENCH_TOOLCHAIN_IMAGE override) lives in provider-core.
export const config = {
	/** Pinned cross-provider target spec (2 vCPU / 8 GiB / 20 GB). */
	targetSpec: TARGET_SPEC,
	/** Active toolchain image ref the adapters boot from: the `BENCH_TOOLCHAIN_IMAGE` override (CI
	 *  points this at the candidate during iteration), else the canonical public version. */
	toolchainImage,
	/** Immutable public image ref (`:v1`); the promote target. */
	toolchainImageVersion,
	/** Mutable candidate image ref (`:v1-candidate`); what the bake builds/pushes while iterating. */
	toolchainImageCandidate,
	/** Public (version-scoped) e2b template name; the promote target. */
	e2bTemplateVersion,
	/** Candidate e2b template name the bake builds while iterating. */
	e2bTemplateCandidate,
	/** Canonical (version-scoped) daytona snapshot name; the promote target. */
	daytonaSnapshotDefault,
	/** Candidate daytona snapshot name the bake creates while iterating. */
	daytonaSnapshotCandidate,
	/** The daytona account/target the adapter and bake pipeline boot from. Owned by
	 *  provider-daytona; composed here so the bake pipeline keeps its single config import. */
	daytona: daytonaConfig,
} as const;
