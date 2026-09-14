import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readExperimentAttempts, writeImmutableJson } from "./experiment-artifacts.ts";
import type { StoredArtifact } from "./experiment-store.ts";
import {
	artifactDownloadConcurrency,
	downloadExperimentAttempts,
	downloadExperimentPlan,
} from "./experiment-transfer.ts";
import { workflowExperiment } from "./workflow-experiment.ts";

const root = mkdtempSync(join(tmpdir(), "experiment-transfer-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const plan = workflowExperiment(
	{
		GITHUB_RUN_ID: "123",
		GITHUB_SHA: "a".repeat(40),
		BENCH_PROVIDERS: "tama",
		BENCH_SUITES: "system",
		BENCH_REPLICAS: "1",
	},
	"2026-09-10",
);
const store = { list: async () => [], upload: async () => {}, download: async () => {} };
test("missing plan artifacts never regenerate a smaller experiment", async () => {
	await expect(downloadExperimentPlan(store, "123", root)).rejects.toThrow("one immutable");
});
test("interrupted attempts survive collection even when every terminal artifact is absent", async () => {
	const directory = join(root, "interrupted");
	await downloadExperimentAttempts(
		store,
		{
			read: async () => [
				{
					version: "1",
					kind: "intent",
					account: "tama",
					attempt: "lost",
					cellId: "tama-system-r0",
					planDigest: plan.digest,
				},
			],
			append: async () => {},
		},
		plan,
		directory,
	);
	expect(() => readExperimentAttempts(directory)).toThrow("unterminated");
});
test("a plan artifact from another workflow cannot supply experiment provenance", async () => {
	await expect(
		downloadExperimentPlan(
			{
				...store,
				list: async () => [
					{ id: 1, name: "experiment-plan-123", expired: false, workflow_run: { id: 456 } },
				],
				download: async (_artifact, directory) => {
					mkdirSync(directory, { recursive: true });
					writeImmutableJson(join(directory, "plan.json"), plan);
				},
			},
			"123",
			join(root, "wrong-workflow"),
		),
	).rejects.toThrow("workflow provenance");
});

test("collection refuses stale local attempts even when the remote inventory is empty", async () => {
	const directory = join(root, "stale-collection");
	mkdirSync(join(directory, "old-attempt"), { recursive: true });
	writeImmutableJson(join(directory, "old-attempt", "attempt.json"), { stale: true });
	await expect(
		downloadExperimentAttempts(
			store,
			{ read: async () => [], append: async () => {} },
			plan,
			directory,
		),
	).rejects.toThrow("empty");
});

test("plan extraction cannot reuse a stale local plan when an archive omits it", async () => {
	const directory = join(root, "stale-plan");
	mkdirSync(directory);
	writeImmutableJson(join(directory, "plan.json"), plan);
	await expect(
		downloadExperimentPlan(
			{
				...store,
				list: async () => [
					{ id: 1, name: "experiment-plan-123", expired: false, workflow_run: { id: 123 } },
				],
			},
			"123",
			directory,
		),
	).rejects.toThrow("empty");
});

function terminalArtifact(id: number): StoredArtifact {
	return {
		id,
		name: `experiment-attempt-123-attempt-${id}`,
		expired: false,
		workflow_run: { id: 123 },
	};
}

function writeTerminal(artifact: StoredArtifact, directory: string) {
	mkdirSync(directory, { recursive: true });
	writeImmutableJson(join(directory, "attempt.json"), {
		schemaVersion: "1",
		id: `attempt-${artifact.id}`,
		cellId: "tama-system-r0",
		planDigest: plan.digest,
		sha: plan.sha,
		workloadRevision: "test-workload",
		environmentRevision: "test-environment",
		artifactIdentity: "test-artifact",
		passes: 1,
		workflowRun: "123",
		workflowAttempt: 1,
		job: "test",
		sequence: 0,
		outcome: "failed",
		measurementStarted: false,
		retryable: false,
		cleanup: "not-allocated",
		completion: "unknown",
	});
}

test("collection fills a bounded download pool while reading account journals", async () => {
	const artifacts = Array.from({ length: 80 }, (_, i) => terminalArtifact(i + 1));
	let active = 0;
	let peak = 0;
	let journalStarted = false;
	const observed: number[] = [];
	await downloadExperimentAttempts(
		{
			...store,
			list: async () => artifacts,
			download: async (artifact, directory) => {
				active += 1;
				peak = Math.max(peak, active);
				await Bun.sleep(2);
				observed.push(artifact.id);
				writeTerminal(artifact, directory);
				active -= 1;
			},
		},
		{
			read: async () => {
				journalStarted = true;
				expect(observed).toHaveLength(0);
				return [];
			},
			append: async () => {},
		},
		plan,
		join(root, "parallel-downloads"),
	);
	expect(journalStarted).toBe(true);
	expect(peak).toBeGreaterThan(1);
	expect(peak).toBeLessThanOrEqual(64);
	expect(observed.toSorted((a, b) => a - b)).toEqual(artifacts.map((artifact) => artifact.id));
});

test("download concurrency is bounded and configurable independently of sandbox capacity", () => {
	expect(artifactDownloadConcurrency({})).toBe(32);
	expect(artifactDownloadConcurrency({ BENCH_ARTIFACT_DOWNLOAD_CONCURRENCY: "8" })).toBe(8);
	for (const raw of ["0", "65", "1.5", "unlimited", "Infinity"])
		expect(() => artifactDownloadConcurrency({ BENCH_ARTIFACT_DOWNLOAD_CONCURRENCY: raw })).toThrow(
			"integer from 1 to 64",
		);
});

test("a failed download stops refill and waits for active writers before rejecting", async () => {
	const artifacts = [1, 2, 3].map(terminalArtifact);
	const peerEntered = Promise.withResolvers<void>();
	const failureIssued = Promise.withResolvers<void>();
	const finishPeer = Promise.withResolvers<void>();
	const started: number[] = [];
	let settled = false;
	const collected = downloadExperimentAttempts(
		{
			...store,
			list: async () => artifacts,
			download: async (artifact, directory) => {
				started.push(artifact.id);
				if (artifact.id === 1) {
					await peerEntered.promise;
					failureIssued.resolve();
					throw new Error("archive transport failed");
				}
				peerEntered.resolve();
				await finishPeer.promise;
				writeTerminal(artifact, directory);
			},
		},
		{ read: async () => [], append: async () => {} },
		plan,
		join(root, "failed-download-drain"),
		{ concurrency: 2 },
	).then(
		() => {
			settled = true;
			return undefined;
		},
		(error: unknown) => {
			settled = true;
			return error;
		},
	);
	await failureIssued.promise;
	await Bun.sleep(0);
	expect(settled).toBe(false);
	finishPeer.resolve();
	expect(await collected).toBeInstanceOf(AggregateError);
	expect(started).toEqual([1, 2]);
});

test("parallel completion preserves artifact provenance checks", async () => {
	await expect(
		downloadExperimentAttempts(
			{
				...store,
				list: async () => [
					terminalArtifact(1),
					{ ...terminalArtifact(2), workflow_run: { id: 456 } },
				],
				download: async (artifact, directory) => writeTerminal(artifact, directory),
			},
			{ read: async () => [], append: async () => {} },
			plan,
			join(root, "parallel-provenance"),
		),
	).rejects.toThrow("artifact 2: attempt artifact provenance conflict");
});

test("duplicate artifact IDs are rejected before concurrent extraction can mix evidence", async () => {
	let downloads = 0;
	await expect(
		downloadExperimentAttempts(
			{
				...store,
				list: async () => [terminalArtifact(1), terminalArtifact(1)],
				download: async () => {
					downloads += 1;
				},
			},
			{ read: async () => [], append: async () => {} },
			plan,
			join(root, "duplicate-destinations"),
		),
	).rejects.toThrow("duplicate download destinations");
	expect(downloads).toBe(0);
});
