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

// Inherited Object properties the `in`-based guard used to let through: each must be rejected as an
// unknown provider, never invoked off the prototype chain.
const INHERITED = ["__proto__", "toString", "constructor"];

/** Run every case of one scenario at once, tagged with its input so a failure names the case. */
function runAll<T extends string>(cases: readonly T[], args: (value: T) => string[]) {
	return Promise.all(cases.map(async (value) => [value, await run(...args(value))] as const));
}

// `describe.concurrent` because every case here is one `bun build-template.ts` boot, and a boot is
// dominated by loading the CLI's module graph — the assertions are string compares. Serially the seven
// boots cost seven module loads for work that is independent case by case. The runner's own construct,
// rather than launching at collection time and awaiting later: a hoisted promise that rejects before
// its await is reported against whichever test happens to be running, and hoisting spawns every
// subprocess even under `bun test -t`.
describe.concurrent("build-template CLI", () => {
	it("routes every provider the templates package advertises", async () => {
		for (const [provider, { stdout, exitCode }] of await runAll(templateProviders, (p) => [
			p,
			"v1",
		])) {
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
		for (const [name, { stderr, exitCode }] of await runAll(INHERITED, (n) => [n])) {
			expect(`${name}:${exitCode}`).toBe(`${name}:1`);
			expect(stderr).toContain(`Unknown provider "${name}"`);
		}
	});
});
