#!/usr/bin/env bash
# Pre-install ONE GROUP of Phoronix Test Suite benchmark profiles for offline execution, so sandbox
# wall time goes to benchmarks, not setup. The PTS runtime and its state tree come from 20-pts.sh;
# this script only adds profiles, and the Dockerfile invokes it once per group (each invocation is
# its own layer) to keep every compressed layer inside the provider registry caps — see the
# layer-budget comment in the Dockerfile.
#
# PTS_INSTALL_TESTS is THIS GROUP's slice of the baked profile list: the Dockerfile passes one
# PTS_INSTALL_GROUP_* build arg per RUN, all of them partitions of the single ptsInstallTests pin
# (packages/templates/src/lib/pins.ts, enforced by validatedPtsInstallGroups). Called with no group —
# the orchestrator's no-argument debugging mode — it receives the whole list and behaves exactly like
# the former single-layer install. 99-manifest.sh re-verifies the FULL list at the end, so a profile
# whose group never got wired into a RUN fails the build instead of silently going missing.
set -Eeuxo pipefail

# > Fail fast if a pin didn't make it into the env (build.sh + arktype already validated the values).
: "${PTS_INSTALL_TESTS:?}"

pts_root=/var/lib/phoronix-test-suite
cache_dir="${pts_root}/download-cache"
installed_dir="${pts_root}/installed-tests"

# > PTS_INSTALL_TESTS is a space-separated list, so split it into an array to pass each profile as
# > its own argument.
read -ra pts_tests <<< "${PTS_INSTALL_TESTS}"
(( ${#pts_tests[@]} > 0 )) || { echo "ERROR: PTS_INSTALL_TESTS names no profiles" >&2; exit 1; }

# > The download cache and the PTS bookkeeping files are SHARED by every group layer, so this layer
# > must touch only what it adds. Reaching back into an earlier layer never shrinks anything and
# > usually grows the image: overlayfs answers a delete with a whiteout, so the bytes stay put in the
# > lower layer, and it answers a mode CHANGE with a full copy-up, duplicating the file into this
# > layer. (A chmod that leaves the mode as-is is free — measured: re-running the same a+rwX over a
# > 267 MB tree added a 0-byte layer, while an actual mode change over the same tree added 267 MB.)
# > Snapshotting the cache by name before staging is what scopes the prune below to this layer's own
# > downloads; a name diff deliberately, not an mtime comparison, which would race same-timestamp
# > writes.
before_cache=/tmp/pts-cache-before.txt
after_cache=/tmp/pts-cache-after.txt
find "${cache_dir}" -maxdepth 1 -type f -printf '%f\n' | sort > "${before_cache}"

# > The staging list DERIVES from the install list (same versioned pins — caching a different version
# > than the leaves batch-run would send the installer back to the network). Do not cache unwired
# > future profiles: provider snapshot registries must import the complete compressed image.
# > network-loopback has no downloads and no-ops here harmlessly.
phoronix-test-suite make-download-cache "${pts_tests[@]}"

# > fio's configure defaults to -march=native — native to the BAKE machine, which is wrong on both
# > counts for a baked image: it is not the run machine's ISA and it is not portable. Modal's gVisor
# > sandboxes expose only AVX2 (no avx512*), so a builder-native binary dies in ~30ms and the disk
# > suite records empty fio results. Disk I/O measurement is ISA-insensitive, so pin the baked fio
# > to the compiler's portable default. The fio profile version comes from PTS_INSTALL_TESTS (the
# > single source of the pin), so a fio bump can never leave this patch pointing at a stale path.
# > Only the group that owns fio patches it; that there is exactly ONE fio across all groups, and
# > that the patch actually landed, is asserted globally in 99-manifest.sh — so neither a fio-less
# > group nor a group that never got wired into a RUN can hide a missing patch.
fio_pin=""
for t in "${pts_tests[@]}"; do
	case "$t" in
	fio-*)
		[ -z "$fio_pin" ] || { echo "ERROR: multiple fio entries in PTS_INSTALL_TESTS (${PTS_INSTALL_TESTS})" >&2; exit 1; }
		fio_pin="$t"
		;;
	esac
done
if [ -n "$fio_pin" ]; then
	fio_install="${pts_root}/test-profiles/pts/${fio_pin}/install.sh"
	[ -f "${fio_install}" ] || { echo "ERROR: fio profile not staged at ${fio_install}" >&2; exit 1; }
	sed -i 's|\./configure |./configure --disable-native |' "${fio_install}"
	grep -q -- '--disable-native' "${fio_install}" || { echo "ERROR: --disable-native patch did not land in fio install.sh" >&2; exit 1; }
fi

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
		[ -x "${installed_dir}/pts/${t}/pg_/bin/pgbench" ] ||
			{ echo "ERROR: ${t} installed without its built postgres payload (pg_/bin/pgbench missing)" >&2; exit 1; }
		;;
	esac
done

# > batch-install copies each staged archive into its installed-test tree. Keeping the byte-identical
# > source in download-cache pays for it twice in every provider snapshot (silesia.tar alone is
# > ~212 MiB). Runtime leaves explicitly detect pts-install.json and skip reinstall, so the installed
# > copy is the offline source of truth. Remove only files proven identical; retain PTS's small cache
# > index and any non-duplicated payload defensively. Restricted to the downloads THIS layer staged
# > (see the snapshot above) — pruning an earlier layer's cache file would write a whiteout and
# > reclaim nothing.
find "${cache_dir}" -maxdepth 1 -type f -printf '%f\n' | sort > "${after_cache}"
while IFS= read -r name; do
	[ -n "${name}" ] || continue
	if [ "${name}" = pts-download-cache.json ]; then continue; fi
	cached="${cache_dir}/${name}"
	[ -f "${cached}" ] || continue
	duplicate="$(find "${installed_dir}" -type f -name "${name}" -print -quit)"
	if [ -n "${duplicate}" ] && cmp -s "${cached}" "${duplicate}"; then
		echo "::: pruning duplicate PTS download: ${name}"
		rm -f "${cached}"
	else
		# > Retained payload has to stay readable/writable for the unprivileged runtime user, same as
		# > the profile trees below. Only this layer's files are touched, so no copy-up of older ones.
		chmod a+rw "${cached}"
	fi
done < <(comm -13 "${before_cache}" "${after_cache}")
rm -f "${before_cache}" "${after_cache}"

# > Make this group's profiles readable/writable for the unprivileged runtime user that E2B and
# > Novita inject (see the rationale in 20-pts.sh, which does the same for the tree's shared dirs).
# > Scoped to the subtrees THIS layer created: a blanket `chmod -R` over the whole PTS tree would
# > copy every earlier group's payload up into this layer and undo the split.
for t in "${pts_tests[@]}"; do
	for dir in "${pts_root}/test-profiles/pts/${t}" "${installed_dir}/pts/${t}"; do
		if [ -d "${dir}" ]; then chmod -R a+rwX "${dir}"; fi
	done
done
# > PTS rewrites its small bookkeeping files at the tree root on every invocation, and a rewrite that
# > goes through create-then-rename lands them at the umask's 0644 — not writable by the runtime
# > user. Re-open just those (depth 1, files only: no profile payload is reachable from here).
find "${pts_root}" -maxdepth 1 -type f -exec chmod a+rw {} +
find "${cache_dir}" -maxdepth 1 -type f -name pts-download-cache.json -exec chmod a+rw {} +

# > That chmod would ship pgbench broken: its install.sh initdb'd pg_/data/db as 0700, and postgres's
# > checkDataDir() FATALs at startup when the data dir has any group/other mode bits (the profile's
# > run-as-root patch strips the euid checks, not this one) — the launcher's pg_ctl start would fail
# > and the leaf would record empty results, while the payload check above still passes (a+rwX never
# > clears the x bit). Re-tighten the data dir AFTER the chmod and assert the final mode, so a
# > reorder of these steps fails the bake, not the sandbox run. 99-manifest.sh re-asserts the mode
# > once every layer is in, so a later group's chmod cannot silently loosen it again.
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
