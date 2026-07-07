import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePtsComposite, ptsResultToMetric, resultSamples, versionlessTest } from "./pts.ts";

const realFixture = readFileSync(
	join(import.meta.dir, "__fixtures__/daytona/pts_node-web-tooling.xml"),
	"utf8",
);

// A two-result composite (as a batch run produces): proves Result stays an array, and exercises an
// uncatalogued result (pts/git is not in this slice's Catalog) alongside the catalogued one.
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
    <Identifier>pts/git-1.1.0</Identifier>
    <Title>Git</Title>
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
		const git = parsePtsComposite(multiResultXml).PhoronixTestSuite.Result[1];
		expect(git && resultSamples(git)).toEqual([4.2]);
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
		const git = parsePtsComposite(multiResultXml).PhoronixTestSuite.Result[1];
		expect(git && ptsResultToMetric(git)).toEqual({
			kind: "uncatalogued",
			test: "pts/git",
			description: "",
		});
	});
});

describe("versionlessTest", () => {
	it("strips the trailing version", () => {
		expect(versionlessTest("pts/node-web-tooling-1.0.1")).toBe("pts/node-web-tooling");
		expect(versionlessTest("pts/git-1.1.0")).toBe("pts/git");
	});
});
