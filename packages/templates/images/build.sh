#!/usr/bin/env bash
# Build the toolchain base image and all provider variants. The pins come from the arktype-validated
# TypeScript source of truth (packages/templates/src/pins.ts) — there is no versions.env. This script
# validates that config (via bun), passes the image/PTS pins to `docker build` as --build-args, and
# generates the mise.toml (tool versions) + e2b.toml from the same source. Single source of build
# logic for local dev and the publish workflow (the workflow stays thin by shelling out here).
#
# Usage: packages/templates/images/build.sh
# Honors env overrides: REGISTRY, IMAGE_OWNER, BUILD_DATE, BUILD_REF, BUILD_VERSION.
set -Eeuxo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" # packages/templates/images
PINS_TS="${HERE}/../src/pins.ts"

REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_OWNER="${IMAGE_OWNER:-starslingdev}"

# > Validate the pins and collect them as KEY=VALUE lines. `bun` exits non-zero (and set -e aborts)
# > if arktype rejects any pin, so a bad/unfilled pin fails the build before docker is even invoked.
pins_output="$(bun "${PINS_TS}")"

base_build_args=()
image_name=""
image_version=""
while IFS= read -r line; do
	[ -n "${line}" ] || continue
	base_build_args+=(--build-arg "${line}")
	case "${line}" in
		IMAGE_NAME=*) image_name="${line#*=}" ;;
		IMAGE_VERSION=*) image_version="${line#*=}" ;;
	esac
done <<< "${pins_output}"

: "${image_name:?pins.ts did not emit IMAGE_NAME}"
: "${image_version:?pins.ts did not emit IMAGE_VERSION}"

base_repo="${REGISTRY}/${IMAGE_OWNER}/${image_name}"
base_ref="${base_repo}:${image_version}"
# > Local tag the variants build against (matches each variant Dockerfile's BASE_IMAGE default).
base_dev_tag="${image_name}:dev"

# > OCI label inputs — empty on local builds, real values passed by CI. Applied to every image.
meta_args=(
	--build-arg "BUILD_DATE=${BUILD_DATE:-}"
	--build-arg "BUILD_REF=${BUILD_REF:-}"
	--build-arg "BUILD_VERSION=${BUILD_VERSION:-${image_version}}"
)

# > Generate the files the images consume from the same TS source (all gitignored): mise.toml pins the
# > base image's tool versions; e2b.toml is the e2b template manifest; toolchain-manifest.json is the
# > verification manifest, built from the validated pins (single source of truth) and COPY'd into the
# > base image — so it's generated + typed end-to-end instead of hand-assembled in-container.
bun "${PINS_TS}" --mise-toml > "${HERE}/base/mise.toml"
bun "${PINS_TS}" --e2b-toml > "${HERE}/e2b/e2b.toml"
bun "${HERE}/../src/manifest.ts" > "${HERE}/base/toolchain-manifest.json"

echo ">>> building base: ${base_dev_tag} (+ ${base_ref})"
docker build "${base_build_args[@]}" "${meta_args[@]}" \
	-t "${base_dev_tag}" -t "${base_ref}" \
	"${HERE}/base"

# > Each variant composes on the just-built base via --build-arg BASE_IMAGE, with the images/
# > directory as context so it can COPY the shared _shared/validate-base.sh. Variants take only the
# > base ref + build metadata (their Dockerfiles declare no toolchain pins).
for provider in e2b daytona modal; do
	ref="${base_repo}-${provider}:${image_version}"
	echo ">>> building ${provider} variant: ${ref}"
	docker build "${meta_args[@]}" \
		--build-arg "BASE_IMAGE=${base_dev_tag}" \
		-t "${ref}" \
		-f "${HERE}/${provider}/Dockerfile" \
		"${HERE}"
done

echo ">>> build complete"
