/**
 * Invariants for the `.tsx` surface. Each of these guards a failure that is silent rather than loud.
 *
 * 1. `memberSourceFiles` must see `.tsx`, or the whole import-boundary check skips every component.
 * 2. Every tsconfig Bun can resolve as project config must declare `jsx`/`jsxImportSource` INLINE.
 *    Bun does not follow `extends` for these two options — not into a package, and not through a
 *    nested chain — so a shared `@repo/tsconfig` preset silently does nothing and every `.tsx`
 *    import fails at RUNTIME with `Cannot find module 'react/jsx-dev-runtime'`. This test exists
 *    because the obvious "DRY it into a preset" refactor is exactly what breaks it.
 * 3. satori and the rasterizer stay confined to `packages/figures/src/lib/render/`.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { Glob } from "bun";
import { findRepoRoot, importSpecifiers, listMembers, memberSourceFiles } from "./lib/workspace.ts";

const ROOT = findRepoRoot();
const members = listMembers(ROOT);

/** tsconfigs that Bun may load as project config for a program that pulls in a `.tsx` file. */
const JSX_TSCONFIGS = [
	"tsconfig.json",
	"apps/cli/tsconfig.json",
	"packages/figures/tsconfig.json",
	"tooling/repo-checks/tsconfig.json",
];

describe("tsx is visible to the boundary check", () => {
	it("memberSourceFiles globs .tsx as well as .ts", () => {
		const figures = members.find((m) => m.name === "@sandbox-benchmarks/figures");
		expect(figures).toBeDefined();
		if (!figures) return;
		const files = memberSourceFiles(figures).map((f) => relative(figures.dir, f));
		expect(files.some((f) => f.endsWith(".tsx"))).toBe(true);
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
	for (const rel of JSX_TSCONFIGS) {
		it(`${rel} declares jsx + jsxImportSource inline`, () => {
			const path = join(ROOT, rel);
			expect(existsSync(path)).toBe(true);
			const tsconfig = JSON.parse(readFileSync(path, "utf8")) as {
				compilerOptions?: { jsx?: string; jsxImportSource?: string };
			};
			// Inline, not via `extends`: Bun ignores both options when they arrive through extends.
			expect(tsconfig.compilerOptions?.jsx).toBe("react-jsx");
			expect(tsconfig.compilerOptions?.jsxImportSource).toBe("@sandbox-benchmarks/figures");
		});
	}
});

describe("rendering dependencies stay confined", () => {
	const RENDER_ONLY = ["satori", "@resvg/resvg-wasm"];
	/** The only directory allowed to import them. Everything else goes through its exports. */
	const ALLOWED = join(ROOT, "packages", "figures", "src", "lib", "render");

	it("satori and the rasterizer are imported only from lib/render/", () => {
		const violations: string[] = [];
		for (const member of members.filter((m) => m.hasSrc)) {
			for (const file of memberSourceFiles(member)) {
				for (const spec of importSpecifiers(file)) {
					if (!RENDER_ONLY.some((dep) => spec === dep || spec.startsWith(`${dep}/`))) continue;
					if (file.startsWith(ALLOWED)) continue;
					violations.push(`${relative(ROOT, file)} → "${spec}"`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it("the allowed directory actually imports them (the invariant is not vacuous)", () => {
		const found = [...new Glob("*.ts").scanSync({ cwd: ALLOWED })].flatMap((f) =>
			importSpecifiers(join(ALLOWED, f)),
		);
		expect(found).toContain("satori");
		expect(found).toContain("@resvg/resvg-wasm");
	});
});
