import { afterAll, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aggregate, parseRun } from "@sandbox-benchmarks/schema";
import { readPtsTrialEvidence } from "./pts-trial-evidence.ts";

const root = fs.mkdtempSync(join(tmpdir(), "pts-evidence-path-"));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
const rawRoot = join(root, "raw");
const outside = join(root, "outside");
const xml = `<PhoronixTestSuite><Result>
<Identifier>pts/node-web-tooling-1.0.1</Identifier><Title>Node</Title><Scale>runs/s</Scale><Proportion>HIB</Proportion>
<Data><Entry><Value>1.5</Value><RawString>1:2</RawString></Entry></Data>
</Result></PhoronixTestSuite>`;
fs.mkdirSync(rawRoot);
fs.mkdirSync(outside);
fs.writeFileSync(join(outside, "pts_probe.xml"), xml);

function run(providerId: string) {
	return parseRun({
		schemaVersion: "2",
		runId: "probe",
		sha: "abc",
		generatedAt: "2026-09-13T00:00:00Z",
		targetSpec: { vcpus: 4, memoryGb: 8 },
		providers: [
			{
				providerId,
				validationStatus: "validated",
				observedSpecs: {},
				suitesCovered: [],
				gaps: [],
				uncatalogued: [],
				metrics: [
					{
						metricId: "node_web_tooling_runs_per_s",
						samples: [1, 2],
						aggregates: aggregate([1, 2]),
						sourceFile: "pts_probe.xml",
					},
				],
			},
		],
	});
}

test("a provider identifier cannot move evidence reads outside the verified raw root", () => {
	const read = spyOn(fs, "readFileSync");
	try {
		for (const providerId of ["../outside", outside]) {
			expect(readPtsTrialEvidence(rawRoot, run(providerId))).toEqual([
				{
					providerId,
					metricId: "node_web_tooling_runs_per_s",
					source: "unverified",
				},
			]);
		}
		expect(read).not.toHaveBeenCalled();
	} finally {
		read.mockRestore();
	}
});

test("a safe historical provider directory can still prove original raw trials", () => {
	const providerId = "historical-provider";
	fs.mkdirSync(join(rawRoot, providerId));
	fs.writeFileSync(join(rawRoot, providerId, "pts_probe.xml"), xml);
	expect(readPtsTrialEvidence(rawRoot, run(providerId))).toEqual([
		{
			providerId,
			metricId: "node_web_tooling_runs_per_s",
			source: "raw-string",
			observed: 2,
		},
	]);
});

test("the original PTS timing metadata can prove a single Value trial when RawString is omitted", () => {
	const providerId = "single-value";
	fs.mkdirSync(join(rawRoot, providerId));
	fs.writeFileSync(
		join(rawRoot, providerId, "pts_probe.xml"),
		xml.replace(
			"<RawString>1:2</RawString>",
			'<RawString></RawString><JSON>{"test-run-times":"4.89"}</JSON>',
		),
	);
	const measured = run(providerId);
	const metric = measured.providers[0]?.metrics[0];
	if (!metric) throw new Error("missing fixture metric");
	metric.samples = [1.5];
	metric.aggregates = aggregate(metric.samples);
	// Storage provenance stays truthful: this sample came from Value, with its count proved separately.
	metric.ptsSampleSource = "aggregate-value";
	expect(readPtsTrialEvidence(rawRoot, measured)).toEqual([
		{ providerId, metricId: metric.metricId, source: "single-trial-value", observed: 1 },
	]);
	fs.writeFileSync(
		join(rawRoot, providerId, "pts_probe.xml"),
		xml.replace(
			"<RawString>1:2</RawString>",
			'<RawString></RawString><JSON>{"test-run-times":"0"}</JSON>',
		),
	);
	expect(readPtsTrialEvidence(rawRoot, measured)[0]).toMatchObject({
		source: "single-trial-value",
		observed: 1,
	});
	metric.ptsSampleSource = "raw-string";
	expect(readPtsTrialEvidence(rawRoot, measured)[0]?.source).toBe("unverified");
});

test("Value without exactly one successful execution's metadata cannot prove its trial count", () => {
	const providerId = "unproved-value";
	fs.mkdirSync(join(rawRoot, providerId));
	const measured = run(providerId);
	const metric = measured.providers[0]?.metrics[0];
	if (!metric) throw new Error("missing fixture metric");
	metric.samples = [1.5];
	metric.aggregates = aggregate(metric.samples);
	for (const metadata of [
		"",
		"not json",
		"null",
		"[]",
		"{}",
		'{"test-run-times":""}',
		'{"test-run-times":"1:2"}',
		'{"test-run-times":"1:"}',
		'{"test-run-times":"Infinity"}',
		'{"test-run-times":"-1"}',
		'{"test-run-times":1}',
		'{"test-run-times":"4.89","error":"The test quit with a non-zero exit status."}',
	]) {
		fs.writeFileSync(
			join(rawRoot, providerId, "pts_probe.xml"),
			xml.replace("<RawString>1:2</RawString>", `<RawString></RawString><JSON>${metadata}</JSON>`),
		);
		expect(readPtsTrialEvidence(rawRoot, measured)[0]).toEqual({
			providerId,
			metricId: metric.metricId,
			source: "aggregate-value",
		});
	}
});
