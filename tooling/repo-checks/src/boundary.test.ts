// Invariant: imports respect package boundaries AND the dependency graph respects layering.
// (a) No relative import may climb above its own package root (into a sibling package).
// (b) No import may reach another workspace package's private `lib/`.
// (c) Every cross-package (workspace) import in a member's src MUST be declared in that
//     member's package.json dependencies/devDependencies. An undeclared workspace import
//     (e.g. a backward/illegal edge such as `schema` importing `cli`) is a violation — this
//     is the gap a name/relative-only check misses.
// (d) The internal runtime-dependency graph (package.json `dependencies` among workspace
//     members) MUST be acyclic. Layer inversions show up here as cycles.
import { describe, expect, it } from "bun:test";
import { dirname } from "node:path";
import {
  importSpecifiers,
  listMembers,
  memberSourceFiles,
  relative,
  resolve,
  sep,
  stripComments,
} from "./lib/workspace.ts";

const allMembers = listMembers();
const memberNames = new Set(allMembers.map((m) => m.name));
const srcMembers = allMembers.filter((m) => m.hasSrc);

/** The workspace package an import specifier targets (by exact name or `name/...` subpath), or null if external. */
function targetMember(spec: string): string | null {
  for (const name of memberNames) {
    if (spec === name || spec.startsWith(`${name}/`)) return name;
  }
  return null;
}

describe("import boundaries", () => {
  for (const member of srcMembers) {
    it(`${member.relPath}: imports stay in-package and are declared`, () => {
      const declared = new Set([
        ...Object.keys(member.pkg.dependencies ?? {}),
        ...Object.keys(member.pkg.devDependencies ?? {}),
      ]);
      const violations: string[] = [];

      for (const file of memberSourceFiles(member)) {
        const rel = relative(process.cwd(), file);
        for (const spec of importSpecifiers(file)) {
          if (spec.startsWith(".")) {
            // (a) relative import escaping the package root. Compare with a trailing
            // separator so a sibling whose name is a prefix (foo vs foo-bar) can't slip through.
            const target = resolve(dirname(file), spec);
            if (target !== member.dir && !target.startsWith(member.dir + sep)) {
              violations.push(`${rel} → "${spec}" escapes ${member.relPath}`);
            }
            continue;
          }

          const owner = targetMember(spec);
          if (owner === null || owner === member.name) continue; // external dep or self-reference

          // (b) reaching into another workspace package's private lib/.
          const subpath = spec.slice(owner.length + 1);
          if (/(^|\/)lib(\/|$)/.test(subpath)) {
            violations.push(`${rel} → "${spec}" reaches into ${owner}'s private lib/`);
          }

          // (c) the workspace package must be a declared dependency.
          if (!declared.has(owner)) {
            violations.push(`${rel} → imports "${owner}" but it is not a declared dependency`);
          }
        }
      }

      expect(violations).toEqual([]);
    });
  }

  it("found source members to scan", () => {
    expect(srcMembers.length).toBeGreaterThan(0);
  });
});

/** Return a cycle (as the list of nodes on it) in a directed graph, or null if acyclic. */
function findCycle(nodes: string[], edges: Map<string, string[]>): string[] | null {
  const seen = new Map<string, number>(); // 0 = visiting (on stack), 1 = done
  const stack: string[] = [];

  function visit(node: string): string[] | null {
    seen.set(node, 0);
    stack.push(node);
    for (const next of edges.get(node) ?? []) {
      if (!seen.has(next)) {
        const found = visit(next);
        if (found) return found;
      } else if (seen.get(next) === 0) {
        return [...stack.slice(stack.indexOf(next)), next]; // back-edge → cycle
      }
    }
    stack.pop();
    seen.set(node, 1);
    return null;
  }

  for (const node of nodes) {
    if (!seen.has(node)) {
      const found = visit(node);
      if (found) return found;
    }
  }
  return null;
}

describe("dependency-graph layering", () => {
  it("the internal runtime dependency graph is acyclic", () => {
    const nodes = allMembers.map((m) => m.name);
    const edges = new Map<string, string[]>(
      allMembers.map((m) => [
        m.name,
        Object.keys(m.pkg.dependencies ?? {}).filter((d) => memberNames.has(d)),
      ]),
    );
    expect(findCycle(nodes, edges)).toBeNull();
  });

  // Guard against a vacuous detector: it must flag a known cycle and clear a known DAG.
  it("findCycle flags a real cycle and clears an acyclic graph", () => {
    const cyclic = new Map([
      ["a", ["b"]],
      ["b", ["c"]],
      ["c", ["a"]],
    ]);
    expect(findCycle(["a", "b", "c"], cyclic)).not.toBeNull();

    const acyclic = new Map([
      ["a", ["b", "c"]],
      ["b", ["c"]],
      ["c", []],
    ]);
    expect(findCycle(["a", "b", "c"], acyclic)).toBeNull();
  });
});

describe("stripComments (import-extraction pre-pass)", () => {
  it("drops commented-out imports but keeps live imports and string contents", () => {
    const src = [
      'import { live } from "external-live";',
      '// import { dead } from "external-dead";',
      '/* import { block } from "external-block"; */',
      'const url = "http://example.com/x";',
    ].join("\n");
    const cleaned = stripComments(src);
    expect(cleaned).toContain("external-live");
    expect(cleaned).not.toContain("external-dead");
    expect(cleaned).not.toContain("external-block");
    // A `//` inside a string literal is not a comment, so the URL survives.
    expect(cleaned).toContain("http://example.com/x");
  });
});
