# Baseten Sandboxes driver

This package connects Starsling's sandbox benchmark to
[Baseten Sandboxes](https://docs.baseten.co/sandboxes/overview) through the official TypeScript
SDK, [`@basetenlabs/sandbox`](https://www.npmjs.com/package/@basetenlabs/sandbox) (pinned in the
root `computesdk` catalog). Baseten Sandboxes are in pre-release.

## Configuration

- `BASETEN_API_KEY` (secret): a Baseten API key. The SDK acts in the key's only team. Add a
  `teamId` here if the benchmark key ever belongs to several teams.

The SDK can also send requests through the optional `undici` package for HTTP/2, but only on Node.
The benchmark runs on Bun, where the SDK always uses Bun's own `fetch`, so `undici` is not a
dependency.

## Artifact

A Baseten sandbox image must run Baseten's sandbox API server (Blaxel's `sandbox-api` binary). The
shared toolchain image can't boot as is, so the release bakes it. `./artifact` pushes the
`packages/templates/images/baseten/` build context to Baseten's remote builder through
`client.images.push`, `FROM` the digest-pinned toolchain base. Sandboxes boot `<name>:latest`.
The remote builder pulls the base without credentials, so the toolchain package must be public.

## Behaviour

- **Size:** Baseten derives vCPU from memory through a fixed table (2048 MiB → 1 vCPU, 4096 → 2,
  8192 → 4, 16384 → 6, 32768 → 8, 65536 → 16). The SDK has no CPU knob. The 4 vCPU / 8 GiB target
  is `memory: 8192`. A request off the table is refused before any call, and `prepare` checks the
  memory the control plane reports.
- **Disk:** the root filesystem is held in the sandbox's memory (50% of it by default). So each
  create first makes a **persistent volume** of the requested size plus 256 MiB headroom, named by
  the attempt's marker. It waits for the volume to be `DEPLOYED`, then mounts it at
  `/mnt/benchmark-volume` in a sandbox in the volume's region. The image's entrypoint seeds the
  baked PTS tree onto the volume and links PTS and `HOME` there. The kit's disk proof checks
  `/var/lib/phoronix-test-suite`.
- **Standby:** an idle sandbox goes on standby and pauses its processes. `prepare` starts a
  `keepAlive` `sleep infinity` process, as on Blaxel. Every process is started with `timeoutMs: 0`,
  because `keepAlive` alone defaults to a 600 s kill.
- **Exec:** synchronous execs are capped at 60 s. Longer steps run as native background processes.
- **Teardown:** the sandbox is deleted first, then its volume. Baseten refuses to delete a mounted
  volume, and a sandbox takes minutes to reach `TERMINATED`. That refusal is retried as transient
  inside a 15 min delete budget. Removal is confirmed only when both records are gone.
- **Leaks:** every sandbox carries a `TTL_MAX_AGE` expiry of the kit's leak lifetime (3 h). Volumes
  have no expiry. A volume with no live sandbox is listed by inventory as an owned `failed` record,
  so the kit tears it down.
- **Ownership:** sandbox and volume share the `benchmark-<uuid>` marker as their name and carry the
  `sandbox-benchmarks=baseten` label.

## Account and capacity

The default quota is **10 concurrent sandboxes per organization**. A per-account memory cap also
applies, which Baseten does not publish (it answers 429). Baseten publishes no sandbox pricing, so
economics are recorded as unavailable.

## Not yet validated live

This driver is tested at the vendor seam against a stub of the SDK. Before a live rollout:

- check that a volume delete really is refused only while mounted, and with which status;
- check that volume names share the sandbox naming rules;
- run `driver-check` and a CPU suite;
- add `BASETEN_API_KEY` to the `privileged` environment, as described in
  [account admission before live rollout](../../docs/benchmark-execution-rollout.md#account-admission-before-live-rollout).

Run `bun run --filter @sandbox-benchmarks/baseten test` or `typecheck` from the repo root.
