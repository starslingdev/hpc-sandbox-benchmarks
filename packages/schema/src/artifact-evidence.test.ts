import { describe, expect, it } from "bun:test";
import { type } from "arktype";
import {
	artifactProvenanceSchema,
	artifactVerified,
	effectiveArtifact,
	expectedToolchainFingerprint,
	providerArtifactEvidenceSchema,
} from "./artifact-evidence.ts";
import { bakedArtifactName } from "./provider-artifacts.ts";

const BAKED = { kind: "baked", ref: bakedArtifactName("e2b", "version") } as const;
const CELL = { runId: "run-1", providerId: "e2b", suite: "cpu-node" } as const;
const FINGERPRINT = {
	authority: "toolchain-manifest-v1",
	imageName: "sandbox-benchmarks-toolchain",
	imageVersion: "v8",
} as const;

function parseProvenance(input: unknown) {
	const parsed = artifactProvenanceSchema(input);
	if (parsed instanceof type.errors) throw new Error(parsed.summary);
	return parsed;
}

function parseEvidence(input: unknown) {
	const parsed = providerArtifactEvidenceSchema(input);
	if (parsed instanceof type.errors) throw new Error(parsed.summary);
	return parsed;
}

const evidence = (provenance: unknown) => ({
	cell: CELL,
	sandboxId: "isandbox",
	provenance,
});

describe("artifact provenance", () => {
	it("accepts each structurally complete way an artifact can be established", () => {
		expect(parseProvenance({ source: "request-fallback", requested: BAKED }).source).toBe(
			"request-fallback",
		);
		expect(
			parseProvenance({ source: "driver-reported", requested: BAKED, reported: BAKED }).source,
		).toBe("driver-reported");
		expect(
			parseProvenance({
				source: "guest-fingerprint",
				requested: BAKED,
				fingerprint: FINGERPRINT,
			}).source,
		).toBe("guest-fingerprint");
	});

	it("makes a fingerprint claim without an observation unrepresentable", () => {
		expect(() => parseProvenance({ source: "guest-fingerprint", requested: BAKED })).toThrow();
	});

	it("rejects evidence smuggled onto the weakest arm", () => {
		expect(() =>
			parseProvenance({
				source: "request-fallback",
				requested: BAKED,
				fingerprint: FINGERPRINT,
			}),
		).toThrow();
		expect(() =>
			parseProvenance({ source: "request-fallback", requested: BAKED, reported: BAKED }),
		).toThrow();
	});

	it("rejects a driver report that contradicts its request on either observed arm", () => {
		const wrong = { kind: "baked", ref: "sandbox-benchmarks-toolchain-v7" } as const;
		expect(() =>
			parseProvenance({ source: "driver-reported", requested: BAKED, reported: wrong }),
		).toThrow(/ref matches the request/);
		expect(() =>
			parseProvenance({
				source: "guest-fingerprint",
				requested: BAKED,
				reported: wrong,
				fingerprint: FINGERPRINT,
			}),
		).toThrow(/ref matches the request/);
	});

	it("accepts a stock boot, where both sides carry no ref", () => {
		const none = { kind: "none" } as const;
		expect(
			parseProvenance({ source: "driver-reported", requested: none, reported: none }).source,
		).toBe("driver-reported");
	});
});

describe("authoritative guest fingerprints", () => {
	it("derives the expected identity from a canonical provider artifact", () => {
		expect(expectedToolchainFingerprint("e2b", BAKED)).toEqual(FINGERPRINT);
		expect(
			expectedToolchainFingerprint("e2b", {
				kind: "baked",
				ref: bakedArtifactName("e2b", "candidate"),
			}),
		).toEqual(FINGERPRINT);
		expect(
			expectedToolchainFingerprint("modal-gvisor", {
				kind: "image",
				ref: `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"a".repeat(64)}`,
			}),
		).toEqual(FINGERPRINT);
		expect(
			expectedToolchainFingerprint("modal-gvisor", {
				kind: "image",
				ref: `ghcr.io/untrusted/sandbox-benchmarks-toolchain@sha256:${"a".repeat(64)}`,
			}),
		).toBeUndefined();
	});

	it("rejects a guest observation that contradicts release-owned identity", () => {
		expect(() =>
			parseEvidence(
				evidence({
					source: "guest-fingerprint",
					requested: BAKED,
					fingerprint: { ...FINGERPRINT, imageVersion: "v7" },
				}),
			),
		).toThrow(/matching sandbox-benchmarks-toolchain@v8/);
	});

	it("cannot verify an arbitrary ref even when its producer supplies the current fingerprint", () => {
		const override = { kind: "baked", ref: "producer-chosen-template" } as const;
		expect(expectedToolchainFingerprint("e2b", override)).toBeUndefined();
		expect(() =>
			parseEvidence(
				evidence({
					source: "guest-fingerprint",
					requested: override,
					fingerprint: FINGERPRINT,
				}),
			),
		).toThrow(/canonical e2b release artifact/);
	});

	it("rejects the producer-supplied expected/observed shape from the incomplete contract", () => {
		expect(() =>
			parseEvidence(
				evidence({
					source: "guest-fingerprint",
					requested: BAKED,
					fingerprint: { expected: "v7", observed: "v7" },
				}),
			),
		).toThrow();
	});
});

describe("artifact helpers", () => {
	it("admits only an observed, fully bound evidence record", () => {
		expect(
			artifactVerified(parseEvidence(evidence({ source: "request-fallback", requested: BAKED }))),
		).toBe(false);
		expect(
			artifactVerified(
				parseEvidence(evidence({ source: "driver-reported", requested: BAKED, reported: BAKED })),
			),
		).toBe(true);
		expect(
			artifactVerified(
				parseEvidence(
					evidence({
						source: "guest-fingerprint",
						requested: BAKED,
						fingerprint: FINGERPRINT,
					}),
				),
			),
		).toBe(true);
	});

	it("reports the effective artifact without duplicating it", () => {
		expect(
			effectiveArtifact(parseProvenance({ source: "request-fallback", requested: BAKED })),
		).toEqual(BAKED);
		expect(
			effectiveArtifact(
				parseProvenance({ source: "driver-reported", requested: BAKED, reported: BAKED }),
			),
		).toEqual(BAKED);
	});
});

describe("provider artifact evidence", () => {
	it("joins attribution to a complete benchmark cell and sandbox", () => {
		const parsed = parseEvidence(evidence({ source: "request-fallback", requested: BAKED }));
		expect(parsed.cell).toEqual(CELL);
		expect(parsed.sandboxId).toBe("isandbox");
	});

	it("rejects a requested artifact kind outside the provider registry contract", () => {
		expect(() =>
			parseEvidence(
				evidence({
					source: "request-fallback",
					requested: { kind: "image", ref: "image" },
				}),
			),
		).toThrow(/requested kind matches e2b/);
	});

	it("rejects missing identity and undeclared keys", () => {
		expect(() =>
			parseEvidence({ cell: CELL, provenance: { source: "request-fallback", requested: BAKED } }),
		).toThrow();
		expect(() =>
			parseEvidence({
				...evidence({ source: "request-fallback", requested: BAKED }),
				note: "extra",
			}),
		).toThrow();
	});
});
