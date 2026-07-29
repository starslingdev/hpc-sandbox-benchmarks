# Phase decomposition and summary statistics over curl's native `%{json}` write-out records — the
# arithmetic the network probes share.
#
# A jq module (`jq -L lib/jq 'include "curl-phases"; …'`) rather than a string embedded in each task,
# for one reason: two copies of THIS code drifting produce different NUMBERS from the same bytes,
# not merely a differently worded log line. As a file it is also executable against a recorded
# fixture — packages/results/src/lib/curl-phases.test.ts runs it over real captured records and
# asserts the decomposition, which a heredoc inside a bash task can never be.

# Seconds (curl's unit) to milliseconds, keeping three decimals: sub-millisecond DNS off a warm
# resolver is a real reading, not zero.
def ms: (. * 1000000 | round) / 1000;

# Round to three decimals. For values DERIVED from `ms` outputs — a mean, or the midpoint of an
# even-length sample — which would otherwise carry float noise into the artifact.
def r3: (. * 1000 | round) / 1000;

# Did this sample get an answer? The gate for every statistic below: a sample that timed out reports
# time_total == the timeout, so folding it into a median would publish the ceiling as if it were a
# latency. `.exitcode` is absent from older curls' write-out, and `// 0` keeps such a record
# classified by its response code rather than silently dropped from every aggregate.
def responded: ((.exitcode // 0) == 0) and (.response_code > 0);

# curl's timers are CUMULATIVE from the start of the request, so each phase is the gap between
# adjacent milestones. `tls` is null on a plain-HTTP request, which has no appconnect milestone, and
# `server` then measures from the TCP connect instead — subtracting a zero appconnect would charge
# the whole connection to server think-time.
def phases:
	(if .time_appconnect > 0 then .time_appconnect else .time_connect end) as $connected |
	{
		dns: (.time_namelookup | ms),
		tcp: ((.time_connect - .time_namelookup) | ms),
		tls: (if .time_appconnect > 0 then ((.time_appconnect - .time_connect) | ms) else null end),
		server: ((.time_starttransfer - $connected) | ms),
		body: ((.time_total - .time_starttransfer) | ms),
		total: (.time_total | ms)
	};

# Distribution over an array of samples. Nulls are dropped, not counted as zero — an absent phase
# (no TLS on a plain-HTTP endpoint) is not a fast one. An empty input yields null for the same
# reason: "not measured" must never render as a zero-latency reading.
def stats:
	map(select(. != null)) | sort as $s | ($s | length) as $n |
	if $n == 0 then null else {
		min: $s[0],
		median: (
			if $n % 2 == 1
			then $s[($n / 2 | floor)]
			else (($s[($n / 2) - 1] + $s[$n / 2]) / 2 | r3)
			end
		),
		mean: (($s | add) / $n | r3),
		max: $s[-1]
	} end;
