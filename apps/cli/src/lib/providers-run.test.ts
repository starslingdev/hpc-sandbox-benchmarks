import { describe, expect, test } from "bun:test";
import { forEachProviderWithCreds, unknownProviderIds } from "./providers-run.ts";

describe("unknownProviderIds", () => {
	test("returns the ids that are not registered providers", () => {
		expect(unknownProviderIds(["e2b", "dayton", "nope"])).toEqual(["dayton", "nope"]);
	});

	test("is empty when every id is registered", () => {
		expect(unknownProviderIds(["e2b", "daytona", "modal"])).toEqual([]);
	});
});

describe("forEachProviderWithCreds `only`", () => {
	test("visits only the requested provider (a matrix cell reports just its own)", async () => {
		const bodyRan: string[] = [];
		const runs = await forEachProviderWithCreds(
			async (provider) => {
				bodyRan.push(provider.name);
				return null;
			},
			// No creds for daytona in this env → it skips, but nothing else is even considered.
			{ only: ["daytona"], env: {} },
		);
		expect(runs.map((r) => r.provider)).toEqual(["daytona"]);
		expect(runs[0]?.status).toBe("skipped");
		expect(bodyRan).toEqual([]); // skipped: the body never runs
	});

	test("runs the body for a selected provider whose creds are present", async () => {
		const runs = await forEachProviderWithCreds(async () => "smoked", {
			only: ["e2b"],
			env: { E2B_API_KEY: "present" },
		});
		expect(runs).toHaveLength(1);
		expect(runs[0]?.provider).toBe("e2b");
		expect(runs[0]?.status).toBe("ok");
		expect(runs[0]?.value).toBe("smoked");
	});

	test("without `only`, drives every registered provider (unchanged default)", async () => {
		const runs = await forEachProviderWithCreds(async () => null, { env: {} });
		// All registered providers are visited (all skipped here for want of creds).
		expect(runs.map((r) => r.provider)).toEqual(["e2b", "daytona", "blaxel", "modal", "novita"]);
	});
});
