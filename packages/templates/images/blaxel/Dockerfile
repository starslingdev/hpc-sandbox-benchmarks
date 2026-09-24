# syntax=docker/dockerfile:1

# Blaxel's sandbox API and disk-backed writable paths are the only changes to the shared base.
# The release baker pins BASE_IMAGE to the validated candidate/version digest.
ARG BASE_IMAGE=sandbox-benchmarks-toolchain:dev
FROM ${BASE_IMAGE}

ARG BASE_IMAGE
ARG BUILD_DATE=""
ARG BUILD_REF=""
ARG BUILD_VERSION=""

SHELL ["/bin/bash", "-o", "pipefail", "-lc"]

COPY _shared/validate-base.sh /tmp/validate-base.sh
RUN bash /tmp/validate-base.sh && rm -f /tmp/validate-base.sh

COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api
COPY blaxel/entrypoint.sh /usr/local/bin/benchmark-blaxel-entrypoint
RUN chmod +x /usr/local/bin/benchmark-blaxel-entrypoint

ENV HOME=/blaxel

LABEL org.opencontainers.image.title="sandbox-benchmarks-toolchain-blaxel" \
      org.opencontainers.image.description="Blaxel variant of the shared sandbox-benchmarks toolchain." \
      org.opencontainers.image.source="https://github.com/starslingdev/sandbox-benchmarks" \
      org.opencontainers.image.base.name="${BASE_IMAGE}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_REF}" \
      org.opencontainers.image.version="${BUILD_VERSION}"

ENTRYPOINT ["/usr/local/bin/benchmark-blaxel-entrypoint"]
