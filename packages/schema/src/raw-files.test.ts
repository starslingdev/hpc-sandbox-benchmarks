import { describe, expect, it } from "bun:test";
import {
	harnessGapMarkerJson,
	isPtsForensicsFile,
	isPtsResultFile,
	isSkipMarkerFile,
	parseGapMarker,
	parseResultsArtifactName,
	ptsForensicsFile,
	resultsArtifactName,
	sandboxSkipMarkerFile,
} from "./index.ts";

describe("raw-file naming", () => {
	it("recognises PTS result XML by prefix and extension", () => {
		expect(isPtsResultFile("pts_node-web-tooling.xml")).toBe(true);
		expect(isPtsResultFile("pts_node-web-tooling.log")).toBe(false);
		expect(isPtsResultFile("observed-specs.json")).toBe(false);
	});

	it("names a forensics tarball and keeps it disjoint from the PTS result predicate", () => {
		const file = ptsForensicsFile("pts_node-web-tooling");
		expect(file).toBe("pts_node-web-tooling--forensics.tar.gz");
		expect(isPtsForensicsFile(file)).toBe(true);
		// Provably disjoint: the tarball starts pts_ but must NEVER route through the .xml extractor.
		expect(isPtsResultFile(file)).toBe(false);
		// And a real result XML is not a forensics tarball.
		expect(isPtsForensicsFile("pts_node-web-tooling.xml")).toBe(false);
		// The profile segment must be non-empty — a bare `pts_--forensics.tar.gz` is not a valid name.
		expect(isPtsForensicsFile("pts_--forensics.tar.gz")).toBe(false);
	});

	it("names and detects suite skip markers", () => {
		const file = sandboxSkipMarkerFile("daytona", "cpu-node");
		expect(file).toBe("sandbox-daytona-cpu-node--skipped.json");
		expect(isSkipMarkerFile(file)).toBe(true);
	});

	it("pins the exact harness gap-marker bytes (the producer/harness/normalizer contract)", () => {
		// harnessGapMarkerJson is the single source of truth for the on-disk gap-marker body. Pin the
		// exact spelling — fixed key order, two-space indent, trailing newline — so a drift here can't
		// silently break the producer↔harness↔normalizer round-trip.
		const bytes = harnessGapMarkerJson("daytona", "cpu-node", "skipped", "Missing credentials");
		expect(bytes).toBe(
			'{\n  "provider": "daytona",\n  "suite": "cpu-node",\n  "outcome": "skipped",\n  "reason": "Missing credentials"\n}\n',
		);
		// And it round-trips through the reader to the suite + outcome + reason it encoded.
		expect(
			parseGapMarker(sandboxSkipMarkerFile("daytona", "cpu-node"), JSON.parse(bytes), "daytona"),
		).toEqual({
			scope: "suite",
			id: "cpu-node",
			outcome: "skipped",
			reason: "Missing credentials",
		});
	});

	it("round-trips a results artifact name, splitting on the first -sandbox-", () => {
		const name = resultsArtifactName("cpu-node", "daytona");
		expect(name).toBe("benchmark-results-cpu-node-sandbox-daytona");
		expect(parseResultsArtifactName(name)).toEqual({ suite: "cpu-node", provider: "daytona" });
		// Suite is lazy, so a name with a stray `-sandbox-` splits on the FIRST one (suite stays
		// minimal); the provider tail keeps the remainder verbatim.
		expect(parseResultsArtifactName("benchmark-results-cpu-sandbox-node-sandbox-daytona")).toEqual({
			suite: "cpu",
			provider: "node-sandbox-daytona",
		});
	});

	it("returns undefined for an artifact name that doesn't match the grammar", () => {
		expect(parseResultsArtifactName("benchmark-results-cpu-node")).toBeUndefined();
	});
});

describe("parseGapMarker", () => {
	it("reads the harness shape", () => {
		const marker = parseGapMarker(
			"sandbox-daytona-cpu-node--skipped.json",
			{ provider: "daytona", suite: "cpu-node", skipped: true, reason: "insufficient disk" },
			"daytona",
		);
		expect(marker).toEqual({
			scope: "suite",
			id: "cpu-node",
			outcome: "skipped",
			reason: "insufficient disk",
		});
	});

	it("reads the bench.sh shape", () => {
		const marker = parseGapMarker(
			"pts_git--skipped.json",
			{
				schema_version: "1.0",
				benchmark: "pts_git",
				skipped: true,
				skip_reason: "PTS unavailable",
			},
			"daytona",
		);
		expect(marker).toEqual({
			scope: "suite",
			id: "pts_git",
			outcome: "skipped",
			reason: "PTS unavailable",
		});
	});

	it("re-derives the suite from the filename when the body omits it", () => {
		const marker = parseGapMarker(
			"sandbox-daytona-cpu-node--skipped.json",
			{ skipped: true },
			"daytona",
		);
		expect(marker).toEqual({
			scope: "suite",
			id: "cpu-node",
			outcome: "skipped",
			reason: "unknown",
		});
	});

	it("treats an empty-string body suite as absent and re-derives from the filename", () => {
		// suite is a downstream identifier; an explicit `suite: ""` must not slip through as an empty
		// name — it falls through to the filename derivation just like a missing field does.
		const marker = parseGapMarker(
			"sandbox-daytona-cpu-node--skipped.json",
			{ skipped: true, suite: "" },
			"daytona",
		);
		expect(marker).toEqual({
			scope: "suite",
			id: "cpu-node",
			outcome: "skipped",
			reason: "unknown",
		});
	});

	it("falls back to the filename when the suite portion is empty", () => {
		const marker = parseGapMarker("sandbox-daytona---skipped.json", { skipped: true }, "daytona");
		expect(marker).toEqual({
			scope: "suite",
			id: "sandbox-daytona---skipped.json",
			outcome: "skipped",
			reason: "unknown",
		});
	});

	it("rejects a marker whose body outcome contradicts the filename suffix (literal trap)", () => {
		// The two halves disagree, so the marker is corrupt: guessing which to believe is how a crashed
		// suite gets published as a deliberate skip. Neither direction is resolved by precedence.
		expect(
			parseGapMarker(
				"sandbox-daytona-cpu-node--skipped.json",
				{ suite: "cpu-node", outcome: "failed", reason: "exit code 1" },
				"daytona",
			),
		).toBeUndefined();
		expect(
			parseGapMarker(
				"sandbox-daytona-cpu-node--failed.json",
				{ suite: "cpu-node", outcome: "skipped", reason: "insufficient disk" },
				"daytona",
			),
		).toBeUndefined();
	});

	it("returns undefined when the filename is not a gap marker", () => {
		expect(parseGapMarker("results.json", { skipped: true }, "daytona")).toBeUndefined();
	});
});
