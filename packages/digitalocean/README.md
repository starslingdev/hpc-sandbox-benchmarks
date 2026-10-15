# DigitalOcean MicroVMs driver

This package connects Starsling's sandbox benchmark to
[DigitalOcean MicroVMs](https://docs.digitalocean.com/products/microvms/): each sandbox is one
lightweight VM, with its own guest kernel, running the shared public toolchain image
(`ghcr.io/starslingdev/sandbox-benchmarks-toolchain:<version>`) straight from the registry.
Nothing is baked or pre-built.

It talks to the documented `/v2/microvms` REST API directly. The official TypeScript client,
[`@digitalocean/dots`](https://github.com/digitalocean/dots) 1.20.0, predates MicroVMs:
DigitalOcean's OpenAPI spec defines them, but the client has not been regenerated since. Responses
are parsed with arktype.

## Configuration

- `DIGITAL_OCEAN_TOKEN` (secret): a token with the `microvm:create`, `microvm:read`,
  `microvm:update` (exec) and `microvm:delete` scopes.

## Behaviour

- **Size:** DigitalOcean offers only fixed pairs: 1/2, 2/4, 8/16 and 16/32 (vCPU / GiB). A request
  maps to the smallest pair that covers both axes, so the benchmark's 4 vCPU / 8 GiB runs on
  8 vCPU / 16 GiB. The observed specs record that, and the leaderboard flags it. `prepare` checks
  the size the control plane reports, and pricing is the 8/16 size's rate.
- **Exec:** the documented limit is 60 s, but a command still running at about 41–45 s never
  answers; the gateway returns HTTP 524 after roughly 125 s. Any step budgeted at 30 s or more is
  therefore detached and polled over short execs. Output over 4 MiB is reported as truncated, and
  the adapter fails rather than return partial output. A 429 from the team-wide exec rate limit
  (60 per minute, 32 at once) is retried with backoff for about a minute, one full window, and
  then fails.
- **Files:** there is no file API. The kit's exec-backed fallback serves files.
- **Teardown:** a DELETE is refused (`400 FAILED_PRECONDITION`) while a MicroVM is still
  provisioning, so it is retried for longer than the readiness budget. Removal is confirmed by a
  404.
- **Auto-pause:** it cannot be disabled, so the idle timeout is set to the 4 h maximum. Every
  harness poll counts as traffic. A paused MicroVM keeps its memory and processes, and an exec
  resumes it in about 0.5 s.
- **Ownership:** each MicroVM is named by its `benchmark-<uuid>` marker, which is unique per region
  and listable by exact name, and tagged `sandbox-benchmarks`.

## Account and capacity

The DigitalOcean team must hold only benchmark MicroVMs. Admission inventories the whole team, and
any MicroVM it doesn't own (paused ones included) blocks a run. Before a live rollout, add
`DIGITAL_OCEAN_TOKEN` to the `privileged` environment and create the protected
`benchmark-account-journal-digitalocean` branch, as described in
[account admission before live rollout](../../docs/benchmark-execution-rollout.md#account-admission-before-live-rollout).

MicroVMs run only in MKC1 and only `linux/amd64` images (public preview).

The limit that's actually enforced is **100 running vCPUs per account**, which allows 12 concurrent
8/16 MicroVMs. `GET /v2/microvms/options` doesn't report it. The memory and disk limits that
endpoint does report (32 GiB and 400 GiB on 2026-10-15) were not enforced: a smoke test ran
12 × 8/16 at once, and the 13th create was refused with `400 FAILED_PRECONDITION total running vCPU
limit reached for this account (limit: 100)`.

The next constraint is exec's documented team-wide rate (60 per minute, 32 at once). Steady polling
of a detached step costs about 6 execs per minute per sandbox, so about 10 concurrent sandboxes
reach it.

Set capacity with `{"sandboxes": N}` in `BENCH_ACCOUNT_CAPACITY`:
- N is at most 12. Start at 8 or fewer until the real exec rate is measured.
- Leave 8 vCPU of headroom if a toolchain release may validate DigitalOcean during a run.
- Never express the team's limits through the `vcpus` or `memoryGb` axes. The planner divides those
  by the 4/8 target, not the 8/16 actually allocated, so `vcpus: 100` would admit 25.
