import { lstatSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ExperimentPlan } from "@sandbox-benchmarks/schema";
import type { AccountJournal } from "./account-journal.ts";
import {
	readExperimentAttempt,
	readExperimentPlan,
	writeImmutableJson,
} from "./experiment-artifacts.ts";
import type { ExperimentStore } from "./experiment-store.ts";

export const DEFAULT_ARTIFACT_DOWNLOAD_CONCURRENCY = 32;

export function artifactDownloadConcurrency(env: NodeJS.ProcessEnv = process.env): number {
	const raw = env.BENCH_ARTIFACT_DOWNLOAD_CONCURRENCY?.trim();
	if (!raw) return DEFAULT_ARTIFACT_DOWNLOAD_CONCURRENCY;
	if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 64)
		throw new Error("BENCH_ARTIFACT_DOWNLOAD_CONCURRENCY must be an integer from 1 to 64");
	return Number(raw);
}

export interface CollectionSummary {
	artifacts: number;
	downloadConcurrency: number;
	peakDownloads: number;
	archiveBytes?: number;
	inventoryMs: number;
	downloadAndVerificationMs: number;
	verificationMs: number;
	journalMs: number;
	totalMs: number;
}

export async function downloadExperimentPlan(
	store: ExperimentStore,
	id: string,
	root: string,
): Promise<ExperimentPlan> {
	if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) throw new Error("invalid experiment identity");
	const artifacts = (await store.list({ name: `experiment-plan-${id}` })).filter(
		(entry) => entry.name === `experiment-plan-${id}`,
	);
	if (artifacts.length !== 1 || !artifacts[0])
		throw new Error("one immutable experiment plan is required");
	prepareDownloadDirectory(root);
	await store.download(artifacts[0], root);
	const plan = readExperimentPlan(join(root, "plan.json"));
	if (plan.id !== id || String(artifacts[0].workflow_run.id) !== id)
		throw new Error("plan artifact workflow provenance mismatch");
	return plan;
}

/** Recover every attempt, including launch intents whose worker disappeared before terminal upload. */
export async function downloadExperimentAttempts(
	store: ExperimentStore,
	journal: AccountJournal,
	plan: ExperimentPlan,
	root: string,
	options: { concurrency?: number } = {},
): Promise<CollectionSummary> {
	const started = performance.now();
	const concurrency = options.concurrency ?? DEFAULT_ARTIFACT_DOWNLOAD_CONCURRENCY;
	if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 64)
		throw new Error("artifact download concurrency must be an integer from 1 to 64");
	prepareDownloadDirectory(root);
	const artifacts = await store.list({ prefix: `experiment-attempt-${plan.id}-` });
	if (new Set(artifacts.map((artifact) => artifact.id)).size !== artifacts.length)
		throw new Error("artifact inventory contains duplicate download destinations");
	const inventoryMs = performance.now() - started;
	const transferStarted = performance.now();
	let journalMs = 0;
	// Account snapshots are independent read-only requests. Start them alongside the downloads;
	// allSettled keeps failures observed while the download pool drains.
	const journalReads = Promise.allSettled(
		plan.accounts.map(async (account) => ({
			account,
			records: await journal.read(account.quotaDomain),
		})),
	).then((records) => {
		journalMs = performance.now() - transferStarted;
		return records;
	});
	const terminals = new Map<string, ReturnType<typeof readExperimentAttempt>>();
	let next = 0;
	let active = 0;
	let peakDownloads = 0;
	let verificationMs = 0;
	const failures: Error[] = [];
	await Promise.all(
		Array.from({ length: Math.min(concurrency, artifacts.length) }, async () => {
			while (failures.length === 0) {
				const artifact = artifacts[next++];
				if (!artifact) return;
				active += 1;
				peakDownloads = Math.max(peakDownloads, active);
				try {
					const directory = join(root, String(artifact.id));
					await store.download(artifact, directory);
					const verifyStarted = performance.now();
					const attempt = readExperimentAttempt(directory);
					verificationMs += performance.now() - verifyStarted;
					const { evidence } = attempt;
					if (
						evidence.planDigest !== plan.digest ||
						artifact.name !== `experiment-attempt-${plan.id}-${evidence.id}` ||
						String(artifact.workflow_run.id) !== plan.id ||
						terminals.has(evidence.id)
					)
						throw new Error("attempt artifact provenance conflict");
					terminals.set(evidence.id, attempt);
				} catch (error) {
					// Stop new work but await every active extraction before rejecting. Callers can then
					// inspect/remove the partial collection without late writers recreating its files.
					failures.push(
						new Error(
							`artifact ${artifact.id}: ${error instanceof Error ? error.message : "download or verification failed"}`,
							{ cause: error },
						),
					);
				} finally {
					active -= 1;
				}
			}
		}),
	);
	const downloadAndVerificationMs = performance.now() - transferStarted;
	const histories = await journalReads;
	if (failures.length)
		throw new AggregateError(
			failures,
			`experiment artifact collection failed: ${failures
				.slice(0, 3)
				.map((error) => error.message)
				.join("; ")}`,
		);
	const journalFailure = histories.find((entry) => entry.status === "rejected");
	if (journalFailure?.status === "rejected") throw journalFailure.reason;
	for (const history of histories) {
		if (history.status !== "fulfilled") continue;
		const { account, records } = history.value;
		for (const attempt of terminals.values()) {
			const cell = plan.cells.find((cell) => cell.id === attempt.evidence.cellId);
			if (cell?.quotaDomain !== account.quotaDomain || attempt.evidence.outcome !== "completed")
				continue;
			const owned = records.filter((record) => record.attempt === attempt.evidence.id);
			const intent = owned.find((record) => record.kind === "intent");
			const allocated = owned.find((record) => record.kind === "allocated");
			const released = owned.find((record) => record.kind === "released");
			if (
				owned.length !== 3 ||
				!intent ||
				!allocated ||
				!released ||
				released.outcome !== "absent" ||
				owned.some(
					(record) =>
						record.planDigest !== plan.digest ||
						record.cellId !== cell.id ||
						record.account !== cell.quotaDomain,
				) ||
				allocated.ref.id !== released.ref.id ||
				allocated.ref.provider !== released.ref.provider ||
				allocated.ref.provider !== cell.provider ||
				allocated.ref.id !== attempt.execution?.sandboxId
			)
				throw new Error("completed attempt lacks durable allocation and release evidence");
		}

		for (const record of records.filter(
			(record) => record.kind === "intent" && record.planDigest === plan.digest,
		)) {
			if (terminals.has(record.attempt)) continue;
			const directory = join(root, `interrupted-${record.attempt}`);
			mkdirSync(directory, { recursive: true });
			writeImmutableJson(join(directory, "intent.json"), record);
		}
	}
	return {
		artifacts: artifacts.length,
		downloadConcurrency: concurrency,
		peakDownloads,
		...(artifacts.every((artifact) => artifact.size_in_bytes !== undefined)
			? {
					archiveBytes: artifacts.reduce(
						(total, artifact) => total + (artifact.size_in_bytes ?? 0),
						0,
					),
				}
			: {}),
		inventoryMs,
		downloadAndVerificationMs,
		verificationMs,
		journalMs,
		totalMs: performance.now() - started,
	};
}

/** A download must never inherit evidence from an earlier collection or partial extraction. */
function prepareDownloadDirectory(root: string): void {
	mkdirSync(root, { recursive: true });
	if (lstatSync(root).isSymbolicLink() || readdirSync(root).length !== 0)
		throw new Error("artifact download requires an empty regular directory");
}
