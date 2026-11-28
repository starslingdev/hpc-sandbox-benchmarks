import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import { CREATE_FAILURE_PREFIX } from "@sandbox-benchmarks/harness";
import { evidenceDigest } from "@sandbox-benchmarks/results";
import type { ProviderId, SuiteName } from "@sandbox-benchmarks/schema";
import { providerIdSchema, quotaDomain, suiteNameSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { AccountJournal } from "./account-journal.ts";
import { accountRecordSchema, withinSignal } from "./account-journal.ts";
import { readExperimentAttempt } from "./experiment-artifacts.ts";
import {
	readTangleVendorAttestation,
	reviewedTangleCleanup,
	tangleInventoryClearanceEvidence,
} from "./reviewed-tangle-cleanup.ts";

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

// CPU run 43863642458 retained each pre-POST name, but the name changes nothing about the proof:
// two complete inventories with no benchmark-owned sandbox cover a landed create under any name.
const RUNCLOUD_NAMED_TIMEOUT_DETAIL =
	"run.cloud create failed ambiguously (The operation timed out.) and reconciliation could not establish its outcome (no allocation visible during reconciliation), so it is unknown whether a sandbox was allocated; if one was it carries the name sandbox-benchmarks-eaaaa782-5155-43bd-a97c-26f514a4b238 and manual cleanup may be required; cleanup failed: runcloud ComputeSDK failed-create recovery cleanup callback failed";
const freestyleNamedDetail = (failure: string, slug: string) =>
	`computesdk create failed: ${failure}; if a VM was allocated it carries the slug ${slug}; cleanup failed: freestyle ComputeSDK failed-create recovery cleanup callback failed`;

/** Reviewed ambiguous creates from CPU runs 43793708054, 43859473792, 43863642458 and 45952135262 (ADR-0028). */
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
	{
		provider: "freestyle",
		suite: "system",
		attemptId: "freestyle-system-r0-a1-7a215e9a-f7f6-41eb-9d66-b85811031768",
		cellId: "freestyle-system-r0",
		workflowRun: "43859473792",
		sourceSha: "987b4cba3eb94e92d52af5c9f45cd07c9f0538d8",
		detail: "Sandbox creation timed out; allocation ownership unresolved",
	},
	{
		provider: "runcloud",
		suite: "memory",
		attemptId: "runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be",
		cellId: "runcloud-memory-r1",
		workflowRun: "43863642458",
		sourceSha: "8d58408dc4ca36bfae7d9eb83be4b21963562311",
		detail: RUNCLOUD_NAMED_TIMEOUT_DETAIL,
	},
	{
		provider: "freestyle",
		suite: "realworld-mastra",
		attemptId: "freestyle-realworld-mastra-r0-a1-49a9e56f-2817-4eca-ad21-813e3ce01723",
		cellId: "freestyle-realworld-mastra-r0",
		workflowRun: "43863642458",
		sourceSha: "8d58408dc4ca36bfae7d9eb83be4b21963562311",
		detail: freestyleNamedDetail(
			"The operation timed out.",
			"sandbox-benchmarks-e59efef3-38d3-476b-a984-b6cfa6994be6",
		),
	},
	{
		provider: "freestyle",
		suite: "realworld-mastra",
		attemptId: "freestyle-realworld-mastra-r1-a1-f8dcceaa-d91c-4bb8-bc6e-8d8569b35350",
		cellId: "freestyle-realworld-mastra-r1",
		workflowRun: "43863642458",
		sourceSha: "8d58408dc4ca36bfae7d9eb83be4b21963562311",
		detail: freestyleNamedDetail(
			"The operation timed out.",
			"sandbox-benchmarks-aed6332b-e041-4ec1-90c2-704f07d66b21",
		),
	},
	{
		provider: "freestyle",
		suite: "realworld-mastra",
		attemptId: "freestyle-realworld-mastra-r5-a1-fb1876ee-acc1-402c-b9d0-9575d7674f27",
		cellId: "freestyle-realworld-mastra-r5",
		workflowRun: "43863642458",
		sourceSha: "8d58408dc4ca36bfae7d9eb83be4b21963562311",
		detail: freestyleNamedDetail(
			"The operation timed out.",
			"sandbox-benchmarks-b76a507c-7d60-4438-8a28-ae37e0a939d0",
		),
	},
	{
		provider: "freestyle",
		suite: "realworld-mastra",
		attemptId: "freestyle-realworld-mastra-r7-a1-6c4c6e94-485a-4d99-8646-1bb05c775be6",
		cellId: "freestyle-realworld-mastra-r7",
		workflowRun: "43863642458",
		sourceSha: "8d58408dc4ca36bfae7d9eb83be4b21963562311",
		detail: freestyleNamedDetail(
			"Freestyle background request returned HTTP 409; operation outcome is unconfirmed",
			"sandbox-benchmarks-afe780f1-5f40-48c6-9cc1-e9f331cab7b3",
		),
	},
	{
		// The v2 image was never baked for this variant, so create was refused before allocation.
		provider: "daytona-vm-arm",
		suite: "memory",
		attemptId: "daytona-vm-arm-memory-r0-a1-492db90a-a65c-44af-86bb-74f21e6f71a7",
		cellId: "daytona-vm-arm-memory-r0",
		workflowRun: "45952135262",
		sourceSha: "f26ecf06029e1224930d8602d8e952fede4c4aa6",
		detail:
			"computesdk create failed: image 'sandbox-benchmarks-toolchain-v9-arm' not found; cleanup failed: daytona-vm-arm ComputeSDK failed-create recovery cleanup callback failed",
	},
	reviewedTangleCleanup,
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
	vendorAttestation?: string;
	/** Reviewed Tangle only: clear on two empty inventories when the vendor receipt is unavailable. */
	inventoryOnly?: { operator: string };
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
	if (reviewed.provider === "tangle") {
		if (evidenceDigest(evidence) !== reviewed.attemptDigest)
			throw new Error("Tangle attempt differs from the reviewed artifact");
		const { inventoryOnly } = options;
		if (inventoryOnly) {
			if (options.vendorAttestation)
				throw new Error("choose the vendor attestation or inventory-only clearance, not both");
			return {
				attempt,
				reviewed,
				releaseEvidence: (confirmedAt: string) =>
					tangleInventoryClearanceEvidence(inventoryOnly.operator, confirmedAt),
			};
		}
		const attestation = readTangleVendorAttestation(options.vendorAttestation);
		return { attempt, reviewed, attestation, releaseEvidence: attestation.releaseEvidence };
	}
	if (options.vendorAttestation || options.inventoryOnly)
		throw new Error(
			"vendor attestation and inventory-only clearance only apply to the reviewed Tangle attempt",
		);
	return { attempt, reviewed };
}

/**
 * Release one reviewed ADR-0028 intent under exclusive account ownership. A Tangle dispatch
 * releases as `reconciled` on its vendor receipt or, inventory-only, on the operator's
 * confirmation. Name-free inventory clearances keep their original outcome.
 */
export async function recoverAmbiguousCreateInventory(options: {
	directory: string;
	provider: ProviderId;
	suite: SuiteName;
	vendorAttestation?: string;
	inventoryOnly?: { operator: string };
	observeTangleCustomer?: () => Promise<string>;
	drivers?: readonly { readonly id: ProviderId; readonly driver: SandboxDriver }[];
	journal?: AccountJournal;
	assertQuiescent?: (workflowRun: string, sourceSha: string) => Promise<void>;
	signal?: AbortSignal;
}): Promise<string> {
	const { attempt, reviewed, attestation, releaseEvidence } =
		verifyAmbiguousCreateInventory(options);
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
		if (attestation) {
			const probes = driver.driver.probes;
			if (!probes) throw new Error("Tangle resource absence requires authenticated probes");
			const observeCustomer = options.observeTangleCustomer;
			if (!observeCustomer) throw new Error("missing Tangle account identity observer");
			attestation.assertCustomer(await withinSignal(signal, observeCustomer));
			const observed = await withinSignal(signal, () =>
				probes.observe({ provider: "tangle", id: attestation.sandboxId }).catch(() => {
					// An SDK error may echo the private resource ID in the request URL.
					throw new Error("Tangle could not verify the attested resource");
				}),
			);
			if (observed.state !== "absent")
				throw new Error("the attested Tangle resource is still visible");
		}
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
	if (releaseEvidence) await assertQuiescent(evidence.workflowRun, evidence.sha);
	const unchanged = await readIntent();
	if (JSON.stringify(unchanged) !== JSON.stringify(intent))
		throw new Error("journal changed during inventory clearance");
	signal.throwIfAborted();
	const release = releaseEvidence
		? { outcome: "reconciled", evidence: releaseEvidence(new Date().toISOString()) }
		: { outcome: "not-allocated" };
	await withinSignal(signal, () =>
		journal.append(accountRecordSchema.assert({ ...intent, kind: "released", ...release })),
	);
	return reviewed.attemptId;
}
