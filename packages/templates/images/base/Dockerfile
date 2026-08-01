# syntax=docker/dockerfile:1

# Shared benchmark toolchain image for every sandbox provider. Built once; each provider variant
# (images/{e2b,daytona,modal}) composes on top via `ARG BASE_IMAGE` and adds only its delta, so the
# toolchain layers stay byte-identical across providers via registry dedupe.
#
# > Thin Dockerfile, fat scripts: RUN instructions only dispatch numbered install scripts
# > (base/scripts/NN-*.sh) through the orchestrator. Scripts are shellcheck-linted outside Docker.
#
# > Pins are NOT read from a file. The single source of truth is the arktype-validated TypeScript
# > config (packages/templates/src/pins.ts); build.sh validates it, passes the image/PTS pins as
# > --build-args, and generates mise.toml (the mise tool versions). See images/README.md.

# > ARG before FROM is the whole composability trick. The default is a working local build value
# > (the upstream distro); build.sh/CI override BASE_IMAGE. Bases must be glibc Debian/Ubuntu-family —
# > mise's tools are glibc-linked and the apt set assumes Debian packaging.
# > Security: the default is pinned by digest (not just the floating :13-slim tag) so the build is
# > reproducible and the base can't be silently swapped. Refresh the digest with
# > `docker buildx imagetools inspect debian:13-slim`.
ARG BASE_IMAGE=debian:13-slim@sha256:4e401d95de7083948053197a9c3913343cd06b706bf15eb6a0c3ccd26f436a0e

FROM ${BASE_IMAGE} AS toolchain

# > Redeclared inside the stage so the labels + manifest can record which base this image was built on.
ARG BASE_IMAGE
# > Build metadata, empty on local builds; stamped into OCI labels below. build.sh/CI pass real values.
ARG BUILD_DATE=""
ARG BUILD_REF=""
ARG BUILD_VERSION=""
# > Image/PTS pins, supplied by build.sh from the arktype-validated TS source (the mise tool versions
# > arrive via the generated mise.toml instead). No defaults: a missing pin leaves the ARG empty and a
# > script's `: "${VAR:?}"` assert fails the build loudly. MISE_VERSION is the pinned mise *release*
# > version (fetched from its immutable GitHub release in 00-apt.sh — not apt).
ARG IMAGE_NAME
ARG IMAGE_VERSION
ARG MISE_VERSION
# > Per-arch sha256 of the mise release binary. The asset is arch-specific (unlike the arch-independent
# > PTS .deb), so the sha is pinned per arch in pins.ts; 00-apt.sh verifies the download against the one
# > matching the build arch — a committed pin, not a checksum fetched alongside the binary.
ARG MISE_SHA256_X64
ARG MISE_SHA256_ARM64
ARG PTS_VERSION
ARG PTS_DEB_SHA256
# > The complete baked profile set. Only 99-manifest.sh consumes it, to verify every profile below
# > actually installed; the per-group args carry the same profiles split across the RUNs that install
# > them (see the layer-budget comment further down).
ARG PTS_INSTALL_TESTS
# > One ARG per group in ptsInstallGroups (packages/templates/src/lib/pins.ts). These are packaging,
# > not pins: pins.ts validates that they partition PTS_INSTALL_TESTS exactly, and pins.test.ts gates
# > this ARG/RUN pair list against that object, so a group added there without a RUN here fails the
# > repo checks rather than silently dropping its benchmarks.
ARG PTS_INSTALL_GROUP_DATABASE
ARG PTS_INSTALL_GROUP_BROWSER
ARG PTS_INSTALL_GROUP_RUNTIME
ARG PTS_INSTALL_GROUP_NATIVE

# > The description is what anonymous visitors see on the public ghcr package page.
LABEL org.opencontainers.image.title="sandbox-benchmarks-toolchain" \
      org.opencontainers.image.description="Pre-baked toolchain for ComputeSDK sandbox benchmarks: mise-managed tools (node, python, pnpm, hyperfine, warp, jc, quarto) and pre-installed Phoronix Test Suite profiles for offline runs, so sandbox wall time goes to benchmarks, not setup." \
      org.opencontainers.image.source="https://github.com/starslingdev/sandbox-benchmarks" \
      org.opencontainers.image.base.name="${BASE_IMAGE}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_REF}" \
      org.opencontainers.image.version="${BUILD_VERSION}"

# > Build-only: DEBIAN_FRONTEND is an ARG, not ENV, so it isn't baked into this image or the variants
# > built FROM it (a persistent ENV would silently suppress interactive prompts in derived images).
# > It's handed to the orchestrator RUNs below, scoped to the build.
ARG DEBIAN_FRONTEND=noninteractive

# > mise lives system-wide: one shared toolchain for every sandbox user, on PATH via its shims dir.
# > 10-mise.sh installs from the config at MISE_CONFIG_DIR (the generated mise.toml, COPY'd below).
# > These MUST persist at runtime, so they stay ENV.
ENV MISE_DATA_DIR=/usr/local/share/mise \
    MISE_CONFIG_DIR=/etc/mise \
    PTS_USER_PATH_OVERRIDE=/var/lib/phoronix-test-suite/ \
    PATH=/usr/local/share/mise/shims:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# > Login bash with pipefail so a failure anywhere in a piped RUN (and inside the scripts) aborts
# > the build instead of being masked by the last command's exit code.
SHELL ["/bin/bash", "-o", "pipefail", "-lc"]

# > mise.toml (generated by build.sh from pins.ts — the mise tool versions) drives 10-mise.sh. Placed
# > at mise's system config path so `mise install` finds it.
COPY mise.toml /etc/mise/config.toml

# > The verification manifest, generated host-side from the validated pins (single source of truth) and
# > shipped as-is — 99-manifest.sh confirms it landed; the smoke spec verifies the runtime matches it.
COPY toolchain-manifest.json /toolchain-manifest.json

# > LAYER BUDGET — why the install is split across this many RUNs rather than one.
# >
# > Two provider registries cap what they will accept, and the cap is on the COMPRESSED layer:
# >   - Vercel Container Registry: 500 MB per layer (the binding constraint today). Over it, the push
# >     fails mid-stream with an opaque `413 Request Entity Too Large`.
# >     https://vercel.com/docs/container-registry/limits-and-pricing
# >   - Daytona's snapshot registry: ~1 GiB per layer, rejected with an opaque inspection error.
# > Neither caps the total image (VCR allows 15 GB; this image is well under 2 GB), so the fix is
# > always to split, never to ship fewer benchmarks.
# >
# > MEASURE COMPRESSED. `docker history` and `docker image inspect` report UNCOMPRESSED sizes and
# > will mislead you by more than 2x (v6's 970 MB layer shows as 2.27 GB there). What a registry
# > receives is the manifest's layer sizes, so read them off a throwaway local registry:
# >   docker run -d -p 5001:5000 --name tmp-registry registry:2
# >   docker tag <image> localhost:5001/probe:t && docker push localhost:5001/probe:t
# >   docker buildx imagetools inspect localhost:5001/probe:t --raw | jq '.layers[].size'
# > On a multi-platform tag that `--raw` returns the index instead; resolve the linux/amd64 entry
# > (`.manifests[] | select(.platform.architecture=="amd64")`) and inspect that digest.
# >
# > This split is the second iteration. The first (apt+mise | PTS | verify) was what brought the
# > former single >1 GiB layer under Daytona's cap; VCR's tighter 500 MB then cut both of those
# > layers, so apt and mise are separate now and the PTS profiles are installed group by group
# > (ptsInstallGroups in packages/templates/src/lib/pins.ts — grouped by install weight, heaviest
# > first). Install logic stays in the shellcheck-linted scripts; the RUNs only dispatch. Pins remain
# > RUN-scoped and are not baked into the final image's environment.
# >
# > Order matters beyond dependencies: each profile group's layer also prunes and chmods ONLY what it
# > added. In overlayfs a cross-layer delete is a whiteout (reclaims nothing) and a cross-layer mode
# > CHANGE is a full copy-up, so a blanket `chmod -R` after the groups silently re-merges everything
# > this split exists to separate — measured on a stubbed four-group tree, it added a 267 MB layer and
# > took the image from 297 MB to 565 MB. That is why 20-pts.sh does its one recursive chmod while the
# > tree is still empty, and each group re-opens only its own subtree afterwards.
COPY scripts /tmp/build/scripts
RUN DEBIAN_FRONTEND="${DEBIAN_FRONTEND}" \
    bash /tmp/build/scripts/orchestrator.sh 00-apt.sh
# Separate layer is the registry layer-size constraint documented above.
# hadolint ignore=DL3059
RUN MISE_VERSION="${MISE_VERSION}" MISE_SHA256_X64="${MISE_SHA256_X64}" MISE_SHA256_ARM64="${MISE_SHA256_ARM64}" \
    bash /tmp/build/scripts/orchestrator.sh 10-mise.sh
# The PTS runtime + its state tree; profiles arrive in the per-group layers below.
# hadolint ignore=DL3059
RUN DEBIAN_FRONTEND="${DEBIAN_FRONTEND}" \
    PTS_VERSION="${PTS_VERSION}" PTS_DEB_SHA256="${PTS_DEB_SHA256}" \
    bash /tmp/build/scripts/orchestrator.sh 20-pts.sh
# One layer per profile group, heaviest first so a cache miss re-runs as little as possible.
# hadolint ignore=DL3059
RUN PTS_INSTALL_TESTS="${PTS_INSTALL_GROUP_DATABASE}" \
    bash /tmp/build/scripts/orchestrator.sh 25-pts-profiles.sh
# hadolint ignore=DL3059
RUN PTS_INSTALL_TESTS="${PTS_INSTALL_GROUP_BROWSER}" \
    bash /tmp/build/scripts/orchestrator.sh 25-pts-profiles.sh
# hadolint ignore=DL3059
RUN PTS_INSTALL_TESTS="${PTS_INSTALL_GROUP_RUNTIME}" \
    bash /tmp/build/scripts/orchestrator.sh 25-pts-profiles.sh
# hadolint ignore=DL3059
RUN PTS_INSTALL_TESTS="${PTS_INSTALL_GROUP_NATIVE}" \
    bash /tmp/build/scripts/orchestrator.sh 25-pts-profiles.sh
# Keep verification/cleanup out of the already bounded install layers. This one sees the FULL profile
# set, so it is where a group that never got wired to a RUN above is caught.
# hadolint ignore=DL3059
RUN IMAGE_NAME="${IMAGE_NAME}" IMAGE_VERSION="${IMAGE_VERSION}" BASE_IMAGE="${BASE_IMAGE}" \
    PTS_INSTALL_TESTS="${PTS_INSTALL_TESTS}" \
    bash /tmp/build/scripts/orchestrator.sh 99-manifest.sh \
    && rm -rf /tmp/build

# > Security note: the generic image defaults to root, while E2B-compatible template builders inject
# > an unprivileged runtime user. PTS_USER_PATH_OVERRIDE keeps both identities on the same pre-baked
# > state under /var/lib/phoronix-test-suite; 20-pts.sh grants sandbox users write access because PTS
# > writes per-run config and results there. Isolation remains the provider's outer VM/container
# > boundary. Any setuid binary added later should be justified here.
#
# > Plain `docker build` yields the generic toolchain image. Provider glue lives in the variant
# > Dockerfiles (FROM this image) — never here — so these layers stay shared across providers.
FROM toolchain
