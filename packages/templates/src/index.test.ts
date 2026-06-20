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

	it("points each spec at its in-repo variant Dockerfile", () => {
		expect(buildE2bTemplate("v1").dockerfile).toBe("packages/templates/images/e2b/Dockerfile");
		expect(buildDaytonaTemplate("v1").dockerfile).toBe(
			"packages/templates/images/daytona/Dockerfile",
		);
		expect(buildModalTemplate("v1").dockerfile).toBe("packages/templates/images/modal/Dockerfile");
	});

	it("lists every provider that has a builder", () => {
		expect([...templateProviders]).toEqual(["e2b", "daytona", "modal"]);
	});
});
