// Private helper: the vendor-seam invariant (ADR-0023 §2), as a pure function over a repository
// snapshot so its tests can plant violations in a fixture instead of mutating the repo.
//
// A vendor library is any entry of the root `catalogs.vendors`. Provider-neutral libraries live in
// the default catalog, so the vendor set needs no exception list. The invariant:
//   - every vendor library is declared by exactly one workspace member, and that member is a provider
//     package (the library's owner);
//   - no file outside the owner references the library, and the owner references it itself (or
//     declares it only to satisfy another of its vendor libraries' peer dependencies);
//   - every member takes third-party libraries only from the root catalogs, so a vendor SDK cannot
//     enter through an inline pin and escape the vendor set; and a provider package takes one from the
//     default catalog only when a non-provider member also does, so a vendor SDK cannot pass as
//     provider-neutral;
//   - every file references a third-party library only when its own member (or, outside every
//     member, the root manifest) declares it, so a vendor SDK's transitive dependency cannot be
//     reached through hoisting, and no file reaches into `node_modules` by path;
//   - only `@sandbox-benchmarks/drivers` and the allowlisted named subpaths import a provider package
//     from outside it, and nothing outside it reaches into its directory by relative path;
//   - the dissolved `packages/providers` does not come back.
// A reference is any module specifier in source: static, type-only and side-effect imports,
// re-exports, dynamic `import()` (including `typeof import()` types), `import.meta.resolve`,
// `require` / `require.resolve` / `createRequire(...)(...)` string specifiers, and triple-slash
// `types` and `path` references.
import { builtinModules } from "node:module";
import { posix } from "node:path";
import { stripComments } from "./workspace.ts";

/**
 * Vendor code with exactly one implementation, imported by name rather than through a generated join
 * (ADR-0023 §2). Adding an entry is an architecture decision: say why in the ADR.
 */
export const NAMED_PROVIDER_SUBPATHS: ReadonlySet<string> = new Set([
	"@sandbox-benchmarks/modal/gpu",
	"@sandbox-benchmarks/modal/cleanup-observation",
]);

/** The only package that joins every provider package (the generated loader). */
const PROVIDER_JOIN = "@sandbox-benchmarks/drivers";
const DISSOLVED = "packages/providers";
const VENDOR_CATALOG = "catalog:vendors";

const SOURCE_FILE = /\.(?:[cm]?[jt]s|tsx)$/;
// Quote characters are spelled as escapes (\x22 double, \x27 single, \x60 backtick) so this file's
// own regex literals never read as string openers to the comment stripper that scans it.
const SPECIFIER_PATTERNS = [
	// import … from "x" / export … from "x" (type-only included).
	/(?:import|export)\b[^\x22\x27\x60;]*?\bfrom\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/g,
	// import "x" (side effect).
	/\bimport\s+[\x22\x27]([^\x22\x27]+)[\x22\x27]/g,
	// import("x"), typeof import("x"), import.meta.resolve("x"), and a template literal without
	// substitutions.
	/\bimport(?:\.meta\.resolve)?\s*\(\s*(?:[\x22\x27]([^\x22\x27]+)[\x22\x27]|\x60([^\x60$]+)\x60)/g,
	// require("x"), require.resolve("x"), and any aliased `…Require("x")` / `…require("x")`.
	/\b\w*(?:require|Require)(?:\.resolve)?\s*\(\s*(?:[\x22\x27]([^\x22\x27]+)[\x22\x27]|\x60([^\x60$]+)\x60)/g,
	// createRequire(import.meta.url)("x").
	/\bcreateRequire\s*\((?:[^()]|\([^()]*\))*\)\s*\(\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/g,
];
// A triple-slash directive is a comment, so it is read from the raw source.
const REFERENCE_DIRECTIVE =
	/^[ \t]*\/\/\/[ \t]*<reference\s+(types|path)\s*=\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/gm;
// A package name as npm spells it; generator code that prints `import … from "${x}"` into a
// template is not a reference of the file that holds the template.
const PACKAGE_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;
const NODE_MODULES = /(?:^|[/\\])node_modules(?:[/\\]|$)/;
const BUILTINS: ReadonlySet<string> = new Set([...builtinModules, "bun"]);

/** One module reference: its specifier, and whether a `/// <reference types>` directive made it. */
interface Reference {
	readonly specifier: string;
	readonly types: boolean;
}

function moduleReferences(source: string): Reference[] {
	const found: Reference[] = [];
	for (const [, kind, value] of source.matchAll(REFERENCE_DIRECTIVE)) {
		if (!value) continue;
		// A `path` reference is relative to the file even without a leading `./`.
		if (kind === "types") found.push({ specifier: value, types: true });
		else found.push({ specifier: /^[./]/.test(value) ? value : `./${value}`, types: false });
	}
	const text = stripComments(source);
	for (const pattern of SPECIFIER_PATTERNS) {
		for (const match of text.matchAll(pattern)) {
			const specifier = match.slice(1).find((group) => group !== undefined);
			if (specifier) found.push({ specifier, types: false });
		}
	}
	return found;
}

/** Every module specifier a source file references, comments ignored (triple-slash directives read). */
export function moduleSpecifiers(source: string): string[] {
	return moduleReferences(source).map((reference) => reference.specifier);
}

/** The package a bare specifier names (`@scope/name` or `name`), or null for relative/builtin ones. */
export function packageOf(specifier: string): string | null {
	if (specifier.startsWith(".") || specifier.startsWith("/") || /^[a-z]+:/.test(specifier)) {
		return null;
	}
	const parts = specifier.split("/");
	return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? null);
}

interface Manifest {
	name?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	workspaces?:
		| string[]
		| { packages?: string[]; catalogs?: Record<string, Record<string, string>> };
}

interface SnapshotMember {
	readonly dir: string;
	readonly name: string;
	readonly dependencies: Readonly<Record<string, string>>;
}

export interface RepositorySnapshot {
	/** Repo-relative path → contents: source files, workspace manifests, the root manifest, and
	 *  `node_modules/<vendor>/package.json` for any vendor whose peers matter. */
	readonly files: ReadonlyMap<string, string>;
	/** Repo-relative directories of the registered provider packages (`packages/<directory>`). */
	readonly providerDirectories: ReadonlySet<string>;
}

function manifest(files: ReadonlyMap<string, string>, path: string): Manifest | undefined {
	const text = files.get(path);
	return text === undefined ? undefined : (JSON.parse(text) as Manifest);
}

function workspaceMembers(files: ReadonlyMap<string, string>, root: Manifest): SnapshotMember[] {
	const workspaces = root.workspaces;
	const globs = (Array.isArray(workspaces) ? workspaces : (workspaces?.packages ?? [])).map(
		(glob) =>
			new RegExp(`^${glob.replaceAll(".", "\\.").replaceAll("*", "[^/]+")}/package\\.json$`),
	);
	const members: SnapshotMember[] = [];
	for (const path of files.keys()) {
		if (!globs.some((glob) => glob.test(path))) continue;
		const pkg = manifest(files, path) ?? {};
		members.push({
			dir: path.slice(0, -"/package.json".length),
			name: pkg.name ?? path,
			dependencies: { ...pkg.dependencies, ...pkg.devDependencies },
		});
	}
	return members.sort((a, b) => a.dir.localeCompare(b.dir));
}

/** Every distinct vendor-seam violation in the snapshot, sorted; empty when the seam holds. */
export function vendorSeamViolations({ files, providerDirectories }: RepositorySnapshot): string[] {
	const violations: string[] = [];
	const root = manifest(files, "package.json");
	if (!root) return ["package.json: missing root manifest"];
	const catalogs = Array.isArray(root.workspaces) ? {} : (root.workspaces?.catalogs ?? {});
	const vendors = new Set(Object.keys(catalogs.vendors ?? {}));
	if (vendors.size === 0) violations.push("package.json: workspaces.catalogs.vendors is empty");

	const members = workspaceMembers(files, root);
	const memberOf = (path: string) =>
		members.find((member) => path.startsWith(`${member.dir}/`)) ?? null;
	const providers = new Map(
		members.filter((member) => providerDirectories.has(member.dir)).map((m) => [m.name, m]),
	);

	if ([...files.keys()].some((path) => path.startsWith(`${DISSOLVED}/`))) {
		violations.push(`${DISSOLVED} exists; it was dissolved by ADR-0023`);
	}

	// Declarations: each vendor library has exactly one owner, and it is a provider package.
	const owners = new Map<string, SnapshotMember>();
	for (const vendor of vendors) {
		const declarers = members.filter((member) => vendor in member.dependencies);
		for (const member of declarers) {
			if (!providerDirectories.has(member.dir)) {
				violations.push(`${member.dir} declares vendor library ${vendor}`);
			}
		}
		const providerDeclarers = declarers.filter((member) => providerDirectories.has(member.dir));
		if (providerDeclarers.length === 0) {
			violations.push(`${vendor} is in the vendor catalog but no provider package declares it`);
		} else if (providerDeclarers.length > 1) {
			violations.push(
				`${vendor} is declared by ${providerDeclarers.length} provider packages: ${providerDeclarers.map((m) => m.dir).join(", ")}`,
			);
		} else if (providerDeclarers[0]) {
			owners.set(vendor, providerDeclarers[0]);
		}
	}
	// A default-catalog library is provider-neutral only if something besides a provider uses it.
	const neutral = new Set(
		members
			.filter((member) => !providerDirectories.has(member.dir))
			.flatMap((member) =>
				Object.entries(member.dependencies)
					.filter(([, specifier]) => specifier === "catalog:")
					.map(([dependency]) => dependency),
			),
	);
	// A non-provider member takes third-party libraries from the root catalogs only (its vendor
	// catalog entries are reported above).
	for (const member of members) {
		if (providerDirectories.has(member.dir)) continue;
		for (const [dependency, specifier] of Object.entries(member.dependencies)) {
			if (specifier.startsWith("workspace:") || specifier.startsWith("catalog:")) continue;
			violations.push(
				`${member.dir} pins ${dependency} outside the catalogs; a third-party library is taken from the root catalogs`,
			);
		}
	}
	for (const provider of providers.values()) {
		for (const [dependency, specifier] of Object.entries(provider.dependencies)) {
			if (specifier.startsWith("workspace:")) continue;
			if (specifier === "catalog:") {
				if (!neutral.has(dependency)) {
					violations.push(
						`${provider.dir} takes ${dependency} from the default catalog, but no non-provider member uses it; a vendor library belongs in catalogs.vendors`,
					);
				}
				continue;
			}
			if (specifier !== VENDOR_CATALOG) {
				violations.push(
					`${provider.dir} pins ${dependency} outside the catalogs; a vendor library belongs in catalogs.vendors`,
				);
			}
		}
	}

	// References: vendor libraries only inside their owner; provider packages only through the join or
	// a named subpath; any other third-party library only where the referencing member declares it.
	const memberNames = new Set(members.map((member) => member.name));
	const rootDependencies = { ...root.dependencies, ...root.devDependencies };
	const referenced = new Set<string>();
	for (const [path, source] of files) {
		if (!SOURCE_FILE.test(path) || path.includes("node_modules/")) continue;
		const member = memberOf(path);
		const declared = member?.dependencies ?? rootDependencies;
		for (const { specifier, types } of moduleReferences(source)) {
			if (NODE_MODULES.test(specifier)) {
				violations.push(`${path} reaches into node_modules by path ${specifier}`);
				continue;
			}
			if (specifier.startsWith(".")) {
				const resolved = posix.join(posix.dirname(path), specifier);
				const entered = [...providerDirectories].find(
					(dir) => resolved === dir || resolved.startsWith(`${dir}/`),
				);
				if (entered !== undefined && member?.dir !== entered) {
					violations.push(
						`${path} reaches into provider package ${entered} by relative path ${specifier}`,
					);
				}
				continue;
			}
			const target = packageOf(specifier);
			if (target === null || !PACKAGE_NAME.test(target) || BUILTINS.has(target)) continue;
			const owner = owners.get(target);
			if (vendors.has(target)) {
				if (owner && member?.dir === owner.dir) referenced.add(target);
				else violations.push(`${path} references vendor library ${target}`);
				continue;
			}
			if (memberNames.has(target)) {
				const provider = providers.get(target);
				if (
					provider &&
					member?.dir !== provider.dir &&
					member?.name !== PROVIDER_JOIN &&
					!NAMED_PROVIDER_SUBPATHS.has(specifier)
				) {
					violations.push(
						`${path} imports provider package ${specifier}; only ${PROVIDER_JOIN} and the named subpaths may`,
					);
				}
				continue;
			}
			// A `types` directive is also satisfied by the library's DefinitelyTyped package.
			const typesPackage = `@types/${target.replace(/^@/, "").replace("/", "__")}`;
			if (!(target in declared) && !(types && typesPackage in declared)) {
				violations.push(
					`${path} references ${target}, which ${member ? member.dir : "the root manifest"} does not declare`,
				);
			}
		}
	}

	// An owner that never references its vendor library either carries a dead dependency or satisfies
	// another vendor library's peer dependency; only the latter is allowed.
	for (const [vendor, owner] of owners) {
		if (referenced.has(vendor)) continue;
		const peerOfOwnedVendor = [...owners].some(
			([other, otherOwner]) =>
				other !== vendor &&
				otherOwner.dir === owner.dir &&
				vendor in (manifest(files, `node_modules/${other}/package.json`)?.peerDependencies ?? {}),
		);
		if (!peerOfOwnedVendor) {
			violations.push(`${owner.dir} declares ${vendor} but never references it`);
		}
	}
	return [...new Set(violations)].sort();
}
