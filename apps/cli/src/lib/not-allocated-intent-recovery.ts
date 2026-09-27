import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CREATE_FAILURE_PREFIX } from "@sandbox-benchmarks/harness";
import { providerIdSchema, quotaDomain, suiteNameSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { AccountJournal } from "./account-journal.ts";
import { accountRecordSchema, withinSignal } from "./account-journal.ts";
import { readExperimentAttempt } from "./experiment-artifacts.ts";
import { isPreCreateStopDetail } from "./pre-create-stop.ts";

const createFailureMarker = type({
	provider: providerIdSchema,
	suite: suiteNameSchema,
	outcome: "'failed'",
	reason: "string >= 1",
	cause: { kind: "'sandbox-create-failed'", detail: "string >= 1" },
}).onUndeclaredKey("reject");

const AMBIGUOUS_CREATE =
	"original evidence does not prove create never started; do not append a not-allocated release for an ambiguous or vendor create";

/**
 * Replay a lost `released` / `not-allocated` append.
 *
 * A journal failure can stop admission after an intent is durable and before vendor create.
 * The attempt already says `cleanup: not-allocated`, but the release append may have been lost
 * to the same failure. Other recovery commands require a retained allocation, unresolved cleanup,
 * or one reviewed historical marker, so they cannot close this intent.
 *
 * Append the executor's ordinary not-allocated release only when the single create-failure marker
 * is an executor pre-create stop and the attempt diagnostic carries that same detail. Ambiguous
 * creates stay unresolved. This is an explicit operator command under exclusive account ownership:
 * it never calls a provider and never rewrites the original attempt.
 */
export async function recoverNotAllocatedIntent(options: {
	directory: string;
	journal: AccountJournal;
	/** Recheck that the original workflow terminated and no allocating workflows can run. */
	assertQuiescent: (workflowRun: string, sourceSha: string) => Promise<void>;
	signal: AbortSignal;
}): Promise<string> {
	const attempt = readExperimentAttempt(options.directory);
	const { evidence } = attempt;
	if (attempt.allocation)
		throw new Error("attempt retains allocation.json; recover with recover-allocated-intent");
	if (
		evidence.outcome !== "failed" ||
		evidence.measurementStarted ||
		evidence.cleanup !== "not-allocated" ||
		!evidence.rawDigest ||
		attempt.execution ||
		attempt.cleanup
	)
		throw new Error("attempt does not prove create never started");
	const markers = createFailureMarkers(join(options.directory, "raw"));
	const markerPath = markers[0];
	if (markers.length !== 1 || markerPath === undefined) throw new Error(AMBIGUOUS_CREATE);
	const parsed = createFailureMarker(JSON.parse(readFileSync(markerPath, "utf8")));
	if (parsed instanceof type.errors) throw new Error(AMBIGUOUS_CREATE);
	const detail = parsed.cause.detail;
	const prefix = `${parsed.provider}-${parsed.suite}-r`;
	const replicate = evidence.cellId.slice(prefix.length);
	if (!evidence.cellId.startsWith(prefix) || !/^[0-9]+$/.test(replicate))
		throw new Error("recovery marker identity mismatch");
	if (
		!isPreCreateStopDetail(detail) ||
		parsed.reason !== `${CREATE_FAILURE_PREFIX}${detail}` ||
		!evidence.diagnostic?.includes(detail)
	)
		throw new Error(AMBIGUOUS_CREATE);
	const account = quotaDomain(parsed.provider);
	const readIntent = async () => {
		const records = (await withinSignal(options.signal, () => options.journal.read(account)))
			.map((record) => accountRecordSchema.assert(record))
			.filter((record) => record.attempt === evidence.id);
		if (records.some((record) => record.kind === "allocated"))
			throw new Error(
				"journal already records an allocation; recover with recover-allocated-intent",
			);
		const intent = records[0];
		if (
			records.length !== 1 ||
			intent?.kind !== "intent" ||
			intent.account !== account ||
			intent.cellId !== evidence.cellId ||
			intent.planDigest !== evidence.planDigest
		)
			throw new Error("recovery requires a matching unresolved intent without a release");
		return intent;
	};
	await readIntent();
	await options.assertQuiescent(evidence.workflowRun, evidence.sha);
	const intent = await readIntent();
	await options.assertQuiescent(evidence.workflowRun, evidence.sha);
	options.signal.throwIfAborted();
	await withinSignal(options.signal, () =>
		options.journal.append(
			accountRecordSchema.assert({
				...intent,
				kind: "released",
				outcome: "not-allocated",
			}),
		),
	);
	return evidence.id;
}

function createFailureMarkers(directory: string): string[] {
	const found: string[] = [];
	const visit = (path: string): void => {
		for (const entry of readdirSync(path, { withFileTypes: true })) {
			const child = join(path, entry.name);
			if (entry.isSymbolicLink())
				throw new Error("recovery evidence must not contain symbolic links");
			if (entry.isDirectory()) visit(child);
			else if (entry.isFile() && /^sandbox-.+--failed\.json$/.test(entry.name)) found.push(child);
		}
	};
	visit(directory);
	return found;
}
