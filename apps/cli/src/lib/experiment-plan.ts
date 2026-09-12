import { evidenceDigest, verifyExperimentPlan } from "@sandbox-benchmarks/results";
import type { ExperimentCell, ExperimentPlan } from "@sandbox-benchmarks/schema";
import {
	BENCH_JOB_CEILING_MINUTES,
	benchmarkWave,
	experimentCellSchema,
} from "@sandbox-benchmarks/schema";

export interface AccountCapacity {
	sandboxes: number;
	vcpus?: number;
	memoryGb?: number;
	gpus?: number;
}

/**
 * Batches per collection round, and therefore the approval unit of a run: a round's batch jobs are
 * created together so one `privileged` approval releases them all, and they then queue on the
 * account's concurrency group. GitHub's `queue: max` holds at most 100 pending jobs per group and
 * cancels the overflow (a cancelled batch is a failed cell), so a released round must stay well under
 * that even when the sibling isolation variant and the smoke/toolchain/GPU lanes share the group.
 */
export const ROUND_BATCH_LIMIT = 64;

// Suite workloads retain their own identities and deadlines inside a concurrent wave.
function allocationIdentity(cell: ExperimentCell): string {
	return evidenceDigest({
		provider: cell.provider,
		quotaDomain: cell.quotaDomain,
		target: cell.target,
		gpu: cell.gpu ?? null,
		artifactIdentity: cell.artifactIdentity,
		environmentRevision: cell.environmentRevision,
		startupMinutes: cell.startupMinutes,
	});
}

/** Pure admission planning. No credential reads, remote calls, or implicit wall-clock input. */
export function planExperiment(
	request: {
		id: string;
		sha: string;
		createdOn: string;
		cells: readonly ExperimentCell[];
		maxPremeasurementRetries?: number;
	},
	policy: Readonly<Record<string, AccountCapacity>> = {},
): ExperimentPlan {
	const cells = request.cells.map((cell) => experimentCellSchema.assert(structuredClone(cell)));
	const eligible = cells.filter(
		(cell) =>
			!cell.metrics.every((metric) => cell.exclusions.some((entry) => entry.metricId === metric)),
	);
	const ordered = [...eligible].sort((left, right) => {
		const rank = (suite: string) => (benchmarkWave(suite) === "synthetic" ? 0 : 1);
		return rank(left.suite) - rank(right.suite);
	});
	type Prepared = {
		cell: ExperimentCell;
		cap: number;
		budget: number;
		wave: ReturnType<typeof benchmarkWave>;
		identity: string;
	};
	const prepared: Prepared[] = [];
	for (const cell of ordered) {
		const capacity = policy[cell.quotaDomain] ?? { sandboxes: 1 };
		if (
			!Number.isSafeInteger(capacity.sandboxes) ||
			capacity.sandboxes < 1 ||
			(capacity.vcpus !== undefined && (!Number.isFinite(capacity.vcpus) || capacity.vcpus <= 0)) ||
			(capacity.memoryGb !== undefined &&
				(!Number.isFinite(capacity.memoryGb) || capacity.memoryGb <= 0))
		) {
			throw new Error(`invalid account capacity: ${cell.quotaDomain}`);
		}
		const cap = Math.min(
			capacity.sandboxes,
			Math.floor((capacity.vcpus ?? Infinity) / cell.target.vcpus),
			Math.floor((capacity.memoryGb ?? Infinity) / cell.target.memoryGb),
			cell.gpu ? Math.floor((capacity.gpus ?? 0) / cell.gpu.count) : Infinity,
		);
		if (cap < 1) throw new Error(`target exceeds account capacity: ${cell.id}`);
		const budget = cell.startupMinutes + cell.workloadMinutes + cell.finishMinutes + 15;
		if (budget > BENCH_JOB_CEILING_MINUTES)
			throw new Error(`replicate cannot fit a ${BENCH_JOB_CEILING_MINUTES}-minute job: ${cell.id}`);
		prepared.push({
			cell,
			cap,
			budget,
			wave: benchmarkWave(cell.suite),
			identity: allocationIdentity(cell),
		});
	}
	// Group by (quotaDomain, provider, wave, allocationIdentity), preserving plan order.
	const groups: Prepared[][] = [];
	const groupIndex = new Map<string, number>();
	for (const entry of prepared) {
		const key = `${entry.cell.quotaDomain}\0${entry.cell.provider}\0${entry.wave}\0${entry.identity}`;
		let index = groupIndex.get(key);
		if (index === undefined) {
			index = groups.length;
			groupIndex.set(key, index);
			groups.push([]);
		}
		groups[index]?.push(entry);
	}
	const batches: ExperimentPlan["batches"] = [];
	for (const group of groups) {
		const first = group[0];
		if (!first) continue;
		const budget = Math.max(...group.map((entry) => entry.budget));
		const affordable = Math.max(1, Math.floor(BENCH_JOB_CEILING_MINUTES / budget));
		const size = Math.min(group.length, first.cap * affordable);
		for (let offset = 0; offset < group.length; offset += size) {
			const chunk = group.slice(offset, offset + size);
			batches.push({
				id: `batch-${batches.length}`,
				quotaDomain: first.cell.quotaDomain,
				wave: first.wave,
				cells: chunk.map((entry) => entry.cell.id),
				maxConcurrency: first.cap,
				budgetMinutes: Math.ceil(chunk.length / first.cap) * budget,
			});
		}
	}
	const rounds: ExperimentPlan["rounds"] = [];
	for (const quotaDomain of new Set(cells.map((cell) => cell.quotaDomain))) {
		for (const wave of ["synthetic", "realworld"] as const) {
			const domainBatches = batches.filter(
				(batch) => batch.quotaDomain === quotaDomain && batch.wave === wave,
			);
			for (let offset = 0; offset < domainBatches.length; offset += ROUND_BATCH_LIMIT)
				rounds.push({
					id: `round-${rounds.length}`,
					quotaDomain,
					wave,
					batches: domainBatches.slice(offset, offset + ROUND_BATCH_LIMIT).map((batch) => batch.id),
				});
		}
	}
	const accounts = [...new Set(cells.map((cell) => cell.quotaDomain))].map((quotaDomain) => ({
		quotaDomain,
		...(policy[quotaDomain] ?? { sandboxes: 1 }),
	}));
	const body = {
		schemaVersion: "1" as const,
		...request,
		cells,
		batches,
		accounts,
		rounds,
		retryPolicy: "premeasurement-only" as const,
		maxPremeasurementRetries: request.maxPremeasurementRetries ?? 0,
	};
	return verifyExperimentPlan({ ...body, digest: evidenceDigest(body) });
}
