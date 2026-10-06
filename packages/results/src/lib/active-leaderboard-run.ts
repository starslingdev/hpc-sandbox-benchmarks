import type { Run } from "@sandbox-benchmarks/schema";
import { PROVIDER_IDS, parseRun } from "@sandbox-benchmarks/schema";

const ACTIVE_PROVIDER_IDS: ReadonlySet<string> = new Set(PROVIDER_IDS);

const record = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);
const retired = (value: unknown, key: string): boolean =>
	record(value) && typeof value[key] === "string" && !ACTIVE_PROVIDER_IDS.has(value[key]);

/** Validate the current comparison view without rewriting archived source Runs. */
export function parseActiveLeaderboardRun(value: unknown): Run {
	if (!record(value) || !Array.isArray(value.providers)) return parseRun(value);
	const providers = value.providers.filter((provider) => !retired(provider, "providerId"));
	const experiment = value.experiment;
	const partial = record(experiment) ? experiment.partial : undefined;
	if (!record(partial) || !Array.isArray(partial.cells)) {
		return checked(parseRun({ ...value, providers }));
	}

	const cells = partial.cells.filter((cell) => !retired(cell, "provider"));
	const attemptIds = new Set(
		cells.flatMap((cell) =>
			record(cell) && typeof cell.attemptId === "string" ? [cell.attemptId] : [],
		),
	);
	const cellIds = new Set(
		cells.flatMap((cell) => (record(cell) && typeof cell.id === "string" ? [cell.id] : [])),
	);
	const complete = cells.filter((cell) => record(cell) && cell.status === "complete").length;
	const excluded = cells.filter((cell) => record(cell) && cell.status === "excluded").length;
	const { cleanupRecoveries, ...otherExperiment } = experiment as Record<string, unknown>;
	const keptRecoveries = Array.isArray(cleanupRecoveries)
		? cleanupRecoveries.filter(
				(recovery) =>
					record(recovery) && typeof recovery.cellId === "string" && cellIds.has(recovery.cellId),
			)
		: undefined;
	const originalAttemptIds = otherExperiment.attemptIds;
	const projected = {
		...value,
		providers,
		experiment: {
			...otherExperiment,
			attemptIds: Array.isArray(originalAttemptIds)
				? originalAttemptIds.filter((id) => attemptIds.has(id))
				: originalAttemptIds,
			...(keptRecoveries?.length ? { cleanupRecoveries: keptRecoveries } : {}),
			partial: {
				...partial,
				cells,
				planned: cells.length,
				complete,
				incomplete: cells.length - complete - excluded,
				excluded,
			},
		},
	};
	return checked(parseRun(projected));
}

function checked(run: Run): Run {
	const unknown = run.providers.find((provider) => !ACTIVE_PROVIDER_IDS.has(provider.providerId));
	if (unknown) throw new Error(`unregistered leaderboard provider: ${unknown.providerId}`);
	return run;
}
