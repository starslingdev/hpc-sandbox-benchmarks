#!/usr/bin/env bash
# Verification step. /toolchain-manifest.json is generated host-side from the arktype-validated pins
# (the single source of truth — see packages/templates/src/manifest.ts) and COPY'd in by the
# Dockerfile, so it can't drift from what `mise install` baked (both derive from the same pins). Here
# we confirm it landed for the expected image and that pre-installed PTS state is complete; the
# in-sandbox smoke spec verifies the actual runtime versions match the declared manifest.
#
# This is also the ONLY step that sees the whole PTS install, so it carries the cross-layer
# assertions. Profiles are baked group by group (25-pts-profiles.sh, one layer per group), and each
# group can only vouch for its own slice: a profile whose group was never wired into a Dockerfile
# RUN, or a fio patch skipped because fio landed in a group nobody installed, is invisible layer by
# layer. Checking the FULL PTS_INSTALL_TESTS here closes that gap — fewer benchmarks fails the bake
# rather than shipping quietly.
set -Eeuxo pipefail

: "${IMAGE_NAME:?}"
: "${PTS_INSTALL_TESTS:?}"

pts_root=/var/lib/phoronix-test-suite
read -ra pts_tests <<< "${PTS_INSTALL_TESTS}"

# > PTS exits 0 even when installs fail, so require a completed install manifest here too. The group
# > steps verify their own profiles; this final stage proves installed state still exists for EVERY
# > baked profile after the later groups' layers and the duplicate-download prune.
installed="$(phoronix-test-suite list-installed-tests)"
for t in "${pts_tests[@]}"; do
	echo "${installed}" | grep -qE "(^|/)${t}(-[0-9]|[[:space:]]|$)" \
		|| { echo "ERROR: ${t} is in PTS_INSTALL_TESTS but not installed — is its group wired to a Dockerfile RUN?" >&2; exit 1; }
	[ -f "${pts_root}/installed-tests/pts/${t}/pts-install.json" ] \
		|| { echo "ERROR: ${t} has no pts-install.json — the pre-install did not complete" >&2; exit 1; }
done

# > Exactly one fio across the whole bake, carrying the portability patch 25-pts-profiles.sh applies
# > (see the -march=native rationale there). Asserted globally because only the owning group patches:
# > zero or several fio entries is a pin-list bug this bake refuses to guess around, and an unpatched
# > fio silently records empty disk results on Modal's gVisor sandboxes.
fio_pin=""
for t in "${pts_tests[@]}"; do
	case "${t}" in
	fio-*)
		[ -z "${fio_pin}" ] || { echo "ERROR: multiple fio entries in PTS_INSTALL_TESTS (${PTS_INSTALL_TESTS})" >&2; exit 1; }
		fio_pin="${t}"
		;;
	esac
done
[ -n "${fio_pin}" ] || { echo "ERROR: no fio entry in PTS_INSTALL_TESTS (${PTS_INSTALL_TESTS}) — the --disable-native patch has nothing to apply to" >&2; exit 1; }
grep -q -- '--disable-native' "${pts_root}/test-profiles/pts/${fio_pin}/install.sh" \
	|| { echo "ERROR: ${fio_pin} install.sh lost its --disable-native patch" >&2; exit 1; }

# > pgbench's built payload and its 0700 data dir, re-checked after every group's chmod has run: the
# > payload because upstream's install.sh writes a launcher even when the postgres build failed, the
# > mode because postgres FATALs at startup on any group/other bit and a later layer's chmod is
# > exactly the kind of edit that would loosen it again.
for t in "${pts_tests[@]}"; do
	case "${t}" in
	pgbench*)
		[ -x "${pts_root}/installed-tests/pts/${t}/pg_/bin/pgbench" ] \
			|| { echo "ERROR: ${t} installed without its built postgres payload (pg_/bin/pgbench missing)" >&2; exit 1; }
		pgdata="${pts_root}/installed-tests/pts/${t}/pg_/data/db"
		[ "$(stat -c '%a' "${pgdata}")" = "700" ] \
			|| { echo "ERROR: ${t} data dir mode is $(stat -c '%a' "${pgdata}"), postgres requires 0700" >&2; exit 1; }
		;;
	esac
done

# > Confirm the generated manifest was COPY'd in and is for this image.
[ -f /toolchain-manifest.json ] \
	|| { echo "ERROR: /toolchain-manifest.json missing (Dockerfile COPY?)" >&2; exit 1; }
grep -q "\"image_name\": \"${IMAGE_NAME}\"" /toolchain-manifest.json \
	|| { echo "ERROR: /toolchain-manifest.json is not for ${IMAGE_NAME}" >&2; exit 1; }

cat /toolchain-manifest.json
