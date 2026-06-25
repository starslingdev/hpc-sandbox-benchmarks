import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleRun } from "./bin/assemble-run.ts";

/** Lay down a file (creating parents) under `root`. */
function put(root: string, rel: string, body = "x"): void {
	const path = join(root, rel);
	mkdirSync(join(path, ".."), { recursive: true });
	writeFileSync(path, body);
}

describe("assembleRun", () => {
	it("merges per-cell artifacts into one dir per provider, curates, and stamps run.json", () => {
		const tmp = mkdtempSync(join(tmpdir(), "assemble-run-"));
		const artifactsDir = join(tmp, "artifacts");
		const destDir = join(tmp, "raw", "42");

		// Two suites for daytona (merge into one provider dir), one for e2b, plus a planner skip for modal.
		put(artifactsDir, "benchmark-results-cpu-node-sandbox-daytona/pts_node.xml");
		put(artifactsDir, "benchmark-results-cpu-node-sandbox-daytona/run.log"); // curated away
		put(artifactsDir, "benchmark-results-disk-sandbox-daytona/disk.json");
		put(artifactsDir, "benchmark-results-cpu-node-sandbox-e2b/pts_node.xml");
		put(artifactsDir, "benchmark-results-cpu-node-sandbox-e2b/.DS_Store"); // curated away
		put(artifactsDir, "setup-skips/modal/sandbox-modal-cpu-node--skipped.json", '{"skipped":true}');
		// An unrelated artifact (e.g. the summary) must not become a provider dir.
		put(artifactsDir, "some-other-artifact/notes.txt");

		const result = assembleRun({
			artifactsDir,
			destDir,
			runId: "42",
			sha: "deadbeef",
			sourceRunUrl: "http://example/run/42",
		});

		// One dir per contributing provider; the unrelated artifact is ignored.
		expect(result.providers).toEqual(["daytona", "e2b", "modal"]);
		expect(new Set(readdirSync(destDir))).toEqual(new Set(["daytona", "e2b", "modal", "run.json"]));

		// daytona's two suites merged; logs/OS cruft dropped everywhere.
		expect(new Set(readdirSync(join(destDir, "daytona")))).toEqual(
			new Set(["pts_node.xml", "disk.json"]),
		);
		expect(readdirSync(join(destDir, "e2b"))).toEqual(["pts_node.xml"]);
		expect(readdirSync(join(destDir, "modal"))).toEqual(["sandbox-modal-cpu-node--skipped.json"]);

		// run.json provenance stamp.
		expect(JSON.parse(readFileSync(join(destDir, "run.json"), "utf8"))).toEqual({
			runId: "42",
			sha: "deadbeef",
			sourceRunUrl: "http://example/run/42",
		});
	});

	it("first writer wins on a duplicate filename across suites (deterministic by sorted artifact name)", () => {
		const tmp = mkdtempSync(join(tmpdir(), "assemble-run-dup-"));
		const artifactsDir = join(tmp, "artifacts");
		const destDir = join(tmp, "raw", "7");
		// cpu-node sorts before disk, so cpu-node's copy wins.
		put(artifactsDir, "benchmark-results-cpu-node-sandbox-daytona/dup.txt", "from-cpu-node");
		put(artifactsDir, "benchmark-results-disk-sandbox-daytona/dup.txt", "from-disk");

		assembleRun({ artifactsDir, destDir, runId: "7", sha: "s", sourceRunUrl: "u" });

		expect(readFileSync(join(destDir, "daytona", "dup.txt"), "utf8")).toBe("from-cpu-node");
	});

	it("produces a providers-less tree (just run.json) when there are no artifacts", () => {
		const tmp = mkdtempSync(join(tmpdir(), "assemble-run-empty-"));
		const destDir = join(tmp, "raw", "0");
		const result = assembleRun({
			artifactsDir: join(tmp, "artifacts"), // never created
			destDir,
			runId: "0",
			sha: "s",
			sourceRunUrl: "u",
		});
		expect(result.providers).toEqual([]);
		expect(readdirSync(destDir)).toEqual(["run.json"]);
	});
});
