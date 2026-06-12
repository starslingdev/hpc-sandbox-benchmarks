# @repo/tsconfig

Shared, source-first TypeScript configs for the monorepo. **Config-only** — no `src/`, no build,
no `test`/`typecheck` scripts.

## What lives here

- `base.json` — the no-build base every member extends: `moduleResolution: "bundler"`,
  `allowImportingTsExtensions`, `noEmit`, `verbatimModuleSyntax`, `strict`,
  `noUncheckedIndexedAccess`, `types: ["bun"]`. The app and `@repo/*` source members extend this
  directly.
- `library.json` — the preset `packages/*` extend. Source-first means there is no `.d.ts`
  emit, so it currently just re-exports `base.json`; it exists as the seam for any future
  library-only compiler options.

## How it resolves

`package.json` lists the json files in `"files"` and intentionally has **no** `exports` map. A
member's `tsconfig.json` references it as `"extends": "@repo/tsconfig/library.json"`, which TS
resolves directly through the `node_modules` workspace symlink.
