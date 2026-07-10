# @sandbox-benchmarks/provider-cloudrun

**Role:** the Google Cloud Run provider adapter — sandboxes execute through a pre-deployed gateway
Cloud Run service (Cloud Run Sandboxes beta), deps isolated to this package.

**Public surface (`.`):** `cloudRunAdapter` (the `ProviderAdapter` the aggregator binds to the
schema's `cloudrun` id) and `cloudRunConfig` (the resolved gateway coordinates).

**Env vars:** `CLOUD_RUN_SANDBOX_URL`, `CLOUD_RUN_SANDBOX_SECRET` — the gateway deployed by
`npx @computesdk/cloud-run` in an allow-listed GCP project. The factory does not read these itself;
this package routes them through provider-core's validated env gate. Missing → the harness skips
the provider.

**Depends on:** `@sandbox-benchmarks/provider-core` (adapter contract + env gate),
`@computesdk/cloud-run` (the vendor wrapper).

**What lives here:** only the gateway plumbing. There are no create-time spec knobs — CPU/memory
are the gateway service's deploy-time flags, so deploy it at the target spec (2 vCPU / 8 GiB) for
cross-provider parity.
