#!/usr/bin/env bash
# Install the Phoronix Test Suite RUNTIME and prepare its state tree. The benchmark profiles are NOT
# installed here — 25-pts-profiles.sh does that, once per layer group, so no single compressed layer
# exceeds the provider registry caps (see the layer-budget comment in the Dockerfile). Pins arrive as
# environment variables (from the arktype-validated packages/templates/src/pins.ts via build-args).
# Runs after 10-mise so the profile layers downstream find the mise-managed python/node on PATH.
set -Eeuxo pipefail

# > Fail fast if a pin didn't make it into the env (build.sh + arktype already validated the values).
: "${PTS_VERSION:?}"
: "${PTS_DEB_SHA256:?}"

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

# > Non-interactive batch config, so the profile layers downstream install without prompting. Build
# > and sandboxes both run as root, so PTS state under /var/lib/phoronix-test-suite lines up at
# > runtime.
printf 'y\nn\nn\nn\nn\nn\ny\n' | phoronix-test-suite batch-setup

# > E2B and Novita inject an unprivileged runtime user after importing this image. PTS otherwise
# > switches from the root bake's /var/lib state to $HOME/.phoronix-test-suite, making every baked
# > profile invisible. The image ENV pins PTS_USER_PATH_OVERRIDE to this directory; make the
# > ephemeral benchmark state writable so that user can create batch config and result XML beside the
# > read-mostly installed profiles. Provider isolation is the outer security boundary for this image.
# >
# > The blanket recursive chmod belongs HERE, in the layer where the tree is still empty, and nowhere
# > downstream: chmod always triggers an overlayfs copy-up, so re-running it after the profiles are
# > baked would copy every earlier layer's payload into the last one and undo the whole split. The
# > directories PTS (and a runtime leaf staging a vendored profile) create files in are pre-created so
# > they inherit the permissive mode now, instead of being born 0755 inside a later profile layer;
# > each profile layer then chmods only the subtree it added.
mkdir -p \
	/var/lib/phoronix-test-suite/test-profiles/pts \
	/var/lib/phoronix-test-suite/test-suites \
	/var/lib/phoronix-test-suite/installed-tests/pts \
	/var/lib/phoronix-test-suite/download-cache \
	/var/lib/phoronix-test-suite/test-results
chmod -R a+rwX /var/lib/phoronix-test-suite
