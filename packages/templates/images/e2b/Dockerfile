# syntax=docker/dockerfile:1

# e2b template variant of the shared toolchain. e2b builds templates from a Dockerfile and injects
# its own `envd` daemon during `e2b template build`, so the only delta here is validating the base
# and stamping labels. Built with the images/ directory as context (to reach _shared/), e.g.:
#   docker build -f packages/templates/images/e2b/Dockerfile \
#     --build-arg BASE_IMAGE=sandbox-benchmarks-toolchain:dev packages/templates/images

# > ARG BASE_IMAGE before FROM: default is the local base build tag; CI overrides with the registry
# > URI. The variant's base is the base image's output — declared here, never duplicated.
ARG BASE_IMAGE=sandbox-benchmarks-toolchain:dev

FROM ${BASE_IMAGE}

ARG BASE_IMAGE
ARG BUILD_DATE=""
ARG BUILD_REF=""
ARG BUILD_VERSION=""

SHELL ["/bin/bash", "-o", "pipefail", "-lc"]

# > Validate the base before doing anything provider-specific (catches base/variant skew at build
# > time). Shared across all three variants.
COPY _shared/validate-base.sh /tmp/validate-base.sh
RUN bash /tmp/validate-base.sh && rm -f /tmp/validate-base.sh

LABEL org.opencontainers.image.title="sandbox-benchmarks-toolchain-e2b" \
      org.opencontainers.image.description="e2b template variant of the sandbox-benchmarks toolchain." \
      org.opencontainers.image.source="https://github.com/starslingdev/sandbox-benchmarks" \
      org.opencontainers.image.base.name="${BASE_IMAGE}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_REF}" \
      org.opencontainers.image.version="${BUILD_VERSION}"

# > No ENTRYPOINT/CMD: `e2b template build` injects envd and owns the sandbox lifecycle.
