# Contributing

Thanks for helping improve sandbox provider comparisons. Read the
[methodology](./docs/methodology.md) for how a measurement is produced before extending the matrix.

This repo is a Bun workspace monorepo with a strict, enforced dependency DAG (see
[architecture](./docs/architecture.md)) and a source-first, no-build layout.

## Pull requests from forks

1. Fork, branch, and open a PR against `main`.
2. Hosted CI (`ci.yml` / `ci-lint.yml`) runs the command contract on your PR — no provider secrets.
3. Self-hosted Docker toolchain smoke and live provider benches **do not** run on fork PRs (by
   design: untrusted code must not execute on org runners or spend provider quota).
4. Live benches, dataset publish, and GHCR toolchain releases are maintainer-only:
   `workflow_dispatch` on `main` behind Environment `privileged`. See [CI & secrets](./docs/ci-secrets.md).

For local benches, copy [`.env.example`](./.env.example) to a gitignored `.env`. Never commit API
keys or paste them into issues/PRs — the repo-checks secret-hygiene gate fails CI if a credential
file or secret token is tracked ([SECURITY.md](./SECURITY.md)).

## Local checks (the browser-free gate)

The browser-free checks below are the shared local/CI baseline. CI runs the figures screenshot suite
in a separate job that provisions pinned headless Chrome.

```sh
bun install          # resolve the graph (frozen lockfile in CI)
bun run typecheck    # tsc --noEmit per member
bun run test         # browser-free bun test per member, incl. repo-checks invariants
bun run lint         # biome check; warnings fail
bun run spell        # typos (via mise)
```

The Chrome-backed figures screenshot suite is intentionally separate from the normal local gate:
CI's `figures` job provisions its pinned headless Chrome on a hosted runner and runs
`bun run test:figures` explicitly.

PTS-catalog changes also have a drift gate:

```sh
bun run --filter @sandbox-benchmarks/schema generate-catalog   # regenerate from vendored profiles
bun run check:catalog-drift                                    # fail if the committed draft drifted
bun run check:provider-registry-drift                           # fail if provider metadata assembly drifted
bun run check:provider-wiring                                   # fail if generated CI/docs/env wiring drifted
```

## Add a provider

1. **Identity + metadata** — append the id to `PROVIDER_IDS` in
   [`packages/schema/src/provider-ids.ts`](./packages/schema/src/provider-ids.ts), then add the one
   hand-authored `packages/schema/src/provider-meta/<id>.ts` module. Declare display/vendor identity,
   inputs, artifact lifecycle, isolation, vetted pricing, maturity, spec pinning, and transport there.
   Run `bun run generate-provider-registry` and `bun run generate-provider-wiring`, then review the
   generated correlated index plus managed workflow/docs/env regions. Filename, tuple key, and
   declared id disagreement is a compile error; malformed descriptor semantics fail the generator's
   Tier-3 arktype gate. Keep the independent hardcoded provider oracle in `providers.test.ts` current.
2. **Adapter** — add a matching entry to the adapter map in
   [`packages/providers`](./packages/providers): how to `createCompute()` and the create-time
   `createOptions` (the pinned target spec + toolchain image). The two registries are joined by id, so a
   one-sided provider is a compile error.
3. **Artifact implementation** — only when the descriptor's `artifact.kind` requires one, add the
   provider-specific bake/template implementation. Providers using a stock or shared image do not get
   no-op bakers.
4. **Generated wiring** — do not hand-edit provider choice/input regions. Provider metadata generates
   the smoke dispatch options, three least-privilege workflow input blocks, runner routing,
   `.env.example`, CI configuration docs, and the privileged-environment checklist. The drift gate
   rejects stale or hand-edited output.
5. Bring the provider up with a single-provider branch dispatch. Adding it to the default benchmark
   matrix remains a separate promotion decision after live validation.

## Add a suite

1. **Register it** in [`SUITES`](./packages/schema/src/suites.ts): the `dimensions` it measures, the
   catalogued `metrics` it emits, its `commands` (mise tasks), and the timeouts. The
   [suite↔dimension↔metric contract](./packages/schema/src/suite-contract.ts) fails at load if a metric
   is uncatalogued or off-dimension, or a declared dimension has no metric.
2. **Producer tasks** — add the mise task(s) under `.mise/tasks/benchmark/**` that the `commands` name,
   driving the benchmark via the helpers in [`lib/bench.sh`](./lib/bench.sh) (e.g. `run_pts_benchmark`).
   An orchestrator is a task *file*; its leaves live in a sibling *directory* (a task path can't be both)
   — **unless** the group's own task is spelled `_default`. mise loads `.mise/tasks/a/b/_default` as the
   task `a:b`, so a task can gain sibling leaves without being renamed (this is how
   `benchmark:system:provider` grew `:isolation` and `:egress`). Two things follow from choosing it:
   `task_result_name` strips the `_default` segment so the artifact keeps its name — the normalizer
   matches those files by exact name — and a leaf that is a *view* rather than a producer must write no
   result at all, so it can never race the group task for that artifact.
3. **No matrix job edit** — `bench-matrix.yml` matrices over `plan.outputs.suites` (from `SUITE_NAMES`
   via `plan-suites`), so a new suite is picked up automatically and nests as `<suite> / <provider>` in
   the Actions UI; a dispatch can still narrow to a subset with the `suites` input. The
   workflow-registry-sync drift gate keeps that nesting wiring honest. `bench-smoke.yml` runs the same
   plan → `bench-suite.yml` pipeline, so it needs no edit either — except adding the name to its `suite`
   dispatch `options`, which is what makes the suite selectable for a single-cell smoke.

## Add a metric

**PTS-backed metric** (preferred — generated, not hand-written):

1. Add the profile's exact `<name>-<ver>` dir to `PROFILES` in
   [`fetch-profiles.ts`](./packages/schema/scripts/fetch-profiles.ts) and run
   `bun run --filter @sandbox-benchmarks/schema fetch-profiles` to vendor its
   `test-definition.xml` / `results-definition.xml`.
2. Run `generate-catalog` to regenerate `pts-generated.ts`. A **single-result** profile yields one
   description-less wildcard entry (no byte-match risk). A **multi-result** profile yields one entry per
   option combination — its synthesized `pts.description` must byte-match real PTS output, so commit a
   recorded `composite.xml` fixture under `packages/results/src/lib/__fixtures__/` (the
   [golden gate](./packages/results/src/lib/pts-golden.test.ts) proves it).
3. Curate editorial fields in [`pts-overrides.ts`](./packages/schema/src/pts-overrides.ts): a short
   `label`, any `dimension` correction, and exactly one `headline: true` per dimension.
4. Commit the regenerated `pts-generated.ts` (the drift gate diffs it; overrides are excluded).

**Non-PTS metric** (harness-measured or derived): add the `MetricDef` to the relevant hand-authored
slice (`harness-metrics.ts` for timings, `economics.ts` for derived) and wire its producer — the
lifecycle driver for a timing, `deriveEconomics` for a derived metric. These carry no `pts` field and
don't trip the drift gate.

## Conventions

- **Parse, don't validate**: arktype schemas at every boundary; the TypeScript types are inferred from
  the runtime schema, never hand-written twice.
- **Cross-registry invariants** (id-uniqueness, one-headline-per-dimension, the suite contract) are
  plain throws at module load over typed in-repo constants — fail fast at import.
- Keep packages within the [dependency DAG](./docs/architecture.md#dependency-dag-enforced); `@repo/repo-checks`
  fails CI on a boundary violation.
