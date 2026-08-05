// The promote fan-out's merge is the one place the split release lane could silently differ from the
// monolithic `bake --promote`: thirteen concurrent steps each write a fragment, and `commit` has to
// reassemble them into the report list promoteAll() would have produced — same providers, same order,
// same statuses — before the gates run over it and the payload is uploaded. These tests pin that.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasVersionArtifact, PROVIDERS } from "@sandbox-benchmarks/schema";
import type { BakeReport } from "../lib/bake/types.ts";
import { mergeFragments } from "./promote-phase.ts";

const ALL = PROVIDERS.map((provider) => provider.id);

/** A fragment directory populated from a spec, mirroring what the workflow's steps leave behind. */
function fragments(
	validate: Partial<Record<string, BakeReport>>,
	artifact: Partial<Record<string, BakeReport>> = {},
): string {
	const dir = mkdtempSync(join(tmpdir(), "promote-fragments-"));
	mkdirSync(dir, { recursive: true });
	for (const [provider, report] of Object.entries(validate)) {
		writeFileSync(join(dir, `validate-${provider}.json`), JSON.stringify(report));
	}
	for (const [provider, report] of Object.entries(artifact)) {
		writeFileSync(join(dir, `artifact-${provider}.json`), JSON.stringify(report));
	}
	return dir;
}

const ok = (provider: string): BakeReport => ({ provider, status: "ok" });

describe("mergeFragments", () => {
	test("an all-green run reports every requested provider exactly once, in registry order", () => {
		const dir = fragments(
			Object.fromEntries(ALL.map((id) => [id, ok(id)])),
			Object.fromEntries(ALL.filter((id) => hasVersionArtifact(id)).map((id) => [id, ok(id)])),
		);
		const { reports, missing } = mergeFragments(dir, ALL);
		expect(missing).toEqual([]);
		expect(reports.map((r) => r.provider)).toEqual(ALL);
		expect(reports.every((r) => r.status === "ok")).toBe(true);
	});

	test("providers rejected at re-validation come first, then the artifact outcomes", () => {
		// This is promoteAll()'s order: `promotionScope.rejected` is pushed before the step-3 runs. An
		// operator diffing two payloads across the change must not see the entries move.
		const failed: BakeReport = { provider: "e2b", status: "failed", reason: "smoke failed" };
		const dir = fragments(
			{ e2b: failed, "modal-vm": ok("modal-vm"), novita: ok("novita") },
			{ novita: ok("novita") },
		);
		const { reports } = mergeFragments(dir, ["e2b", "modal-vm", "novita"]);
		expect(reports.map((r) => r.provider)).toEqual(["e2b", "modal-vm", "novita"]);
		expect(reports[0]).toEqual(failed);
	});

	test("a provider that failed re-validation gets no artifact entry, only its rejection", () => {
		// The exclusion promotionScopeAfterValidation() performs between steps 2 and 3: a best-effort
		// provider that did not re-validate must not have a version artifact published for it.
		const dir = fragments({ e2b: { provider: "e2b", status: "failed", reason: "boom" } });
		const { reports } = mergeFragments(dir, ["e2b"]);
		expect(reports).toHaveLength(1);
		expect(reports[0]?.status).toBe("failed");
	});

	test("a skipped provider is carried through as skipped, not silently dropped", () => {
		const skipped: BakeReport = {
			provider: "novita",
			status: "skipped",
			reason: "missing NOVITA_API_KEY",
		};
		const dir = fragments({ novita: skipped });
		const { reports } = mergeFragments(dir, ["novita"]);
		expect(reports).toEqual([skipped]);
	});

	test("a provider with no version artifact is recorded ok without needing an artifact step", () => {
		// The seven providers that boot the published base by ref have no `artifact` step in the
		// workflow at all; their step-3 branch is a log line, and the merge stands in for it.
		const bootsOnly = ALL.find((id) => !hasVersionArtifact(id));
		if (bootsOnly === undefined) throw new Error("every provider has an artifact");
		const dir = fragments({ [bootsOnly]: ok(bootsOnly) });
		const { reports, missing } = mergeFragments(dir, [bootsOnly]);
		expect(missing).toEqual([]);
		expect(reports).toEqual([{ provider: bootsOnly, status: "ok" }]);
	});

	test("a missing re-validation fragment is a FAILURE, never an absent provider", () => {
		// A cancelled or crashed step leaves no file. Treating that as "not visited" would shrink the
		// set the required-providers gate runs over — a release that verified nothing looking like a
		// release that passed. It must read as no verdict, which is a failure.
		const { reports, missing } = mergeFragments(fragments({}), ["e2b"]);
		expect(missing).toEqual(["e2b"]);
		expect(reports).toEqual([
			{ provider: "e2b", status: "failed", reason: "candidate re-validation produced no result" },
		]);
	});

	test("a missing artifact fragment for an artifact-bearing provider is also a FAILURE", () => {
		const dir = fragments({ e2b: ok("e2b") });
		const { reports, missing } = mergeFragments(dir, ["e2b"]);
		expect(missing).toEqual(["e2b"]);
		expect(reports[0]?.status).toBe("failed");
		expect(reports[0]?.reason).toContain("version artifact");
	});

	test("only the requested scope is reported — a backfill says nothing about the fleet", () => {
		// A scoped promote backfills onto a published version and must not claim a verdict for the
		// providers it never touched.
		const dir = fragments(
			Object.fromEntries(ALL.map((id) => [id, ok(id)])),
			Object.fromEntries(ALL.filter((id) => hasVersionArtifact(id)).map((id) => [id, ok(id)])),
		);
		const { reports } = mergeFragments(dir, ["runloop"]);
		expect(reports.map((r) => r.provider)).toEqual(["runloop"]);
	});

	test("durationMs and reason survive the round trip", () => {
		const detailed: BakeReport = {
			provider: "daytona-vm",
			status: "failed",
			reason: "snapshot create failed",
			durationMs: 1234,
		};
		const dir = fragments({ "daytona-vm": detailed });
		expect(mergeFragments(dir, ["daytona-vm"]).reports[0]).toEqual(detailed);
	});
});
