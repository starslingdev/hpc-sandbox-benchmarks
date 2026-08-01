#!/usr/bin/env bash
# Pre-install ONE group of PTS profiles for offline execution, so sandbox wall time goes to
# benchmarks, not setup. The Dockerfile calls this once per entry in ptsInstallGroups
# (packages/templates/src/lib/pins.ts), each in its own RUN, so each group becomes its own layer.
#
# Why per-group: a single PTS layer measured 970.0 MB compressed and Vercel Container Registry
# rejects any compressed layer over 500 MB with an opaque HTTP 413 mid-push. The group boundaries come
# from measured per-profile compressed sizes (see ptsInstallGroups) — git alone is 451.5 MB.
#
# EVERY step for a group must stay inside THIS script, and therefore inside one RUN:
#   - the download cache is staged and pruned here, because a later layer that deletes a cached
#     tarball cannot shrink the earlier layer that added it;
#   - the chmod is scoped to this group's installed tree, because a blanket `chmod -R` in a later
#     layer copies every file it touches into that layer.
# Splitting any of it back out silently re-inflates the image without failing anything.
set -Eeuxo pipefail

: "${PTS_PROFILE_GROUP:?}"
: "${FIO_PROFILE_PIN:?}"

read -ra pts_tests <<< "${PTS_PROFILE_GROUP}"
(( ${#pts_tests[@]} > 0 )) || { echo "ERROR: empty PTS_PROFILE_GROUP" >&2; exit 1; }
echo "::: PTS profile group: ${PTS_PROFILE_GROUP}"

# > The staging list DERIVES from the install list (same versioned pins — caching a different version
# > than the leaves batch-run would send the installer back to the network). Do not cache unwired
# > future profiles: provider snapshot registries must import the complete compressed image.
# > network-loopback has no downloads and no-ops here harmlessly.
phoronix-test-suite make-download-cache "${pts_tests[@]}"

# > fio's configure defaults to -march=native — native to the BAKE machine, which is wrong on both
# > counts for a baked image: it is not the run machine's ISA and it is not portable. Modal's gVisor
# > sandboxes expose only AVX2 (no avx512*), so a builder-native binary dies in ~30ms and the disk
# > suite records empty fio results. Disk I/O measurement is ISA-insensitive, so pin the baked fio to
# > the compiler's portable default.
# >
# > FIO_PROFILE_PIN is the single fio entry across ALL groups (validatedPins() enforces exactly one, so
# > no group has to guess). Patch only in the group that actually installs it.
for t in "${pts_tests[@]}"; do
	if [ "$t" = "${FIO_PROFILE_PIN}" ]; then
		fio_install="/var/lib/phoronix-test-suite/test-profiles/pts/${FIO_PROFILE_PIN}/install.sh"
		[ -f "${fio_install}" ] || { echo "ERROR: fio profile not staged at ${fio_install}" >&2; exit 1; }
		sed -i 's|\./configure |./configure --disable-native |' "${fio_install}"
		grep -q -- '--disable-native' "${fio_install}" || { echo "ERROR: --disable-native patch did not land in fio install.sh" >&2; exit 1; }
	fi
done

# > PTS exits 0 even when an install fails, so verify each requested profile actually reports installed.
# > A versionless entry anchors on "<test>-<version>" (versions start with a digit); a version-pinned
# > entry ("fio-2.1.0") already ends in its version, so it anchors on a following non-name character
# > instead. Both keep a profile name that is a substring of another installed test from masking its
# > own install failure.
phoronix-test-suite batch-install "${pts_tests[@]}"
installed="$(phoronix-test-suite list-installed-tests)"
for t in "${pts_tests[@]}"; do
	echo "${installed}" | grep -qE "(^|/)${t}(-[0-9]|[[:space:]]|$)" || { echo "ERROR: pre-install of ${t} failed" >&2; exit 1; }
done

# > list-installed-tests only proves the launcher file a profile's install.sh wrote exists — and
# > pgbench's upstream install.sh (plain sh, no set -e) writes it even when configure/make failed,
# > so the 2026-07 ICU/pkg-config half-install (launcher present, pg_/ payload absent) passed the
# > loop above and the image published. Assert the payload the generated launcher actually executes
# > (its line 21 runs pg_/bin/pgbench), so a launcher-only half-install fails the bake loudly —
# > this script runs under set -Eeuxo pipefail inside docker build.
for t in "${pts_tests[@]}"; do
	case "${t}" in
	pgbench*)
		[ -x "/var/lib/phoronix-test-suite/installed-tests/pts/${t}/pg_/bin/pgbench" ] ||
			{ echo "ERROR: ${t} installed without its built postgres payload (pg_/bin/pgbench missing)" >&2; exit 1; }
		;;
	esac
done

# > batch-install copies each staged archive into its installed-test tree. Keeping the byte-identical
# > source in download-cache pays for it twice in every provider snapshot (silesia.tar alone is
# > ~212 MiB). Runtime leaves explicitly detect pts-install.json and skip reinstall, so the installed
# > copy is the offline source of truth. Remove only files proven identical; retain PTS's small cache
# > index and any non-duplicated payload defensively.
cache_dir=/var/lib/phoronix-test-suite/download-cache
installed_dir=/var/lib/phoronix-test-suite/installed-tests
if [ -d "${cache_dir}" ] && [ -d "${installed_dir}" ]; then
	find "${cache_dir}" -maxdepth 1 -type f ! -name pts-download-cache.json -print0 |
		while IFS= read -r -d '' cached; do
			name="$(basename "${cached}")"
			duplicate="$(find "${installed_dir}" -type f -name "${name}" -print -quit)"
			if [ -n "${duplicate}" ] && cmp -s "${cached}" "${duplicate}"; then
				echo "::: pruning duplicate PTS download: ${name}"
				rm -f "${cached}"
			fi
		done
fi

# > Make THIS group's installed trees readable/writable for the unprivileged runtime user E2B and
# > Novita inject (see 20-pts.sh for the full rationale). Scoped to the group's own directories: a
# > blanket chmod over /var/lib/phoronix-test-suite here would copy every earlier group's files into
# > this layer. The shared state dirs PTS rewrites per install are chmod'ed too, since they are small
# > and already resident in this layer.
for t in "${pts_tests[@]}"; do
	for dir in "${installed_dir}/pts/${t}" "/var/lib/phoronix-test-suite/test-profiles/pts/${t}"; do
		[ -d "${dir}" ] && chmod -R a+rwX "${dir}"
	done
done
chmod -R a+rwX "${cache_dir}" 2>/dev/null || true

# > That blanket chmod would ship pgbench broken: its install.sh initdb'd pg_/data/db as 0700, and
# > postgres's checkDataDir() FATALs at startup when the data dir has any group/other mode bits (the
# > profile's run-as-root patch strips the euid checks, not this one) — the launcher's pg_ctl start
# > would fail and the leaf would record empty results, while the payload check above still passes
# > (a+rwX never clears the x bit). Re-tighten the data dir AFTER the blanket chmod and assert the
# > final mode, so a reorder of these steps fails the bake, not the sandbox run.
for t in "${pts_tests[@]}"; do
	case "${t}" in
	pgbench*)
		pgdata="${installed_dir}/pts/${t}/pg_/data/db"
		[ -d "${pgdata}" ] || { echo "ERROR: ${t} has no initdb'd data dir at ${pgdata}" >&2; exit 1; }
		chmod -R go-rwx "${pgdata}"
		[ "$(stat -c '%a' "${pgdata}")" = "700" ] ||
			{ echo "ERROR: ${t} data dir mode is $(stat -c '%a' "${pgdata}"), postgres requires 0700" >&2; exit 1; }
		;;
	esac
done
