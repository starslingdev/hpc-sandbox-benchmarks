import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import { CREATE_FAILURE_PREFIX } from "@sandbox-benchmarks/harness";
import type { ProviderId, SuiteName } from "@sandbox-benchmarks/schema";
import { providerIdSchema, quotaDomain, suiteNameSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { AccountJournal } from "./account-journal.ts";
import { accountRecordSchema, withinSignal } from "./account-journal.ts";
import { readExperimentAttempt } from "./experiment-artifacts.ts";

/**
 * Name-free ambiguous creates cannot be cleared from empty inventory in general (ADR-0019,
 * ADR-0025). The reviewed exceptions (ADR-0028) are pinned to exact attempts from CPU run
 * 43793708054 and still require two complete inventories that hold no benchmark-owned sandbox.
 */
const failedMarker = type({
	provider: providerIdSchema,
	suite: suiteNameSchema,
	outcome: "'failed'",
	reason: "string >= 1",
	cause: { kind: "'sandbox-create-failed'", detail: "string >= 1" },
}).onUndeclaredKey("delete");

const RUNCLOUD_SETTLE_DETAIL =
	"computesdk create failed: run.cloud create did not settle within 30000ms; cleanup failed: runcloud ComputeSDK failed-create recovery cleanup callback failed";
const FREESTYLE_502_DETAIL =
	"computesdk create failed: Freestyle background request returned HTTP 502; operation outcome is unconfirmed; cleanup failed: freestyle ComputeSDK failed-create recovery cleanup callback failed";

/** Reviewed name-free ambiguous creates from CPU run 43793708054 (ADR-0028). */
export const AMBIGUOUS_CREATE_INVENTORY_CLEARANCES = Object.freeze([
	{
		provider: "runcloud",
		suite: "cpu-node",
		attemptId: "runcloud-cpu-node-r1-a1-034455b4-d224-43ee-840e-6ef0b32a55fa",
		cellId: "runcloud-cpu-node-r1",
		workflowRun: "43793708054",
		sourceSha: "606c3e9eb4d3f83ac5f9d15ed2b04f80b8878467",
		detail: RUNCLOUD_SETTLE_DETAIL,
	},
	{
		provider: "runcloud",
		suite: "system",
		attemptId: "runcloud-system-r0-a1-fd39aec5-fedf-46a7-8051-16020fec756f",
		cellId: "runcloud-system-r0",
		workflowRun: "43793708054",
		sourceSha: "606c3e9eb4d3f83ac5f9d15ed2b04f80b8878467",
		detail: RUNCLOUD_SETTLE_DETAIL,
	},
	{
		provider: "freestyle",
		suite: "memory",
		attemptId: "freestyle-memory-r0-a1-9cdb4aab-8254-49c2-a03d-b34e5c97fb24",
		cellId: "freestyle-memory-r0",
		workflowRun: "43793708054",
		sourceSha: "606c3e9eb4d3f83ac5f9d15ed2b04f80b8878467",
		detail: FREESTYLE_502_DETAIL,
	},
	{
		provider: "freestyle",
		suite: "memory",
		attemptId: "freestyle-memory-r2-a1-a3f40368-e3d6-49a2-8bfd-dd4d54e9d5eb",
		cellId: "freestyle-memory-r2",
		workflowRun: "43793708054",
		sourceSha: "606c3e9eb4d3f83ac5f9d15ed2b04f80b8878467",
		detail: FREESTYLE_502_DETAIL,
	},
] as const);

export type AmbiguousCreateInventoryClearance =
	(typeof AMBIGUOUS_CREATE_INVENTORY_CLEARANCES)[number];

const NO_REVIEWED_EVIDENCE =
	"original evidence is not a reviewed name-free ambiguous create (ADR-0028); " +
	"inventory cannot clear an unreviewed or named/allocated intent. " +
	"Keep it unresolved pending identity-based recovery or its own review.";

/**
 * Validate the original artifact without credentials. Returns the attempt only for a reviewed
 * ADR-0028 case; every other attempt fails closed before any provider or journal is opened.
 */
export function verifyAmbiguousCreateInventory(options: {
	directory: string;
	provider: ProviderId;
	suite: SuiteName;
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
		throw new Error("attempt does not prove an unresolved pre-execution create failure");
	if (existsSync(join(options.directory, "raw", "allocation.json")))
		throw new Error("attempt retains allocation.json; recover with recover-allocated-intent");
	const marker = failedMarker.assert(
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
	const reviewed = AMBIGUOUS_CREATE_INVENTORY_CLEARANCES.find(
		(entry) =>
			entry.provider === options.provider &&
			entry.suite === options.suite &&
			entry.attemptId === evidence.id &&
			entry.cellId === evidence.cellId &&
			entry.workflowRun === evidence.workflowRun &&
			entry.sourceSha === evidence.sha &&
			entry.detail === marker.cause.detail &&
			evidence.completion === "unknown" &&
			marker.reason === `${CREATE_FAILURE_PREFIX}${entry.detail}` &&
			evidence.diagnostic?.endsWith(entry.detail),
	);
	if (!reviewed) throw new Error(NO_REVIEWED_EVIDENCE);
	return { attempt, reviewed };
}

/**
 * Append the ordinary not-allocated release for a reviewed ADR-0028 attempt, under exclusive
 * account ownership. It never calls a provider mutation and never rewrites the original attempt.
 */
export async function recoverAmbiguousCreateInventory(options: {
	directory: string;
	provider: ProviderId;
	suite: SuiteName;
	drivers?: readonly { readonly id: ProviderId; readonly driver: SandboxDriver }[];
	journal?: AccountJournal;
	assertQuiescent?: (workflowRun: string, sourceSha: string) => Promise<void>;
	signal?: AbortSignal;
}): Promise<string> {
	const { attempt, reviewed } = verifyAmbiguousCreateInventory(options);
	const { evidence } = attempt;
	const { journal, assertQuiescent, signal } = options;
	const driver = options.drivers?.length === 1 ? options.drivers[0] : undefined;
	if (!driver || driver.id !== options.provider || !journal || !assertQuiescent || !signal)
		throw new Error(
			"reviewed inventory clearance requires one provider driver, the journal and a signal",
		);
	const inventory = driver.driver.inventory;
	if (!inventory) throw new Error("reviewed inventory clearance requires a complete inventory");
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
		throw new Error("journal changed during inventory clearance");
	signal.throwIfAborted();
	await withinSignal(signal, () =>
		journal.append(
			accountRecordSchema.assert({ ...intent, kind: "released", outcome: "not-allocated" }),
		),
	);
	return reviewed.attemptId;
}
