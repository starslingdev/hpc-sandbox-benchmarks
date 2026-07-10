# @sandbox-benchmarks/provider-vercel

**Role:** the Vercel Sandbox provider adapter — Firecracker microVMs booting Amazon Linux 2023,
deps isolated to this package.

**Public surface (`.`):** `vercelAdapter` (the `ProviderAdapter` the aggregator binds to the
schema's `vercel` id) and `VERCEL_GB_PER_VCPU` (the memory-per-vCPU coupling factor).

**Env vars:** `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` (read by the
`@computesdk/vercel` factory; missing → the harness skips the provider).

**Depends on:** `@sandbox-benchmarks/provider-core` (adapter contract), `@sandbox-benchmarks/schema`
(`TARGET_SPEC`), `@computesdk/vercel` (the vendor wrapper).

**What lives here:** the spec-coupling policy. Vercel provisions RAM at a fixed 2 GB/vCPU, so the
2 vCPU / 8 GiB target is inexpressible — the adapter buys memory parity with 4 vCPUs and the CPU
oversizing is disclosed downstream via observed specs (`specMatched=false`). No custom images: the
toolchain installs at run time through the harness's dnf fallback paths.
