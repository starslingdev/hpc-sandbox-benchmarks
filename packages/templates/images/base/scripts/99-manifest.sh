#!/usr/bin/env bash
# Verification step. /toolchain-manifest.json is generated host-side from the arktype-validated pins
# (the single source of truth — see packages/templates/src/manifest.ts) and COPY'd in by the
# Dockerfile, so it can't drift from what `mise install` baked (both derive from the same pins). Here
# we confirm it landed for the expected image and that pre-installed PTS state is non-empty; the
# in-sandbox smoke spec verifies the actual runtime versions match the declared manifest.
set -Eeuxo pipefail

: "${IMAGE_NAME:?}"

# > PTS exits 0 even when installs fail, so require a completed install manifest here too. The build
# > step verifies every requested profile individually; this final stage proves installed state still
# > exists after duplicate download payloads were pruned.
pts_installed="$(find /var/lib/phoronix-test-suite/installed-tests -name pts-install.json -type f -print -quit 2>/dev/null)"
[ -n "${pts_installed}" ] \
	|| { echo "ERROR: no pre-installed PTS profiles found" >&2; exit 1; }

# > Confirm the generated manifest was COPY'd in and is for this image.
[ -f /toolchain-manifest.json ] \
	|| { echo "ERROR: /toolchain-manifest.json missing (Dockerfile COPY?)" >&2; exit 1; }
grep -q "\"image_name\": \"${IMAGE_NAME}\"" /toolchain-manifest.json \
	|| { echo "ERROR: /toolchain-manifest.json is not for ${IMAGE_NAME}" >&2; exit 1; }

cat /toolchain-manifest.json
