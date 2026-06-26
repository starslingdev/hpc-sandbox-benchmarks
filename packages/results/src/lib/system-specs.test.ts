import { describe, expect, it } from "bun:test";
import { parseSystemHost } from "./system-specs.ts";

describe("parseSystemHost", () => {
	it("extracts host CPU/memory/OS from a real PTS <System> Hardware/Software block", () => {
		const host = parseSystemHost({
			Identifier: "sandbox",
			Hardware:
				"Processor: AMD EPYC 9R14 96-Core Processor (48 Cores), Motherboard: Amazon EC2, Memory: 4 x 16 GB DDR5-4800MT/s, Disk: 322GB Amazon Elastic Block Store",
			Software:
				"OS: Ubuntu 24.04, Kernel: 6.8.0-1014-aws (x86_64), Compiler: GCC 13.2.0, System Layer: amazon",
			User: "root",
		});
		expect(host.cpuModel).toBe("AMD EPYC 9R14 96-Core Processor");
		expect(host.hostVcpus).toBe(48);
		expect(host.hostMemoryGb).toBe(64); // 4 x 16 GB
		expect(host.os).toBe("Ubuntu 24.04");
		expect(host.kernel).toBe("6.8.0-1014-aws");
		expect(host.virtualization).toBe("amazon");
		expect(host.user).toBe("root");
		// CRITICAL: never sets effective fields — those come only from the in-sandbox probe.
		expect(host.vcpus).toBeUndefined();
		expect(host.memoryGb).toBeUndefined();
	});

	it("prefers the thread count over the core count for host vCPUs, and parses clock + single-stick memory", () => {
		const host = parseSystemHost({
			Hardware: "Processor: Intel Xeon (24 Cores / 48 Threads) @ 3.70GHz, Memory: 64 GB",
		});
		expect(host.hostVcpus).toBe(48);
		expect(host.cpuMhz).toBe(3700);
		expect(host.hostMemoryGb).toBe(64);
	});

	it("captures a processor model even when no core-count parenthetical is present", () => {
		const host = parseSystemHost({ Hardware: "Processor: Apple M2, Memory: 16 GB" });
		expect(host.cpuModel).toBe("Apple M2");
		expect(host.hostVcpus).toBeUndefined();
		expect(host.hostMemoryGb).toBe(16);
	});

	it("returns an empty object for an empty/unrecognized <System>", () => {
		expect(parseSystemHost({})).toEqual({});
		expect(parseSystemHost({ Hardware: "nothing parseable here" })).toEqual({});
	});
});
