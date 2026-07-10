# @sandbox-benchmarks/provider-blaxel

**Role:** the Blaxel provider adapter — boots the stock Debian `ts-app` image (no baked artifact),
deps isolated to this package.

**Public surface (`.`):** `blaxelAdapter` (the `ProviderAdapter` the aggregator binds to the
schema's `blaxel` id).

**Env vars:** `BL_API_KEY`, `BL_WORKSPACE` (read by the Blaxel SDK; missing → the harness skips
the provider).

**Depends on:** `@sandbox-benchmarks/provider-core` (adapter contract), `@computesdk/blaxel` (the
vendor wrapper).

**What lives here:** the sizing workaround for Blaxel's coupled spec dimensions — CPU cores =
memory MB / 2048 and disk is a tmpfs overlay at ~78% of memory, so the shared 2 vCPU / 8 GiB /
20 GB target is inexpressible. The adapter boots oversized (16 GiB ⇒ 8-core allocation, ~12.5 GiB
disk) and the mismatch is disclosed downstream via observed specs (`specMatched=false`).
