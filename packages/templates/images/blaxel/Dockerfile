# syntax=docker/dockerfile:1

# blaxel variant: unlike daytona/modal (which inject their own agent/lifecycle around an unmodified
# image), Blaxel's control plane can only manage a sandbox that runs Blaxel's own `sandbox-api`
# binary as PID 1 — without it there is no exec/fs protocol for the sandbox to speak. So this variant
# bakes that binary + entrypoint onto the shared toolchain base, the same recipe @blaxel/core's
# `ImageInstance` builder (`fromRegistry(...).build()`) would generate automatically for a base image
# that doesn't already carry one (see `_prepareForSandbox` in @blaxel/core's image module) — done here
# as a plain Dockerfile so the result is an ordinary pushed GHCR image the adapter boots via `image:`
# directly, matching every other provider's bake-once/boot-many model instead of going through that
# builder's per-sandbox build-and-deploy flow. Built with the images/ directory as context (to reach
# _shared/), e.g.:
#   docker build -f packages/templates/images/blaxel/Dockerfile \
#     --build-arg BASE_IMAGE=sandbox-benchmarks-toolchain:dev packages/templates/images

# > Named stage for Blaxel's own sandbox-api binary (the exact source image/path @blaxel/core's
# > ImageInstance builder copies in — SANDBOX_API_IMAGE/SANDBOX_API_PATH, verified against the pinned
# > @blaxel/core@0.2.95). A named stage, not a bare `COPY --from=<image>`, so a plain lint pass reads it
# > as an ordinary multi-stage copy. Pinned by digest for the same reproducibility reason the base pins
# > BASE_IMAGE; refresh with `docker buildx imagetools inspect ghcr.io/blaxel-ai/sandbox:latest`.
FROM ghcr.io/blaxel-ai/sandbox@sha256:8c60ef94ab45394e065aa998213535852305656ca39f415fcb4a42bdd3b7d2e3 AS sandbox-api

ARG BASE_IMAGE=sandbox-benchmarks-toolchain:dev

FROM ${BASE_IMAGE}

ARG BASE_IMAGE
ARG BUILD_DATE=""
ARG BUILD_REF=""
ARG BUILD_VERSION=""

SHELL ["/bin/bash", "-o", "pipefail", "-lc"]

COPY _shared/validate-base.sh /tmp/validate-base.sh
RUN bash /tmp/validate-base.sh && rm -f /tmp/validate-base.sh

COPY --from=sandbox-api /sandbox-api /usr/local/bin/sandbox-api

LABEL org.opencontainers.image.title="sandbox-benchmarks-toolchain-blaxel" \
      org.opencontainers.image.description="blaxel variant of the sandbox-benchmarks toolchain, with Blaxel's sandbox-api injected so the baked toolchain (not the stock blaxel/ts-app image) boots as a Blaxel sandbox." \
      org.opencontainers.image.source="https://github.com/starslingdev/sandbox-benchmarks" \
      org.opencontainers.image.base.name="${BASE_IMAGE}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_REF}" \
      org.opencontainers.image.version="${BUILD_VERSION}"

# > Blaxel's control plane execs/manages the sandbox exclusively through this binary — see the header.
ENTRYPOINT ["/usr/local/bin/sandbox-api"]
