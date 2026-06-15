# @repo/repo-checks

**Role:** runnable invariant tests that keep the monorepo structure honest. They run under
`bun --filter '*' test` like any other member, so a structural violation fails CI.

**Public surface:** none — this package is not imported (no `exports`, no `bin`). It only ships
`bun:test` files.

**What lives here:**
- `src/boundary.test.ts` — scans every source member's `src/**/*.ts` imports and fails on
  (a) relative imports that escape the package root and (b) imports reaching another package's
  private `lib/`.
- `src/package-meta.test.ts` — asserts the uniform `package.json` shape across all members:
  identity fields, the test/typecheck script contract (source members) vs. a `files` array
  (config-only members), `exports`/`bin` rules, and that internal deps use `workspace:*` while
  cataloged externals use `catalog:` / `catalog:<name>`.
- `src/lib/workspace.ts` — repo-root resolution + member enumeration via `Bun.Glob` (private).

To prove enforcement works, temporarily add an import like `import "../../providers/src/index.ts"`
to any stub and watch `boundary.test.ts` fail; then revert.
