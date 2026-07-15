#!/usr/bin/env bash
# Install the Phoronix Test Suite and pre-install the benchmark profiles for offline execution, so
# sandbox wall time goes to benchmarks, not setup. Pins arrive as environment variables
# (from the arktype-validated packages/templates/src/pins.ts via build-args). Runs after 10-mise so
# pyperformance's pip-install targets the mise-managed python on PATH.
set -Eeuxo pipefail

# > Fail fast if a pin didn't make it into the env (build.sh + arktype already validated the values).
: "${PTS_VERSION:?}"
: "${PTS_DEB_SHA256:?}"
: "${PTS_INSTALL_TESTS:?}"

# > Fetch + verify the .deb from GitHub releases (the only host reliably reachable from sandbox
# > networks), then install. dpkg first, apt -f to pull any missing runtime deps.
curl -fsSL --retry 5 --retry-all-errors -o /tmp/pts.deb \
	"https://github.com/phoronix-test-suite/phoronix-test-suite/releases/download/v${PTS_VERSION}/phoronix-test-suite_${PTS_VERSION}_all.deb"
echo "${PTS_DEB_SHA256}  /tmp/pts.deb" | sha256sum -c -
apt-get update
dpkg -i /tmp/pts.deb || apt-get install -y --no-install-recommends -f
rm -rf /tmp/pts.deb /var/lib/apt/lists/*
phoronix-test-suite version

# > The PTS deb ships phoromatic + result-viewer systemd units, and its postinst ENABLES them via
# > deb-systemd-helper (no running systemd needed). Providers that boot this image with systemd as
# > PID 1 (e2b microVMs — e2b's template build injects systemd; daytona/modal never run it) then
# > start phoromatic-client at boot, and a phoromatic client with no server POWERS OFF the guest
# > ~5 min in — every e2b sandbox died at exactly t+300s until this mask (probed 2026-07-10:
# > masked → survives; unmasked → dead at 5:00, guest healthy, orchestrator logs a bare "Sandbox
# > stopped"). Mask by symlinking the unit names to /dev/null — exactly what `systemctl mask`
# > writes, done by hand because this slim build stage has no systemctl binary; a mask (vs
# > removing the wants/ symlinks) also defeats the deb's enable-on-upgrade.
for unit in phoromatic-client phoromatic-server phoronix-result-server; do
	ln -sf /dev/null "/etc/systemd/system/${unit}.service"
done

# > Non-interactive batch config + staged downloads for the PTS-backed suites. Build and
# > sandboxes both run as root, so PTS state under /var/lib/phoronix-test-suite lines up at runtime.
# > PTS_INSTALL_TESTS is a space-separated list, so split it into an array to pass each profile as
# > its own argument.
printf 'y\nn\nn\nn\nn\nn\ny\n' | phoronix-test-suite batch-setup
read -ra pts_tests <<< "${PTS_INSTALL_TESTS}"

# > The staging list DERIVES from the install list (same versioned pins — caching a different version
# > than the leaves batch-run would send the installer back to the network). Do not cache unwired
# > future profiles: provider snapshot registries must import the complete compressed image.
# > network-loopback has no downloads and no-ops here harmlessly.
phoronix-test-suite make-download-cache "${pts_tests[@]}"
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

# > E2B and Novita inject an unprivileged runtime user after importing this image. PTS otherwise
# > switches from the root bake's /var/lib state to $HOME/.phoronix-test-suite, making every baked
# > profile invisible. The image ENV pins PTS_USER_PATH_OVERRIDE to this existing directory; make the
# > ephemeral benchmark state writable so that user can create batch config and result XML beside the
# > read-mostly installed profiles. Provider isolation is the outer security boundary for this image.
chmod -R a+rwX /var/lib/phoronix-test-suite
