import { afterAll, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import {
	evidenceDigest,
	runcloudAmbiguousCreateName,
	verifyCleanupRecovery,
} from "@sandbox-benchmarks/results";
import {
	MODAL_CREATED_REQUEST_REVISION,
	parseRun,
	RUNCLOUD_AMBIGUOUS_CREATE_REVISION,
} from "@sandbox-benchmarks/schema";
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
const sandboxName = "sandbox-benchmarks-efda2427-1008-4157-91d0-2a06215216e9";
function fixture(name: string, allocated = true, runcloud = false) {
	const directory = join(root, name);
	const raw = join(directory, "raw");
	mkdirSync(raw, { recursive: true });
	const plan = workflowExperiment(
		{
			GITHUB_RUN_ID: "123",
			GITHUB_SHA: runcloud ? RUNCLOUD_AMBIGUOUS_CREATE_REVISION : MODAL_CREATED_REQUEST_REVISION,
			BENCH_PROVIDERS: runcloud ? "runcloud" : "modal-gvisor",
			BENCH_SUITES: runcloud ? "realworld-openclaw" : "realworld-better-auth",
			BENCH_REPLICAS: "1",
		},
		"2026-09-14",
	);
	const cell = plan.cells[0];
	if (!cell) throw new Error("missing fixture cell");
	const intent: AccountRecord = {
		version: "1",
		kind: "intent",
		account: runcloud ? "runcloud" : "modal",
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
			diagnostic: runcloud
				? `Suite "${cell.suite}" failed on runcloud — recorded as a failed gap in experiment/attempts/${cell.id}/run.json: computesdk create failed: run.cloud create failed ambiguously (run.cloud create did not settle within 30000ms) and reconciliation could not establish its outcome (no allocation visible during reconciliation), so it is unknown whether a sandbox was allocated; if one was it carries the name ${sandboxName} and manual cleanup may be required; cleanup failed: runcloud ComputeSDK failed-create recovery cleanup callback failed`
				: "modal-gvisor ComputeSDK created-request preparation and verification callback failed; cleanup failed: modal-gvisor ComputeSDK lifecycle destroy callback failed",
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
			observeRuncloudName: async (_name: string) => ({
				kind: "runcloud-named-sandbox" as const,
				sandboxName,
				sandboxId: "sbx-original",
				state: "destroyed" as const,
				inventoryPasses: 2 as const,
			}),
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

test("admission cleanup can later receive a publication attestation without rewriting its release", async () => {
	const f = fixture("admission-released");
	await recoverAccount(
		"modal",
		new Map([["modal-gvisor", f.driver]]),
		f.options.journal,
		f.options.signal,
	);
	const history = JSON.stringify(f.records);
	const original = readFileSync(join(f.directory, "attempt.json"), "utf8");
	const recovery = await recoverExperimentCleanup(f.options);
	expect(JSON.stringify(f.records.slice(0, 3))).toBe(history);
	expect(f.records).toHaveLength(4);
	expect(f.records.at(-1)).toMatchObject({ kind: "cleanup-attested", recovery });
	expect(await recoverExperimentCleanup(f.options)).toEqual(recovery);
	expect(f.records).toHaveLength(4);
	expect(f.destroys()).toBe(1);
	expect(readFileSync(join(f.directory, "attempt.json"), "utf8")).toBe(original);
	const fresh = join(root, "collected-admission-released");
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

test("a reviewed Runcloud name recovery preserves failure and survives fresh collection and admission", async () => {
	const f = fixture("runcloud-named", false, true);
	const original = readFileSync(join(f.directory, "attempt.json"), "utf8");
	const recovery = await recoverExperimentCleanup(f.options);
	expect(recovery.observation).toMatchObject({ kind: "runcloud-named-sandbox", sandboxName });
	expect(f.records.at(-1)).toMatchObject({
		kind: "released",
		outcome: "reconciled",
		evidence: recovery,
	});
	expect(await recoverExperimentCleanup(f.options)).toEqual(recovery);
	expect(f.records).toHaveLength(2);
	expect(f.destroys()).toBe(0);
	expect(readFileSync(join(f.directory, "attempt.json"), "utf8")).toBe(original);
	const fresh = join(root, "collected-runcloud-name");
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
	const collected = readExperimentAttempts(fresh)[0];
	expect(collected?.cleanupRecovery).toEqual(recovery);
	expect(collected?.evidence.outcome).toBe("failed");
	await recoverAccount("runcloud", new Map(), f.options.journal, f.options.signal);
});

test("Runcloud name recovery refuses another signature, measurement, writers and journal races", async () => {
	for (const fault of ["signature", "measurement", "name", "observation", "writers", "journal"]) {
		const f = fixture(`runcloud-invalid-${fault}`, false, true);
		const path = join(f.directory, "attempt.json");
		const evidence = JSON.parse(readFileSync(path, "utf8"));
		if (fault === "signature") evidence.diagnostic += " other failure";
		if (fault === "measurement") evidence.measurementStarted = true;
		writeFileSync(path, JSON.stringify(evidence));
		if (fault === "name")
			f.options.observeRuncloudName = async () => ({
				kind: "runcloud-named-sandbox",
				sandboxName: "sandbox-benchmarks-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
				sandboxId: "sbx-other",
				state: "destroyed",
				inventoryPasses: 2,
			});
		if (fault === "observation")
			f.options.observeRuncloudName = async () => {
				throw new Error("inventory unavailable");
			};
		let checks = 0;
		f.options.assertQuiescent = async () => {
			checks++;
			if (fault === "writers" && checks === 2) throw new Error("active writer");
			if (fault === "journal" && checks === 2)
				f.records.push({ ...f.records[0], kind: "intent" } as AccountRecord);
		};
		await expect(recoverExperimentCleanup(f.options)).rejects.toThrow();
		expect(f.records.some((record) => record.kind === "released")).toBe(false);
	}
});

test("publication re-verifies the reviewed Runcloud source and exact diagnostic name", async () => {
	const f = fixture("runcloud-verification", false, true);
	const recovery = await recoverExperimentCleanup(f.options);
	const attempt = readExperimentAttempt(f.directory);
	expect(() => verifyCleanupRecovery(f.plan, attempt)).not.toThrow();
	expect(runcloudAmbiguousCreateName({ ...f.plan, sha: "b".repeat(40) }, attempt)).toBeUndefined();
	expect(() =>
		verifyCleanupRecovery(f.plan, {
			...attempt,
			cleanupRecovery: {
				...recovery,
				observation: {
					kind: "runcloud-named-sandbox",
					sandboxName: "sandbox-benchmarks-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
					sandboxId: "sbx-other",
					state: "destroyed",
					inventoryPasses: 2,
				},
			},
		}),
	).toThrow("reviewed Runcloud");
});

test("a supplemental attestation requires an ordinary matching release and a fresh observation", async () => {
	for (const fault of ["identity", "not-allocated", "observation", "writers"]) {
		const f = fixture(`supplement-${fault}`);
		await recoverAccount(
			"modal",
			new Map([["modal-gvisor", f.driver]]),
			f.options.journal,
			f.options.signal,
		);
		const release = f.records[2];
		if (release?.kind !== "released" || release.outcome !== "absent")
			throw new Error("missing release");
		if (fault === "identity")
			f.records[2] = { ...release, ref: { ...release.ref, id: "sb-other" } };
		if (fault === "not-allocated")
			f.records[2] = {
				version: "1",
				kind: "released",
				outcome: "not-allocated",
				account: release.account,
				attempt: release.attempt,
				cellId: release.cellId,
				planDigest: release.planDigest,
			};
		if (fault === "observation")
			f.options.openDriver = async () => {
				throw new Error("observation unavailable");
			};
		if (fault === "writers")
			f.options.assertQuiescent = async () => {
				throw new Error("active writer");
			};
		const before = JSON.stringify(f.records);
		await expect(recoverExperimentCleanup(f.options)).rejects.toThrow();
		expect(JSON.stringify(f.records)).toBe(before);
	}
});

test("admission rejects a supplemental attestation that contradicts its release", async () => {
	const f = fixture("supplement-conflict");
	await recoverAccount(
		"modal",
		new Map([["modal-gvisor", f.driver]]),
		f.options.journal,
		f.options.signal,
	);
	await recoverExperimentCleanup(f.options);
	const release = f.records[2];
	if (release?.kind !== "released" || release.outcome !== "absent")
		throw new Error("missing release");
	f.records[2] = { ...release, ref: { ...release.ref, id: "sb-other" } };
	await expect(
		recoverAccount(
			"modal",
			new Map([["modal-gvisor", f.driver]]),
			f.options.journal,
			f.options.signal,
		),
	).rejects.toThrow("attestation contradicts");
	await expect(recoverExperimentCleanup(f.options)).rejects.toThrow("attestation contradicts");
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

test("retained pre-execution allocation restores journal identity and remains verifiable after collection", async () => {
	const f = fixture("retained-before-execution");
	rmSync(join(f.directory, "raw", "execution-original.json"));
	const path = join(f.directory, "attempt.json");
	const original = JSON.parse(readFileSync(path, "utf8"));
	writeFileSync(
		path,
		JSON.stringify({
			...original,
			measurementStarted: false,
			rawDigest: rawTreeDigest(join(f.directory, "raw")),
		}),
	);
	f.records.splice(1);
	const recovery = await recoverExperimentCleanup(f.options);
	expect(f.records.map((record) => record.kind)).toEqual(["intent", "allocated", "released"]);
	expect(recovery.observation).toMatchObject({ kind: "sandbox", sandboxId: "sb-original" });
	expect(f.destroys()).toBe(1);
	expect(await recoverExperimentCleanup(f.options)).toEqual(recovery);
	const fresh = join(root, "retained-collected");
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
});

test("pre-execution recovery rejects unbound identities and measurement evidence before journal writes", async () => {
	const unbound = "retained allocation does not bind the original attempt";
	for (const [change, guard] of [
		["attempt", unbound],
		["account", unbound],
		["provider", unbound],
		["measurement", "lost allocation append requires a pre-execution failure"],
	] as const) {
		const f = fixture(`retained-invalid-${change}`);
		rmSync(join(f.directory, "raw", "execution-original.json"));
		const allocationPath = join(f.directory, "raw", "allocation.json");
		const allocation = JSON.parse(readFileSync(allocationPath, "utf8"));
		if (change === "attempt") allocation.attempt = "other";
		if (change === "account") allocation.account = "blaxel";
		if (change === "provider") allocation.ref.provider = "modal-vm";
		writeFileSync(allocationPath, JSON.stringify(allocation));
		const path = join(f.directory, "attempt.json");
		const original = JSON.parse(readFileSync(path, "utf8"));
		writeFileSync(
			path,
			JSON.stringify({
				...original,
				measurementStarted: change === "measurement",
				rawDigest: rawTreeDigest(join(f.directory, "raw")),
			}),
		);
		f.records.splice(1);
		await expect(recoverExperimentCleanup(f.options)).rejects.toThrow(guard);
		expect(f.records).toHaveLength(1);
		expect(f.destroys()).toBe(0);
	}
});
