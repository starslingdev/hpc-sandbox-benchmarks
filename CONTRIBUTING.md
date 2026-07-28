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

Start by picking the **archetype**, because it decides most of the work below:

| Archetype | Examples | Boots |
| --- | --- | --- |
| **A. Direct image** | `namespace`, `modal-gvisor`, `modal-vm` | The published GHCR toolchain image, by ref, at create time — nothing to bake |
| **B. Stock vendor image** | `blaxel` | The vendor's own base image; setup steps run fallbacks instead of the baked toolchain |
| **C. Baked artifact** | `e2b`, `daytona-vm`, `daytona-container`, `novita` | A provider-side template/snapshot built FROM the toolchain image |

Then work through the steps. `bun run typecheck && bun run test` catches every step except 6 and 7.

1. **Identity & economics** — add the id to `ProviderId` and a `REGISTRY` entry in
   [`packages/schema/src/providers.ts`](./packages/schema/src/providers.ts): `displayName`, `website`,
   `sdkPackage`, `requiredEnvVars`, `isolation`, vetted `pricing` (per-vCPU/per-GiB, normalized to USD),
   `maturity`, `specPinning`, and the `transport` capability (`streaming`/`syncCapMs`/`detachedPoll`).
   The `Record<ProviderId, …>` type makes a missing entry a compile error.

   > **Get `transport` right — it is the one field a wrong guess turns into lost benchmark data.** A
   > finite `syncCapMs` REQUIRES `detachedPoll: true` (asserted in `providers.test.ts`), and
   > `detachedPoll` does *not* require a filesystem API: `StepRunner.runDetached` polls the done-file
   > over the sandbox filesystem where one works and `cat`s it over exec where none does. Reading it as
   > "needs a filesystem" is what stranded a 55-minute namespace benchmark on a synchronous exec its own
   > server cut at ~4m19s.

2. **Adapter** — add a matching entry to the adapter map in
   [`packages/providers`](./packages/providers): how to `createCompute()` and the create-time
   `createOptions`. Pin the target spec from `TARGET_SPEC` (some SDKs take it on the factory config, some
   per-create) and point at `config.toolchainImage` (A), the vendor image (B), or the baked artifact
   name (C). The two registries are joined by id, so a one-sided provider is a compile error.
3. **The CLI's four exhaustive sites** — each is a compile error until handled, and for archetypes A/B
   each is a one-line no-op: the baker map in [`bake.ts`](./apps/cli/src/bin/bake.ts),
   `candidateCreateOptions` in [`validate.ts`](./apps/cli/src/lib/bake/validate.ts), the promote switch
   in [`promote.ts`](./apps/cli/src/lib/bake/promote.ts), and `providerArtifact` in
   [`release-plan.ts`](./apps/cli/src/bin/release-plan.ts).
4. **Archetype C only** — the bake pipeline: add the env keys to *both* `envSchema` and `ENV_KEYS` in
   [`config.ts`](./packages/providers/src/lib/config.ts) (they are hand-parallel) along with the
   version/candidate artifact names; add a baker under `apps/cli/src/lib/bake/`; add a `CandidateRefs`
   field and thread it through the `candidateRefs` literals in **both** `bake.ts` and `promote.ts`. Add a
   template builder under [`packages/templates`](./packages/templates) only if the artifact is built from
   a `TemplateSpec` — most providers ship none.
5. **Dependencies** — add the `@computesdk/*` wrapper to `workspaces.catalogs.computesdk` in the root
   `package.json` and reference it as `catalog:computesdk` from `packages/providers` (the
   `package-meta` gate enforces the `catalog:` form).
6. **Workflows.** The `workflow-registry-sync` gate covers the bench lanes: add the id to
   `bench-smoke.yml`'s `provider` choice `options`, and each `requiredEnvVars` key to the *"Run suite and
   normalize"* step env of **both** `bench-smoke.yml` and `bench-suite.yml` (same value expression modulo
   each lane's `inputs.provider` / `matrix.provider` selector). It also covers the release lane: wire the
   same keys into `toolchain-image.yml`'s `bake` and `publish` credential blocks, or declare the provider
   in `RELEASE_LANE_EXEMPT` with the reason it needs no release-lane boot. Across all four blocks it
   further checks that each guard names a *registered* provider that actually requires the key, and that
   every lane draws the credential from the same `secrets.*` name — a typo'd guard would otherwise pass
   every presence check while handing the provider an empty string on every run.
7. **Nothing enforces the default matrix.** `bench-matrix.yml`'s `providers` input default is free text;
   a new provider is dispatchable immediately but stays out of the default run until added there. Leave
   it out (and out of `RELEASE_REQUIRED_PROVIDERS`) until a committed run validates it — that is the
   repo's opt-in posture for an unproven provider, so a missing secret skips rather than blocking.
8. **Credential docs** — [`.env.example`](./.env.example) for local runs and the operator table in
   [CI & secrets](./docs/ci-secrets.md) for the `privileged` environment.
9. **Free** — `packages/results` is provider-generic, so normalization, aggregation, leaderboard,
   economics, and stability pick the provider up with no edits. Bring it up live via `bench-smoke.yml`.

## Add a suite

1. **Register it** in [`SUITES`](./packages/schema/src/suites.ts): the `dimensions` it measures, the
   catalogued `metrics` it emits, its `commands` (mise tasks), and the timeouts. The
   [suite↔dimension↔metric contract](./packages/schema/src/suite-contract.ts) fails at load if a metric
   is uncatalogued or off-dimension, or a declared dimension has no metric.
2. **Producer tasks** — add the mise task(s) under `.mise/tasks/benchmark/**` that the `commands` name,
   driving the benchmark via the helpers in [`lib/bench.sh`](./lib/bench.sh) (e.g. `run_pts_benchmark`).
   An orchestrator is a task *file*; its leaves live in a sibling *directory* (a task path can't be both).
3. **No matrix job edit** — `bench-matrix.yml` matrices over `plan.outputs.suites` (from `SUITE_NAMES`
   via `plan-suites`), so a new suite is picked up automatically and nests as `<suite> / <provider>` in
   the Actions UI; a dispatch can still narrow to a subset with the `suites` input. The
   workflow-registry-sync drift gate keeps that nesting wiring honest. Add it to the `bench-smoke` suite
   `options` too so it stays dispatchable on its own.

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
