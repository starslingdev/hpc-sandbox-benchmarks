import { expect, test } from "bun:test";
import { verifyPromotionEvidence } from "./release-evidence.ts";

const baseImage = `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"a".repeat(64)}`;
const expected = {
	providers: ["brezel", "e2b"],
	required: ["e2b"],
	sourceRef: "abc",
	baseImage,
	version: "v1",
	partial: false,
	force: false,
};
const report = (provider: string, ok = true) => ({
	stage: { provider, sourceRef: "abc", baseImage, version: "v1", partial: false, force: false, ok },
	reports: [{ provider, status: ok ? "ok" : "failed" }],
});
test("required promotion failure or missing evidence blocks the commit", () => {
	expect(() =>
		verifyPromotionEvidence([report("brezel"), report("e2b", false)], expected),
	).toThrow();
	expect(() => verifyPromotionEvidence([report("brezel")], expected)).toThrow();
});
test("optional failures remain visible without blocking required success", () => {
	expect(verifyPromotionEvidence([report("brezel", false), report("e2b")], expected)).toHaveLength(
		2,
	);
});
test("rejects duplicates, foreign providers, mismatched base, source, version and mode", () => {
	for (const changed of [
		{ provider: "modal-vm" },
		{ sourceRef: "other" },
		{ baseImage: "other" },
		{ version: "v2" },
		{ partial: true },
		{ force: true },
	]) {
		const value = report("e2b");
		Object.assign(value.stage, changed);
		expect(() => verifyPromotionEvidence([report("brezel"), value], expected)).toThrow();
	}
	expect(() =>
		verifyPromotionEvidence([report("brezel"), report("e2b"), report("e2b")], expected),
	).toThrow();
});
test("a claimed success cannot hide a failure or omit the provider result", () => {
	for (const reports of [
		[],
		[{ provider: "e2b", status: "failed" }],
		[{ provider: "brezel", status: "ok" }],
		[
			{ provider: "e2b", status: "ok" },
			{ provider: "image", status: "failed" },
		],
	]) {
		expect(() =>
			verifyPromotionEvidence([report("brezel"), { ...report("e2b"), reports }], expected),
		).toThrow();
	}
});
