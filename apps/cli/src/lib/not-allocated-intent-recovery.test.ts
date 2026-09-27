import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CREATE_FAILURE_PREFIX } from "@sandbox-benchmarks/harness";
import type { ExperimentAttempt } from "@sandbox-benchmarks/schema";
import { harnessGapMarkerJson } from "@sandbox-benchmarks/schema";
import type { AccountRecord } from "./account-journal.ts";
import { recoverAccount } from "./account-journal.ts";
import { rawTreeDigest } from "./experiment-artifacts.ts";
import { recoverNotAllocatedIntent } from "./not-allocated-intent-recovery.ts";
import {
	admissionStoppedDetail,
	isPreCreateStopDetail,
	STARTUP_DEADLINE_BEFORE_CREATE,
} from "./pre-create-stop.ts";

const directories: string[] = [];
afterEach(() => {
	for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const PLAN_DIGEST = `sha256:${"a".repeat(64)}`;
const SHA = "c".repeat(40);
const ATTEMPT = "modal-gvisor-disk-r2-a1-480e005e-b705-465e-919f-99e1e500f77a";
const ADMISSION_STOP = admissionStoppedDetail("modal", "modal-gvisor-pgbench-r1");

function fixture(
	overrides: {
		detail?: string;
		diagnostic?: string | false;
		cleanup?: ExperimentAttempt["cleanup"];
		measurementStarted?: boolean;
		outcome?: ExperimentAttempt["outcome"];
		allocation?: boolean;
		markers?: "one" | "none" | "two";
		reason?: string;
		cellId?: string;
		execution?: boolean;
		released?: boolean;
		allocatedRecord?: boolean;
	} = {},
) {
	const directory = mkdtempSync(join(tmpdir(), "not-allocated-intent-"));
	directories.push(directory);
	const provider = "modal-gvisor" as const;
	const suite = "disk" as const;
	const detail = overrides.detail ?? ADMISSION_STOP;
	const diagnostic =
		overrides.diagnostic === false
			? undefined
			: (overrides.diagnostic ??
				`Suite "disk" failed on modal-gvisor — recorded as a failed gap in run.json: ${detail}`);
	const raw = join(directory, "raw");
	const markerDir = join(raw, provider, suite);
	mkdirSync(markerDir, { recursive: true });
	writeFileSync(
		join(raw, "attempt-diagnostic.json"),
		JSON.stringify({ diagnostic: diagnostic ?? null }),
	);
	const reason = overrides.reason ?? `${CREATE_FAILURE_PREFIX}${detail}`;
	const markerBody = () =>
		harnessGapMarkerJson(provider, suite, "failed", reason, {
			kind: "sandbox-create-failed",
			detail,
		});
	if (overrides.markers !== "none")
		writeFileSync(join(markerDir, `sandbox-${provider}-${suite}--failed.json`), markerBody());
	if (overrides.markers === "two")
		writeFileSync(join(markerDir, `sandbox-${provider}-memory--failed.json`), markerBody());
	const intent: AccountRecord = {
		version: "1",
		kind: "intent",
		account: "modal",
		attempt: ATTEMPT,
		cellId: overrides.cellId ?? "modal-gvisor-disk-r2",
		planDigest: PLAN_DIGEST,
	};
	if (overrides.allocation)
		writeFileSync(
			join(raw, "allocation.json"),
			JSON.stringify({
				...intent,
				kind: "allocated",
				ref: { provider, id: "sb-retained" },
			}),
		);
	if (overrides.execution)
		writeFileSync(
			join(raw, "execution-1.json"),
			JSON.stringify({
				schemaVersion: "1",
				executionId: "execution-1",
				runId: "36265300223",
				provider,
				suite,
				sandboxId: "sb-started",
				steps: [],
				detached: [],
				primaryFailure: null,
			}),
		);
	const evidence: ExperimentAttempt = {
		schemaVersion: "1",
		id: ATTEMPT,
		cellId: intent.cellId,
		planDigest: PLAN_DIGEST,
		sha: SHA,
		workloadRevision: "disk",
		environmentRevision: "env",
		artifactIdentity: "image",
		passes: 2,
		workflowRun: "36265300223",
		workflowAttempt: 1,
		job: "bench",
		sequence: 0,
		outcome: overrides.outcome ?? "failed",
		measurementStarted: overrides.measurementStarted ?? false,
		retryable: false,
		cleanup: overrides.cleanup ?? "not-allocated",
		completion: "unknown",
		rawDigest: rawTreeDigest(raw),
		...(diagnostic ? { diagnostic } : {}),
	};
	writeFileSync(join(directory, "attempt.json"), JSON.stringify(evidence));
	const records: AccountRecord[] = [intent];
	if (overrides.allocatedRecord)
		records.push({ ...intent, kind: "allocated", ref: { provider, id: "sb-retained" } });
	if (overrides.released) records.push({ ...intent, kind: "released", outcome: "not-allocated" });
	const events: string[] = [];
	const reads: string[] = [];
	return {
		directory,
		records,
		events,
		reads,
		attemptJson: readFileSync(join(directory, "attempt.json"), "utf8"),
		options: {
			directory,
			journal: {
				async read(account: string) {
					reads.push(account);
					events.push("read");
					return records;
				},
				async append(record: AccountRecord) {
					events.push("append");
					records.push(record);
				},
			},
			assertQuiescent: async () => {
				events.push("quiescent");
			},
			signal: AbortSignal.timeout(5000),
		},
	};
}

test("pre-create stop details are a closed set", () => {
	expect(isPreCreateStopDetail(ADMISSION_STOP)).toBe(true);
	expect(isPreCreateStopDetail(STARTUP_DEADLINE_BEFORE_CREATE)).toBe(true);
	expect(isPreCreateStopDetail("account journal POST HTTP 500; allocation blocked")).toBe(false);
	expect(isPreCreateStopDetail("account modal admission stopped after cell: other")).toBe(false);
	expect(isPreCreateStopDetail("vendor refused allocation")).toBe(false);
});

for (const detail of [ADMISSION_STOP, STARTUP_DEADLINE_BEFORE_CREATE]) {
	test(`appends released not-allocated when create stopped before the vendor (${detail === ADMISSION_STOP ? "admission" : "deadline"})`, async () => {
		const f = fixture({ detail });
		expect(await recoverNotAllocatedIntent(f.options)).toBe(ATTEMPT);
		expect(f.reads).toEqual(["modal", "modal"]);
		expect(f.events.filter((event) => event === "quiescent")).toHaveLength(2);
		expect(f.records.at(-1)).toEqual({
			version: "1",
			kind: "released",
			account: "modal",
			attempt: ATTEMPT,
			cellId: "modal-gvisor-disk-r2",
			planDigest: PLAN_DIGEST,
			outcome: "not-allocated",
		});
		expect(readFileSync(join(f.directory, "attempt.json"), "utf8")).toBe(f.attemptJson);
		await recoverAccount("modal", new Map(), f.options.journal, AbortSignal.timeout(1000));
		expect(f.records.filter((record) => record.kind === "released")).toHaveLength(1);
	});
}

test("refuses a vendor create-failure marker without reading the journal", async () => {
	const f = fixture({ detail: "vendor refused allocation" });
	await expect(recoverNotAllocatedIntent(f.options)).rejects.toThrow(
		/does not prove create never started/,
	);
	expect(f.events).toEqual([]);
	expect(f.records).toHaveLength(1);
});

test("refuses a retained allocation and points at identity recovery", async () => {
	const f = fixture({ allocation: true });
	await expect(recoverNotAllocatedIntent(f.options)).rejects.toThrow(/recover-allocated-intent/);
	expect(f.events).toEqual([]);
});

for (const change of [
	"measured",
	"confirmed",
	"unresolved",
	"receipt",
	"unmarked",
	"diagnostic",
] as const) {
	test(`refuses a ${change} attempt`, async () => {
		const f = fixture({
			...(change === "measured" ? { measurementStarted: true } : {}),
			...(change === "confirmed" ? { cleanup: "confirmed" } : {}),
			...(change === "unresolved" ? { cleanup: "unresolved" } : {}),
			...(change === "receipt" ? { execution: true } : {}),
			...(change === "unmarked" ? { markers: "none" } : {}),
			...(change === "diagnostic" ? { diagnostic: false } : {}),
		});
		await expect(recoverNotAllocatedIntent(f.options)).rejects.toThrow(
			/does not prove create never started/,
		);
		expect(f.events).toEqual([]);
	});
}

test("refuses a marker whose reason does not carry the pre-create detail", async () => {
	const f = fixture({ reason: `${CREATE_FAILURE_PREFIX}vendor refused allocation` });
	await expect(recoverNotAllocatedIntent(f.options)).rejects.toThrow(/ambiguous or vendor create/);
	expect(f.events).toEqual([]);
});

test("refuses two create-failure markers", async () => {
	const f = fixture({ markers: "two" });
	await expect(recoverNotAllocatedIntent(f.options)).rejects.toThrow(/ambiguous or vendor create/);
	expect(f.events).toEqual([]);
});

test("refuses a marker for a different cell", async () => {
	const f = fixture({ cellId: "modal-gvisor-memory-r2" });
	await expect(recoverNotAllocatedIntent(f.options)).rejects.toThrow(
		"recovery marker identity mismatch",
	);
	expect(f.events).toEqual([]);
});

test("does not release ownership when quiescence fails", async () => {
	const f = fixture();
	await expect(
		recoverNotAllocatedIntent({
			...f.options,
			assertQuiescent: async () => {
				throw new Error("repository has in_progress workflows; stop writers before recovery");
			},
		}),
	).rejects.toThrow("stop writers before recovery");
	expect(f.records).toHaveLength(1);
	expect(f.events).not.toContain("append");
});

test("refuses when the journal already released the intent", async () => {
	const f = fixture({ released: true });
	await expect(recoverNotAllocatedIntent(f.options)).rejects.toThrow(
		"recovery requires a matching unresolved intent without a release",
	);
	expect(f.events).not.toContain("append");
});

test("refuses when the journal already recorded an allocation", async () => {
	const f = fixture({ allocatedRecord: true });
	await expect(recoverNotAllocatedIntent(f.options)).rejects.toThrow(/recover-allocated-intent/);
	expect(f.events).not.toContain("append");
});
