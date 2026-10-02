# @sandbox-benchmarks/providers

**Role:** release-lane configuration and evidence helpers. Every provider runs through its
DriverModule (`packages/drivers`); this package no longer holds provider adapters, and ADR-0023
dissolves what remains into schema, the harness, and the provider packages.

**Public surface (`.`):** the validated `config` gatekeeper (toolchain and artifact names, vendor
namespaces and targets the release lane reads), the cost-evidence sanitizers and hook types the
harness persists through.
`./config` and `./support` expose the gatekeeper and the sanitizers without the rest.

**Depends on:** `@sandbox-benchmarks/schema` and `arktype`. It imports no vendor library: artifact
builders live in their provider packages (`./artifact`).

Cost-evidence hooks live on DriverModules (for example `packages/modal/src/shared.ts`). Billing API
calls never belong in the SDK-free results package, and observed evidence must identify the
benchmark sandbox itself; organization/account/workspace/shared-app totals are context only.

## Validate Vercel locally

Vercel uses a project-issued OIDC token at runtime; do not pass a long-lived `VERCEL_TOKEN` to the
benchmark process. Enable OIDC Federation in the linked project's Security settings, then run from a
Vercel-authenticated checkout:

Use the repository-pinned CLI (`./node_modules/.bin/vercel`), not a globally installed one: `vcr` is a
recent subcommand, and an older global `vercel` fails with `"vcr" is not a valid subcommand`.

```sh
# Link the checkout and create the VCR repository once.
./node_modules/.bin/vercel login
./node_modules/.bin/vercel link
./node_modules/.bin/vercel vcr add sandbox-benchmarks-toolchain-vercel
./node_modules/.bin/vercel vcr login docker

# Read the namespace back from the resolved config so this flow and CI cannot drift. Override the
# defaults with VERCEL_TEAM_SLUG / VERCEL_PROJECT_NAME to publish into a fork's team or project.
read -r vcr_owner vcr_project vcr_image <<<"$(bun -e 'import { config } from "@sandbox-benchmarks/providers";
  console.log(`${config.vercelTeamSlug}/${config.vercelProjectName}`, config.vercelProjectName, config.vercelImage)')"

# Build and publish the shared Vercel variant into that namespace.
REGISTRY=vcr.vercel.com IMAGE_OWNER="$vcr_owner" packages/templates/images/build.sh
./node_modules/.bin/vercel vcr push docker "${vcr_image##*/}" --project "$vcr_project"

# Pull a short-lived project OIDC token. The Vercel SDK discovers it directly from the environment.
./node_modules/.bin/vercel pull --yes
./node_modules/.bin/vercel env pull .env.vercel.local
set -a; . ./.env.vercel.local; set +a
trap 'rm -f .env.vercel.local; docker logout vcr.vercel.com >/dev/null 2>&1 || true' EXIT
unset VERCEL_TOKEN

# Other providers skip when their credentials are absent; Vercel is required to boot and pass.
REQUIRE_PROVIDERS=vercel bun apps/cli/src/bin/bench-smoke.ts
```

`vercel link` writes `.vercel/project.json` (the `team_*` / `prj_*` API IDs); CI supplies the same two
values as `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secrets instead, so no Git integration between the
GitHub repository and the Vercel project is required. `VERCEL_PROJECT_NAME` must name the project that
`prj_*` identifies — `vcr push --project` uses the name, so a mismatch fails loudly rather than
publishing where nothing pulls from.

The VCR path is rooted at the configured human-readable namespace. The `EXIT` trap removes the
temporary environment file and Docker credential even if validation fails. The Vercel driver
(`packages/vercel`) uses the v2 SDK's name-keyed lifecycle, detached current-session execution, non-resuming
reconnects, and permanent delete cleanup. A conservative 60-second synchronous policy cap routes
longer setup and suite steps through native detached execution. Filesystem methods are intentionally
omitted because Vercel's high-level filesystem wrapper can auto-resume a stopped sandbox; the harness
observes detached completion with short `cat` polls through the same non-resuming current session.
