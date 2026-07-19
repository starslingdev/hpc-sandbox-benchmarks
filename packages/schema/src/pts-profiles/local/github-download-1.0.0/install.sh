#!/bin/sh
set -eu
# PTS local-profile install script: generates the `github-download` executable PTS invokes at
# batch-run time (the runtime convention — an executable named after the versionless profile dir, in
# the install cwd, same as local/hardlink). The measurement is a single curl download of a pinned
# GitHub archive; no source build. curl is the only dependency (the toolchain image bakes it; the
# mise leaf also skips before install when it is absent).
if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: github-download requires curl" >&2
  echo 1 > ~/install-exit-status
  exit 1
fi

# The runner PTS executes once per trial. It downloads $GITHUB_DOWNLOAD_URL, discards the body, and
# derives four metrics from curl's write-out: sustained throughput (Mbit/s) plus the connect-RTT,
# time-to-first-byte and DNS-lookup timings (ms) of that same request. Each metric is printed as a
# distinct sentinel line the results-definition scrapes. All output goes to $LOG_FILE; the trial's
# pass/fail lands in ~/test-exit-status (PTS convention). A trial that cannot produce a complete
# HTTP-200 measurement exits non-zero so PTS records a FAILED trial rather than banking a bogus 0.
#
# Defaults are read at run time (not install time — the heredoc is quoted), so a sandbox can retarget
# the probe via env without reinstalling: GITHUB_DOWNLOAD_URL (default: an immutable release-tag
# archive so the transfer size is constant across runs/providers, on the github.com path real CI
# clone traffic already takes), GITHUB_DOWNLOAD_MAX_TIME, GITHUB_DOWNLOAD_CONNECT_TIMEOUT.
cat <<'EOF' > github-download
#!/bin/sh
URL="${GITHUB_DOWNLOAD_URL:-https://github.com/git/git/archive/refs/tags/v2.43.0.tar.gz}"
MAX_TIME="${GITHUB_DOWNLOAD_MAX_TIME:-120}"
CONNECT_TIMEOUT="${GITHUB_DOWNLOAD_CONNECT_TIMEOUT:-20}"

run() {
	# -sSL: quiet, but keep error text; follow the github.com -> codeload redirect. The body is
	# discarded (-o /dev/null) — throughput and timings come from curl's write-out, not the bytes.
	# Without -f, curl still exits 0 on an HTTP error, so the write-out is captured either way and
	# the awk below rejects any non-200 / empty response as a failed trial.
	w=$(curl -sSL --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" -o /dev/null \
		-w 'http_code=%{http_code} size=%{size_download} speed=%{speed_download} dns=%{time_namelookup} connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}' \
		"$URL") || {
		echo "github-download: curl failed (exit $?) for $URL" >&2
		return 1
	}
	echo "github-download: $URL -> $w"
	printf '%s\n' "$w" | awk '{
		for (i = 1; i <= NF; i++) { p = index($i, "="); v[substr($i, 1, p - 1)] = substr($i, p + 1) }
		if (v["http_code"] != "200" || v["size"] + 0 <= 0) {
			printf "github-download: bad response (HTTP %s, %s bytes) — failing trial\n", v["http_code"], v["size"] > "/dev/stderr"
			exit 1
		}
		# speed_download is bytes/sec: x8 -> bits/sec, /1e6 -> Mbit/s. curl timings are cumulative
		# seconds -> ms. Latency is the TCP connect round-trip (connect - namelookup), independent of
		# resolution time; TTFB and DNS lookup come straight off the same request.
		printf "GITHUB_DOWNLOAD_SPEED_MBPS: %.3f\n", v["speed"] * 8 / 1000000
		printf "GITHUB_DOWNLOAD_LATENCY_MS: %.3f\n", (v["connect"] - v["dns"]) * 1000
		printf "GITHUB_DOWNLOAD_TTFB_MS: %.3f\n", v["ttfb"] * 1000
		printf "GITHUB_DOWNLOAD_DNS_MS: %.3f\n", v["dns"] * 1000
	}'
}

run > "$LOG_FILE" 2>&1
status=$?
echo "$status" > ~/test-exit-status
exit "$status"
EOF
chmod +x github-download

echo 0 > ~/install-exit-status
