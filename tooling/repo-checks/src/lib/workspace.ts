// Private helper: locate the repo root and enumerate workspace members from the workspace globs.
// Used by the boundary + package-meta invariant tests.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { Glob } from "bun";

export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  type?: string;
  exports?: Record<string, unknown>;
  bin?: Record<string, string> | string;
  files?: string[];
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?:
    | string[]
    | {
        packages?: string[];
        catalog?: Record<string, string>;
        catalogs?: Record<string, Record<string, string>>;
      };
}

export interface Member {
  /** Declared package name. */
  name: string;
  /** Absolute path to the member directory. */
  dir: string;
  /** Path of the member directory relative to the repo root, e.g. "packages/schema". */
  relPath: string;
  /** Whether the member has a `src/` directory (a "source member"). */
  hasSrc: boolean;
  /** Parsed package.json. */
  pkg: PackageJson;
}

function readJson(path: string): PackageJson {
  return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
}

/** Walk up from `start` until we find the package.json that declares `workspaces`. */
export function findRepoRoot(start: string = import.meta.dir): string {
  let dir = start;
  for (;;) {
    const pj = join(dir, "package.json");
    if (existsSync(pj) && readJson(pj).workspaces) return dir;
    const parent = dirname(dir);
    if (parent === dir)
      throw new Error("could not locate repo root (no package.json with workspaces)");
    dir = parent;
  }
}

/** The workspace package globs from the root package.json (object or array form). */
export function workspaceGlobs(root: string = findRepoRoot()): string[] {
  const ws = readJson(join(root, "package.json")).workspaces;
  if (!ws) return [];
  return Array.isArray(ws) ? ws : (ws.packages ?? []);
}

/** Enumerate every workspace member by expanding the workspace globs. */
export function listMembers(root: string = findRepoRoot()): Member[] {
  const members: Member[] = [];
  for (const g of workspaceGlobs(root)) {
    const glob = new Glob(`${g}/package.json`);
    for (const rel of glob.scanSync({ cwd: root, onlyFiles: true })) {
      const dir = dirname(join(root, rel));
      const pkg = readJson(join(dir, "package.json"));
      members.push({
        name: pkg.name ?? "<unnamed>",
        dir,
        relPath: dirname(rel),
        hasSrc: existsSync(join(dir, "src")),
        pkg,
      });
    }
  }
  return members.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

/** Every `.ts` file under a member's `src/`, as absolute paths. */
export function memberSourceFiles(member: Member): string[] {
  const glob = new Glob("**/*.ts");
  return [...glob.scanSync({ cwd: join(member.dir, "src"), onlyFiles: true })].map((rel) =>
    join(member.dir, "src", rel),
  );
}

// Matches a string/template literal (capture group 1) OR a line/block comment. Echoing the
// string back while replacing comments with "" strips comments without tripping on a `//`
// that lives inside a string (e.g. "http://…").
const STRING_OR_COMMENT =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

/**
 * Strip `//` line and block comments from TS/JS source while preserving string and template
 * literals. Import extraction runs on the result, so a commented-out import never registers as a
 * real one — a regex over raw source text would mis-read it and fire a false boundary violation.
 */
export function stripComments(src: string): string {
  return src.replace(STRING_OR_COMMENT, (_match, stringLiteral) => stringLiteral ?? "");
}

const IMPORT_SPECIFIER =
  /(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

/** Extract every module specifier referenced by a source file (comments stripped first). */
export function importSpecifiers(filePath: string): string[] {
  const src = stripComments(readFileSync(filePath, "utf8"));
  const specs: string[] = [];
  for (const m of src.matchAll(IMPORT_SPECIFIER)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec) specs.push(spec);
  }
  return specs;
}

export { relative, resolve, sep };
