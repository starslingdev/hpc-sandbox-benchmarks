#!/usr/bin/env bash
# shellcheck disable=SC2034
# The globals this file assigns are its OUTPUT CONTRACT — read by the task that sources it,
# never by the file itself. Scoped to the whole file because that is what the contract is.
# Public-egress identity: which address a sandbox leaves from, which network announces it, and where
# that network is. Sourced after lib/bench.sh:
#
#   source "${REPO_ROOT}/lib/net-identity.sh"
#   net_identity_probe          # sets PUBLIC_IP ASN ORG_NAME ORG PREFIX ASN_SOURCE
#                               #      CITY REGION COUNTRY LOC TIMEZONE REVERSE_DNS GEO_SOURCE
#
# Lives here rather than inside the provider task because it answers a question about the SANDBOX'S
# NETWORK, which is independent of the isolation question the task's other half answers, and because
# any network leaf that wants to name its egress can source it without pulling in the isolation
# engine.
#
# WHAT THE ASN ACTUALLY IS: the network that announces the sandbox's public egress IP. It is a
# network fact, not a hardware one. A sandbox NATs its egress through the provider's own network, so
# this names whoever owns the address block the traffic leaves from — which may be the underlying
# host cloud (Oracle, AWS) rather than the vendor you buy from (Daytona, Novita), or a transit/proxy
# network belonging to neither.
#
# WHY NOT ipinfo.io FOR THE ASN. Anonymous ipinfo is quota'd per source IP, and a matrix fan-out
# behind one NAT egress makes many anonymous calls. On a 429 it returns a JSON error body, `.org`
# resolves to empty, and the provider column silently reads "unknown" — indistinguishable from a
# sandbox we genuinely could not identify. So the ASN comes from Team Cymru's DNS whois instead:
# authoritative BGP origin data, no HTTP, no quota, no install, and no key. ipinfo is retained only
# for city/region, and its failure is recorded in `geo_source` rather than blanking the identity.
#
# Tolerant throughout: every leg is capped and every failure is a recorded source, never an abort.

PUBLIC_IP=""
ASN=""
ORG_NAME=""
ORG=""
PREFIX=""
ASN_SOURCE="unavailable"
CITY=""
REGION=""
COUNTRY=""
LOC=""
TIMEZONE=""
REVERSE_DNS=""
GEO_SOURCE="unavailable"

# --- Egress address ----------------------------------------------------------
# DNS echoes first: no quota, and they answer over :53 where an HTTP egress proxy may not exist.
# Each is capped so a blackholed resolver cannot stall the leg. HTTP echoes are the fallback.
# Keep only the first line that IS an address of the leg's family. Validation must happen PER LEG:
# dig prints multi-record answers (edns-client-subnet lines) and even failure diagnostics (";;
# communications error …") to stdout under +short, and a proxy can serve HTML to curl — any
# non-empty garbage accepted here would short-circuit the remaining legs and yield no IP on a
# working network.
_first_ipv4() { tr -d '"' | grep -m1 -xE '[0-9]{1,3}(\.[0-9]{1,3}){3}' || true; }

# A public egress address must be global unicast — 2000::/3, i.e. a leading hextet of four hex digits
# starting with 2 or 3. Rejects the forms an echo leg can plausibly hand back that are NOT an egress
# address: `::` (unspecified), `::1` (a proxy answering on loopback), fe80::/10 link-local, fc00::/7
# ULA, ff00::/8 multicast, and ::ffff:0:0/96 v4-mapped. Deliberately tests only the leading hextet so
# it needs no expansion and can run during discovery, before _v6_nibbles has an address to expand.
_is_global_v6() { [[ "${1%%:*}" =~ ^[23][0-9a-fA-F]{3}$ ]]; }

# Permissive line-picker (accepts some malformed colon runs) followed by the global-unicast filter.
# The filter is what keeps a bad leg from ending discovery: a non-global echo must fall through to the
# remaining legs rather than pin the whole identity to an address with no public egress. Scanning all
# candidate lines (no -m1) means a diagnostic line preceding the real answer can't mask it either.
# _v6_nibbles' expansion remains the strict structural validator before anything is queried.
_first_ipv6() {
	local line
	tr -d '"' | grep -xiE '([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}' | while IFS= read -r line; do
		_is_global_v6 "$line" && { printf '%s' "$line"; break; }
	done
}

# Does this sandbox even have a globally-routable IPv6? /proc/net/if_inet6's fourth column is the
# address scope; `00` is global. Pure builtins, no fork — and it is what keeps a v4-only sandbox from
# paying ~10s of IPv6 echo legs to rediscover that it has no v6 route.
_has_global_v6() {
	local addr idx plen scope rest
	[ -r /proc/net/if_inet6 ] || return 1
	while read -r addr idx plen scope rest; do
		[ "$scope" = "00" ] && return 0
	done </proc/net/if_inet6
	return 1
}

_public_ip() {
	# One family per probe run: every identity field (ASN, prefix, geo) must describe the SAME
	# address. IPv4 legs run first; the IPv6 legs are a whole-identity fallback for sandboxes with no
	# public IPv4 path at all (e.g. Blaxel egresses through a globally-routed IPv6) — the Cymru and
	# ipinfo lookups below follow whichever family answered here.
	#
	# There is deliberately no ipinfo.io/ip leg: _geo_probe already fetches ipinfo's full document,
	# whose `.ip` net_identity_probe uses as the last resort. Echoing the address from the same host
	# first would be a second TLS round trip for a value the next call already returns.
	local ip=""
	if have dig; then
		ip="$(dig -4 @ns1.google.com TXT o-o.myaddr.l.google.com +short +time=2 +tries=1 2>/dev/null | _first_ipv4)"
		[ -z "$ip" ] && ip="$(dig -4 @resolver1.opendns.com myip.opendns.com +short +time=2 +tries=1 2>/dev/null | _first_ipv4)"
		[ -z "$ip" ] && ip="$(dig -4 @1.0.0.1 ch txt whoami.cloudflare +short +time=2 +tries=1 2>/dev/null | _first_ipv4)"
	fi
	[ -z "$ip" ] && ip="$(curl -s -4 --max-time 3 https://ifconfig.me 2>/dev/null | _first_ipv4)"
	if [ -z "$ip" ] && _has_global_v6; then
		if have dig; then
			# Both echoes report the QUERY's source address, so over -6 transport they return the
			# public IPv6. (No OpenDNS leg: myip.opendns.com only answers for A-record resolvers.)
			ip="$(dig -6 @ns1.google.com TXT o-o.myaddr.l.google.com +short +time=2 +tries=1 2>/dev/null | _first_ipv6)"
			[ -z "$ip" ] && ip="$(dig -6 @2606:4700:4700::1111 ch txt whoami.cloudflare +short +time=2 +tries=1 2>/dev/null | _first_ipv6)"
		fi
		[ -z "$ip" ] && ip="$(curl -s -6 --max-time 3 https://ifconfig.me 2>/dev/null | _first_ipv6)"
	fi
	printf '%s' "$ip"
}

# --- ASN + org, from Team Cymru DNS whois ------------------------------------
# <reversed-ip>.origin.asn.cymru.com  TXT => "31898 | 161.153.0.0/17 | US | arin | 2024-07-01"
# <reversed-nibbles>.origin6.asn.cymru.com  (same shape, for an IPv6 egress)
# AS<n>.asn.cymru.com          TXT      => "31898 | US | arin | ... | ORACLE-BMC-31898 - Oracle Corporation, US"

# Print the origin6 QNAME labels for an IPv6 literal — its 32 nibbles, reversed, dot-separated — or
# fail on anything that is not a plain global IPv6 address (zone suffixes, v4-mapped forms, malformed
# groups). This is the strict validator behind _first_ipv6's permissive line-picker.
_v6_nibbles() {
	local ip="$1" left="" right="" hex="" group i
	local -a lparts=() rparts=() groups=()
	[[ "$ip" == *:* ]] || return 1
	# Enforce the "global" half of this function's contract; the structural checks below enforce the
	# "plain IPv6 address" half. Without it `::`, `::1` and fe80::/10 all expand happily, and a caller
	# reaching here by some path other than _first_ipv6 would query Cymru for a non-egress address.
	_is_global_v6 "$ip" || return 1
	if [[ "$ip" == *"::"* ]]; then
		left="${ip%%::*}"
		right="${ip#*::}"
	else
		left="$ip"
	fi
	[ -n "$left" ] && IFS=: read -ra lparts <<<"$left"
	[ -n "$right" ] && IFS=: read -ra rparts <<<"$right"
	local fill=$((8 - ${#lparts[@]} - ${#rparts[@]}))
	# "::" must stand for at least one zero group, and a full address must have exactly eight.
	if [[ "$ip" == *"::"* ]]; then [ "$fill" -ge 1 ] || return 1; else [ "$fill" -eq 0 ] || return 1; fi
	groups=("${lparts[@]}")
	for ((i = 0; i < fill; i++)); do groups+=("0"); done
	groups+=("${rparts[@]}")
	for group in "${groups[@]}"; do
		[[ "$group" =~ ^[0-9a-fA-F]{1,4}$ ]] || return 1
		hex+="$(printf '%04x' "0x$group")"
	done
	local out=""
	for ((i = ${#hex} - 1; i >= 0; i--)); do out+="${hex:i:1}."; done
	printf '%s' "${out%.}"
}

# Shared tail of both families' lookups: parse the origin TXT, then resolve the AS name.
_cymru_from_origin() {
	local qname="$1" origin asn name
	origin="$(dig +short +time=2 +tries=1 "$qname" TXT 2>/dev/null | tr -d '"' | head -1)"
	# Require the answer's documented shape ("31898 | 161.153.0.0/17 | …"): dig prints resolver
	# failure diagnostics (";; communications error …") to STDOUT even under +short, and treating one
	# as an answer would record asn="AS;;" with asn_source=cymru while blocking the ipinfo fallback.
	[[ "$origin" =~ ^[0-9]+[0-9\ ]*\| ]] || return 1
	# Field 1 lists SEVERAL space-separated origin ASNs for a MOAS prefix ("23028 23029 | …"); take
	# the first — stripping the spaces instead would fabricate a nonexistent AS number.
	asn="$(printf '%s' "$origin" | awk -F'|' '{split($1, parts, " "); print parts[1]}')"
	[[ "$asn" =~ ^[0-9]+$ ]] || return 1
	PREFIX="$(printf '%s' "$origin" | awk -F'|' '{gsub(/^ +| +$/,"",$2); print $2}')"
	# Field 5 of the AS record is "HANDLE - Org Name, CC"; take the org half.
	name="$(dig +short +time=2 +tries=1 "AS${asn}.asn.cymru.com" TXT 2>/dev/null | tr -d '"' |
		awk -F'|' '{gsub(/^ +| +$/,"",$5); print $5}' | head -1)"
	name="$(printf '%s' "$name" | sed -E 's/^[A-Z0-9_-]+ - //; s/, [A-Z]{2}$//')"
	ASN="AS${asn}"
	ORG_NAME="$name"
	ASN_SOURCE="cymru"
}

_cymru_lookup() {
	local ip="$1" rev nib
	have dig || return 1
	# Dispatch by family — the IPv6 nibble form is a different zone (origin6). Bail on anything that
	# is neither, rather than silently querying a malformed name.
	if [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
		rev="$(printf '%s' "$ip" | awk -F. '{print $4"."$3"."$2"."$1}')"
		_cymru_from_origin "${rev}.origin.asn.cymru.com"
	else
		nib="$(_v6_nibbles "$ip")" || return 1
		_cymru_from_origin "${nib}.origin6.asn.cymru.com"
	fi
}

# --- Geo, best-effort, from ipinfo -------------------------------------------
_IPINFO='{}'
_jq_get() { printf '%s' "$_IPINFO" | jq -r "$1 // \"\"" 2>/dev/null || printf ''; }

# A quota'd or errored ipinfo returns a body with `.error` (or no `.ip` at all). Distinguishing that
# from a genuine answer is what keeps `geo_source` honest instead of silently reporting blanks.
_ipinfo_unusable() { [ -n "$(_jq_get .error.title)" ] || [ -z "$(_jq_get .ip)" ]; }

_geo_probe() {
	# "No parser on this image" is NOT "ipinfo refused us", and it is knowable before spending a
	# network leg — every field below is extracted with jq, so without it the fetch is wasted.
	if ! have jq; then
		GEO_SOURCE="no-jq"
		return 0
	fi
	# 3s cap: an unreachable metadata service must not stall a benchmark leg. Same family as the
	# echoed egress address — the Cymru lookup and this geo record must describe the SAME address, or
	# a dual-stack sandbox reports an ASN for one address and a city for another.
	local family="-4"
	[[ "$PUBLIC_IP" == *:* ]] && family="-6"
	_IPINFO="$(curl -s "$family" --max-time 3 https://ipinfo.io 2>/dev/null || echo '{}')"
	GEO_SOURCE="ipinfo"
	# When no echo pinned a family the first fetch tried IPv4; retry IPv6 once before declaring geo
	# unavailable — a v6-only sandbox reaches ipinfo only that way, and with PUBLIC_IP empty there is
	# no other address for these fields to disagree with. A pinned family is never second-guessed.
	if _ipinfo_unusable && [ -z "$PUBLIC_IP" ] && _has_global_v6; then
		_IPINFO="$(curl -s -6 --max-time 3 https://ipinfo.io 2>/dev/null || echo '{}')"
	fi
	if _ipinfo_unusable; then
		GEO_SOURCE="unavailable"
		_IPINFO='{}'
	fi
	return 0
}

# --- Entry point -------------------------------------------------------------
net_identity_probe() {
	PUBLIC_IP="$(_public_ip)"
	[ -n "$PUBLIC_IP" ] && { _cymru_lookup "$PUBLIC_IP" || true; }
	_geo_probe

	# One jq invocation for all six geo fields rather than one per field: the document is already in
	# memory, and a jq start-up is ~4ms that six of them turn into ~30ms.
	if have jq; then
		IFS=$'\t' read -r CITY REGION COUNTRY LOC TIMEZONE REVERSE_DNS < <(
			printf '%s' "$_IPINFO" |
				jq -r '[.city, .region, .country, .loc, .timezone, .hostname] | map(. // "") | @tsv' 2>/dev/null
		)
	fi

	# The echo legs can fail while Cymru's DNS still works (an HTTP-only egress proxy), so an address
	# recovered from ipinfo gets its own BGP-origin lookup. Guarded by "we had no address before",
	# because re-querying Cymru for an address it has already declined costs two more 2s DNS legs for
	# a guaranteed-identical answer.
	if [ -z "$PUBLIC_IP" ]; then
		PUBLIC_IP="$(_jq_get .ip)"
		[ -n "$PUBLIC_IP" ] && { _cymru_lookup "$PUBLIC_IP" || true; }
	fi

	# Fall back to ipinfo's org string only if Cymru could not answer, splitting
	# "AS31898 Oracle Corporation" into its halves. An org string without a leading ASN leaves asn
	# empty rather than swallowing the first word.
	if [ -z "$ASN" ]; then
		local ipinfo_org
		ipinfo_org="$(_jq_get .org)"
		if [[ "$ipinfo_org" =~ ^(AS[0-9]+)[[:space:]]+(.*)$ ]]; then
			ASN="${BASH_REMATCH[1]}"
			ORG_NAME="${BASH_REMATCH[2]}"
			ASN_SOURCE="ipinfo"
		elif [ -n "$ipinfo_org" ]; then
			ORG_NAME="$ipinfo_org"
			ASN_SOURCE="ipinfo"
		fi
	fi

	# runs-on's `Infrastructure` column is this literal string; keep the shape so our table and theirs
	# can be read side by side. No trailing space when the AS-name lookup came back empty — exact-match
	# grouping on this field must not split "AS31898" from "AS31898 ".
	if [ -n "$ASN" ] && [ -n "$ORG_NAME" ]; then
		ORG="$ASN $ORG_NAME"
	else
		ORG="${ASN}${ORG_NAME}"
	fi
	return 0
}

# The human report for this probe, so the sourcing task renders nothing itself — matching the
# contract lib/isolation.sh offers, rather than leaving one library to format its own output and the
# other to be formatted by its caller.
net_identity_report() {
	echo "=== Egress ==="
	bench_row "public ip" "${PUBLIC_IP:-N/A}"
	bench_row "network" "${ORG:-N/A} (asn_source=${ASN_SOURCE})"
	bench_row "announced prefix" "$PREFIX"
	bench_row "reverse dns" "$REVERSE_DNS"
	bench_row "location" "${CITY:-N/A}, ${REGION:-N/A}, ${COUNTRY:-N/A} (${LOC:-N/A}) ${TIMEZONE} (geo_source=${GEO_SOURCE})"
	return 0
}
