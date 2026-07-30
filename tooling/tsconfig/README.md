# @repo/tsconfig

Shared, source-first TypeScript configs for the monorepo. **Config-only** — no `src/`, no build,
no `test`/`typecheck` scripts.

## What lives here

- `base.json` — the no-build base every member extends: `moduleResolution: "bundler"`,
  `allowImportingTsExtensions`, `noEmit`, `verbatimModuleSyntax`, `strict`,
  `noUncheckedIndexedAccess`, `types: ["bun"]`. The app and `@repo/*` source members extend this
  directly. (These files are strict JSON, not JSONC — Biome only allows comments in a file actually
  named `tsconfig.json` — so anything that needs explaining is explained here.)

### Why `jsx` is in the shared base

`@sandbox-benchmarks/figures` is the only member holding `.tsx`, but `jsx: "react-jsx"` belongs to
every member, because this workspace is **source-first**: a package is consumed as TypeScript, so a
consumer of the figure package type-checks that package's `.tsx` under its **own** compilerOptions.
Set on the producer alone, every importer would fail with *"Cannot use JSX unless the `--jsx` flag
is provided"* — pointing at a file it does not own. The option is inert in a member with no `.tsx`,
which is all of them but one.

Only `packages/figures/tsconfig.json` restates `types`, adding `react` to it. `types` is a
whole-project override rather than a merge, so `bun` has to be repeated there or every `node:*`
import and `import.meta.dir` in that package stops resolving.
- `library.json` — the preset `packages/*` extend. Source-first means there is no `.d.ts`
  emit, so it currently just re-exports `base.json`; it exists as the seam for any future
  library-only compiler options.

## How it resolves

`package.json` lists the json files in `"files"` and intentionally has **no** `exports` map. A
member's `tsconfig.json` references it as `"extends": "@repo/tsconfig/library.json"`, which TS
resolves directly through the `node_modules` workspace symlink.
