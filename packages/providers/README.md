# @sandbox-benchmarks/providers

**Role:** provider wiring — binds each schema provider to a computesdk runtime.

**Public surface (`.`):** `ProviderAdapter`, `ProviderConfig`, `DirectProvider` (types), the
assembled `providers` registry, and the toolchain image constants (`TOOLCHAIN_IMAGE`,
`TOOLCHAIN_VERSION`, `DAYTONA_SNAPSHOT_DEFAULT`).

**Depends on:** `@sandbox-benchmarks/schema` (provider identity / `PROVIDERS`), `computesdk` and the
`@computesdk/*` wrappers where they preserve the required surface, plus first-class `defineProvider`
adapters over raw vendor SDKs where they do not (including `@vercel/sandbox` v2).

**What lives here:** provider factories and focused compatibility adapters. Most `@computesdk/*`
packages adapt their vendor SDK directly; Microsandbox and Vercel use local `defineProvider`
implementations so lifecycle, detached exec, and filesystem semantics remain honest. The package also
owns benchmark create-time policy — the pinned `TARGET_SPEC` and toolchain image. The assembled
`providers` registry joins the schema `PROVIDERS` metadata with the adapter
map by id; both are keyed by `ProviderId`, so a one-sided provider is a compile error rather than a
runtime check. Private glue lives in `src/lib/` and is never imported across a package boundary.

The join also carries each provider's schema-owned `transport` capability (`ProviderTransport`:
streaming, synchronous cap, detached+poll) onto the `ProviderConfig`, so the harness selects a
per-step exec transport from the declared capability instead of hardcoding one provider's quirks.

## Validate Vercel locally

Vercel uses a project-issued OIDC token at runtime; do not pass a long-lived `VERCEL_TOKEN` to the
benchmark process. Enable OIDC Federation in the linked project's Security settings, then run from a
Vercel-authenticated checkout:

```sh
# Link the checkout and create the VCR repository once.
vercel login
vercel link
vercel vcr add sandbox-benchmarks-toolchain-vercel
vercel vcr login docker

# Build and publish the shared Vercel variant. Replace both names with the linked project's values.
export VERCEL_TEAM_SLUG=your-team-slug
export VERCEL_PROJECT_NAME=your-project-name
REGISTRY=vcr.vercel.com \
IMAGE_OWNER="$VERCEL_TEAM_SLUG/$VERCEL_PROJECT_NAME" \
packages/templates/images/build.sh
docker push \
  "vcr.vercel.com/$VERCEL_TEAM_SLUG/$VERCEL_PROJECT_NAME/sandbox-benchmarks-toolchain-vercel:v6"

# Pull a short-lived project OIDC token, copy only that bearer into a restricted file, and remove the
# bearer from the process environment before starting the benchmark.
vercel env pull .env.vercel.local
set -a; . ./.env.vercel.local; set +a
export VERCEL_ORG_ID="$(jq -r .orgId .vercel/project.json)"
export VERCEL_PROJECT_ID="$(jq -r .projectId .vercel/project.json)"
export VERCEL_OIDC_TOKEN_FILE="$(mktemp)"
trap 'rm -f "$VERCEL_OIDC_TOKEN_FILE" .env.vercel.local' EXIT
chmod 0600 "$VERCEL_OIDC_TOKEN_FILE"
printf %s "$VERCEL_OIDC_TOKEN" > "$VERCEL_OIDC_TOKEN_FILE"
unset VERCEL_OIDC_TOKEN VERCEL_TOKEN

# Other providers skip when their credentials are absent; Vercel is required to boot and pass.
REQUIRE_PROVIDERS=vercel bun apps/cli/src/bin/bench-smoke.ts
```

The VCR path uses the human-readable team slug and project name; the `team_*` / `prj_*` API IDs
extracted from `.vercel/project.json` authenticate SDK calls only. The `EXIT` trap removes both local
bearer files even if validation fails. A successful smoke permanently deletes its ephemeral named
sandbox during teardown.
