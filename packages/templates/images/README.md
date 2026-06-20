# `@sandbox-benchmarks/templates` — provider toolchain images

Modular, composable Dockerfiles that build the **shared toolchain** every sandbox provider runs, plus
the **per-provider variants** (e2b, daytona, modal) that compose on top of it. Published as
`ghcr.io/starslingdev/sandbox-benchmarks-toolchain` (name + version, like every pin, live in the
arktype-validated TypeScript config — see below).

## The build chain

```text
debian:13-slim                 (upstream, BASE_IMAGE default for base/)
  └─ base/                     the shared toolchain (mise tools + Phoronix Test Suite + caches)
       ├─ e2b/                 thin variant: e2b template (envd injected by the e2b builder)
       ├─ daytona/             thin variant: daytona snapshot source
       └─ modal/               thin variant: consumed via Image.fromRegistry
```

`ARG BASE_IMAGE` before `FROM` is the whole composability trick. Each layer's default base is the
*output of the layer below it*, declared — never duplicated:

- `base/Dockerfile` defaults `BASE_IMAGE=debian:13-slim`.
- each variant defaults `BASE_IMAGE=sandbox-benchmarks-toolchain:dev` (the local base build tag).
- CI overrides `BASE_IMAGE` with the registry-qualified URI when building published images.

## TypeScript is the single source of truth

Every external pin plus the image identity lives in the arktype-validated config at
[`../src/pins.ts`](../src/pins.ts) — there is no `versions.env`, hand-maintained `mise.toml`, or other
config file. `build.sh` validates that config and feeds the build two ways:

- image identity + the mise/PTS pins (`IMAGE_NAME`, `MISE_VERSION`, `PTS_VERSION`, …) are passed to
  `docker build` as `--build-arg`s;
- the mise **tool** versions (node, python, pnpm, hyperfine, warp, jc, quarto) are emitted as a
  generated `base/mise.toml` (gitignored) that the Dockerfile COPYs and `mise install` consumes.

The base image is built in layers, one install script per concern:

- `00-apt.sh` — OS/build deps only (compilers, headers, php, utils) **plus the `mise` binary**,
  downloaded and sha256-verified from its pinned, immutable GitHub release at `MISE_VERSION` — *not*
  apt, whose mise repo is rolling and serves only the latest, which would break the pin.
- `10-mise.sh` — the mise-managed language/CLI toolchain, installed system-wide from the generated
  `mise.toml`. (This is why node/python/etc. are *not* apt packages — mise owns them.)
- `20-pts.sh` — the Phoronix Test Suite + offline caches.
- `99-manifest.sh` — a verification manifest that fails the build on any drift.

> **TODO-pin status.** The pins ship as `__TODO__` placeholders — the reference image they come from
> is not part of this repo. The shell/Docker **lint** gates and the TypeScript gates are green today;
> the actual `docker build` is intentionally **not** a CI gate (the publish workflow is
> `workflow_dispatch`/`main`-only) and will only succeed once the pins in `pins.ts` are filled from
> the reference (or current upstream releases). arktype rejects an unfilled/invalid pin at build time,
> so a forgotten pin fails loudly.

## Building locally

```sh
# Build the base + all variants (validates pins.ts, derives --build-args, generates mise.toml + e2b.toml):
packages/templates/images/build.sh
```

Under the hood `build.sh` runs the base build then each variant, wiring `--build-arg BASE_IMAGE` to
the freshly built base. Variants share `_shared/validate-base.sh`, so their build context is the
`images/` directory and the Dockerfile is selected with `-f`.

## Conventions every Dockerfile / script follows

- **Thin Dockerfile, fat scripts** — the Dockerfile's only `RUN` is the orchestrator; logic lives in
  small, single-concern, `shellcheck`-clean scripts run via `bash <script>`.
- **Script hygiene** — `set -Eeuxo pipefail`; downloads use `curl --retry … && sha256sum -c`; `/tmp`
  is cleaned up.
- **Variants validate their base** — `_shared/validate-base.sh` fails with a "rebuild the base first"
  message if the base is missing the stable node symlink, mise, or the PTS caches.
- **Stable internal paths** — consumers use `/usr/local/bin/bench-node`; the node-version coupling is
  resolved once in the base.
- **OCI labels via ARGs** — `BUILD_DATE`/`BUILD_REF`/`BUILD_VERSION` stamp `org.opencontainers.image.*`.
- **`# >` comments explain *why*** — decisions that look odd are pre-justified inline.
