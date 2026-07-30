// biome-ignore-all lint/performance/noDelete: this file's whole job is to hand the parse
// MALFORMED documents, and several rules under test are about a field being ABSENT ("true or
// absent", "either both or neither"). Setting a key to `undefined` leaves it present, so
// `delete` is the only way to express the case — and there is no hot path here.
// biome-ignore-all lint/suspicious/noExplicitAny: the same reason from the other side. Every
// `any` below is a deliberate escape from the type the parse exists to enforce; typing these
// mutations would mean declaring the malformed shapes legal.
// biome-ignore-all lint/style/noNonNullAssertion: on a document this file parsed itself, from
// contents it wrote three lines above.
import { describe, expect, it } from "bun:test";
import { parseSandboxBenchmarkData } from "./parse.ts";

/**
 * The parse boundary, fixture-tested.
 *
 * This is the one seam where the derived artifact enters the program, and it replaced
 * `rawData as SandboxBenchmarkData` — an assertion nobody checked. The property under test is
 * not "the committed run parses": that is asserted by every other test in the repo, since the
 * site's content module calls this at import time and a throw would take all of them down.
 * The property under test is that a MALFORMED document is rejected, at the boundary, naming
 * the field — because the whole failure mode being closed is a document that renders anyway.
 *
 * Synthetic documents throughout, deliberately. A guard that could only be exercised against
 * the committed run would pass on whatever that run happens to contain: this run has no
 * backfill, no `indent: false`, no provider missing its specs and no bar naming a column that
 * is not there, so every case below would be untestable and the boundary would be worth
 * exactly nothing.
 *
 * Registered in scripts/verify-guards.mjs as two mutants, because the file fails in two
 * independent ways: "sandbox-data-parse-tolerates-a-missing-field" (a required field is waved
 * through as a default) and "sandbox-data-parse-admits-an-unresolvable-provider-id" (the
 * document parses, and a provider index built from it is missing a key a chart will read).
 * Breaking one leaves the other green.
 */

/** A minimal well-formed document: two providers, one suite, one measured row and
 *  one derived row, a backfill disclosure, and one excluded provider. Rebuilt on
 *  every call so a case that mutates it cannot leak into the next. */
function validDocument(): Record<string, unknown> {
	return {
		provenance: {
			runFile: "data/runs/1.json",
			catalogFile: "data/catalog.json",
			catalogSourceSha: "abc123",
			generator: "scripts/generate.ts",
		},
		run: {
			runId: "1",
			commit: "abcdef123456",
			date: "2026-01-01",
			schemaVersion: "3",
			targetSpec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		},
		backfill: {
			runFile: "data/runs/0.json",
			runId: "0",
			commit: "0123456789ab",
			date: "2025-12-01",
			targetSpec: { vcpus: 2, memoryGb: 4, diskGb: 20 },
			cells: [{ provider: "alpha", metricId: "disk_read" }],
		},
		providers: [providerDoc("alpha", "Alpha"), providerDoc("beta", "Beta")],
		excludedProviders: [{ id: "gamma", name: "Gamma", validationStatus: "pending", metrics: 0 }],
		environmentFlags: [{ provider: "beta", field: "diskGb" }],
		phaseOrder: ["clone", "install"],
		suites: [
			{
				id: "realworld-demo",
				name: "Demo",
				minDiskGb: 20,
				tasks: [
					{
						id: "demo_task_git_clone",
						label: "Demo: git clone",
						shortLabel: "git clone",
						phase: "clone",
					},
				],
				bars: [
					{
						provider: "alpha",
						totalS: 12.5,
						costPerRunUsd: 0.0025,
						segments: [
							{
								id: "demo_task_git_clone",
								label: "Demo: git clone",
								shortLabel: "git clone",
								phase: "clone",
								p50: 12.5,
								n: 12,
							},
						],
					},
				],
				incomplete: [{ provider: "beta", outcome: "skipped", reason: "insufficient disk" }],
			},
		],
		dimensionGroups: [
			{
				dimension: "disk",
				rows: [
					{
						id: "disk_read",
						label: "Disk read",
						unit: "MB/s",
						direction: "HIB",
						headline: true,
						derived: false,
						values: {
							alpha: {
								p50: 100,
								p95: 120,
								mean: 104,
								stdev: 8,
								min: 90,
								max: 130,
								n: 6,
								samples: [90, 100, 130],
								r: 3,
								rep: [95, 100, 110],
								backfilled: true,
							},
							beta: null,
						},
					},
					{
						id: "realworld-demo_total",
						label: "Demo: total (Σ task medians)",
						unit: "Seconds",
						direction: "LIB",
						headline: false,
						derived: true,
						// After `values`, as the generator spreads it (`{ ...valueRow(def), indent: true }`).
						values: { alpha: { p50: 12.5, n: 12 }, beta: null },
						indent: true,
					},
				],
			},
		],
		coverageGaps: [
			{
				provider: "beta",
				suite: "realworld-demo",
				outcome: "skipped",
				reason: "insufficient disk",
				disk: true,
			},
		],
	};
}

function providerDoc(id: string, name: string): Record<string, unknown> {
	return {
		id,
		name,
		specMatched: true,
		priceUsdHr: 0.5,
		specs: {
			vcpus: 4,
			cpuModel: "EPYC 9254",
			cpuModels: null,
			cpuCacheSize: "32 MB",
			virtualization: "KVM",
			isolation: "vm",
			memoryGb: 8,
			diskGb: 40,
			fileSystem: "ext4",
			mountOptions: "relatime",
			diskScheduler: "none",
			diskBlockSize: "4096",
			kernel: "6.1.0",
			os: "Ubuntu 24.04",
			egressFamily: "IPv4",
			asn: "AS1234",
			asnOrg: "Example",
			geo: "Ashburn, VA, US",
			egressFromShard: false,
			region: "us-east-1",
			regionPinned: true,
		},
	};
}

/** Apply `edit` to a fresh valid document and return it. */
function broken(edit: (doc: Record<string, unknown>) => void): unknown {
	const doc = validDocument();
	edit(doc);
	return doc;
}

/** The fixture's first dimension group's rows. Typed `any` on purpose: every case below
 *  hands the parser something that does not typecheck, which is the point. */
// oxlint-disable-next-line no-explicit-any
const rows = (doc: any) => doc.dimensionGroups[0].rows;

describe("parseSandboxBenchmarkData", () => {
	it("accepts a well-formed document and returns it field for field", () => {
		const doc = validDocument();
		const parsed = parseSandboxBenchmarkData(doc);
		expect(parsed.phaseOrder).toEqual(["clone", "install"]);
		expect(parsed.providers.map((p) => p.id)).toEqual(["alpha", "beta"]);
		expect(parsed.providers[0]!.specs.diskGb).toBe(40);
		expect(parsed.suites[0]!.bars[0]!.segments[0]!.p50).toBe(12.5);
		expect(parsed.backfill?.cells).toEqual([{ provider: "alpha", metricId: "disk_read" }]);
		expect(parsed.dimensionGroups[0]!.rows[0]!.values.beta).toBeNull();
	});

	it("re-serialises to the bytes it was given", () => {
		// The artifact is compared BYTE for byte by the recompute guard, and the page's
		// markdown mirror is generated from the parsed value. A parse that reordered keys
		// or dropped an optional field would be a silent rewrite of a document whose whole
		// claim is that it is a deterministic function of the vendored run.
		const doc = validDocument();
		expect(JSON.stringify(parseSandboxBenchmarkData(doc), null, 2)).toBe(
			JSON.stringify(doc, null, 2),
		);
	});

	it("rejects a missing top-level field, naming it", () => {
		// The motivating case: `phaseOrder` feeds `indexOf(phase)` for the colour ramp,
		// so its absence used to surface as a chart drawing every segment in slot -1.
		expect(() => parseSandboxBenchmarkData(broken((d) => delete d.phaseOrder))).toThrow(
			/phaseOrder: expected an array, got undefined/,
		);
		expect(() => parseSandboxBenchmarkData(broken((d) => delete d.suites))).toThrow(/suites/);
		expect(() => parseSandboxBenchmarkData(broken((d) => delete d.dimensionGroups))).toThrow(
			/dimensionGroups/,
		);
		expect(() => parseSandboxBenchmarkData(broken((d) => delete d.coverageGaps))).toThrow(
			/coverageGaps/,
		);
	});

	it("rejects a provider with no specs, naming the provider's position", () => {
		// Used to render as a column of empty cells — and then to be cropped into a
		// published figure as a column of empty cells.
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => delete d.providers[1].specs)),
		).toThrow(/providers\[1\]\.specs: expected an object, got undefined/);
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => delete d.providers[0].specs.diskGb)),
		).toThrow(/providers\[0\]\.specs\.diskGb/);
	});

	it("names the exact path of a bad field however deep it sits", () => {
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => (rows(d)[0].values.alpha.p50 = "100"))),
		).toThrow(
			/dimensionGroups\[0\]\.rows\[0\]\.values\.alpha\.p50: expected a finite number, got "100"/,
		);
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => (rows(d)[0].values.alpha.samples[1] = null))),
		).toThrow(/values\.alpha\.samples\[1\]: expected a finite number, got null/);
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => (d.suites[0].bars[0].segments[0].n = "12"))),
		).toThrow(/suites\[0\]\.bars\[0\]\.segments\[0\]\.n/);
	});

	it("rejects a number that is not finite", () => {
		// NaN and Infinity survive `typeof x === "number"` and then render as "NaN" in a
		// published table, or size a bar to nothing.
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => (d.suites[0].bars[0].totalS = Number.NaN))),
		).toThrow(/suites\[0\]\.bars\[0\]\.totalS: expected a finite number/);
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => (rows(d)[0].values.alpha.p50 = Infinity))),
		).toThrow(/a finite number/);
	});

	it("rejects a direction outside the two the formatters know", () => {
		// Every ratio, every "best" marker and every tint step branches on this. An
		// unknown value would silently take the higher-is-better branch.
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => (rows(d)[0].direction = "MIB"))),
		).toThrow(/rows\[0\]\.direction: expected one of "HIB" \| "LIB", got "MIB"/);
	});

	it("distinguishes an absent optional field from a present wrong one", () => {
		// `null` is not absence. A cell carrying `samples: null` would pass a `?.length`
		// check and fail an iteration, three layers down.
		const withoutSamples = broken(
			(d: any) => delete d.dimensionGroups[0].rows[0].values.alpha.samples,
		);
		expect(() => parseSandboxBenchmarkData(withoutSamples)).not.toThrow();
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => (rows(d)[0].values.alpha.samples = null))),
		).toThrow(/values\.alpha\.samples: expected an array, got null/);
	});

	it("rejects a marker field that is present and false", () => {
		// `indent` and `backfilled` are markers: the generator writes `true` or nothing.
		// `indent: false` means someone hand-edited the artifact, and it is the shape a
		// "helpful" normalisation pass produces.
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => (rows(d)[1].indent = false))),
		).toThrow(/rows\[1\]\.indent: expected true or the field to be absent, got false/);
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => (rows(d)[0].values.alpha.backfilled = false))),
		).toThrow(/backfilled: expected true or the field to be absent/);
	});

	it("rejects the document itself when it is not an object", () => {
		expect(() => parseSandboxBenchmarkData(null)).toThrow(/\(root\): expected an object, got null/);
		expect(() => parseSandboxBenchmarkData([])).toThrow(/\(root\): expected an object/);
		expect(() => parseSandboxBenchmarkData("{}")).toThrow(/\(root\): expected an object/);
	});

	it("accepts a document with no backfill, and rejects a malformed one", () => {
		const none = broken((d) => (d.backfill = null));
		expect(parseSandboxBenchmarkData(none).backfill).toBeNull();
		expect(() =>
			parseSandboxBenchmarkData(broken((d: any) => delete d.backfill.targetSpec.diskGb)),
		).toThrow(/backfill\.targetSpec\.diskGb/);
	});

	describe("provider references", () => {
		// THE INVARIANT THAT REPLACED A CAST. `providerIndexOf(data.providers)[bar.provider]`
		// is typed as always present; before this check that was a lie, and a bar naming a
		// provider the run never rendered read as `undefined.name` inside a chart. Every
		// reference site is covered, because covering four of five is the same as covering
		// none — the fifth is where the next one lands.

		it("rejects a bar naming a provider that is not a column", () => {
			expect(() =>
				parseSandboxBenchmarkData(broken((d: any) => (d.suites[0].bars[0].provider = "delta"))),
			).toThrow(
				/suites\[0\]\.bars\[0\]\.provider: expected a provider id in providers\[\] \(alpha, beta\), got "delta"/,
			);
		});

		it("rejects an incomplete row, a flag, a gap or a backfilled cell naming an unknown provider", () => {
			expect(() =>
				parseSandboxBenchmarkData(
					broken((d: any) => (d.suites[0].incomplete[0].provider = "delta")),
				),
			).toThrow(/suites\[0\]\.incomplete\[0\]\.provider/);
			expect(() =>
				parseSandboxBenchmarkData(broken((d: any) => (d.environmentFlags[0].provider = "delta"))),
			).toThrow(/environmentFlags\[0\]\.provider/);
			expect(() =>
				parseSandboxBenchmarkData(broken((d: any) => (d.coverageGaps[0].provider = "delta"))),
			).toThrow(/coverageGaps\[0\]\.provider/);
			expect(() =>
				parseSandboxBenchmarkData(broken((d: any) => (d.backfill.cells[0].provider = "delta"))),
			).toThrow(/backfill\.cells\[0\]\.provider/);
		});

		it("rejects a table column keyed by a provider that is not in providers[]", () => {
			expect(() =>
				parseSandboxBenchmarkData(
					broken((d: any) => {
						rows(d)[0].values.delta = { p50: 1, n: 1 };
					}),
				),
			).toThrow(/dimensionGroups\[0\]\.rows\[0\]\.values\.delta/);
		});

		it("still allows excludedProviders to name providers that are not columns", () => {
			// Its entire job. A check that forgot this would reject every real run, which is
			// the failure mode where someone deletes the check rather than reading it.
			const doc = parseSandboxBenchmarkData(validDocument());
			expect(doc.excludedProviders.map((p) => p.id)).toEqual(["gamma"]);
			expect(doc.providers.map((p) => p.id)).not.toContain("gamma");
		});
	});
});
