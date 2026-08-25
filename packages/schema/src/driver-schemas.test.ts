import { describe, expect, test } from "bun:test";
import { type } from "arktype";
import {
	execResultSchema,
	exitSchema,
	gpuSpecSchema,
	resolvedArtifactSchema,
	sandboxObservationSchema,
} from "./driver-schemas.ts";
import { targetSpecSchema } from "./target-spec-schema.ts";

const rejected = (result: unknown): boolean => result instanceof type.errors;

const execResult = {
	exit: { kind: "exited", code: 0 },
	stdout: "",
	stderr: "",
	durationMs: 12,
	truncated: false,
} as const;

describe("execResultSchema", () => {
	test("accepts a finite duration", () => {
		expect(rejected(execResultSchema({ ...execResult, durationMs: 1234.5 }))).toBe(false);
		expect(rejected(execResultSchema({ ...execResult, durationMs: 0 }))).toBe(false);
	});

	test("rejects a non-finite duration before it can cross the driver port", () => {
		// A bare `number >= 0` bound admits Infinity, which would be recorded as a real measurement
		// and poison every latency statistic derived from it.
		for (const durationMs of [Number.POSITIVE_INFINITY, Number.NaN, -1]) {
			expect(rejected(execResultSchema({ ...execResult, durationMs }))).toBe(true);
		}
	});

	test("rejects undeclared fields at the envelope and nested exit boundary", () => {
		expect(rejected(execResultSchema({ ...execResult, extra: true }))).toBe(true);
		expect(
			rejected(execResultSchema({ ...execResult, exit: { ...execResult.exit, extra: true } })),
		).toBe(true);
	});
});

describe("standalone driver boundary schemas", () => {
	test("accepts every canonical exit arm and rejects undeclared fields", () => {
		for (const exit of [
			{ kind: "exited", code: 0 },
			{ kind: "signalled", signal: "SIGTERM" },
			{ kind: "unknown", detail: "status unavailable" },
		] as const) {
			expect(rejected(exitSchema(exit))).toBe(false);
			expect(rejected(exitSchema({ ...exit, extra: true }))).toBe(true);
		}
	});

	test("accepts a canonical GPU and rejects undeclared fields", () => {
		expect(rejected(gpuSpecSchema({ model: "H100", count: 1 }))).toBe(false);
		expect(rejected(gpuSpecSchema({ model: "H100", count: 1, extra: true }))).toBe(true);
	});

	test("accepts every canonical artifact arm and rejects undeclared fields", () => {
		for (const artifact of [
			{ kind: "none" },
			{ kind: "image", ref: "image" },
			{ kind: "baked", ref: "template" },
			{ kind: "mirror", ref: "mirror" },
			{ kind: "built", ref: "build" },
		] as const) {
			expect(rejected(resolvedArtifactSchema(artifact))).toBe(false);
			expect(rejected(resolvedArtifactSchema({ ...artifact, extra: true }))).toBe(true);
		}
	});

	test("accepts every canonical observation arm and rejects undeclared fields", () => {
		for (const observation of [
			{ state: "running" },
			{ state: "terminal" },
			{ state: "absent" },
		] as const) {
			expect(rejected(sandboxObservationSchema(observation))).toBe(false);
			expect(rejected(sandboxObservationSchema({ ...observation, extra: true }))).toBe(true);
		}
	});
});

describe("targetSpecSchema", () => {
	test("accepts the declared resource vocabulary", () => {
		expect(rejected(targetSpecSchema({ vcpus: 4, memoryGb: 8 }))).toBe(false);
		expect(rejected(targetSpecSchema({ vcpus: 4, memoryGb: 8, diskGb: 40 }))).toBe(false);
		expect(rejected(targetSpecSchema({ vcpus: 1.5, memoryGb: 0.5, diskGb: 40.25 }))).toBe(false);
	});

	test("rejects an undeclared key instead of silently dropping it", () => {
		expect(rejected(targetSpecSchema({ vcpus: 4, memoryGb: 8, gpu: "h100" }))).toBe(true);
		expect(rejected(targetSpecSchema({ vcpus: 4, memoryGb: 8, memoryGB: 16 }))).toBe(true);
	});

	test("rejects an unsafe resource bound", () => {
		for (const resource of ["vcpus", "memoryGb", "diskGb"] as const) {
			for (const invalid of [
				Number.POSITIVE_INFINITY,
				Number.NEGATIVE_INFINITY,
				Number.NaN,
				Number.MAX_SAFE_INTEGER + 1,
			]) {
				expect(
					rejected(targetSpecSchema({ vcpus: 4, memoryGb: 8, diskGb: 40, [resource]: invalid })),
				).toBe(true);
			}
		}
	});
});
