#!/usr/bin/env bash
# Tolerant probes: "print whatever this runner exposes, never fail".
#
# Sourced via lib/bench.sh — do not source directly; the facade is the documented entry point and the
# only path whose ordering is guaranteed.

# --- Tolerant probes ---

# Run a command; on failure print why and return 0 (never abort).
try() {
	"$@" 2>/dev/null && return 0
	local rc=$?
	if [ "$rc" -eq 127 ]; then echo "(${1} not found)"; else echo "(${1} failed — exit $rc)"; fi
	return 0
}

# Echo command output, or a fallback value on failure/empty.
get() {
	local fallback="$1"
	shift
	local out
	if out=$("$@" 2>/dev/null) && [ -n "$out" ]; then echo "$out"; else echo "$fallback"; fi
}
