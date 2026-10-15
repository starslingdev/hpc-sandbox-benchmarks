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
  (60 per minute, 32 at once) is waited out.
- **Files:** there is no file API. The kit's exec-backed fallback serves files.
- **Teardown:** a DELETE is refused (`400 FAILED_PRECONDITION`) while a MicroVM is still
  provisioning, so it is retried for longer than the readiness budget. Removal is confirmed by a
  404.
- **Auto-pause:** it cannot be disabled, so the idle timeout is set to the 4 h maximum. Every
  harness poll counts as traffic. A paused MicroVM keeps its memory and processes, and an exec
  resumes it in about 0.5 s.
- **Ownership:** each MicroVM is named by its `benchmark-<uuid>` marker, which is unique per region
  and listable by exact name, and tagged `sandbox-benchmarks`.

## Limits (public preview)

MicroVMs run only in MKC1 and only `linux/amd64` images. Our team's limits (from
`GET /v2/microvms/options`) are 32 GiB of memory, 400 GiB of disk and 200 MicroVMs. The disk limit
fits one 8/16 MicroVM (320 GB) at a time, so `BENCH_ACCOUNT_CAPACITY` should hold `digitalocean`
to one sandbox until DigitalOcean raises it.
