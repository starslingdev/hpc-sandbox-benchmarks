# @sandbox-benchmarks/vercel

Owns the Vercel Sandbox driver, its `@vercel/sandbox` dependency, and its tests. The fleet loader
selects this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives the SDK's `Sandbox` statics and translates the v2
  name-keyed API: the OIDC token projected into explicit team/project credentials, a non-persistent
  tagged create named `sandbox-benchmarks-<uuid>` (the name is the identity and carries the
  attempt's ownership marker), non-resuming lookups, statuses as phases (only `running` is usable;
  a `failed` or `aborted` record is the benchmark's to delete but no allocation of anyone else's),
  `delete` as permanent removal, typed refusal statuses (400, 401, 403, 404, 422, 429; only 429 is
  retryable), and current-session execution with native detached launch. It declares no files.
- `src/index.ts` binds the SDK in `defineVendorDriver`, refusing a request off the 2 GiB/vCPU line
  before any call. Readiness, cleanup confirmation, inventory, recovery (a lookup by the create's
  name) and the root disk proof come from `@sandbox-benchmarks/driver/vendor`.

`src/index.test.ts` tests the translation, runs `vendorContract` over a stub SDK, and drives
sessions through the module's `specFor` seam. Run `bun run --filter @sandbox-benchmarks/vercel test`
or `typecheck` from the repo root.

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

# Read the namespace back from the CLI's release config so this flow and CI cannot drift. Override the
# defaults with VERCEL_TEAM_SLUG / VERCEL_PROJECT_NAME to publish into a fork's team or project.
read -r vcr_owner vcr_project vcr_image <<<"$(bun -e 'import { releaseConfig as c } from "./apps/cli/src/lib/release-config.ts";
  console.log(`${c.vercelTeamSlug}/${c.vercelProjectName}`, c.vercelProjectName, c.vercelImageVersion)')"

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
