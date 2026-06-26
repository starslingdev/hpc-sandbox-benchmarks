import { describe, expect, it } from "bun:test";
import { resolveCpuMicroarch } from "./cpu-fingerprint.ts";

describe("resolveCpuMicroarch", () => {
	it("resolves standard EPYC SKUs by their model number (the final digit is the generation)", () => {
		// OURS fixtures (pts_stream/pts_hardlink) run on a bare-metal 9275F — a 9xx5 = Zen 5 (Turin).
		expect(resolveCpuMicroarch("AMD EPYC 9275F 24-Core")).toEqual({
			name: "Zen 5 (Turin)",
			year: 2024,
		});
		// 9xx4 = Genoa (Zen 4), 7xx3 = Milan (Zen 3), 7xx2 = Rome (Zen 2).
		expect(resolveCpuMicroarch("AMD EPYC 9654 96-Core Processor")?.name).toBe("Zen 4 (Genoa)");
		expect(resolveCpuMicroarch("AMD EPYC 7763 64-Core Processor")?.name).toBe("Zen 3 (Milan)");
	});

	it("resolves the cloud-masked AWS/Azure EPYC SKUs that carry a letter mid-model", () => {
		// AWS masks the series digit ("9R14"/"9R45"); the static SKU table still nails the microarch.
		expect(resolveCpuMicroarch("AMD EPYC 9R14")?.name).toBe("Zen 4 (Genoa)");
		expect(resolveCpuMicroarch("AMD EPYC 9R45")?.name).toBe("Zen 5 (Turin)");
		expect(resolveCpuMicroarch("AMD EPYC 7R13")?.name).toBe("Zen 3 (Milan)");
		// 7R32 is an AWS Milan custom — the naive final-digit heuristic would misread it as Zen 2.
		expect(resolveCpuMicroarch("AMD EPYC 7R32")?.name).toBe("Zen 3 (Milan)");
		// Azure: 7V12 = Rome, 7V73X = Milan-X.
		expect(resolveCpuMicroarch("AMD EPYC 7V12 64-Core Processor")?.name).toBe("Zen 2 (Rome)");
		expect(resolveCpuMicroarch("AMD EPYC 7V73X 64-Core Processor")?.name).toBe("Zen 3 (Milan-X)");
	});

	it("resolves the Intel Xeon SKUs seen across runner composites", () => {
		expect(resolveCpuMicroarch("Intel(R) Xeon(R) Platinum 8358 CPU @ 2.60GHz")?.name).toBe(
			"Ice Lake-SP",
		);
		expect(resolveCpuMicroarch("Intel(R) Xeon(R) Platinum 8370C CPU @ 2.80GHz")?.name).toBe(
			"Ice Lake-SP",
		);
		expect(resolveCpuMicroarch("Intel(R) Xeon(R) Platinum 8375C")?.name).toBe("Ice Lake-SP");
		expect(resolveCpuMicroarch("Intel(R) Xeon(R) Platinum 8488C")?.name).toBe("Sapphire Rapids");
	});

	it("looks up the family/model table when ISA hints disclose them", () => {
		expect(resolveCpuMicroarch("AMD EPYC", { family: 26, model: 2 })).toEqual({
			name: "Zen 5 (Turin)",
			year: 2024,
		});
		expect(resolveCpuMicroarch("Intel(R) Xeon(R) Processor", { family: 6, model: 143 })?.name).toBe(
			"Sapphire Rapids",
		);
	});

	it("infers an AMD microarch from the AVX-512 fingerprint when the SKU is masked", () => {
		// Family 0x1A (26) + VP2INTERSECT is Zen 5-only on AMD (hypervisors expose a bare 'AMD EPYC').
		expect(
			resolveCpuMicroarch("AMD EPYC", { family: 26, hasAvx512Vp2intersect: true }),
		).toMatchObject({ name: "Zen 5 (Turin, SKU masked)", inferredFrom: "ISA fingerprint" });
		// Family 0x19 (25): AVX-512 present but no VP2INTERSECT → Zen 4; absent → Zen 3.
		expect(resolveCpuMicroarch("AMD EPYC", { family: 25, hasAvx512f: true })?.name).toBe(
			"Zen 4 (Genoa/Bergamo, SKU masked)",
		);
		expect(resolveCpuMicroarch("AMD EPYC", { family: 25, hasAvx512f: false })?.name).toBe(
			"Zen 3 (Milan, SKU masked)",
		);
	});

	it("returns undefined for an unrecognized model (caller leaves cpuMicroarch unset)", () => {
		expect(resolveCpuMicroarch("Apple M2")).toBeUndefined();
		expect(resolveCpuMicroarch("")).toBeUndefined();
		expect(resolveCpuMicroarch("AMD EPYC")).toBeUndefined();
	});
});
