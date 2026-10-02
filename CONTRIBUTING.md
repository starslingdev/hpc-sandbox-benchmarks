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

PTS-catalog and provider-metadata changes also have drift gates:

```sh
bun run --filter @sandbox-benchmarks/schema generate-catalog   # regenerate from vendored profiles
bun run check:catalog-drift                                    # fail if the committed draft drifted
bun run generate-providers                                     # regenerate everything provider metadata projects
bun run check:providers                                        # fail if any generated provider output drifted
bun run check:new-provider                                     # scaffold, fill and gate a provider of every kind
```

## Add a provider

A new provider is four steps; everything else is scaffolded or generated.

1. **Scaffold** — `bun run new-provider -- --id <id> --kind sdk|http|cli [--sdk <name>@<version>]
   [--protocol e2b] [--baked]`. `--sdk` names the vendor's npm SDK at an exact version (`--kind
   sdk`) or the CLI binary and its release (`--kind cli`); `--protocol e2b` binds an E2B-compatible
   SDK to the shared `e2bProtocolVendor`; `--baked` adds the `./artifact` builder for a provider that
   bakes the OCI toolchain base. It appends the id to `PROVIDER_IDS`, pins the SDK in the root
   `catalogs.vendors`, writes `packages/schema/src/provider-meta/<id>.ts` and `packages/<id>/`
   (manifest, tsconfig, README, `src/index.ts` binding `defineVendorDriver` or `defineCliDriver` with
   defaults, the `src/vendor.ts` adapter skeleton and `src/index.test.ts`), a checksum-pinned
   `.github/actions/setup-<cli>/action.yml` for a CLI, and runs `bun install --ignore-scripts`. Every
   value only the vendor can answer is left as a typed `unfilled("…")`: typecheck names each one, and
   `generate-providers` refuses the metadata until it is stated.
2. **Fill the metadata** — `packages/schema/src/provider-meta/<id>.ts`: display and vendor identity,
   website, isolation, vetted pricing and spec pinning (and inputs, which default to
   `<ID>_API_KEY`). Declare `package` only for an isolation variant sharing another provider's
   package, and `figureLabel` only when the chart label differs from the derived default.
3. **Write the adapter** — `packages/<id>/src/vendor.ts` translates the vendor onto the vendor port
   (`packages/brezel` and `packages/novita` are the references; `packages/vercel` and
   `packages/microsandbox-cloud` show a name-keyed vendor, `packages/blaxel` a post-readiness
   `prepare`, `packages/boat` a vendor marked on `attach` whose lookups cannot prove absence,
   `packages/daytona` and `packages/modal` isolation variants sharing one adapter, and
   `packages/freestyle` native snapshots on the `snapshots` passthrough). An E2B-protocol adapter is
   already the shared binding: state only the vendor's differences. An SDK, HTTP or CLI provider also
   fills the stand-in for its transport in `src/index.test.ts`, which then runs `vendorContract` and a
   session through `vendorDriver` (an E2B-protocol test needs nothing: it runs over the shared
   `e2bProtocolStub`). A baking provider writes its builder in `src/artifact.ts`. Add translation
   tests for the vendor's quirks beside the generated ones; kit behaviour is already tested in
   `packages/driver`. Change the generated `src/index.ts` only to tune a trait (`coverage`,
   `execution`, `timing`, `recovery`) away from its default.
4. **Generate** — `bun run generate-providers` renders the registry index, the driver and
   artifact-builder loaders, provenance, the managed workflow/docs/env regions (smoke dispatch
   options, workflow input blocks, runner routing, the CLI setup step, `.env.example`, CI
   configuration docs, the privileged-environment checklist) and the registry snapshot
   (`packages/schema/src/__snapshots__/provider-registry.test.ts.snap`). Review that snapshot's diff:
   it records every fact the registry answers for the new provider. The drift gate rejects stale or
   hand-edited output.

The rules the scaffold already satisfies, and the gates that hold them: a vendor library is pinned in
the root `catalogs.vendors` and declared as `catalog:vendors` by its provider package alone (the
vendor-seam check); `sdkPackage` is a dependency of the provider's own package; filename, tuple key
and declared id agree (a compile error otherwise); `./artifact` exists exactly for an OCI baker (a
native-snapshot provider exports `snapshotBuild` from its driver entry instead). The cost guard
(`packages/schema/scripts/new-provider.test.ts`) and `bun run check:new-provider` (a scaffold of
every kind, filled and taken through every gate) keep that cost from growing.

Bring the provider up with a single-provider branch dispatch. Adding it to the default benchmark
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
   `label`, any `dimension` correction, and the curated `headline: true` metrics (one per
   dimension, except network's two WAN directions — ADR-0015).
4. Commit the regenerated `pts-generated.ts` (the drift gate diffs it; overrides are excluded).

**Non-PTS metric** (harness-measured or derived): add the `MetricDef` to the relevant hand-authored
slice (`harness-metrics.ts` for timings, `economics.ts` for derived) and wire its producer — the
lifecycle driver for a timing, `deriveEconomics` for a derived metric. These carry no `pts` field and
don't trip the drift gate.

## Conventions

- **Parse, don't validate**: arktype schemas at every boundary; the TypeScript types are inferred from
  the runtime schema, never hand-written twice.
- **Cross-registry invariants** (id-uniqueness, the per-dimension headline count, the suite contract) are
  plain throws at module load over typed in-repo constants — fail fast at import.
- Keep packages within the [dependency DAG](./docs/architecture.md#dependency-dag-enforced); `@repo/repo-checks`
  fails CI on a boundary violation.
- A provider package is its vendor's only importer ([the vendor seam](./docs/architecture.md#the-vendor-seam)):
  reach a provider through `@sandbox-benchmarks/drivers`, never by importing its package, except the
  allowlisted Modal-only subpaths (`@sandbox-benchmarks/modal/gpu`, `/cleanup-observation`).
