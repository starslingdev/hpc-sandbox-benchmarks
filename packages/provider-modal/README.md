# @sandbox-benchmarks/provider-modal

**Role:** the Modal provider adapter — boots the toolchain image straight from the registry (no
baked artifact of its own), deps isolated to this package.

**Public surface (`.`):** `modalAdapter` (the `ProviderAdapter` the aggregator binds to the
schema's `modal` id).

**Env vars:** `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET` (read by the Modal SDK; missing → the harness
skips the provider). `BENCH_TOOLCHAIN_IMAGE` (via provider-core) points a run at the candidate
image while iterating.

**Depends on:** `@sandbox-benchmarks/provider-core` (adapter contract + the shared toolchain-image
identity), `@sandbox-benchmarks/schema` (`TARGET_SPEC`, `VCPUS_PER_PHYSICAL_CORE`),
`@computesdk/modal` (the vendor wrapper).

**What lives here:** the unit conversions Modal needs to hit the pinned target spec: physical
cores instead of vCPUs (1 core = 2 vCPU), and `memoryLimitMiB` as the hard cap — a reservation
alone leaves the guest seeing host RAM, which breaks STREAM's array sizing. Sandboxes boot under
the project's dedicated `sandbox-benchmarks` Modal app for attributability.
