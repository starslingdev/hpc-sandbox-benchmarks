# @sandbox-benchmarks/cli

**Role:** the entrypoint app — wires the five `@sandbox-benchmarks/*` packages into runnable commands.

**Bins (`bin`, no `exports`):**
- `bench-lifecycle` — benchmark one provider's spawn→exec→teardown lifecycle.
- `bench-suite` — run one suite on one provider sandbox into a raw tree, then normalize it into a Run
  (`--raw-only` stops after the raw tree; the bench-matrix fan-out uses it).
- `plan-matrix` — plan the provider × suite matrix for the bench-matrix workflow: emit the credentialed
  provider list + selected suites to `$GITHUB_OUTPUT` and write skip markers for credential-less providers.
- `assemble-run` — merge a bench-matrix run's per-cell raw artifacts into one curated raw tree (the
  package-raw step's input to `normalize`).
- `build-template` — build a provider's sandbox template.
- `normalize` — turn raw runs into normalized run documents.
- `promote` — promote normalized results to the published dataset.

**Depends on:** all five packages (`workspace:*`) + `dotenv` (`catalog:`).

**What lives here:** thin command wrappers under `src/bin/`; shared command helpers under
`src/lib/` (never imported across a package boundary). As an app it has **no `exports`** — nothing
imports the CLI.

Run a bin directly during development: `bun apps/cli/src/bin/plan-matrix.ts`.
