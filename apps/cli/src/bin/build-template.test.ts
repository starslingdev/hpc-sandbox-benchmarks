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

// Every case is one `bun build-template.ts` boot, and a boot is dominated by loading the CLI's module
// graph — the assertions themselves are string compares. Run sequentially, the seven boots cost seven
// times that load for work that is independent case by case, so they are all launched here, at
// collection time, and each test awaits its own. Nothing is shared between them: separate processes,
// separate argv, no filesystem writes.
const routed = templateProviders.map((provider) => [provider, run(provider, "v1")] as const);
const unknown = run("nope");
const inherited = INHERITED.map((name) => [name, run(name)] as const);

describe("build-template CLI", () => {
	it("routes every provider the templates package advertises", async () => {
		for (const [provider, pending] of routed) {
			const { stdout, exitCode } = await pending;
			expect(`${provider}:${exitCode}`).toBe(`${provider}:0`);
			expect(JSON.parse(stdout).provider).toBe(provider);
		}
	});

	it("rejects an unknown provider with a usable message, not a stack trace", async () => {
		const { stderr, exitCode } = await unknown;
		expect(exitCode).toBe(1);
		expect(stderr).toContain('Unknown provider "nope"');
	});

	it("rejects inherited Object properties instead of invoking them", async () => {
		for (const [name, pending] of inherited) {
			const { stderr, exitCode } = await pending;
			expect(`${name}:${exitCode}`).toBe(`${name}:1`);
			expect(stderr).toContain(`Unknown provider "${name}"`);
		}
	});
});
