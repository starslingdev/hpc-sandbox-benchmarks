// Invariant: no value `bun run new-provider` left for an author survives into the tree. A TypeScript
// placeholder already fails typecheck, but one in YAML (a CLI setup action's archive URL or
// checksum) or any other file typecheck never reads would not, so this scans every file a commit
// would carry (tracked, or new and not ignored) for the placeholder spellings: the marker call, the
// marker type, and the "marker: hint" string of YAML and of the error the call throws. Since a
// renamed import (`{ marker as m }`) or a namespace member (`ns.marker`) would hide the call, the
// marker may not be imported or reached through a namespace at all outside the exemptions.
// Exempt are the scaffolder itself (its generated templates), the placeholders' definition and the
// kit's re-export of it, and Markdown, whose prose describes them. The patterns are assembled at
// runtime so this file does not match itself.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./lib/workspace.ts";

const WORD = ["un", "filled"].join("");
/** Spelled apart so the import scans never read a planted import out of this file. */
const FROM = ["fr", "om"].join("");
const NAME = `[uU]${WORD.slice(1)}`;
const PLACEHOLDER = new RegExp(
	[
		`\\b${WORD}[(:]`,
		`\\bU${WORD.slice(1)}<`,
		// Named in an import or re-export clause, under any local name.
		`\\b(?:import|export)\\s+(?:type\\s+)?(?:[\\w$]+\\s*,\\s*)?\\{[^}]*\\b${NAME}\\b[^}]*\\}`,
		// Reached through a namespace import.
		`\\.${NAME}\\b`,
		`\\[\\s*["'\x60]${NAME}["'\x60]\\s*\\]`,
	].join("|"),
);
const EXEMPT = [
	/^packages\/schema\/scripts\/new-provider[^/]*$/,
	/^packages\/schema\/src\/provider-meta\.ts$/,
	/^packages\/driver\/src\/vendor\.ts$/,
	/\.md$/,
];

/** The files in `files` (path to content) that still hold a scaffold placeholder, sorted. */
export function placeholderFiles(files: ReadonlyMap<string, string>): string[] {
	return [...files]
		.filter(([path, text]) => !EXEMPT.some((rule) => rule.test(path)) && PLACEHOLDER.test(text))
		.map(([path]) => path)
		.sort();
}

function committable(root: string): Map<string, string> {
	const listed = Bun.spawnSync(
		["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
		{ cwd: root },
	);
	if (listed.exitCode !== 0) throw new Error(`git ls-files failed: ${listed.stderr}`);
	const files = new Map<string, string>();
	for (const path of listed.stdout.toString("utf8").split("\0").filter(Boolean)) {
		try {
			files.set(path, readFileSync(join(root, path), "utf8"));
		} catch {
			// Tracked but deleted in the working tree.
		}
	}
	return files;
}

describe("scaffold placeholders", () => {
	test("no file a commit would carry still holds a value left for the provider's author", () => {
		expect(placeholderFiles(committable(findRepoRoot()))).toEqual([]);
	});

	test("finds each spelling outside the exemptions, and only there", () => {
		const call = `${WORD}("the API's base URL")`;
		const files = new Map([
			[".github/actions/setup-acme/action.yml", `    default: "${WORD}: the archive's sha256"`],
			["packages/acme/src/vendor.ts", `const base = ${call};`],
			["packages/acme/src/types.ts", `type Sandbox = U${WORD.slice(1)}<"the sandbox type">;`],
			["packages/templates/src/pins.ts", `// an ${WORD} or invalid pin is rejected`],
			[
				"packages/acme/src/renamed.ts",
				`import kit, {\n\ttype U${WORD.slice(1)} as Hole,\n\t${WORD} as u,\n} ${FROM} "@sandbox-benchmarks/driver/vendor";`,
			],
			["packages/acme/src/namespace.ts", `const base = kit.${WORD}("the API's base URL");`],
			["packages/acme/src/indexed.ts", `const base = kit["${WORD}"]("the API's base URL");`],
			["packages/driver/src/vendor.ts", `export { type U${WORD.slice(1)}, ${WORD} } ${FROM} "x";`],
			["packages/schema/scripts/new-provider.ts", `const hint = ${call};`],
			["packages/schema/src/provider-meta.ts", `throw new Error(\`${WORD}: \${hint}\`);`],
			["CONTRIBUTING.md", `Every value is left as a typed \`${call}\`.`],
		]);
		expect(placeholderFiles(files)).toEqual([
			".github/actions/setup-acme/action.yml",
			"packages/acme/src/indexed.ts",
			"packages/acme/src/namespace.ts",
			"packages/acme/src/renamed.ts",
			"packages/acme/src/types.ts",
			"packages/acme/src/vendor.ts",
		]);
	});
});
