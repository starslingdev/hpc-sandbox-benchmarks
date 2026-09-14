import { afterAll, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import { evidenceDigest } from "@sandbox-benchmarks/results";
import { MODAL_CREATED_REQUEST_REVISION, parseRun } from "@sandbox-benchmarks/schema";
import type { AccountRecord } from "./account-journal.ts";
import { recoverAccount } from "./account-journal.ts";
import { recoverExperimentCleanup } from "./cleanup-recovery.ts";
import {
	rawTreeDigest,
	readExperimentAttempt,
	readExperimentAttempts,
} from "./experiment-artifacts.ts";
import { downloadExperimentAttempts } from "./experiment-transfer.ts";
import { workflowExperiment } from "./workflow-experiment.ts";

const root = mkdtempSync(join(tmpdir(), "cleanup-recovery-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
function fixture(name: string, allocated = true) {
	const directory = join(root, name);
	const raw = join(directory, "raw");
	mkdirSync(raw, { recursive: true });
	const plan = workflowExperiment(
		{
			GITHUB_RUN_ID: "123",
			GITHUB_SHA: MODAL_CREATED_REQUEST_REVISION,
			BENCH_PROVIDERS: "modal-gvisor",
			BENCH_SUITES: "realworld-better-auth",
			BENCH_REPLICAS: "1",
		},
		"2026-09-14",
	);
	const cell = plan.cells[0];
	if (!cell) throw new Error("missing fixture cell");
	const intent: AccountRecord = {
		version: "1",
		kind: "intent",
		account: "modal",
		attempt: cell.id,
		cellId: cell.id,
		planDigest: plan.digest,
	};
	const ref = { provider: "modal-gvisor", id: "sb-original" } as const;
	const records: AccountRecord[] = [intent];
	if (allocated) {
		const allocation: AccountRecord = { ...intent, kind: "allocated", ref };
		records.push(allocation);
		writeFileSync(join(raw, "allocation.json"), JSON.stringify(allocation));
		writeFileSync(
			join(raw, "execution-original.json"),
			JSON.stringify({
				schemaVersion: "1",
				executionId: "original",
				runId: plan.id,
				provider: ref.provider,
				suite: cell.suite,
				sandboxId: ref.id,
				primaryFailure: "failed",
				steps: [],
				detached: [],
			}),
		);
	} else writeFileSync(join(raw, "diagnostic.json"), JSON.stringify({ failed: true }));
	const run = parseRun({
		schemaVersion: "6",
		runId: plan.id,
		sha: plan.sha,
		generatedAt: "2026-09-14T00:00:00Z",
		targetSpec: cell.target,
		providers: [],
	});
	writeFileSync(join(directory, "run.json"), JSON.stringify(run));
	writeFileSync(
		join(directory, "attempt.json"),
		JSON.stringify({
			schemaVersion: "1",
			id: cell.id,
			cellId: cell.id,
			planDigest: plan.digest,
			sha: plan.sha,
			workloadRevision: cell.workloadRevision,
			environmentRevision: cell.environmentRevision,
			artifactIdentity: cell.artifactIdentity,
			passes: cell.passes,
			workflowRun: plan.id,
			workflowAttempt: 1,
			job: "test",
			sequence: 0,
			outcome: "failed",
			measurementStarted: allocated,
			retryable: false,
			cleanup: "unresolved",
			completion: "unknown",
			runDigest: evidenceDigest(run),
			rawDigest: rawTreeDigest(raw),
			diagnostic:
				"modal-gvisor ComputeSDK created-request preparation and verification callback failed; cleanup failed: modal-gvisor ComputeSDK lifecycle destroy callback failed",
		}),
	);
	let running = true;
	let destroys = 0;
	const driver = {
		destroyById: async () => {
			running = false;
			destroys++;
		},
		probes: { observe: async () => ({ state: running ? "running" : "terminal" }) },
	} as unknown as SandboxDriver;
	const journal = {
		read: async () => records,
		append: async (record: AccountRecord) => {
			records.push(record);
		},
	};
	return {
		directory,
		plan,
		records,
		driver,
		destroys: () => destroys,
		options: {
			plan,
			directory,
			operator: "test",
			journal,
			openDriver: async () => driver,
			modalAnchor: ref.id,
			observeModalApp: async () => ({
				kind: "modal-app" as const,
				appName: "sandbox-benchmarks" as const,
				appId: "ap-original",
				anchorSandboxId: ref.id,
				environment: "main",
				v1Running: 0 as const,
				v2Running: 0 as const,
				inventoryPasses: 2 as const,
			}),
			assertQuiescent: async () => {},
			signal: AbortSignal.timeout(5000),
		},
	};
}

test("confirmed cleanup appends once, preserves the original attempt and survives fresh artifact collection", async () => {
	const f = fixture("known");
	const original = readFileSync(join(f.directory, "attempt.json"), "utf8");
	const recovery = await recoverExperimentCleanup(f.options);
	expect(f.destroys()).toBe(1);
	expect(f.records.at(-1)).toMatchObject({ kind: "released", outcome: "absent", recovery });
	expect(await recoverExperimentCleanup(f.options)).toEqual(recovery);
	expect(f.records).toHaveLength(3);
	expect(f.destroys()).toBe(1);
	expect(readFileSync(join(f.directory, "attempt.json"), "utf8")).toBe(original);
	const fresh = join(root, "collected");
	await downloadExperimentAttempts(
		{
			list: async () => [
				{
					id: 1,
					name: `experiment-attempt-123-${recovery.attemptId}`,
					expired: false,
					workflow_run: { id: 123 },
				},
			],
			upload: async () => {},
			download: async (_artifact, destination) => {
				cpSync(f.directory, destination, { recursive: true });
				rmSync(join(destination, "cleanup-recovery.json"));
			},
		},
		f.options.journal,
		f.plan,
		fresh,
	);
	expect(readExperimentAttempts(fresh)[0]?.cleanupRecovery).toEqual(recovery);
	await recoverAccount(
		"modal",
		new Map([["modal-gvisor", f.driver]]),
		f.options.journal,
		f.options.signal,
	);
	expect(f.destroys()).toBe(1);
});

test("identifier-free clearance records the reviewed App observation without inventing an allocation", async () => {
	const f = fixture("unknown", false);
	const recovery = await recoverExperimentCleanup(f.options);
	expect(recovery.observation.kind).toBe("modal-app");
	expect(f.records).toHaveLength(2);
	expect(f.records.at(-1)).toMatchObject({
		kind: "released",
		outcome: "reconciled",
		evidence: recovery,
	});
	expect(readExperimentAttempt(f.directory).evidence.cleanup).toBe("unresolved");
	expect(f.destroys()).toBe(0);
});

test("uncertain observations, live writers and changed journals never append a clearance", async () => {
	for (const reason of ["observation", "writers", "journal"]) {
		const f = fixture(reason, false);
		if (reason === "observation")
			f.options.observeModalApp = async () => {
				throw new Error("inventory unavailable");
			};
		if (reason === "writers")
			f.options.assertQuiescent = async () => {
				throw new Error("workflow running");
			};
		if (reason === "journal")
			f.options.assertQuiescent = async () => {
				f.records.push({ ...f.records[0], kind: "intent" } as AccountRecord);
			};
		await expect(recoverExperimentCleanup(f.options)).rejects.toThrow();
		expect(f.records.some((r) => r.kind === "released")).toBe(false);
	}
});

test("a different revision cannot use the identifier-free exception", async () => {
	const f = fixture("wrong-source", false);
	const path = join(f.directory, "attempt.json");
	writeFileSync(
		path,
		JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), sha: "b".repeat(40) }),
	);
	await expect(recoverExperimentCleanup(f.options)).rejects.toThrow("original failed attempt");
	expect(f.records).toHaveLength(1);
});
