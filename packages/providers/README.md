# @sandbox-benchmarks/providers

**Role:** provider wiring — binds each schema provider to a computesdk runtime.

**Public surface (`.`):** `ProviderAdapter`, `ProviderConfig`, `DirectProvider` (types), the
assembled `providers` registry, and the toolchain image constants (`TOOLCHAIN_IMAGE`,
`TOOLCHAIN_VERSION`, `DAYTONA_SNAPSHOT_DEFAULT`).

**Depends on:** `@sandbox-benchmarks/schema` (provider identity / `PROVIDERS`), `computesdk` and the
`@computesdk/*` wrappers where they preserve the required surface, plus focused compatibility
adapters over raw vendor SDKs only where required.

**What lives here:** provider factories and focused compatibility adapters. Most `@computesdk/*`
packages adapt their vendor SDK directly; Microsandbox uses a local `defineProvider` implementation.
Vercel's local provider starts from ComputeSDK's upstream adapter but uses pinned `@vercel/sandbox`
v2, because the published wrapper still pins a pre-VCR SDK. The package also
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

# Build and publish the shared Vercel variant into this repository's fixed VCR namespace.
REGISTRY=vcr.vercel.com \
IMAGE_OWNER="starslingdev/sandbox-benchmarks" \
packages/templates/images/build.sh
vercel vcr push docker \
  "sandbox-benchmarks-toolchain-vercel:v6"

# Pull a short-lived project OIDC token. The Vercel SDK discovers it directly from the environment.
vercel pull --yes
vercel env pull .env.vercel.local
set -a; . ./.env.vercel.local; set +a
trap 'rm -f .env.vercel.local; docker logout vcr.vercel.com >/dev/null 2>&1 || true' EXIT
unset VERCEL_TOKEN

# Other providers skip when their credentials are absent; Vercel is required to boot and pass.
REQUIRE_PROVIDERS=vercel bun apps/cli/src/bin/bench-smoke.ts
```

The VCR path is fixed to this repository's human-readable namespace. The `EXIT` trap removes the
temporary environment file and Docker credential even if validation fails. The local ComputeSDK
provider uses the v2 SDK's name-keyed lifecycle, detached current-session execution, non-resuming
reconnects, and permanent delete cleanup.
