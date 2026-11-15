import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import { CREATE_FAILURE_PREFIX } from "@sandbox-benchmarks/harness";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { providerIdSchema, quotaDomain, suiteNameSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { AccountJournal } from "./account-journal.ts";
import { accountRecordSchema, withinSignal } from "./account-journal.ts";
import { readExperimentAttempt } from "./experiment-artifacts.ts";

/**
 * Legacy create-failure markers do not distinguish rejection from an ambiguous accepted request.
 * Keep this entry point to explain why old operator invocations can no longer clear ownership.
 * Empty inventory, even after workflow completion, cannot prove a POST was cancelled.
 * No provider or journal operation is permitted without authoritative rejection evidence.
 *
 * The one reviewed exception (ADR-0027) is {@link CREATEOS_REVIEWED_REJECTION}: a CreateOS create
 * answered "service unavailable", which the CreateOS SDK's own contract says the server did not
 * process. It is pinned to its exact original attempt and still requires two complete inventories
 * that hold no benchmark-owned sandbox before it may append the not-allocated release.
 */
const rejectedMarker = type({
	provider: providerIdSchema,
	suite: suiteNameSchema,
	outcome: "'failed'",
	reason: "string >= 1",
	cause: { kind: "'sandbox-create-failed'", detail: "string >= 1" },
}).onUndeclaredKey("delete");

/** The reviewed CreateOS 503 create from CPU run 43646674451 (ADR-0027). Nothing else qualifies. */
export const CREATEOS_REVIEWED_REJECTION = Object.freeze({
	provider: "createos",
	suite: "realworld-openclaw",
	attemptId: "createos-realworld-openclaw-r6-a1-4aacfaed-46a7-4808-ac60-4e522dc985f9",
	cellId: "createos-realworld-openclaw-r6",
	workflowRun: "43646674451",
	sourceSha: "181066d25fa9558474edd0aa9018af1f8cf24ecb",
	detail:
		"computesdk create failed: service unavailable; cleanup failed: createos ComputeSDK failed-create recovery cleanup callback failed",
} as const);

const NO_REJECTION_EVIDENCE =
	"original evidence does not prove a definitive create rejection; inventory cannot clear an ambiguous create. " +
	"Keep the intent unresolved pending identity-based recovery or vendor-confirmed rejection; do not append a not-allocated release from empty inventory.";

/**
 * Validate the original artifact without credentials. Returns the attempt only for the reviewed
 * CreateOS rejection; every other attempt fails closed before any provider or journal is opened.
 */
export function verifyRejectedCreate(options: {
	directory: string;
	provider: typeof providerIdSchema.infer;
	suite: typeof suiteNameSchema.infer;
}) {
	const attempt = readExperimentAttempt(options.directory);
	const { evidence, execution, cleanup } = attempt;
	if (
		evidence.outcome !== "failed" ||
		evidence.measurementStarted ||
		evidence.cleanup !== "unresolved" ||
		!evidence.rawDigest ||
		execution ||
		cleanup
	)
		throw new Error("attempt does not prove an unresolved create rejection");
	// A retained allocation means create RETURNED a sandbox and only the append failed. That is a
	// known resource with its own recovery, and clearing it here would abandon a live sandbox.
	if (existsSync(join(options.directory, "raw", "allocation.json")))
		throw new Error("attempt retains allocation.json; recover with recover-allocated-intent");
	const marker = rejectedMarker.assert(
		JSON.parse(
			readFileSync(
				join(
					options.directory,
					"raw",
					options.provider,
					options.suite,
					`sandbox-${options.provider}-${options.suite}--failed.json`,
				),
				"utf8",
			),
		),
	);
	if (
		marker.provider !== options.provider ||
		marker.suite !== options.suite ||
		!evidence.cellId.startsWith(`${marker.provider}-${marker.suite}-r`)
	)
		throw new Error("recovery marker identity mismatch");
	const reviewed = CREATEOS_REVIEWED_REJECTION;
	if (
		marker.provider !== reviewed.provider ||
		marker.suite !== reviewed.suite ||
		evidence.id !== reviewed.attemptId ||
		evidence.cellId !== reviewed.cellId ||
		evidence.workflowRun !== reviewed.workflowRun ||
		evidence.sha !== reviewed.sourceSha ||
		evidence.completion !== "unknown" ||
		marker.cause.detail !== reviewed.detail ||
		marker.reason !== `${CREATE_FAILURE_PREFIX}${reviewed.detail}` ||
		!evidence.diagnostic?.endsWith(reviewed.detail)
	)
		throw new Error(NO_REJECTION_EVIDENCE);
	return attempt;
}

/**
 * Append the ordinary not-allocated release for the reviewed CreateOS rejection, under exclusive
 * account ownership. It never calls a provider mutation and never rewrites the original attempt.
 */
export async function recoverRejectedCreate(options: {
	directory: string;
	provider: typeof providerIdSchema.infer;
	suite: typeof suiteNameSchema.infer;
	drivers?: readonly { readonly id: ProviderId; readonly driver: SandboxDriver }[];
	journal?: AccountJournal;
	/** Recheck that the original workflow terminated and no allocating workflows can run. */
	assertQuiescent?: (workflowRun: string, sourceSha: string) => Promise<void>;
	signal?: AbortSignal;
}): Promise<string> {
	const { evidence } = verifyRejectedCreate(options);
	const { journal, assertQuiescent, signal } = options;
	const driver = options.drivers?.length === 1 ? options.drivers[0] : undefined;
	if (!driver || driver.id !== options.provider || !journal || !assertQuiescent || !signal)
		throw new Error(
			"reviewed rejection recovery requires one provider driver, the journal and a signal",
		);
	const inventory = driver.driver.inventory;
	if (!inventory) throw new Error("reviewed rejection recovery requires a complete inventory");
	const account = quotaDomain(options.provider);
	const readIntent = async () => {
		const records = (await withinSignal(signal, () => journal.read(account)))
			.map((record) => accountRecordSchema.assert(record))
			.filter((record) => record.attempt === evidence.id);
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
	// Belt and braces beside the vendor contract: the account must hold no benchmark-owned
	// sandbox at all, in two complete inventories with a quiescence check between them, so even a
	// mistaken rejection could not leave an allocation behind the released intent.
	const assertNothingOwned = async () => {
		const { owned } = await withinSignal(signal, () => inventory.list());
		if (owned.length > 0)
			throw new Error(
				`${options.provider} account still holds ${owned.length} benchmark-owned sandbox(es); clean them up first`,
			);
	};
	const intent = await readIntent();
	await assertQuiescent(evidence.workflowRun, evidence.sha);
	await assertNothingOwned();
	await assertQuiescent(evidence.workflowRun, evidence.sha);
	await assertNothingOwned();
	const unchanged = await readIntent();
	if (JSON.stringify(unchanged) !== JSON.stringify(intent))
		throw new Error("journal changed during rejection recovery");
	signal.throwIfAborted();
	await withinSignal(signal, () =>
		journal.append(
			accountRecordSchema.assert({ ...intent, kind: "released", outcome: "not-allocated" }),
		),
	);
	return evidence.id;
}
