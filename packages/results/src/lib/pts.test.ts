import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MetricDef } from "@sandbox-benchmarks/schema";
import {
	buildPtsIndex,
	parsePtsComposite,
	ptsResultToMetric,
	resultSamples,
	versionlessTest,
} from "./pts.ts";
import type { PtsResult } from "./pts-schema.ts";

const realFixture = readFileSync(
	join(import.meta.dir, "__fixtures__/daytona/pts_node-web-tooling.xml"),
	"utf8",
);

// A two-result composite (as a batch run produces): proves Result stays an array, and exercises an
// uncatalogued synthetic result alongside the catalogued one.
const multiResultXml = `<?xml version="1.0"?>
<PhoronixTestSuite>
  <Generated><TestClient>phoronix-test-suite/10.8.4</TestClient></Generated>
  <Result>
    <Identifier>pts/node-web-tooling-1.0.1</Identifier>
    <Title>Node.js V8 Web Tooling Benchmark</Title>
    <Scale>runs/s</Scale>
    <Proportion>HIB</Proportion>
    <Data><Entry><Value>20.5</Value><RawString>20.5</RawString></Entry></Data>
  </Result>
  <Result>
    <Identifier>pts/not-in-catalog-1.0.0</Identifier>
    <Title>Not In Catalog</Title>
    <Scale>Seconds</Scale>
    <Proportion>LIB</Proportion>
    <Data><Entry><Value>4.2</Value></Entry></Data>
  </Result>
</PhoronixTestSuite>`;

describe("parsePtsComposite", () => {
	it("parses the real single-result fixture, forcing object nodes to arrays", () => {
		const composite = parsePtsComposite(realFixture);
		const results = composite.PhoronixTestSuite.Result;
		expect(Array.isArray(results)).toBe(true);
		expect(results).toHaveLength(1);
		const entries = results[0]?.Data.Entry;
		expect(Array.isArray(entries)).toBe(true);
	});

	it("coerces <Value> text to a number via the schema (parser stays dumb)", () => {
		const value = parsePtsComposite(realFixture).PhoronixTestSuite.Result[0]?.Data.Entry[0]?.Value;
		expect(value).toBe(16.19);
		expect(typeof value).toBe("number");
	});

	it("keeps multiple results as an array", () => {
		expect(parsePtsComposite(multiResultXml).PhoronixTestSuite.Result).toHaveLength(2);
	});

	it("throws an arktype summary on malformed XML", () => {
		expect(() => parsePtsComposite("<PhoronixTestSuite></PhoronixTestSuite>")).toThrow(
			/invalid PTS composite\.xml/,
		);
	});

	it("tolerates a Result whose every pass failed (empty <Value>) instead of throwing", () => {
		// PTS doesn't omit a fully-failed option's <Result> — it emits one with an empty <Value>. A
		// composite carrying one alongside a successful Result must still parse (captured shape: a Docker
		// smoke test of a two-Option batch-run where one Option's every pass failed).
		const xml = `<?xml version="1.0"?>
<PhoronixTestSuite><Result>
  <Identifier>pts/x-1.0</Identifier><Title>X</Title><Scale>Seconds</Scale><Proportion>LIB</Proportion>
  <Data><Entry><Value></Value><RawString></RawString></Entry></Data>
</Result></PhoronixTestSuite>`;
		const result = parsePtsComposite(xml).PhoronixTestSuite.Result[0];
		expect(result?.Data.Entry[0]?.Value).toBeUndefined();
	});

	it("rejects a malformed RawString sample token at the schema boundary", () => {
		// A non-numeric per-pass token fails the schema's sampleList morph, so the whole composite is
		// rejected loudly here rather than the bad token silently vanishing during aggregation.
		const xml = `<?xml version="1.0"?>
<PhoronixTestSuite><Result>
  <Identifier>pts/x-1.0</Identifier><Title>X</Title><Scale>runs/s</Scale><Proportion>HIB</Proportion>
  <Data><Entry><Value>1</Value><RawString>1:notanumber:3</RawString></Entry></Data>
</Result></PhoronixTestSuite>`;
		expect(() => parsePtsComposite(xml)).toThrow(/invalid PTS composite\.xml/);
	});
});

describe("resultSamples", () => {
	it("splits the colon-joined RawString into the per-pass samples", () => {
		const result = parsePtsComposite(realFixture).PhoronixTestSuite.Result[0];
		expect(result && resultSamples(result)).toEqual([16.19, 16.3, 16.08]);
	});

	it("falls back to the single Value when RawString is absent", () => {
		const unknown = parsePtsComposite(multiResultXml).PhoronixTestSuite.Result[1];
		expect(unknown && resultSamples(unknown)).toEqual([4.2]);
	});

	it("retains legitimate zero-valued samples (filters non-finite/negative, not zero)", () => {
		const xml = `<?xml version="1.0"?>
<PhoronixTestSuite><Result>
  <Identifier>pts/x-1.0</Identifier><Title>X</Title><Scale>errors</Scale><Proportion>LIB</Proportion>
  <Data><Entry><Value>0</Value><RawString>0:5:0</RawString></Entry></Data>
</Result></PhoronixTestSuite>`;
		const result = parsePtsComposite(xml).PhoronixTestSuite.Result[0];
		expect(result && resultSamples(result)).toEqual([0, 5, 0]);
	});

	it("returns no samples for a Result whose every pass failed (empty <Value>)", () => {
		const xml = `<?xml version="1.0"?>
<PhoronixTestSuite><Result>
  <Identifier>pts/x-1.0</Identifier><Title>X</Title><Scale>Seconds</Scale><Proportion>LIB</Proportion>
  <Data><Entry><Value></Value><RawString></RawString></Entry></Data>
</Result></PhoronixTestSuite>`;
		const result = parsePtsComposite(xml).PhoronixTestSuite.Result[0];
		expect(result && resultSamples(result)).toEqual([]);
	});

	it("returns no samples for an entry-less result (nothing to aggregate)", () => {
		// The schema permits Data.Entry: [] (`.array()`); resultSamples reports it honestly as []
		// rather than fabricating a value, so the extractor can skip the measurement-less result.
		const entryless = { Data: { Entry: [] } } as unknown as Parameters<typeof resultSamples>[0];
		expect(resultSamples(entryless)).toEqual([]);
	});
});

describe("ptsResultToMetric", () => {
	it("maps node-web-tooling onto its catalogued Metric", () => {
		const result = parsePtsComposite(realFixture).PhoronixTestSuite.Result[0];
		const mapped = result && ptsResultToMetric(result);
		expect(mapped?.kind).toBe("matched");
		if (mapped?.kind !== "matched") throw new Error("expected a matched mapping");
		expect(mapped.def.id).toBe("node_web_tooling_runs_per_s");
		expect(mapped.samples).toEqual([16.19, 16.3, 16.08]);
	});

	it("returns an uncatalogued mapping for a result with no catalogued Metric", () => {
		const unknown = parsePtsComposite(multiResultXml).PhoronixTestSuite.Result[1];
		expect(unknown && ptsResultToMetric(unknown)).toEqual({
			kind: "uncatalogued",
			test: "pts/not-in-catalog",
			description: "",
			scale: "Seconds",
		});
	});

	it("routes a scale-pinned description by <Scale>, and strands an unknown scale", () => {
		// fio's twin results share one description and differ only in <Scale> — the catalog pins each
		// twin with pts.scale. An unknown scale (a parser/profile drift) must fall to uncatalogued, not
		// to the nearest twin.
		const description =
			"Type: Random Read - Engine: Linux AIO - Direct: Yes - Block Size: 4KB - Job Count: 1 - Disk Target: Default Test Directory";
		const fioResult = (scale: string) =>
			parsePtsComposite(`<?xml version="1.0"?>
<PhoronixTestSuite>
  <Generated><TestClient>phoronix-test-suite/10.8.4</TestClient></Generated>
  <Result>
    <Identifier>pts/fio-2.1.0</Identifier>
    <Title>Flexible IO Tester</Title>
    <Description>${description}</Description>
    <Scale>${scale}</Scale>
    <Proportion>HIB</Proportion>
    <Data><Entry><Value>91400</Value></Entry></Data>
  </Result>
</PhoronixTestSuite>`).PhoronixTestSuite.Result[0];

		const routedId = (scale: string): string => {
			const result = fioResult(scale);
			const mapped = result && ptsResultToMetric(result);
			if (mapped?.kind !== "matched") throw new Error(`expected <Scale>${scale}</Scale> to match`);
			return mapped.def.id;
		};

		// BOTH twins must land on their OWN entry. Asserting only the IOPS arm leaves the symmetric
		// half — the one a twin SWAP actually breaks — unproven against the real catalog.
		expect(routedId("IOPS")).toBe(
			"fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops",
		);
		expect(routedId("MB/s")).toBe(
			"fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s",
		);

		const unknownScale = fioResult("GB/s");
		expect(unknownScale && ptsResultToMetric(unknownScale)).toEqual({
			kind: "uncatalogued",
			test: "pts/fio",
			description,
			scale: "GB/s",
		});
	});
});

// The scale-pinned arm has no coverage through the real catalog: no METRIC_CATALOG entry carries a
// `pts.scale` pin until fio is vendored two branches up, so the precedence order and — critically —
// the BUILD/LOOKUP key-shape agreement would ship unexecuted. `buildPtsIndex` is the same seam
// `catalogSchema` already offers: drive it with a crafted catalog rather than waiting for the pins.
describe("buildPtsIndex scale-pinned routing", () => {
	const base = {
		dimension: "disk",
		direction: "HIB",
		headline: false,
		label: "l",
		description: "d",
	} as const;
	const catalog: MetricDef[] = [
		{
			...base,
			id: "twin_mb_per_s",
			unit: "MB/s",
			pts: { test: "pts/fio", description: "4K", scale: "MB/s" },
		},
		{
			...base,
			id: "twin_iops",
			unit: "IOPS",
			pts: { test: "pts/fio", description: "4K", scale: "IOPS" },
		},
		{ ...base, id: "described", unit: "s", pts: { test: "pts/other", description: "Only" } },
		{ ...base, id: "wild", unit: "s", pts: { test: "pts/wild" } },
	];
	const match = buildPtsIndex(catalog);
	const result = (identifier: string, description: string, scale: string): PtsResult =>
		({
			Identifier: identifier,
			Description: description,
			Scale: scale,
			Data: { Entry: [{ Value: 1 }] },
		}) as PtsResult;

	it("routes each scale twin to ITS OWN entry (a swap is what this catches)", () => {
		const mb = match(result("pts/fio-2.1.0", "4K", "MB/s"));
		const iops = match(result("pts/fio-2.1.0", "4K", "IOPS"));
		if (mb.kind !== "matched" || iops.kind !== "matched") throw new Error("expected matches");
		expect(mb.def.id).toBe("twin_mb_per_s");
		expect(iops.def.id).toBe("twin_iops");
	});

	it("falls to uncatalogued (never the nearest twin) when <Scale> matches no pin", () => {
		expect(match(result("pts/fio-2.1.0", "4K", "GB/s"))).toEqual({
			kind: "uncatalogued",
			test: "pts/fio",
			description: "4K",
			scale: "GB/s",
		});
	});

	it("still matches an unpinned description, and the wildcard, on any scale", () => {
		const described = match(result("pts/other-1.0.0", "Only", "anything"));
		const wild = match(result("pts/wild-1.0.0", "whatever", "anything"));
		if (described.kind !== "matched" || wild.kind !== "matched")
			throw new Error("expected matches");
		expect(described.def.id).toBe("described");
		expect(wild.def.id).toBe("wild");
	});

	it("throws at build on a key collision (the catalogSchema invariants regressed)", () => {
		expect(() => buildPtsIndex([catalog[0] as MetricDef, catalog[0] as MetricDef])).toThrow(
			/collide on PTS match key/,
		);
	});
});

describe("versionlessTest", () => {
	it("strips the trailing version", () => {
		expect(versionlessTest("pts/node-web-tooling-1.0.1")).toBe("pts/node-web-tooling");
		expect(versionlessTest("pts/git-1.1.0")).toBe("pts/git");
	});
});
