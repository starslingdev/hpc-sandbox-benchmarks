/**
 * Invariants for the `.tsx` surface. Each guards a failure that is silent rather than loud.
 *
 * 1. `memberSourceFiles` must see `.tsx`, or the import-boundary check skips every component.
 * 2. Every tsconfig Bun can resolve as project config must declare `jsx`/`jsxImportSource` INLINE.
 *    Bun does not follow `extends` for these two options — not into a package, and not through a
 *    nested chain — so a shared `@repo/tsconfig` preset silently does nothing and every `.tsx`
 *    import fails at RUNTIME with `Cannot find module 'react/jsx-dev-runtime'`. This test exists
 *    because the obvious "DRY it into a preset" refactor is exactly what breaks it.
 * 3. satori and the rasterizer stay confined to one directory.
 *
 * The member set for (2) and the allowlist for (3) are DERIVED / declared in `./lib/jsx-wiring.ts`,
 * not enumerated here: a hardcoded list of tsconfigs would simply not contain the next package that
 * imports the figures package, and would report success while that package was broken.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { Glob } from "bun";
import { authorsTsx, CONFINED_DEPENDENCIES, membersNeedingJsx } from "./lib/jsx-wiring.ts";
import { findRepoRoot, importSpecifiers, listMembers, memberSourceFiles } from "./lib/workspace.ts";

const ROOT = findRepoRoot();
const members = listMembers(ROOT);

/** The root tsconfig is the one entry that cannot be derived from a member — Bun resolves it for any
 *  command run from the repo root, which is how every CLI bin is invoked. */
const ROOT_TSCONFIG = "tsconfig.json";

describe("tsx is visible to the boundary check", () => {
	it("memberSourceFiles globs .tsx as well as .ts", () => {
		const authors = members.filter(authorsTsx);
		expect(authors.length).toBeGreaterThan(0);
		for (const member of authors) {
			expect(memberSourceFiles(member).some((f) => f.endsWith(".tsx"))).toBe(true);
		}
	});

	it("every .tsx in the repo belongs to a member the boundary check scans", () => {
		const tracked = new Set(members.flatMap((m) => (m.hasSrc ? memberSourceFiles(m) : [])));
		const onDisk = [
			...new Glob("{packages,apps,tooling}/*/src/**/*.tsx").scanSync({ cwd: ROOT }),
		].map((rel) => join(ROOT, rel));
		expect(onDisk.length).toBeGreaterThan(0);
		expect(onDisk.filter((f) => !tracked.has(f))).toEqual([]);
	});
});

describe("jsx compiler options are inline, not inherited", () => {
	const required = [
		ROOT_TSCONFIG,
		...membersNeedingJsx(members).map((m) => `${m.relPath}/tsconfig.json`),
	];

	it("derives a non-empty set of tsconfigs (the invariant is not vacuous)", () => {
		// More than the root alone, or the derivation has silently stopped finding anything.
		expect(required.length).toBeGreaterThan(1);
	});

	for (const rel of required) {
		it(`${rel} declares jsx + jsxImportSource inline`, () => {
			const tsconfig = JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as {
				compilerOptions?: { jsx?: string; jsxImportSource?: string };
			};
			// Inline, not via `extends`: Bun ignores both options when they arrive through extends.
			expect(tsconfig.compilerOptions?.jsx).toBe("react-jsx");
			expect(tsconfig.compilerOptions?.jsxImportSource).toBe("@sandbox-benchmarks/figures");
		});
	}
});

describe("rendering dependencies stay confined", () => {
	for (const [dep, { dir }] of Object.entries(CONFINED_DEPENDENCIES)) {
		const allowed = join(ROOT, dir);

		it(`${dep} is imported only from ${dir}`, () => {
			const violations: string[] = [];
			for (const member of members.filter((m) => m.hasSrc)) {
				for (const file of memberSourceFiles(member)) {
					if (file.startsWith(allowed)) continue;
					for (const spec of importSpecifiers(file)) {
						if (spec === dep || spec.startsWith(`${dep}/`)) {
							violations.push(`${relative(ROOT, file)} → "${spec}"`);
						}
					}
				}
			}
			expect(violations).toEqual([]);
		});

		it(`${dep} is actually imported from ${dir} (the allowlist has not gone stale)`, () => {
			const found = [...new Glob("*.ts").scanSync({ cwd: allowed })].flatMap((f) =>
				importSpecifiers(join(allowed, f)),
			);
			expect(found.some((spec) => spec === dep || spec.startsWith(`${dep}/`))).toBe(true);
		});
	}
});
