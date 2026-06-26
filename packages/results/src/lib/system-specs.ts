/**
 * Parse a PTS `<System>` block into HOST-side {@link ObservedSpecs}. PTS's Hardware/Software fields are
 * free-text human descriptions ("Processor: AMD EPYC … (48 Cores), Memory: 4 x 16 GB, …"), so this is
 * deliberately a set of tolerant regexes: anything that doesn't match is simply left unset.
 *
 * CRITICAL host-vs-effective rule: inside a container `<System>` reports the underlying machine (a
 * 48-thread EPYC), not the sandbox's 2-vCPU cgroup quota. So this only ever sets the HOST fields
 * (`hostVcpus`/`hostMemoryGb`/`cpuModel`/`cpuMhz`/`kernel`/`os`/`virtualization`/`user`) and NEVER the
 * effective `vcpus`/`memoryGb`/`diskGb` — those come solely from the in-sandbox spec probe.
 */
import type { ObservedSpecs } from "@sandbox-benchmarks/schema";
import { resolveCpuMicroarch } from "./cpu-fingerprint.ts";
import type { PtsSystem } from "./pts-schema.ts";

export function parseSystemHost(system: PtsSystem): ObservedSpecs {
	const specs: ObservedSpecs = {};
	const hw = system.Hardware ?? "";
	const sw = system.Software ?? "";

	// "Processor: <model> (N Cores[ / M Threads][, …])". Host logical CPUs = threads when disclosed,
	// else cores. The model is everything between "Processor:" and the core-count parenthetical.
	const cpu = hw.match(/Processor:\s*(.+?)\s*\((\d+)\s*Cores(?:\s*\/\s*(\d+)\s*Threads)?/i);
	if (cpu?.[1]) {
		specs.cpuModel = cpu[1].trim();
		const logical = Number(cpu[3] ?? cpu[2]);
		if (Number.isFinite(logical) && logical > 0) specs.hostVcpus = logical;
	} else {
		// No core count — still capture the model up to the first comma/parenthesis.
		const model = hw.match(/Processor:\s*([^,(]+)/i);
		if (model?.[1]?.trim()) specs.cpuModel = model[1].trim();
	}

	// Clock, when PTS appends it ("… @ 3.7GHz"). Stored as MHz to match ObservedSpecs.cpuMhz.
	const ghz = hw.match(/@\s*([\d.]+)\s*GHz/i);
	if (ghz?.[1]) {
		const mhz = Math.round(Number(ghz[1]) * 1000);
		if (Number.isFinite(mhz) && mhz > 0) specs.cpuMhz = mhz;
	}

	// "Memory: [K x ]S GB" → total GiB (K defaults to 1 for a single-stick "S GB"/"SGB").
	const mem = hw.match(/Memory:\s*(?:(\d+)\s*x\s*)?(\d+)\s*GB/i);
	if (mem?.[2]) {
		const total = (mem[1] ? Number(mem[1]) : 1) * Number(mem[2]);
		if (Number.isFinite(total) && total > 0) specs.hostMemoryGb = total;
	}

	const os = sw.match(/OS:\s*([^,]+)/i);
	if (os?.[1]?.trim()) specs.os = os[1].trim();
	const kernel = sw.match(/Kernel:\s*([^\s,]+)/i);
	if (kernel?.[1]) specs.kernel = kernel[1];
	// PTS's "System Layer" names the virtualization/containerization layer (kvm, amazon, docker, …).
	const layer = sw.match(/System Layer:\s*([^,]+)/i);
	if (layer?.[1]?.trim()) specs.virtualization = layer[1].trim();

	const user = (system.User ?? "").trim();
	if (user) specs.user = user;

	// Host-side microarch fingerprint, derived purely from the disclosed CPU model. Host-only by
	// construction: cpuModel here is always the <System> brand string (the physical machine), so the
	// label can never masquerade as the effective spec.
	if (specs.cpuModel) {
		const fp = resolveCpuMicroarch(specs.cpuModel);
		if (fp) specs.cpuMicroarch = fp.name;
	}

	return specs;
}
