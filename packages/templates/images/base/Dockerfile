# syntax=docker/dockerfile:1

# Shared benchmark toolchain image for every sandbox provider. Built once; each provider variant
# (images/{e2b,daytona,modal}) composes on top via `ARG BASE_IMAGE` and adds only its delta, so the
# toolchain layers stay byte-identical across providers via registry dedupe.
#
# > Thin Dockerfile, fat scripts: the only RUN is the orchestrator, which runs each numbered install
# > script (base/scripts/NN-*.sh) in order. Scripts are shellcheck-linted outside Docker.
#
# > Pins are NOT read from a file. The single source of truth is the arktype-validated TypeScript
# > config (packages/templates/src/pins.ts); build.sh validates it, passes the image/PTS pins as
# > --build-args, and generates mise.toml (the mise tool versions). See images/README.md.

# > ARG before FROM is the whole composability trick. The default is a working local build value
# > (the upstream distro); build.sh/CI override BASE_IMAGE. Bases must be glibc Debian/Ubuntu-family —
# > mise's tools are glibc-linked and the apt set assumes Debian packaging.
ARG BASE_IMAGE=debian:13-slim

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
ARG PTS_INSTALL_TESTS

# > The description is what anonymous visitors see on the public ghcr package page.
LABEL org.opencontainers.image.title="sandbox-benchmarks-toolchain" \
      org.opencontainers.image.description="Pre-baked toolchain for ComputeSDK sandbox benchmarks: mise-managed tools (node, python, pnpm, hyperfine, warp, jc, quarto) and the Phoronix Test Suite with offline caches, so sandbox wall time goes to benchmarks, not setup." \
      org.opencontainers.image.source="https://github.com/starslingdev/sandbox-benchmarks" \
      org.opencontainers.image.base.name="${BASE_IMAGE}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_REF}" \
      org.opencontainers.image.version="${BUILD_VERSION}"

ENV DEBIAN_FRONTEND=noninteractive

# > Login bash with pipefail so a failure anywhere in a piped RUN (and inside the scripts) aborts
# > the build instead of being masked by the last command's exit code.
SHELL ["/bin/bash", "-o", "pipefail", "-lc"]

# > orchestrator.sh runs each NN-*.sh install script in order; the manifest step fails the build on
# > any drift. Pins are passed to the orchestrator as env (from the ARGs above) for this RUN only, so
# > versions are not baked into the final image's environment.
COPY scripts /tmp/build/scripts
RUN IMAGE_NAME="${IMAGE_NAME}" IMAGE_VERSION="${IMAGE_VERSION}" BASE_IMAGE="${BASE_IMAGE}" \
    MISE_VERSION="${MISE_VERSION}" MISE_SHA256_X64="${MISE_SHA256_X64}" MISE_SHA256_ARM64="${MISE_SHA256_ARM64}" \
    PTS_VERSION="${PTS_VERSION}" PTS_DEB_SHA256="${PTS_DEB_SHA256}" PTS_INSTALL_TESTS="${PTS_INSTALL_TESTS}" \
    bash /tmp/build/scripts/orchestrator.sh \
    && rm -rf /tmp/build

# > Plain `docker build` yields the generic toolchain image. Provider glue lives in the variant
# > Dockerfiles (FROM this image) — never here — so these layers stay shared across providers.
FROM toolchain
