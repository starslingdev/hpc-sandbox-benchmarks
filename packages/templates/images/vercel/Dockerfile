# syntax=docker/dockerfile:1

# Vercel Sandbox variant mirrored to VCR. The vendor injects its session agent when the custom image
# boots, so the provider delta is limited to validating and labelling the shared Debian toolchain.
ARG BASE_IMAGE=sandbox-benchmarks-toolchain:dev

FROM ${BASE_IMAGE}

ARG BASE_IMAGE
ARG BUILD_DATE=""
ARG BUILD_REF=""
ARG BUILD_VERSION=""

SHELL ["/bin/bash", "-o", "pipefail", "-lc"]

COPY _shared/validate-base.sh /tmp/validate-base.sh
RUN bash /tmp/validate-base.sh && rm -f /tmp/validate-base.sh

LABEL org.opencontainers.image.title="sandbox-benchmarks-toolchain-vercel" \
      org.opencontainers.image.description="Vercel Sandbox VCR variant of the sandbox-benchmarks toolchain." \
      org.opencontainers.image.source="https://github.com/starslingdev/sandbox-benchmarks" \
      org.opencontainers.image.base.name="${BASE_IMAGE}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_REF}" \
      org.opencontainers.image.version="${BUILD_VERSION}"

# No ENTRYPOINT/CMD: Vercel injects and owns the sandbox session lifecycle.
