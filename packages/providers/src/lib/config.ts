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
import {
	e2bTemplate,
	e2bTemplateCandidate,
	e2bTemplateVersion,
} from "@sandbox-benchmarks/provider-e2b";
import { TARGET_SPEC, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";

// The single, fully-typed config object. Everything that needs config imports THIS. No env is read
// here any more: every provider package reads its own slice through provider-core's validated env
// gate (E2B_TEMPLATE, DAYTONA_*, CLOUD_RUN_*, NOVITA_API_KEY, …), and the toolchain-image identity
// (with its BENCH_TOOLCHAIN_IMAGE override) lives in provider-core. This object composes the
// pieces the bake pipeline consumes, so it keeps its single config import.
export const config = {
	/** Pinned cross-provider target spec (2 vCPU / 8 GiB / 20 GB). */
	targetSpec: TARGET_SPEC,
	/** Immutable toolchain image version tag. */
	toolchainVersion: TOOLCHAIN_VERSION,
	/** Active toolchain image ref the adapters boot from: the `BENCH_TOOLCHAIN_IMAGE` override (CI
	 *  points this at the candidate during iteration), else the canonical public version. */
	toolchainImage,
	/** Immutable public image ref (`:v1`); the promote target. */
	toolchainImageVersion,
	/** Mutable candidate image ref (`:v1-candidate`); what the bake builds/pushes while iterating. */
	toolchainImageCandidate,
	/** The e2b template the sandbox boots from (name = e2b.toml `template_name`); `E2B_TEMPLATE`
	 *  override, else the version-scoped public template. Owned by provider-e2b; composed here so
	 *  the bake pipeline keeps its single config import. */
	e2bTemplate,
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
