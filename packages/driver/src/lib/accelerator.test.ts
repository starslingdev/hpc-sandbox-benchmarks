import { describe, expect, test } from "bun:test";
import {
	matchesNvidiaGpu,
	normalizeNvidiaModel,
	nvidiaAccelerator,
	parseNvidiaSmi,
} from "./accelerator.ts";

describe("NVIDIA accelerator strategy", () => {
	test("uses a bounded, machine-readable nvidia-smi query", () => {
		expect(nvidiaAccelerator).toMatchObject({
			family: "nvidia",
			command: "nvidia-smi --query-gpu=name --format=csv,noheader,nounits",
		});
		expect(Object.isFrozen(nvidiaAccelerator)).toBe(true);
	});

	test("normalizes a homogeneous visible device set", () => {
		expect(parseNvidiaSmi("NVIDIA H100 80GB HBM3\r\nNVIDIA H100 80GB HBM3\r\n")).toEqual({
			model: "H100 80GB HBM3",
			count: 2,
		});
		expect(normalizeNvidiaModel("  NVIDIA   A100-PCIE-80GB ")).toBe("A100 PCIE 80GB");
	});

	test("rejects an empty or heterogeneous observation", () => {
		expect(() => parseNvidiaSmi("\n")).toThrow(/no visible GPUs/);
		expect(() => parseNvidiaSmi("NVIDIA A100\nNVIDIA H100\n")).toThrow(/heterogeneous/);
	});

	test("matches normalized model and exact count", () => {
		const observed = { model: "H100 80GB HBM3", count: 2 };
		expect(matchesNvidiaGpu({ model: "H100", count: 2 }, observed)).toBe(true);
		expect(matchesNvidiaGpu({ model: "NVIDIA H100 80GB HBM3", count: 2 }, observed)).toBe(true);
		expect(matchesNvidiaGpu({ model: "H100", count: 1 }, observed)).toBe(false);
		expect(matchesNvidiaGpu({ model: "A100", count: 2 }, observed)).toBe(false);
		expect(
			matchesNvidiaGpu({ model: "NVIDIA H100 80GB HBM3", count: 2 }, { model: "H100", count: 2 }),
		).toBe(false);
	});
});
