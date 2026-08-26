import { describe, expect, it } from "bun:test";
import type { ProviderRun, ResultGap } from "./index.ts";
import {
	aggregate,
	harnessGapMarkerJson,
	isProviderArtifactEvidenceFile,
	isPtsForensicsFile,
	isPtsResultFile,
	isSkipMarkerFile,
	parseGapMarker,
	parseProviderArtifactEvidence,
	parseProviderCostEvidence,
	parseResultsArtifactName,
	providerArtifactEvidenceFile,
	providerArtifactEvidenceJson,
	providerCostEvidenceFile,
	providerCostEvidenceJson,
	providerReportedNothing,
	ptsForensicsFile,
	resultsArtifactName,
	sandboxSkipMarkerFile,
} from "./index.ts";

describe("raw-file naming", () => {
	it("round-trips bounded host-owned artifact evidence with deterministic bytes", () => {
		const record = {
			cell: { runId: "run-1", providerId: "e2b", suite: "cpu-node" },
			sandboxId: "sb-1",
			provenance: {
				source: "request-fallback" as const,
				requested: { kind: "baked" as const, ref: "sandbox-benchmarks-toolchain-v8" },
			},
		} as const;
		expect(providerArtifactEvidenceFile()).toBe("provider-artifact-evidence.json");
		expect(isProviderArtifactEvidenceFile(providerArtifactEvidenceFile())).toBe(true);
		expect(isProviderArtifactEvidenceFile("provider-cost-evidence.json")).toBe(false);
		const bytes = providerArtifactEvidenceJson(record);
		expect(bytes.endsWith("\n")).toBe(true);
		expect(parseProviderArtifactEvidence(bytes)).toEqual(record);
		expect(() => parseProviderArtifactEvidence(`{"padding":"${"x".repeat(17 * 1024)}"}`)).toThrow(
			/exceeds 16 KiB/,
		);
	});

	it("round-trips strict provider cost evidence with deterministic bytes", () => {
		const record = {
			kind: "missing" as const,
			cell: { runId: "run-1", providerId: "modal-gvisor", suite: "cpu-node" },
			subject: { kind: "sandbox" as const, sandboxId: "sb-1" },
			capturedAt: "2026-08-08T00:00:00.000Z",
			sdk: { packageName: "modal", version: "0.7.6" },
			reason: "unsupported_public_api" as const,
			detail: "No public sandbox usage endpoint.",
		} as const;
		expect(providerCostEvidenceFile()).toBe("provider-cost-evidence.json");
		const bytes = providerCostEvidenceJson(record);
		expect(bytes.endsWith("\n")).toBe(true);
		expect(parseProviderCostEvidence(bytes)).toEqual(record);
		expect(() => parseProviderCostEvidence({ ...record, reason: "unknown" })).toThrow(
			/invalid provider cost evidence/,
		);
	});
	it("rejects an oversized evidence file before parsing JSON", () => {
		expect(() => parseProviderCostEvidence(`{"padding":"${"x".repeat(97 * 1024)}"}`)).toThrow(
			/exceeds 96 KiB/,
		);
	});
	it("recognises PTS result XML by prefix and extension", () => {
		expect(isPtsResultFile("pts_node-web-tooling.xml")).toBe(true);
		expect(isPtsResultFile("pts_node-web-tooling.log")).toBe(false);
		expect(isPtsResultFile("pts_node-web-tooling--metadata.json")).toBe(false);
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

	it("reads the bench.sh fail_result shape (a leaf that RAN and errored on every trial)", () => {
		// The exact body run_pts_benchmark writes beside a value-less composite. The --failed.json
		// suffix decides the outcome, the body's outcome agrees, and `benchmark` becomes the gap id —
		// the LEAF name at this layer (the normalizer folds it into the suite).
		const marker = parseGapMarker(
			"pts_fio-rand-read--failed.json",
			{
				outcome: "failed",
				benchmark: "pts_fio-rand-read",
				reason:
					"PTS batch-run of pts/fio-2.1.0 completed but every trial errored (composite carries no values)",
			},
			"modal-gvisor",
		);
		expect(marker).toEqual({
			scope: "suite",
			id: "pts_fio-rand-read",
			outcome: "failed",
			reason:
				"PTS batch-run of pts/fio-2.1.0 completed but every trial errored (composite carries no values)",
		});
	});

	it("drops an unparsable cause, keeping the gap — a newer producer must not erase one", () => {
		// The raw tree is re-normalized retroactively, so this build reads markers written by builds it
		// does not control. If an uninterpretable `cause` failed the whole body, `parseGapMarker` would
		// answer `undefined` and the gap would vanish — a benchmark that reads as never attempted, which
		// is strictly worse than one recorded without a diagnosis.
		const unclassified: ResultGap = {
			scope: "suite",
			id: "cpu-node",
			outcome: "skipped",
			reason: "Insufficient disk: 3.0 GiB free, suite needs 20 GiB",
		};
		const body = (cause: unknown) => ({
			outcome: "skipped",
			suite: "cpu-node",
			reason: "Insufficient disk: 3.0 GiB free, suite needs 20 GiB",
			cause,
		});
		// A kind from a future taxonomy this build has no arm for.
		expect(
			parseGapMarker(
				"sandbox-daytona-cpu-node--skipped.json",
				body({ kind: "quota-exceeded" }),
				"daytona",
			),
		).toEqual(unclassified);
		// A known kind whose payload is malformed (a shortfall that is not short).
		expect(
			parseGapMarker(
				"sandbox-daytona-cpu-node--skipped.json",
				body({ kind: "disk-shortfall", freeGb: 30, requiredGb: 20 }),
				"daytona",
			),
		).toEqual(unclassified);
		// Outright garbage in the field.
		expect(
			parseGapMarker("sandbox-daytona-cpu-node--skipped.json", body("disk"), "daytona"),
		).toEqual(unclassified);
	});

	it("drops a cause from the wrong side of the skip/failure partition, keeping the gap", () => {
		// Unlike a contradicting `outcome`, a contradicting cause leaves the outcome knowable (the
		// filename said it), so only the classification is lost. Keeping it would fail resultGapSchema's
		// narrow — and a Run parses whole, so one bad marker would take the entire Run down.
		const marker = parseGapMarker(
			"sandbox-daytona-cpu-node--skipped.json",
			{
				outcome: "skipped",
				suite: "cpu-node",
				reason: "Missing credentials",
				cause: { kind: "step-timeout", step: "install", timeoutSeconds: 600 },
			},
			"daytona",
		);
		expect(marker).toEqual({
			scope: "suite",
			id: "cpu-node",
			outcome: "skipped",
			reason: "Missing credentials",
		});
		// A coherent pairing survives.
		expect(
			parseGapMarker(
				"sandbox-daytona-cpu-node--skipped.json",
				{
					suite: "cpu-node",
					reason: "no creds",
					cause: { kind: "missing-credentials", variables: ["E2B_API_KEY"] },
				},
				"daytona",
			)?.cause,
		).toEqual({ kind: "missing-credentials", variables: ["E2B_API_KEY"] });
	});

	it("never writes a marker whose cause contradicts its outcome", () => {
		// The same rule on the producer side, so the bytes in a CI artifact are self-consistent and a
		// human reading one does not have to know which half the reader believes.
		const bytes = harnessGapMarkerJson("daytona", "cpu-node", "skipped", "Missing credentials", {
			kind: "step-failed",
			step: "install",
			exitCode: 1,
		});
		expect(JSON.parse(bytes).cause).toBeUndefined();
		expect(
			JSON.parse(
				harnessGapMarkerJson("daytona", "cpu-node", "skipped", "Missing credentials", {
					kind: "missing-credentials",
					variables: ["E2B_API_KEY"],
				}),
			).cause,
		).toEqual({ kind: "missing-credentials", variables: ["E2B_API_KEY"] });
	});

	it("rejects the fail_result body under a --skipped.json filename (suffix/body contradiction)", () => {
		expect(
			parseGapMarker(
				"pts_fio-rand-read--skipped.json",
				{ outcome: "failed", benchmark: "pts_fio-rand-read", reason: "every trial errored" },
				"modal-gvisor",
			),
		).toBeUndefined();
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

// Colocated with the marker tests (both sides of "did this provider report anything?"): the marker
// files are the evidence trail, and this predicate is what consumers use when NO trail exists.
describe("providerReportedNothing", () => {
	const empty = (): ProviderRun => ({
		providerId: "modal-vm",
		validationStatus: "pending",
		observedSpecs: {},
		metrics: [],
		suitesCovered: [],
		gaps: [],
		uncatalogued: [],
	});

	it("is true for the zero-evidence placeholder the normalizer emits for an absent raw dir", () => {
		expect(providerReportedNothing(empty())).toBe(true);
	});

	it("flips false on EACH single piece of participation evidence", () => {
		expect(
			providerReportedNothing({
				...empty(),
				validationStatus: "validated",
				metrics: [{ metricId: "m", samples: [1], aggregates: aggregate([1]) }],
			}),
		).toBe(false);
		expect(providerReportedNothing({ ...empty(), suitesCovered: ["cpu-node"] })).toBe(false);
		expect(
			providerReportedNothing({
				...empty(),
				gaps: [{ scope: "suite", id: "cpu-node", outcome: "failed", reason: "died" }],
			}),
		).toBe(false);
		expect(
			providerReportedNothing({
				...empty(),
				uncatalogued: [{ id: "pts/x::default::s", value: 1, sourceFile: "pts_x.xml" }],
			}),
		).toBe(false);
		expect(providerReportedNothing({ ...empty(), observedSpecs: { vcpus: 2 } })).toBe(false);
		expect(
			providerReportedNothing({
				...empty(),
				hostMetadata: [{ source: "mise/system-provider", sourceFile: "s.json", fields: [] }],
			}),
		).toBe(false);
		// A booted sandbox leaves an artifact attribution even when it produced nothing else, so a
		// provider that has one is not a never-dispatched row. `costEvidence` counted already but was
		// never asserted here, which left this test's "EACH" claim untrue for both sandbox-scoped
		// arrays.
		expect(
			providerReportedNothing({
				...empty(),
				artifactEvidence: [
					{
						cell: {
							runId: "run-1",
							providerId: "modal-vm",
							suite: "cpu-node",
						},
						sandboxId: "isandbox",
						provenance: {
							source: "request-fallback",
							requested: { kind: "baked", ref: "toolchain-v8" },
						},
					},
				],
			}),
		).toBe(false);
		expect(
			providerReportedNothing({
				...empty(),
				costEvidence: [
					{
						kind: "missing",
						cell: { runId: "run-1", providerId: "modal-vm", suite: "cpu-node" },
						subject: { kind: "sandbox", sandboxId: "sb-1" },
						capturedAt: "2026-06-20T00:00:00.000Z",
						sdk: { packageName: "modal", version: "0.9.0" },
						reason: "sandbox_teardown_unconfirmed",
						detail: "teardown was not confirmed",
					},
				],
			}),
		).toBe(false);
	});
});
