import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import { evidenceDigest, verifyCleanupRecovery } from "@sandbox-benchmarks/results";
import type { CleanupRecovery, ExperimentPlan, ProviderId } from "@sandbox-benchmarks/schema";
import { cleanupRecoverySchema, MODAL_CREATED_REQUEST_REVISION } from "@sandbox-benchmarks/schema";
import type { AccountJournal } from "./account-journal.ts";
import { accountRecordSchema, confirmRemoval, withinSignal } from "./account-journal.ts";
import { readExperimentAttempt, writeImmutableJson } from "./experiment-artifacts.ts";

/** Explicit post-run ownership recovery. No original receipt or measurement is rewritten. */
export async function recoverExperimentCleanup(options: {
	plan: ExperimentPlan;
	directory: string;
	operator: string;
	journal: AccountJournal;
	openDriver: (provider: ProviderId) => Promise<SandboxDriver>;
	/** Read-only, complete V1/V2 inventories twice, anchored to an original sandbox in this App. */
	observeModalApp: (anchorSandboxId: string) => Promise<CleanupRecovery["observation"]>;
	modalAnchor?: string;
	assertQuiescent: (runId: string, sha: string) => Promise<void>;
	signal: AbortSignal;
}): Promise<CleanupRecovery> {
	const attempt = readExperimentAttempt(options.directory);
	const { evidence } = attempt;
	const cell = options.plan.cells.find((cell) => cell.id === evidence.cellId);
	if (
		!cell ||
		evidence.cleanup !== "unresolved" ||
		evidence.outcome !== "failed" ||
		evidence.planDigest !== options.plan.digest ||
		evidence.sha !== options.plan.sha ||
		evidence.workflowRun !== options.plan.id ||
		!evidence.rawDigest ||
		!evidence.runDigest ||
		!attempt.run
	)
		throw new Error("recovery requires an original failed attempt with unresolved cleanup");
	const records = (await options.journal.read(cell.quotaDomain)).filter(
		(r) => r.attempt === evidence.id,
	);
	const intent = records.find((r) => r.kind === "intent");
	const allocation = records.find((r) => r.kind === "allocated");
	const release = records.find((r) => r.kind === "released");
	if (
		!intent ||
		records.some(
			(r) =>
				r.cellId !== cell.id ||
				r.planDigest !== options.plan.digest ||
				r.account !== cell.quotaDomain,
		)
	)
		throw new Error("cleanup recovery journal provenance mismatch");
	const previous =
		release?.outcome === "absent"
			? release.recovery
			: release?.outcome === "reconciled" && release.evidence.kind === "post-run-cleanup"
				? release.evidence
				: undefined;
	if (previous) {
		if (
			release?.outcome === "absent"
				? records.length !== 3 ||
					!allocation ||
					allocation.ref.id !== release.ref.id ||
					allocation.ref.provider !== release.ref.provider ||
					previous.observation.kind !== "sandbox" ||
					previous.observation.sandboxId !== release.ref.id ||
					previous.observation.provider !== release.ref.provider
				: records.length !== 2 || allocation || previous.observation.kind !== "modal-app"
		)
			throw new Error("existing cleanup recovery contradicts journal ownership");
		verifyCleanupRecovery(options.plan, { ...attempt, cleanupRecovery: previous });
		persist(previous);
		return previous;
	}
	if (release || records.length !== (allocation ? 2 : 1))
		throw new Error("cleanup recovery requires matching unresolved journal records");
	await options.assertQuiescent(evidence.workflowRun, evidence.sha);
	let observation: CleanupRecovery["observation"];
	if (allocation) {
		const retained = accountRecordSchema.assert(
			JSON.parse(readFileSync(join(options.directory, "raw", "allocation.json"), "utf8")),
		);
		if (
			evidenceDigest(retained) !== evidenceDigest(allocation) ||
			allocation.ref.provider !== cell.provider ||
			attempt.execution?.sandboxId !== allocation.ref.id
		)
			throw new Error("cleanup recovery allocation differs from original retained execution");
		const driver = await withinSignal(options.signal, () => options.openDriver(cell.provider));
		const probes = driver.probes;
		if (!probes) throw new Error("cleanup recovery requires control-plane probes");
		await confirmRemoval(driver, allocation.ref, options.signal);
		const state = await withinSignal(options.signal, () => probes.observe(allocation.ref));
		if (state.state === "running") throw new Error("sandbox became active during cleanup recovery");
		observation = {
			kind: "sandbox",
			provider: cell.provider,
			sandboxId: allocation.ref.id,
			state: state.state,
		};
	} else {
		if (
			cell.provider !== "modal-gvisor" ||
			cell.quotaDomain !== "modal" ||
			evidence.sha !== MODAL_CREATED_REQUEST_REVISION ||
			evidence.measurementStarted ||
			attempt.execution ||
			attempt.cleanup ||
			!options.modalAnchor ||
			existsSync(join(options.directory, "raw", "allocation.json"))
		)
			throw new Error("identifier-free recovery requires the reviewed Modal post-create failure");
		const anchor = options.modalAnchor;
		observation = await withinSignal(options.signal, () => options.observeModalApp(anchor));
		if (observation.kind !== "modal-app") throw new Error("missing complete Modal App observation");
	}
	const recovery = cleanupRecoverySchema.assert({
		kind: "post-run-cleanup",
		attemptId: evidence.id,
		cellId: evidence.cellId,
		planDigest: options.plan.digest,
		attemptDigest: evidenceDigest(evidence),
		workflowRun: evidence.workflowRun,
		sourceSha: evidence.sha,
		confirmedAt: new Date().toISOString(),
		operator: options.operator,
		observation,
	});
	verifyCleanupRecovery(options.plan, { ...attempt, cleanupRecovery: recovery });
	await options.assertQuiescent(evidence.workflowRun, evidence.sha);
	const current = (await options.journal.read(cell.quotaDomain)).filter(
		(r) => r.attempt === evidence.id,
	);
	if (evidenceDigest(current) !== evidenceDigest(records))
		throw new Error("journal changed during cleanup recovery");
	options.signal.throwIfAborted();
	await withinSignal(options.signal, () =>
		options.journal.append(
			accountRecordSchema.assert(
				allocation
					? { ...intent, kind: "released", outcome: "absent", ref: allocation.ref, recovery }
					: { ...intent, kind: "released", outcome: "reconciled", evidence: recovery },
			),
		),
	);
	persist(recovery);
	return recovery;

	function persist(recovery: CleanupRecovery) {
		const path = join(options.directory, "cleanup-recovery.json");
		if (existsSync(path)) {
			if (evidenceDigest(JSON.parse(readFileSync(path, "utf8"))) !== evidenceDigest(recovery))
				throw new Error("local cleanup recovery conflicts with durable journal");
		} else writeImmutableJson(path, recovery);
	}
}
