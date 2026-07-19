import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

	it("preserves an existing E2B-style home and cleans up only a probe-created home", () => {
		const installScript = readFileSync(
			join(import.meta.dir, "../images/base/scripts/10-mise.sh"),
			"utf8",
		);

		const absentGuard = "if [[ ! -e /home/user && ! -L /home/user ]]; then";
		const markCreated = "user_home_created=true";
		const failureCleanup = "trap cleanup_user_home EXIT";
		const createHome = "install -d -m 0755 /home/user";
		const probe = "run_sanitized /home/user";
		const successCleanup = "cleanup_user_home\ntrap - EXIT";

		expect(installScript).toContain(`if [[ "\${user_home_created}" == true ]]; then`);
		expect(installScript).toContain("rm -rf -- /home/user");
		for (const contract of [
			absentGuard,
			markCreated,
			failureCleanup,
			createHome,
			probe,
			successCleanup,
		]) {
			expect(installScript).toContain(contract);
		}
		expect(installScript.indexOf(absentGuard)).toBeLessThan(installScript.indexOf(markCreated));
		expect(installScript.indexOf(markCreated)).toBeLessThan(installScript.indexOf(failureCleanup));
		expect(installScript.indexOf(failureCleanup)).toBeLessThan(installScript.indexOf(createHome));
		expect(installScript.indexOf(createHome)).toBeLessThan(installScript.indexOf(probe));
		expect(installScript.indexOf(probe)).toBeLessThan(installScript.indexOf(successCleanup));
	});
});
