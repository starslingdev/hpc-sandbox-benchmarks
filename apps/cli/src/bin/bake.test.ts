import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { candidateBuildResults, requestedBaseImage, requestedProviders } from "./bake.ts";

describe("requestedProviders", () => {
	test("no flag → undefined (drive every registered provider, the local default)", () => {
		expect(requestedProviders(["--build-push"])).toBeUndefined();
	});

	test("a matrix cell's single id selects just that provider", () => {
		expect(requestedProviders(["--provider", "e2b"])).toEqual(["e2b"]);
		expect(requestedProviders(["--provider=daytona-vm"])).toEqual(["daytona-vm"]);
	});

	test("a comma-separated list returns registry order, not request order", () => {
		expect(requestedProviders(["--provider", "modal-gvisor,e2b"])).toEqual(["e2b", "modal-gvisor"]);
	});

	test("an unknown id throws, naming the registered providers", () => {
		expect(() => requestedProviders(["--provider", "dayton"])).toThrow(/dayton/);
	});

	// The dangerous case: `selectProviders` maps a blank list to "every provider", so without an explicit
	// guard a cell whose `--provider` value failed to interpolate would bake all five instead of its one.
	test("a present-but-valueless flag throws instead of silently selecting every provider", () => {
		expect(() => requestedProviders(["--provider"])).toThrow(/requires at least one provider/);
		expect(() => requestedProviders(["--provider="])).toThrow(/requires at least one provider/);
		expect(() => requestedProviders(["--provider", "--force"])).toThrow(
			/requires at least one provider/,
		);
		expect(() => requestedProviders(["--provider", " "])).toThrow(/requires at least one provider/);
	});
});

describe("requestedBaseImage", () => {
	test("defaults to undefined so local bakes keep the configured candidate", () => {
		expect(requestedBaseImage(["--provider", "runcloud"])).toBeUndefined();
	});

	test("accepts the release plan's base as a separate or equals-form argument", () => {
		expect(requestedBaseImage(["--base-image", "ghcr.io/o/tc@sha256:abc"])).toBe(
			"ghcr.io/o/tc@sha256:abc",
		);
		expect(requestedBaseImage(["--base-image=ghcr.io/o/tc:v1"])).toBe("ghcr.io/o/tc:v1");
	});

	test("rejects a present-but-empty base ref", () => {
		expect(() => requestedBaseImage(["--base-image"])).toThrow(/non-empty image reference/);
		expect(() => requestedBaseImage(["--base-image="])).toThrow(/non-empty image reference/);
		expect(() => requestedBaseImage(["--base-image", "--provider", "runcloud"])).toThrow(
			/non-empty image reference/,
		);
	});
});

describe("candidateBuildResults", () => {
	function reports(files: Record<string, unknown>): string {
		const dir = mkdtempSync(join(tmpdir(), "bake-reports-"));
		for (const [name, report] of Object.entries(files))
			writeFileSync(join(dir, name), JSON.stringify(report));
		return dir;
	}

	test("no flag → nothing recorded", () => {
		expect(candidateBuildResults(["--promote"])).toEqual({});
	});

	test("merges every cell's recorded candidate refs, so promote pins what bake validated", () => {
		const dir = reports({
			"bake-freestyle.json": { candidate: { image: "x", artifacts: { freestyle: "sh-abc" } } },
			"bake-e2b.json": { candidate: { artifacts: { e2b: "toolchain-v9-candidate" } } },
			"bake-modal-gvisor.json": { candidate: { artifacts: {} } },
			"notes.txt": "ignored",
		});
		try {
			expect(candidateBuildResults(["--promote", "--bake-reports", dir])).toEqual({
				freestyle: "sh-abc",
				e2b: "toolchain-v9-candidate",
			});
			expect(candidateBuildResults([`--bake-reports=${dir}`])).toMatchObject({
				freestyle: "sh-abc",
			});
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test("a report supplies only its own provider's candidate", () => {
		const dir = reports({
			"report.json": { provider: "freestyle", candidate: { artifacts: { freestyle: "sh-abc" } } },
		});
		try {
			expect(candidateBuildResults(["--bake-reports", dir])).toEqual({ freestyle: "sh-abc" });
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
		const cases = [
			// One cell's report naming another provider's candidate.
			{ "bake-e2b.json": { candidate: { artifacts: { freestyle: "sh-forged" } } } },
			{ "a.json": { provider: "e2b", candidate: { artifacts: { freestyle: "sh-forged" } } } },
			// A report that names no provider at all.
			{ "a.json": { candidate: { artifacts: { freestyle: "sh-a" } } } },
			// A file name and a stated provider that disagree.
			{ "bake-freestyle.json": { provider: "e2b", candidate: { artifacts: { e2b: "t" } } } },
		];
		for (const files of cases) {
			const dir = reports(files);
			try {
				expect(() => candidateBuildResults(["--bake-reports", dir])).toThrow(
					/its own provider's|names provider/,
				);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		}
	});

	test("rejects a non-baked id, an empty ref, and reports that disagree", () => {
		const cases = [
			{ "bake-modal-gvisor.json": { candidate: { artifacts: { "modal-gvisor": "x" } } } },
			{ "bake-freestyle.json": { candidate: { artifacts: { freestyle: "" } } } },
			{
				"bake-freestyle.json": { candidate: { artifacts: { freestyle: "sh-a" } } },
				"b.json": { provider: "freestyle", candidate: { artifacts: { freestyle: "sh-b" } } },
			},
		];
		for (const files of cases) {
			const dir = reports(files);
			try {
				expect(() => candidateBuildResults(["--bake-reports", dir])).toThrow();
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		}
		expect(() => candidateBuildResults(["--bake-reports"])).toThrow(/requires the directory/);
	});
});
