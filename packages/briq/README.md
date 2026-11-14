# briq driver

This package connects Starsling's sandbox benchmark to [briq](https://briq.cloud): each sandbox is
one briq, a microVM with its own guest kernel, running the shared public toolchain image
(`ghcr.io/starslingdev/sandbox-benchmarks-toolchain:<version>`) straight from the registry.
Nothing is baked or pre-built.

It uses the typed client of [`@briq-cloud/sdk`](https://www.npmjs.com/package/@briq-cloud/sdk)
(the briq REST API). Responses are parsed with arktype.

briq is opt-in: `bench-smoke` or the CLI can select `briq` alone for a targeted run. It is not in
the default matrix in `bench-matrix.yml`.

## Configuration

- `BRIQ_API_KEY` (secret): an API key of a team used only for this benchmark.
- `BRIQ_API_URL` (variable, optional): the API base URL. Default `https://api.briq.cloud`.

## Behaviour

- **Size:** briq offers fixed sizes: `small` 1/2, `medium` 2/4, `large` 4/8 and `xlarge` 8/16
  (vCPU / GiB). A request maps to the smallest size that covers both axes, so the benchmark's
  4 vCPU / 8 GiB runs on `large`, exactly. `prepare` checks the size the API reports. A request no
  size covers is refused before any call.
- **Create:** one `POST /v1/briqs` per sandbox, not waiting. The briq runs `sleep infinity` and the
  harness drives it over exec. The create's `Idempotency-Key` and the `benchmark-marker` label are
  both the harness's ownership marker. Readiness is observed by `GET /v1/briqs/{id}`.
- **Exec:** `POST /v1/briqs/{id}/exec` runs a command for at most 60 s. Longer steps are detached
  and polled over short execs. Output the provider truncated is reported as an error, never as a
  result. A command that timed out has no exit status.
- **Files:** the driver uses no file API. The kit's exec-backed fallback serves files.
- **Sleep:** a briq goes to sleep after an hour without use (default). Every exec counts as use, and
  a sleeping briq is read as ready and wakes on the next exec.
- **Recovery:** a create whose answer was lost is found by repeating it with the same marker as its
  `Idempotency-Key`, which returns the same briq.
- **Teardown:** `DELETE /v1/briqs/{id}`. A destroyed briq stays listed, and is read as gone.
- **Snapshots:** not supported.
- **Environment variables:** the driver passes none to the briq.

## Account and capacity

The briq team behind the key must hold only benchmark briqs: admission inventories the whole team,
and any briq the benchmark does not own blocks a run. Before a live rollout, add `BRIQ_API_KEY` to
the `privileged` environment and create the protected `benchmark-account-journal-briq` branch, as
described in
[account admission before live rollout](../../docs/benchmark-execution-rollout.md#account-admission-before-live-rollout).

The key's team needs a plan and key policy that allow the `large` size, concurrent briqs up to
the capacity you set (`{"sandboxes": N}` in `BENCH_ACCOUNT_CAPACITY`), and room for one 40 GB volume
per sandbox (the Team plan allows 1000 GB, so up to 25 at once). The image's own disk is small: the
driver creates each briq with a volume of the requested capacity mounted at
`/var/lib/phoronix-test-suite`, where the toolchain keeps its state. The kit proves the capacity there
after boot with `df`, so a briq with less is refused and torn down.
