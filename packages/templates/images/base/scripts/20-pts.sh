#!/usr/bin/env bash
# Install the Phoronix Test Suite runtime and prepare its batch state. The benchmark PROFILES are
# pre-installed separately, one group per layer, by 25-pts-profiles.sh — see that script for why.
#
# Pins arrive as environment variables (from the arktype-validated packages/templates/src/pins.ts via
# build-args). Runs after 10-mise so pyperformance's pip-install targets the mise-managed python.
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

# > Non-interactive batch config. Build and sandboxes both run as root, so PTS state under
# > /var/lib/phoronix-test-suite lines up at runtime.
printf 'y\nn\nn\nn\nn\nn\ny\n' | phoronix-test-suite batch-setup

# > E2B, Novita and Runloop inject an unprivileged runtime user after importing this image. That user
# > keeps its OWN mutable PTS state under $HOME (PTS's default, which it creates itself) and shares only
# > the baked profiles, via the image's PTS_TEST_INSTALL_ROOT_PATH — so what has to be writable here is
# > the install bookkeeping PTS writes beside the profiles it installs, not root's private state.
# > Provider isolation is the outer security boundary for this image.
# >
# > Only the STATE created above is chmod'ed here. Each profile group chmods its own installed tree
# > inside its own layer (25-pts-profiles.sh): a blanket `chmod -R` in a later layer would copy every
# > file it touched into that layer, re-inflating the image by the full size of the profile tree.
chmod -R a+rwX /var/lib/phoronix-test-suite
