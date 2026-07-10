# @sandbox-benchmarks/provider-core

**Role:** the shared contract every per-provider package implements — no vendor SDKs, no adapters.

**Public surface (`.`):** `ProviderAdapter`, `ProviderConfig`, `DirectProvider` (the adapter
contract types), `readProviderEnv` (the validated env-contract reader), the shared toolchain-image
identity (`toolchainImage`, `toolchainImageVersion`, `toolchainImageCandidate` — Modal boots the
image directly while e2b/daytona bake their artifacts from it), and `CANDIDATE_SUFFIX` (the
candidate↔version artifact-naming convention every baked artifact shares).

**Depends on:** `@sandbox-benchmarks/schema` (provider identity types), `computesdk` (the universal
sandbox types the contract is phrased in), `arktype` (env validation at the boundary).

**What lives here:** the vocabulary that lets provider packages stay decoupled. A provider package
(`@sandbox-benchmarks/provider-<id>`) exports one `ProviderAdapter` built from its own
`@computesdk/*` wrapper, and reads its slice of credentials through `readProviderEnv` — only
declared keys are forwarded, missing keys stay `undefined` (a *skip* decision made downstream), and
a set-but-empty value fails loudly at module load. The aggregator (`@sandbox-benchmarks/providers`)
joins those adapters with the schema `PROVIDERS` registry; this package is what keeps that join
possible without the aggregator depending on any vendor SDK itself.
