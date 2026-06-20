#!/usr/bin/env bash
# Verification step. /toolchain-manifest.json is generated host-side from the arktype-validated pins
# (the single source of truth — see packages/templates/src/manifest.ts) and COPY'd in by the
# Dockerfile, so it can't drift from what `mise install` baked (both derive from the same pins). Here
# we confirm it landed for the expected image and that the pre-seeded PTS cache is non-empty; the
# in-sandbox smoke spec verifies the actual runtime versions match the declared manifest.
set -Eeuxo pipefail

: "${IMAGE_NAME:?}"

# > PTS exits 0 even when downloads fail, so an empty cache would silently ship a toolchain that
# > benchmarks nothing — the whole point of baking is the pre-seeded cache.
[ -n "$(ls -A /var/lib/phoronix-test-suite/download-cache 2>/dev/null)" ] \
	|| { echo "ERROR: PTS download-cache is empty (make-download-cache failed?)" >&2; exit 1; }

# > Confirm the generated manifest was COPY'd in and is for this image.
[ -f /toolchain-manifest.json ] \
	|| { echo "ERROR: /toolchain-manifest.json missing (Dockerfile COPY?)" >&2; exit 1; }
grep -q "\"image_name\": \"${IMAGE_NAME}\"" /toolchain-manifest.json \
	|| { echo "ERROR: /toolchain-manifest.json is not for ${IMAGE_NAME}" >&2; exit 1; }

cat /toolchain-manifest.json
