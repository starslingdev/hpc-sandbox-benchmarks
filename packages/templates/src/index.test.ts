import { describe, expect, it } from "bun:test";
import { buildDaytonaTemplate } from "./daytona.ts";
import { buildE2bTemplate } from "./e2b.ts";
import { templateProviders } from "./index.ts";
import { buildModalTemplate } from "./modal.ts";

describe("@sandbox-benchmarks/templates", () => {
	it("builds one template spec per provider subpath", () => {
		expect(buildE2bTemplate("v1").provider).toBe("e2b");
		expect(buildDaytonaTemplate("v1").provider).toBe("daytona");
		expect(buildModalTemplate("v1").provider).toBe("modal");
	});

	it("lists every provider that has a builder", () => {
		expect([...templateProviders]).toEqual(["e2b", "daytona", "modal"]);
	});
});
