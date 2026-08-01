// The build-template CLI routes on the templates package's own builder map. Two failures this
// guards, both observed:
//   - a second, hand-maintained copy of the map in this CLI went stale and rejected `vercel` as
//     Unknown while the package advertised it through templateProviders;
//   - the guard used `in`, which walks the prototype chain, so `__proto__` passed it and the call
//     threw a stack trace instead of printing the clean Unknown-provider message.
import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { templateProviders } from "@sandbox-benchmarks/templates";

const CLI = join(import.meta.dir, "build-template.ts");

async function run(...args: string[]) {
	const proc = Bun.spawn(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { stdout, stderr, exitCode };
}

describe("build-template CLI", () => {
	it("routes every provider the templates package advertises", async () => {
		for (const provider of templateProviders) {
			const { stdout, exitCode } = await run(provider, "v1");
			expect(`${provider}:${exitCode}`).toBe(`${provider}:0`);
			expect(JSON.parse(stdout).provider).toBe(provider);
		}
	});

	it("rejects an unknown provider with a usable message, not a stack trace", async () => {
		const { stderr, exitCode } = await run("nope");
		expect(exitCode).toBe(1);
		expect(stderr).toContain('Unknown provider "nope"');
	});

	it("rejects inherited Object properties instead of invoking them", async () => {
		for (const name of ["__proto__", "toString", "constructor"]) {
			const { stderr, exitCode } = await run(name);
			expect(`${name}:${exitCode}`).toBe(`${name}:1`);
			expect(stderr).toContain(`Unknown provider "${name}"`);
		}
	});
});
