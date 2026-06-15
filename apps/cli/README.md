# @sandbox-benchmarks/cli

**Role:** the entrypoint app — wires the five `@sandbox-benchmarks/*` packages into runnable commands.

**Bins (`bin`, no `exports`):**
- `bench-lifecycle` — benchmark one provider's spawn→exec→teardown lifecycle.
- `bench-suite` — run the full suite across the matrix.
- `plan-matrix` — print the benchmark matrix as **single-line compact JSON** for `$GITHUB_OUTPUT`.
- `build-template` — build a provider's sandbox template.
- `normalize` — turn raw runs into normalized run documents.
- `promote` — promote normalized results to the published dataset.

**Depends on:** all five packages (`workspace:*`) + `dotenv` (`catalog:`).

**What lives here:** thin command wrappers under `src/bin/`; shared command helpers under
`src/lib/` (never imported across a package boundary). As an app it has **no `exports`** — nothing
imports the CLI.

Run a bin directly during development: `bun apps/cli/src/bin/plan-matrix.ts`.
