# @sandbox-benchmarks/provider-daytona

**Role:** the Daytona provider adapter — boots the pre-baked toolchain snapshot, deps isolated to
this package. Daytona is the harness's validated reference provider.

**Public surface (`.`):** `daytonaAdapter` (the `ProviderAdapter` the aggregator binds to the
schema's `daytona` id), the `daytonaConfig` slice (API key / runner target / snapshot) the bake
pipeline boots from, and the snapshot names (`daytonaSnapshotDefault`, `daytonaSnapshotCandidate`).

**Env vars:** `DAYTONA_API_KEY` (missing → the harness skips the provider), `DAYTONA_TARGET`
(runner region, e.g. `us-west-2`; unset → account default), `DAYTONA_SNAPSHOT` (override the booted
snapshot — CI points it at the candidate while iterating).

**Depends on:** `@sandbox-benchmarks/provider-core` (adapter contract + env gate + candidate
naming), `@sandbox-benchmarks/schema` (toolchain identity the snapshot names derive from),
`@computesdk/daytona` (the vendor wrapper).

**What lives here:** pure create-time policy. The snapshot carries the toolchain and the pinned
spec class; the adapter is "boot this snapshot on this target" — the snapshot itself is created by
the bake pipeline from the toolchain image.
