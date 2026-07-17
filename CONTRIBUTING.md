# Contributing

Thanks for helping improve sandbox provider comparisons. Read the
[methodology](./docs/methodology.md) for how a measurement is produced before extending the matrix.

This repo is a Bun workspace monorepo with a strict, enforced dependency DAG (see the
[README](./README.md)) and a source-first, no-build layout.

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

## Local checks (the gate)

Green-on-your-machine means green-in-CI — the same command contract runs in both:

```sh
bun install          # resolve the graph (frozen lockfile in CI)
bun run typecheck    # tsc --noEmit per member
bun run test         # bun test per member, incl. repo-checks invariants
bun run lint         # biome check; warnings fail
bun run spell        # typos (via mise)
```

PTS-catalog changes also have a drift gate:

```sh
bun run --filter @sandbox-benchmarks/schema generate-catalog   # regenerate from vendored profiles
bun run check:catalog-drift                                    # fail if the committed draft drifted
```

## Add a provider

1. **Identity & economics** — add the id to `ProviderId` and a `REGISTRY` entry in
   [`packages/schema/src/providers.ts`](./packages/schema/src/providers.ts): `displayName`, `website`,
   `sdkPackage`, `requiredEnvVars`, `isolation`, vetted `pricing` (per-vCPU/per-GiB, normalized to USD),
   `maturity`, `specPinning`, and the `transport` capability (`streaming`/`syncCapMs`/`detachedPoll`).
   The `Record<ProviderId, …>` type makes a missing entry a compile error.
2. **Adapter** — add a matching entry to the adapter map in
   [`packages/providers`](./packages/providers): how to `createCompute()` and the create-time
   `createOptions` (the pinned target spec + toolchain image). The two registries are joined by id, so a
   one-sided provider is a compile error.
3. **Template** — add a template builder under [`packages/templates`](./packages/templates) so the
   provider can be baked with the toolchain image.
4. The provider now flows through the matrix, normalizer, leaderboard, and economics automatically — no
   consumer edits. Bring it up live per the provider end-to-end issues (E2B/Modal/Daytona).

## Add a suite

1. **Register it** in [`SUITES`](./packages/schema/src/suites.ts): the `dimensions` it measures, the
   catalogued `metrics` it emits, its `commands` (mise tasks), and the timeouts. The
   [suite↔dimension↔metric contract](./packages/schema/src/suite-contract.ts) fails at load if a metric
   is uncatalogued or off-dimension, or a declared dimension has no metric.
2. **Producer tasks** — add the mise task(s) under `.mise/tasks/benchmark/**` that the `commands` name,
   driving the benchmark via the helpers in [`lib/bench.sh`](./lib/bench.sh) (e.g. `run_pts_benchmark`).
   An orchestrator is a task *file*; its leaves live in a sibling *directory* (a task path can't be both).
3. **Add its matrix job** in [`bench-matrix.yml`](./.github/workflows/bench-matrix.yml): one named job
   (grouped under its dimension) that `uses: ./.github/workflows/bench-suite.yml` with `suite: <name>`.
   The workflow-registry-sync drift gate (`tooling/repo-checks`) fails until every `SUITE_NAMES` entry
   has exactly one such job, so a new suite can't silently go un-benchmarked. Its provider fan-out is
   automatic (`plan-providers` selects the provider axis from `PROVIDERS`); add it to the `bench-smoke`
   suite `options` too so it stays dispatchable on its own.

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
- Keep packages within the [dependency DAG](./README.md#dependency-dag-enforced); `@repo/repo-checks`
  fails CI on a boundary violation.
