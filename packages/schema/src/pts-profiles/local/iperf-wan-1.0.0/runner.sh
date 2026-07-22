#!/bin/bash
# WAN throughput runner (installed by install.sh as the profile executable `iperf-wan`). PTS invokes
# it per trial with the selected Direction option's value ("-R" for download, blank for upload).
#
# Selection: probe TCP-connect RTT to every server in the curated servers.json, order reachable
# NON-backup servers by RTT (ROLE=backup entries only after every primary), and prefer the server a
# previous trial of this run already used (cached in chosen-server) so both trials of both
# directions measure one path. Public iperf3 servers accept a single client at a time, so "server is
# busy" collisions are expected — six matrix jobs run concurrently — and each listed PORT range is
# independent single-client instances: retry across the chosen server's ports with jitter, then fall
# through to the next-closest server. Only after exhausting every server does the trial fail, honestly.
#
# Measurement: 10s, 8 parallel streams (a single TCP stream understates high bandwidth-delay-product
# WAN paths — one congestion window against 30-100ms of RTT; 8 is the conventional multi-stream
# saturation figure). The reported value is RECEIVER-side goodput (.end.sum_received of iperf3's
# JSON) for both directions — bytes delivered end-to-end, not bytes offered. The chosen server, its
# probe RTT, and the per-trial figure are appended to server-choices.ndjson, which the leaf copies
# into the results tree as provenance — without it cross-provider WAN numbers are uninterpretable.
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN="${SCRIPT_DIR}/iperf-install/bin/iperf3"
SERVERS_JSON="${SCRIPT_DIR}/servers.json"
CHOICE_LOG="${SCRIPT_DIR}/server-choices.ndjson"
CACHE="${SCRIPT_DIR}/chosen-server"
ATTEMPT_BUDGET=40

: > "$LOG_FILE"
log() { printf '%s\n' "$*" >> "$LOG_FILE"; }

fail() {
	log "IPERF WAN: $*"
	echo 1 > ~/test-exit-status
	exit 1
}

direction=upload
extra_args=()
for arg in "$@"; do
	if [ "$arg" = "-R" ]; then
		direction=download
		extra_args+=("-R")
	fi
done

command -v jq >/dev/null 2>&1 || fail "jq not available for server-list parsing"
[ -x "$BIN" ] || fail "iperf3 binary missing at ${BIN}"
[ -f "$SERVERS_JSON" ] || fail "servers.json missing at ${SERVERS_JSON}"

# TCP-connect RTT in ms (bash /dev/tcp under a hard 3s timeout — no extra tooling). Two attempts,
# min wins: the first connect pays DNS resolution inside the timed section (observed +2.3s on a cold
# resolver, enough to misorder servers) and a single lost SYN would misreport a healthy server as
# unreachable. rc 1 = both attempts failed.
probe_rtt_ms() {
	local host="$1" port="$2" best="" start end rtt
	for _ in 1 2; do
		start=$(date +%s%N)
		if timeout 3 bash -c "exec 3<>/dev/tcp/${host}/${port}; exec 3>&-" 2>/dev/null; then
			end=$(date +%s%N)
			rtt=$(((end - start) / 1000000))
			if [ -z "$best" ] || [ "$rtt" -lt "$best" ]; then best="$rtt"; fi
		fi
	done
	[ -n "$best" ] && echo "$best"
}

entries=()
while IFS= read -r line; do
	entries+=("$line")
done < <(jq -r \
	'.servers[] | [."IP/HOST", .PORT, (.ROLE // "primary"), .PROVIDER, .SITE] | @tsv' "$SERVERS_JSON")
[ "${#entries[@]}" -gt 0 ] || fail "servers.json lists no servers"

candidates=() # rtt|host|ports|role|provider|site
for entry in "${entries[@]}"; do
	IFS=$'\t' read -r host ports role provider site <<<"$entry"
	first_port="${ports%%-*}"
	if rtt=$(probe_rtt_ms "$host" "$first_port"); then
		log "iperf-wan probe: host=${host} port=${first_port} rtt_ms=${rtt} role=${role} provider=${provider} site=${site}"
		candidates+=("${rtt}|${host}|${ports}|${role}|${provider}|${site}")
	else
		log "iperf-wan probe: host=${host} port=${first_port} UNREACHABLE role=${role}"
	fi
done
[ "${#candidates[@]}" -gt 0 ] || fail "no listed iperf3 server reachable (all probes failed)"

primaries=$(printf '%s\n' "${candidates[@]}" | awk -F'|' '$4 != "backup"' | sort -t'|' -k1,1n)
backups=$(printf '%s\n' "${candidates[@]}" | awk -F'|' '$4 == "backup"' | sort -t'|' -k1,1n)
ordered=$(printf '%s\n%s\n' "$primaries" "$backups" | sed '/^$/d')
# Pin the whole run to one path when possible: a server an earlier trial measured goes first.
if [ -f "$CACHE" ]; then
	cached=$(cat "$CACHE")
	ordered=$({
		printf '%s\n' "$ordered" | grep -F "|${cached}|"
		printf '%s\n' "$ordered" | grep -vF "|${cached}|"
	} | sed '/^$/d')
fi

attempts=0
while IFS='|' read -r rtt host ports role provider site; do
	[ -n "$host" ] || continue
	lo="${ports%%-*}"
	hi="${ports##*-}"
	for port in $(seq "$lo" "$hi"); do
		attempts=$((attempts + 1))
		if [ "$attempts" -gt "$ATTEMPT_BUDGET" ]; then
			fail "exhausted the ${ATTEMPT_BUDGET}-attempt retry budget without a successful measurement"
		fi
		log "iperf-wan attempt ${attempts}: host=${host} port=${port} direction=${direction} (probe_rtt_ms=${rtt} provider=${provider} role=${role})"
		json="${SCRIPT_DIR}/last-result.json"
		if "$BIN" -c "$host" -p "$port" ${extra_args[@]+"${extra_args[@]}"} \
			-t 10 -P 8 --connect-timeout 3000 -J >"$json" 2>>"$LOG_FILE"; then
			mbps=$(jq -r '((.end.sum_received.bits_per_second // 0) / 1000000 * 100 | round) / 100' "$json")
			case "$mbps" in
			'' | null | 0) ;;
			*)
				echo "$host" > "$CACHE"
				retransmits=$(jq -r '.end.sum_sent.retransmits // "null"' "$json")
				printf '{"ts":"%s","direction":"%s","host":"%s","port":%s,"provider":"%s","site":"%s","probe_rtt_ms":%s,"mbits_per_sec":%s,"retransmits":%s}\n' \
					"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$direction" "$host" "$port" "$provider" "$site" \
					"$rtt" "$mbps" "$retransmits" >> "$CHOICE_LOG"
				log "iperf-wan: server=${host} port=${port} provider=${provider} site=${site} probe_rtt_ms=${rtt} direction=${direction} attempts=${attempts}"
				cat "$json" >> "$LOG_FILE"
				log "IPERF WAN RESULT: ${mbps} Mbits/sec"
				echo 0 > ~/test-exit-status
				exit 0
				;;
			esac
			log "iperf-wan: ${host}:${port} completed without a throughput figure; trying next"
		else
			err=$(jq -r '.error // empty' "$json" 2>/dev/null || true)
			if [ -n "$err" ]; then
				log "iperf-wan: ${host}:${port} -> ${err}"
			else
				log "iperf-wan: ${host}:${port} -> iperf3 failed (no JSON error; see stderr above)"
			fi
			case "$err" in
			*busy*)
				# Single-client collision (another matrix job, or another tenant): jittered backoff so
				# concurrent jobs don't stay in lockstep, then the next port in this server's range.
				sleep $(((RANDOM % 3) + 1))
				;;
			*) ;;
			esac
		fi
	done
done <<<"$ordered"

fail "every listed server (including backups) was exhausted without a successful measurement"
