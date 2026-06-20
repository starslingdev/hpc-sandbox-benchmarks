# syntax=docker/dockerfile:1

# daytona snapshot source: the publish workflow (PR3) creates a daytona snapshot from this image.
# daytona injects its agent at snapshot/runtime, so the only delta here is base validation + labels.
# Built with the images/ directory as context (to reach _shared/), e.g.:
#   docker build -f packages/templates/images/daytona/Dockerfile \
#     --build-arg BASE_IMAGE=sandbox-benchmarks-toolchain:dev packages/templates/images

ARG BASE_IMAGE=sandbox-benchmarks-toolchain:dev

FROM ${BASE_IMAGE}

ARG BASE_IMAGE
ARG BUILD_DATE=""
ARG BUILD_REF=""
ARG BUILD_VERSION=""

SHELL ["/bin/bash", "-o", "pipefail", "-lc"]

COPY _shared/validate-base.sh /tmp/validate-base.sh
RUN bash /tmp/validate-base.sh && rm -f /tmp/validate-base.sh

LABEL org.opencontainers.image.title="sandbox-benchmarks-toolchain-daytona" \
      org.opencontainers.image.description="daytona snapshot source for the sandbox-benchmarks toolchain." \
      org.opencontainers.image.source="https://github.com/starslingdev/sandbox-benchmarks" \
      org.opencontainers.image.base.name="${BASE_IMAGE}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_REF}" \
      org.opencontainers.image.version="${BUILD_VERSION}"

# > No ENTRYPOINT/CMD: daytona wraps this image in a snapshot and injects its own agent.
