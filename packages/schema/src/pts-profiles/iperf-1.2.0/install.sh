#!/bin/sh
set -eu

# Vendored repair of upstream pts/iperf-1.2.0's install.sh, kept under the same `pts/` identifier
# (the catalog join key). Deltas vs upstream, each deliberate:
#
#   * Install prefix: the profile's own installed-tests dir (cwd at install time), spelled from
#     $(pwd) instead of upstream's $HOME/iperf-install. PTS points HOME at the installed dir during
#     install/run, so upstream lands in the same place — but deriving the prefix from cwd keeps
#     every heavy write inside the PTS data dir even if a provider's HOME handling drifts. On blaxel
#     the root fs is RAM-backed and only /var/lib/phoronix-test-suite (the volume) may take heavy
#     writes; the PTS data dir lives there.
#   * CFLAGS: generic -O3, dropping upstream's -march=native. Native-to-the-build-machine binaries
#     are exactly the class the toolchain bake already patches fio for (modal's gVisor exposes no
#     AVX-512, so a builder-native binary can die at run time), and iperf's own CPU tuning is not
#     the thing being benchmarked. CFLAGS_OVERRIDE still wins when a caller sets it, as upstream.
#   * The generated runner fixes upstream's `2>1` typo (client stderr went to a file literally
#     named "1" instead of the log), detaches the local server's stdio from the runner's pipe (PTS
#     reads the runner's stdout to EOF, so an inherited fd on a lingering listener would pin every
#     trial to the harness watchdog — the exact pipe-hold that burned ~213s/trial on fast-cli in
#     run 29937467891), runs the server one-off (-1: it exits after serving the single client run,
#     so a missed kill cannot leak a listener into the next trial), and replaces the fixed
#     `sleep 3` with a bounded readiness poll on /proc/net/tcp{,6} (the deleted vendored
#     network-loopback runner's proven pattern) that falls through after ~10s and lets the client
#     fail honestly.
#   * The vendored test-definition.xml pins TimesToRun to 2 (repo rule: trial count stays 2) and
#     the option matrix to the localhost subset the network suite actually runs.

prefix="$(pwd)/iperf-install"
rm -rf iperf-3.14 "$prefix"
tar -zxf iperf-3.14.tar.gz
cd iperf-3.14
if [ "${CFLAGS_OVERRIDE:-}" = "" ]; then
	CFLAGS="${CFLAGS:-} -O3"
else
	CFLAGS="$CFLAGS_OVERRIDE"
fi
./configure --prefix="$prefix" CFLAGS="$CFLAGS"
make -j "${NUM_CPU_CORES:-2}"
make install
cd ..
rm -rf iperf-3.14

cat <<'EOF' > iperf
#!/bin/sh
# Runner for the localhost subset: self-hosts the server, so the trial is fully in-sandbox.
bin="$(dirname "$0")/iperf-install/bin"
"$bin/iperf3" -s -1 >/dev/null 2>&1 </dev/null &
IPERF_SERVER_PID=$!
# Wait (bounded) for the listener to reach LISTEN (state 0A) on port 5201 (0x1451) before starting
# the client; fall through after ~10s so a broken server surfaces as an honest client failure
# rather than a hang. Checks tcp6 too: iperf3 -s binds the v6 wildcard on dual-stack kernels.
attempt=0
while ! cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | awk '$2 ~ /:1451$/ && $4 == "0A" { found=1 } END { exit !found }'; do
	attempt=$((attempt + 1))
	if [ "$attempt" -ge 100 ] || ! kill -0 "$IPERF_SERVER_PID" 2>/dev/null; then
		break
	fi
	sleep 0.1
done
"$bin/iperf3" "$@" > "$LOG_FILE" 2>&1
status=$?
echo "$status" > ~/test-exit-status
kill "$IPERF_SERVER_PID" 2>/dev/null
wait "$IPERF_SERVER_PID" 2>/dev/null
exit "$status"
EOF
chmod +x iperf

echo 0 > ~/install-exit-status
