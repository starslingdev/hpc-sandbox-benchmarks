import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import { evidenceDigest } from "@sandbox-benchmarks/results";
import type { ExperimentAttempt } from "@sandbox-benchmarks/schema";
import type { AccountRecord } from "./account-journal.ts";
import {
	AMBIGUOUS_CREATE_INVENTORY_CLEARANCES,
	recoverAmbiguousCreateInventory,
	verifyAmbiguousCreateInventory,
} from "./ambiguous-create-inventory-recovery.ts";
import { rawTreeDigest } from "./experiment-artifacts.ts";

const OTHER_SHA = "b".repeat(40);
const directories: string[] = [];
afterEach(() => {
	for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const reviewedRuncloud = AMBIGUOUS_CREATE_INVENTORY_CLEARANCES[0];
const reviewedFreestyle = AMBIGUOUS_CREATE_INVENTORY_CLEARANCES[2];

type FixtureProvider = "runcloud" | "freestyle" | "tama";
type FixtureRefList = { provider: FixtureProvider; id: string }[];

function fixture(kind: "runcloud" | "freestyle" | "other" = "runcloud") {
	const reviewed = kind === "freestyle" ? reviewedFreestyle : reviewedRuncloud;
	const provider: FixtureProvider = kind === "other" ? "tama" : reviewed.provider;
	const suite = kind === "other" ? "memory" : reviewed.suite;
	const directory = mkdtempSync(join(tmpdir(), "ambiguous-create-"));
	directories.push(directory);
	const raw = join(directory, "raw");
	mkdirSync(join(raw, provider, suite), { recursive: true });
	const marker = join(raw, provider, suite, `sandbox-${provider}-${suite}--failed.json`);
	const detail =
		kind === "other"
			? "computesdk create failed: something else; cleanup failed: leftover"
			: reviewed.detail;
	writeFileSync(
		marker,
		JSON.stringify({
			provider,
			suite,
			outcome: "failed",
			reason: `Failed to create sandbox: ${detail}`,
			cause: { kind: "sandbox-create-failed", detail },
		}),
	);
	const source = kind === "other" ? OTHER_SHA : reviewed.sourceSha;
	const workflowRun = kind === "other" ? "1" : reviewed.workflowRun;
	const run = {
		schemaVersion: "6",
		runId: workflowRun,
		sha: source,
		generatedAt: "2026-11-15T00:00:00Z",
		targetSpec: { vcpus: 4, memoryGb: 8 },
		providers: [],
	};
	writeFileSync(join(directory, "run.json"), JSON.stringify(run));
	const evidence: ExperimentAttempt = {
		schemaVersion: "1",
		id:
			kind === "other"
				? "tama-memory-r0-a1-00000000-0000-0000-0000-000000000000"
				: reviewed.attemptId,
		cellId: kind === "other" ? "tama-memory-r0" : reviewed.cellId,
		planDigest: `sha256:${"a".repeat(64)}`,
		sha: source,
		workloadRevision: suite,
		environmentRevision: "env",
		artifactIdentity: "image",
		passes: 1,
		workflowRun,
		workflowAttempt: 1,
		job: "bench",
		sequence: 0,
		outcome: "failed",
		measurementStarted: false,
		retryable: false,
		cleanup: "unresolved",
		completion: "unknown",
		runDigest: evidenceDigest(run),
		rawDigest: rawTreeDigest(raw),
		diagnostic: `Suite "${suite}" failed on ${provider} — recorded as a failed gap in run.json: ${detail}`,
	};
	const save = () => writeFileSync(join(directory, "attempt.json"), JSON.stringify(evidence));
	save();
	const records: AccountRecord[] = [
		{
			version: "1",
			kind: "intent",
			account: provider,
			attempt: evidence.id,
			cellId: evidence.cellId,
			planDigest: evidence.planDigest,
		},
	];
	const events: string[] = [];
	let owned: FixtureRefList = [];
	const driver: SandboxDriver = {
		create: async () => {
			throw new Error("must not allocate");
		},
		inventory: {
			list: async () => {
				events.push("inventory");
				return { owned, foreignCount: 0 };
			},
		},
		probes: { observe: async () => ({ state: "absent" }) },
		destroyById: async () => {
			owned = [];
		},
	};
	const journal = {
		read: async () => records,
		append: async (record: AccountRecord) => {
			events.push("release");
			records.push(record);
		},
	};
	const options = {
		directory,
		provider,
		suite,
		drivers: [{ id: provider, driver }],
		journal,
		assertQuiescent: async () => {
			events.push("quiescent");
		},
		signal: AbortSignal.timeout(1000),
	};
	return {
		options,
		records,
		events,
		evidence,
		save,
		marker,
		hold: (refs: FixtureRefList) => {
			owned = refs;
		},
	};
}

test("the reviewed Runcloud settle timeout releases after two empty inventories", async () => {
	const f = fixture("runcloud");
	const original = readFileSync(join(f.options.directory, "attempt.json"), "utf8");
	expect(await recoverAmbiguousCreateInventory(f.options)).toBe(reviewedRuncloud.attemptId);
	expect(f.events).toEqual(["quiescent", "inventory", "quiescent", "inventory", "release"]);
	expect(f.records.at(-1)).toMatchObject({
		kind: "released",
		outcome: "not-allocated",
		account: "runcloud",
		attempt: reviewedRuncloud.attemptId,
		cellId: reviewedRuncloud.cellId,
	});
	expect(readFileSync(join(f.options.directory, "attempt.json"), "utf8")).toBe(original);
});

test("the reviewed Freestyle 502 case releases after two empty inventories", async () => {
	const f = fixture("freestyle");
	expect(await recoverAmbiguousCreateInventory(f.options)).toBe(reviewedFreestyle.attemptId);
	expect(f.records.at(-1)).toMatchObject({
		kind: "released",
		outcome: "not-allocated",
		account: "freestyle",
		attempt: reviewedFreestyle.attemptId,
	});
});

test("refuses while the account still holds a benchmark sandbox", async () => {
	const f = fixture("runcloud");
	f.hold([{ provider: "runcloud", id: "sb-leftover" }]);
	await expect(recoverAmbiguousCreateInventory(f.options)).rejects.toThrow("still holds 1");
	expect(f.records).toHaveLength(1);
});

test("defers to identity-based recovery when the attempt retained an allocation", async () => {
	const f = fixture("runcloud");
	writeFileSync(
		join(f.options.directory, "raw", "allocation.json"),
		JSON.stringify({
			version: "1",
			kind: "allocated",
			account: "runcloud",
			attempt: f.evidence.id,
			cellId: f.evidence.cellId,
			planDigest: f.evidence.planDigest,
			ref: { provider: "runcloud", id: "sb-retained" },
		}),
	);
	f.evidence.rawDigest = rawTreeDigest(join(f.options.directory, "raw"));
	f.save();
	expect(() =>
		verifyAmbiguousCreateInventory({
			directory: f.options.directory,
			provider: "runcloud",
			suite: "cpu-node",
		}),
	).toThrow("recover with recover-allocated-intent");
});

test("unreviewed create failures cannot authorize an inventory-based release", async () => {
	const f = fixture("other");
	await expect(recoverAmbiguousCreateInventory(f.options)).rejects.toThrow(
		"not a reviewed name-free ambiguous create",
	);
	expect(f.events).toEqual([]);
	expect(f.records).toHaveLength(1);
});

for (const change of ["attempt", "detail", "source", "released"] as const) {
	test(`the reviewed exception does not stretch to a changed ${change}`, async () => {
		const f = fixture("runcloud");
		if (change === "attempt") {
			f.evidence.id = "runcloud-cpu-node-r1-a1-00000000-0000-0000-0000-000000000000";
			f.save();
		}
		if (change === "source") {
			f.evidence.sha = OTHER_SHA;
			f.save();
		}
		if (change === "detail") {
			const marker = JSON.parse(readFileSync(f.marker, "utf8"));
			marker.cause.detail = "computesdk create failed: gateway timeout";
			marker.reason = `Failed to create sandbox: ${marker.cause.detail}`;
			writeFileSync(f.marker, JSON.stringify(marker));
			f.evidence.rawDigest = rawTreeDigest(join(f.options.directory, "raw"));
			f.evidence.diagnostic = `${f.evidence.diagnostic} changed`;
			f.save();
		}
		if (change === "released")
			f.records.push({
				version: "1",
				kind: "released",
				outcome: "not-allocated",
				account: "runcloud",
				attempt: f.evidence.id,
				cellId: f.evidence.cellId,
				planDigest: f.evidence.planDigest,
			});
		await expect(recoverAmbiguousCreateInventory(f.options)).rejects.toThrow();
		expect(f.records.filter((record) => record.kind === "released")).toHaveLength(
			change === "released" ? 1 : 0,
		);
		if (change !== "released") expect(f.events).not.toContain("release");
	});
}
