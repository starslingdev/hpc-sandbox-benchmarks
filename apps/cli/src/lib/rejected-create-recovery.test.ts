import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxDriver } from "@sandbox-benchmarks/driver";
import { evidenceDigest } from "@sandbox-benchmarks/results";
import type { ExperimentAttempt } from "@sandbox-benchmarks/schema";
import type { AccountRecord } from "./account-journal.ts";
import { rawTreeDigest } from "./experiment-artifacts.ts";
import { recoverRejectedCreate } from "./rejected-create-recovery.ts";

const SOURCE = "b".repeat(40);
const directories: string[] = [];
afterEach(() => {
	for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture(provider: "tama" | "runcloud" = "tama") {
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
	const run = {
		schemaVersion: "6",
		runId: "456",
		sha: SOURCE,
		generatedAt: "2026-09-12T00:00:00Z",
		targetSpec: { vcpus: 4, memoryGb: 8 },
		providers: [],
	};
	writeFileSync(join(directory, "run.json"), JSON.stringify(run));
	const evidence: ExperimentAttempt = {
		schemaVersion: "1",
		id: "attempt-1",
		cellId: `${provider}-realworld-openclaw-r4`,
		planDigest: `sha256:${"a".repeat(64)}`,
		sha: SOURCE,
		workloadRevision: "realworld-openclaw",
		environmentRevision: "env",
		artifactIdentity: "image",
		passes: 1,
		workflowRun: "456",
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
type SandboxRefList = { provider: "tama" | "runcloud"; id: string }[];

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
