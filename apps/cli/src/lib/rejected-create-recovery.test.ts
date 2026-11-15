import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import { evidenceDigest } from "@sandbox-benchmarks/results";
import type { ExperimentAttempt } from "@sandbox-benchmarks/schema";
import type { AccountRecord } from "./account-journal.ts";
import { rawTreeDigest } from "./experiment-artifacts.ts";
import { CREATEOS_REVIEWED_REJECTION, recoverRejectedCreate } from "./rejected-create-recovery.ts";

const SOURCE = "b".repeat(40);
const directories: string[] = [];
afterEach(() => {
	for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture(provider: "tama" | "runcloud" | "createos" = "tama") {
	const directory = mkdtempSync(join(tmpdir(), "rejected-create-"));
	directories.push(directory);
	const raw = join(directory, "raw");
	mkdirSync(join(raw, provider, "realworld-openclaw"), { recursive: true });
	const marker = join(
		raw,
		provider,
		"realworld-openclaw",
		`sandbox-${provider}-realworld-openclaw--failed.json`,
	);
	writeFileSync(
		marker,
		JSON.stringify({
			provider: provider,
			suite: "realworld-openclaw",
			outcome: "failed",
			reason: "Failed to create sandbox: tama new bench-1 …: exit 1; failed to provision",
			cause: { kind: "sandbox-create-failed", detail: "bench-1 failed to provision" },
		}),
	);
	const reviewed = CREATEOS_REVIEWED_REJECTION;
	if (provider === "createos")
		writeFileSync(
			marker,
			JSON.stringify({
				provider,
				suite: "realworld-openclaw",
				outcome: "failed",
				reason: `Failed to create sandbox: ${reviewed.detail}`,
				cause: { kind: "sandbox-create-failed", detail: reviewed.detail },
			}),
		);
	const source = provider === "createos" ? reviewed.sourceSha : SOURCE;
	const workflowRun = provider === "createos" ? reviewed.workflowRun : "456";
	const run = {
		schemaVersion: "6",
		runId: workflowRun,
		sha: source,
		generatedAt: "2026-09-12T00:00:00Z",
		targetSpec: { vcpus: 4, memoryGb: 8 },
		providers: [],
	};
	writeFileSync(join(directory, "run.json"), JSON.stringify(run));
	const evidence: ExperimentAttempt = {
		schemaVersion: "1",
		id: provider === "createos" ? reviewed.attemptId : "attempt-1",
		cellId: provider === "createos" ? reviewed.cellId : `${provider}-realworld-openclaw-r4`,
		planDigest: `sha256:${"a".repeat(64)}`,
		sha: source,
		workloadRevision: "realworld-openclaw",
		environmentRevision: "env",
		artifactIdentity: "image",
		passes: 1,
		workflowRun,
		workflowAttempt: 1,
		job: "bench",
		sequence: 0,
		outcome: "failed",
		measurementStarted: false,
		retryable: false,
		cleanup: "unresolved",
		completion: "unknown",
		runDigest: evidenceDigest(run),
		rawDigest: rawTreeDigest(raw),
		...(provider === "createos" && {
			diagnostic: `Suite "realworld-openclaw" failed on createos — recorded as a failed gap in run.json: ${reviewed.detail}`,
		}),
	};
	const save = () => writeFileSync(join(directory, "attempt.json"), JSON.stringify(evidence));
	save();
	const records: AccountRecord[] = [
		{
			version: "1",
			kind: "intent",
			account: provider,
			attempt: evidence.id,
			cellId: evidence.cellId,
			planDigest: evidence.planDigest,
		},
	];
	const events: string[] = [];
	let owned: SandboxRefList = [];
	const driver: SandboxDriver = {
		create: async () => {
			throw new Error("must not allocate");
		},
		inventory: {
			list: async () => {
				events.push("inventory");
				return { owned, foreignCount: 0 };
			},
		},
		probes: { observe: async () => ({ state: "absent" }) },
		destroyById: async () => {
			owned = [];
		},
	};
	const journal = {
		read: async () => records,
		append: async (record: AccountRecord) => {
			events.push("release");
			records.push(record);
		},
	};
	const options = {
		directory,
		provider: provider,
		suite: "realworld-openclaw" as const,
		drivers: [{ id: provider, driver }],
		journal,
		assertQuiescent: async () => {
			events.push("quiescent");
		},
		signal: AbortSignal.timeout(1000),
	};
	return {
		options,
		records,
		events,
		evidence,
		save,
		marker,
		driver,
		hold: (refs: SandboxRefList) => {
			owned = refs;
		},
	};
}
type SandboxRefList = { provider: "tama" | "runcloud" | "createos"; id: string }[];

test("the reviewed CreateOS 503 rejection releases its intent after two empty inventories", async () => {
	const f = fixture("createos");
	const original = readFileSync(join(f.options.directory, "attempt.json"), "utf8");
	expect(await recoverRejectedCreate(f.options)).toBe(CREATEOS_REVIEWED_REJECTION.attemptId);
	expect(f.events).toEqual(["quiescent", "inventory", "quiescent", "inventory", "release"]);
	expect(f.records.at(-1)).toMatchObject({
		kind: "released",
		outcome: "not-allocated",
		account: "createos",
		attempt: CREATEOS_REVIEWED_REJECTION.attemptId,
		cellId: CREATEOS_REVIEWED_REJECTION.cellId,
	});
	expect(readFileSync(join(f.options.directory, "attempt.json"), "utf8")).toBe(original);
});

test("the reviewed CreateOS rejection refuses while the account holds a benchmark sandbox", async () => {
	const f = fixture("createos");
	f.hold([{ provider: "createos", id: "sb-leftover" }]);
	await expect(recoverRejectedCreate(f.options)).rejects.toThrow("still holds 1");
	expect(f.records).toHaveLength(1);
});

for (const change of ["attempt", "detail", "source", "released", "no-journal"] as const) {
	test(`the CreateOS exception does not stretch to a changed ${change}`, async () => {
		const f = fixture("createos");
		if (change === "attempt") {
			f.evidence.id = "createos-realworld-openclaw-r7-a1-00000000-0000-0000-0000-000000000000";
			f.save();
		}
		if (change === "source") {
			f.evidence.sha = SOURCE;
			f.save();
		}
		if (change === "detail") {
			const marker = JSON.parse(readFileSync(f.marker, "utf8"));
			marker.cause.detail = "computesdk create failed: gateway timeout";
			marker.reason = `Failed to create sandbox: ${marker.cause.detail}`;
			writeFileSync(f.marker, JSON.stringify(marker));
			f.evidence.rawDigest = rawTreeDigest(join(f.options.directory, "raw"));
			f.save();
		}
		if (change === "released")
			f.records.push({
				version: "1",
				kind: "released",
				outcome: "not-allocated",
				account: "createos",
				attempt: f.evidence.id,
				cellId: f.evidence.cellId,
				planDigest: f.evidence.planDigest,
			});
		const options = change === "no-journal" ? { ...f.options, journal: undefined } : f.options;
		await expect(recoverRejectedCreate(options)).rejects.toThrow();
		expect(f.records.filter((record) => record.kind === "released")).toHaveLength(
			change === "released" ? 1 : 0,
		);
		if (change !== "released") expect(f.events).not.toContain("release");
	});
}

test("legacy rejection prose cannot authorize an inventory-based release", async () => {
	const f = fixture();
	const original = readFileSync(join(f.options.directory, "attempt.json"), "utf8");
	await expect(recoverRejectedCreate(f.options)).rejects.toThrow(
		"does not prove a definitive create rejection",
	);
	expect(f.events).toEqual([]);
	expect(f.records).toHaveLength(1);
	expect(readFileSync(join(f.options.directory, "attempt.json"), "utf8")).toBe(original);
});

test("refuses an account still holding an owned sandbox — the create was not cleanly rejected", async () => {
	const f = fixture();
	f.hold([{ provider: "tama", id: "bench-1" }]);
	await expect(recoverRejectedCreate(f.options)).rejects.toThrow(
		/does not prove a definitive create rejection/,
	);
	expect(f.events).toEqual([]);
	expect(f.records).toHaveLength(1);
});

test("defers to identity-based recovery when the attempt retained an allocation", async () => {
	const f = fixture();
	writeFileSync(
		join(f.options.directory, "raw", "allocation.json"),
		JSON.stringify({
			version: "1",
			kind: "allocated",
			account: "tama",
			attempt: f.evidence.id,
			cellId: f.evidence.cellId,
			planDigest: f.evidence.planDigest,
			ref: { provider: "tama", id: "bench-1" },
		}),
	);
	// The retained allocation is part of the raw tree, so its digest covers it.
	f.evidence.rawDigest = rawTreeDigest(join(f.options.directory, "raw"));
	f.save();
	await expect(recoverRejectedCreate(f.options)).rejects.toThrow(/recover-allocated-intent/);
	expect(f.records).toHaveLength(1);
});

for (const change of [
	"measured",
	"resolved",
	"marker",
	"identity",
	"released",
	"variant",
] as const) {
	test(`refuses to clear a ${change} attempt`, async () => {
		const f = fixture();
		if (change === "measured") {
			f.evidence.measurementStarted = true;
			f.save();
		}
		if (change === "resolved") {
			f.evidence.cleanup = "confirmed";
			f.save();
		}
		if (change === "marker")
			writeFileSync(
				f.marker,
				JSON.stringify({
					provider: "tama",
					suite: "realworld-openclaw",
					outcome: "failed",
					reason: "teardown failed",
					cause: { kind: "sandbox-teardown-failed", detail: "teardown failed" },
				}),
			);
		if (change === "identity") {
			f.evidence.cellId = "tama-memory-r4";
			f.save();
		}
		if (change === "released")
			f.records.push({
				version: "1",
				kind: "released",
				outcome: "not-allocated",
				account: "tama",
				attempt: f.evidence.id,
				cellId: f.evidence.cellId,
				planDigest: f.evidence.planDigest,
			});
		const options =
			change === "variant"
				? { ...f.options, drivers: [...f.options.drivers, ...f.options.drivers] }
				: f.options;
		await expect(recoverRejectedCreate(options)).rejects.toThrow();
		expect(f.records.filter((record) => record.kind === "released")).toHaveLength(
			change === "released" ? 1 : 0,
		);
	});
}

test("ambiguous Runcloud creates remain blocked despite empty inventory", async () => {
	const f = fixture("runcloud");
	const marker = JSON.parse(readFileSync(f.marker, "utf8"));
	marker.reason = marker.cause.detail =
		"failed to clean up runcloud sandbox by name sandbox-benchmarks-late after create failure";
	writeFileSync(f.marker, JSON.stringify(marker));
	f.evidence.rawDigest = rawTreeDigest(join(f.options.directory, "raw"));
	f.save();
	const original = readFileSync(join(f.options.directory, "attempt.json"), "utf8");
	await expect(recoverRejectedCreate(f.options)).rejects.toThrow(
		"does not prove a definitive create rejection",
	);
	f.hold([{ provider: "runcloud", id: "sb-late" }]);
	expect(f.records).toHaveLength(1);
	expect(f.events).toEqual([]);
	expect(readFileSync(join(f.options.directory, "attempt.json"), "utf8")).toBe(original);
});
