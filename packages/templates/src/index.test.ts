import { describe, expect, it } from "bun:test";
import { buildDaytonaTemplate } from "./daytona.ts";
import { buildE2bTemplate } from "./e2b.ts";
import { templateBuilders, templateProviders } from "./index.ts";
import { buildModalTemplate } from "./modal.ts";
import { buildVercelTemplate } from "./vercel.ts";

describe("@sandbox-benchmarks/templates", () => {
	it("builds one template spec per provider subpath", () => {
		expect(buildE2bTemplate("v1").provider).toBe("e2b");
		expect(buildDaytonaTemplate("v1").provider).toBe("daytona");
		expect(buildModalTemplate("v1").provider).toBe("modal");
		expect(buildVercelTemplate("v1").provider).toBe("vercel");
	});

	it("points each spec at its in-repo variant Dockerfile", () => {
		expect(buildE2bTemplate("v1").dockerfile).toBe("packages/templates/images/e2b/Dockerfile");
		expect(buildDaytonaTemplate("v1").dockerfile).toBe(
			"packages/templates/images/daytona/Dockerfile",
		);
		expect(buildModalTemplate("v1").dockerfile).toBe("packages/templates/images/modal/Dockerfile");
		expect(buildVercelTemplate("v1").dockerfile).toBe(
			"packages/templates/images/vercel/Dockerfile",
		);
	});

	it("lists every provider that has a builder", () => {
		expect([...templateProviders]).toEqual(["e2b", "daytona", "modal", "vercel"]);
	});

	it("routes every advertised provider to a builder", () => {
		// The build-template CLI used to keep its own copy of this map and drifted: it rejected
		// `vercel` as Unknown while templateProviders advertised it. The CLI now imports
		// templateBuilders directly, so this asserts the two views agree at their source.
		for (const provider of templateProviders) {
			expect(typeof templateBuilders[provider]).toBe("function");
		}
		expect(Object.keys(templateBuilders)).toEqual([...templateProviders]);
	});
});
