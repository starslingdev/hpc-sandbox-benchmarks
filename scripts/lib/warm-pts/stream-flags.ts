/**
 * STREAM CFLAGS for host warm — mirrors `.mise/tasks/benchmark/memory/pts/stream` (array size from
 * the mined plan; -march=native except gVisor → x86-64-v3).
 */
import { readFileSync } from "node:fs";

export function streamCflagsOverride(streamArraySize: number): string {
	let version = "";
	try {
		version = readFileSync("/proc/version", "utf8");
	} catch {
		// Non-Linux hosts: keep native.
	}
	const march = /gvisor/i.test(version) ? "x86-64-v3" : "native";
	return `-O3 -march=${march} -DSTREAM_ARRAY_SIZE=${streamArraySize}`;
}
