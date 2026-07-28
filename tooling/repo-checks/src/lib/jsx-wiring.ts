/**
 * Data behind the `.tsx` invariants, kept beside the other named-exception allowlists
 * (`workflow-hardening.ts`'s `CREDENTIALED_CHECKOUTS`, `ALLOWED_TOOLCHAIN_TRIGGERS`) rather than
 * inline in the test, so an exception always travels with its reason.
 */
import { join } from "node:path";
import type { Member } from "./workspace.ts";
import { memberSourceFiles } from "./workspace.ts";

/**
 * Dependencies confined to a single directory, and why.
 *
 * Keyed by dependency so a second confined package does not require restructuring the check.
 */
export const CONFINED_DEPENDENCIES: Record<string, { dir: string; reason: string }> = {
	satori: {
		dir: join("packages", "figures", "src", "lib", "render"),
		reason:
			"Swapping the renderer must touch one file. Confining the import is also what keeps the " +
			"layout engine out of `view/`, where every decision is supposed to be plain testable data.",
	},
	"@resvg/resvg-wasm": {
		dir: join("packages", "figures", "src", "lib", "render"),
		reason:
			"A ~2.5 MB wasm rasterizer with a single-shot init. Confining it keeps it out of packages " +
			"that run on every `bun test` and keeps the init memo in one place.",
	},
};

/** True when the member authors any `.tsx` of its own. */
export function authorsTsx(member: Member): boolean {
	return member.hasSrc && memberSourceFiles(member).some((file) => file.endsWith(".tsx"));
}

/**
 * Every member whose tsconfig must declare `jsx`/`jsxImportSource` INLINE — derived, never listed.
 *
 * A member needs them if it authors `.tsx`, or if it depends (directly) on a member that does: this
 * repo is source-first, so a consumer's program pulls the dependency's `.tsx` files in directly and
 * must be configured to parse them. Deriving the set is what makes the invariant catch the NEXT
 * package to import the figures package — a hardcoded list would simply not contain it, and the
 * failure it guards is a runtime `Cannot find module 'react/jsx-dev-runtime'`.
 */
export function membersNeedingJsx(members: readonly Member[]): Member[] {
	const authors = new Set(members.filter(authorsTsx).map((m) => m.name));
	return members.filter(
		(m) =>
			authors.has(m.name) ||
			Object.keys({ ...m.pkg.dependencies, ...m.pkg.devDependencies }).some((dep) =>
				authors.has(dep),
			),
	);
}
