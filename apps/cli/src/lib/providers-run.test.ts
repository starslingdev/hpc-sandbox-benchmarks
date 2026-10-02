import { describe, expect, test } from "bun:test";
import { PROVIDERS } from "@sandbox-benchmarks/schema";
import { forEachProviderWithCreds } from "./providers-run.ts";

describe("forEachProviderWithCreds `only`", () => {
	test("visits only the requested provider (a matrix cell reports just its own)", async () => {
		const bodyRan: string[] = [];
		const runs = await forEachProviderWithCreds(
			async (target) => {
				bodyRan.push(target.id);
				return null;
			},
			// No creds for daytona in this env → it skips, but nothing else is even considered.
			{ only: ["daytona-vm"], env: {} },
		);
		expect(runs.map((r) => r.provider)).toEqual(["daytona-vm"]);
		expect(runs[0]?.status).toBe("skipped");
		expect(bodyRan).toEqual([]); // skipped: the body never runs
	});

	test("runs the body for a selected provider whose creds are present", async () => {
		const visited: string[] = [];
		const runs = await forEachProviderWithCreds(
			async (target) => {
				visited.push(target.id);
				return "smoked";
			},
			{
				only: ["daytona-vm"],
				env: { DAYTONA_API_KEY: "present" },
			},
		);
		expect(runs.map((r) => r.provider)).toEqual(["daytona-vm"]);
		expect(runs[0]?.status).toBe("ok");
		expect(runs[0]?.value).toBe("smoked");
		expect(visited).toEqual(["daytona-vm"]);
	});

	test("without `only`, drives every schema provider in registry order", async () => {
		const runs = await forEachProviderWithCreds(async () => null, { env: {} });
		expect(runs.map((r) => r.provider)).toEqual(PROVIDERS.map((meta) => meta.id));
		expect(runs.every((run) => run.status === "skipped")).toBe(true);
	});

	// `[]` is truthy, so without a guard it would select nothing, validate nothing, and still exit 0 —
	// a release that baked nothing looking exactly like one that passed.
	test("an empty `only` throws rather than silently validating zero providers", async () => {
		await expect(forEachProviderWithCreds(async () => null, { only: [], env: {} })).rejects.toThrow(
			/empty list/,
		);
	});

	test("a registered id without creds skips and names the missing input", async () => {
		const bodyRan: string[] = [];
		const runs = await forEachProviderWithCreds(
			async (target) => {
				bodyRan.push(target.id);
				return null;
			},
			{ only: ["e2b"], env: {} },
		);
		expect(runs.map((r) => r.provider)).toEqual(["e2b"]);
		expect(runs[0]?.status).toBe("skipped");
		expect(runs[0]?.reason).toMatch(/E2B_API_KEY/);
		expect(bodyRan).toEqual([]);
	});

	test("a multi-provider `only` keeps registry order, not request order", async () => {
		const visited: string[] = [];
		const runs = await forEachProviderWithCreds(
			async (target) => {
				visited.push(target.id);
				return null;
			},
			{
				only: ["tama", "daytona-vm"],
				env: { TAMA_TOKEN: "tok", DAYTONA_API_KEY: "key" },
			},
		);
		expect(runs.map((r) => r.provider)).toEqual(["daytona-vm", "tama"]);
		expect(visited).toEqual(["daytona-vm", "tama"]);
	});
});
