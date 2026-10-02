# Architecture

How the repository itself is put together: the workspace, its enforced boundaries, the command
contract, and the gates that hold them. For how a *measurement* is produced, see
[methodology](./methodology.md).

## Provider sandbox evidence (Run v5 and v6)

The provider's driver module owns billing API interaction. After the harness attempts and awaits sandbox
teardown, its optional hook returns one validated sandbox-scoped observed/missing record. The harness
persists it under the existing raw `data/` tree as `provider-cost-evidence.json`; normalization and
aggregation carry it through using only `@sandbox-benchmarks/schema`, with no provider SDK dependency.
Historical v2-v4 documents remain unchanged and cannot carry evidence.
The sandbox collection archive cannot supply that reserved filename: collection rejects it before
copying any entry, and only the post-teardown host writer may create it. Schema validation establishes a
bounded, structurally valid provider-observed record; it does not authenticate the provider response.

Run v6 adds one host-owned `provider-artifact-evidence.json` per benchmark cell. The composition root
records the exact artifact the selected driver boots, and the harness writes that
request fallback before its first sandbox operation. For a canonical release artifact, the harness
then reads the bounded `/toolchain-manifest.json` from the ready guest and atomically upgrades the
record to `guest-fingerprint`. The expected image name/version is never supplied by the producer: the
schema derives it from release constants plus the provider's canonical artifact mapping and rejects a
stale manifest. Arbitrary overrides remain honest request fallbacks. Collection reserves both evidence
filenames, normalization binds the record to its run/provider/suite/replicate cell, and aggregation
rejects conflicts, sandbox reuse, or a mixture of v6 and older shards that could drop attribution.

## The repository

This repo is a **Bun workspace monorepo** with a strict, enforced dependency DAG and a uniform
package shape. The guiding rule: *"can I import this?"* is answered by the path alone, and
boundary violations fail CI.

## Source-first, no build step

Every package's `exports` map points at TypeScript **source** (`./src/index.ts`), and Bun resolves
workspace sources natively. There is no compile step: `bun install` → `typecheck` → `test` →
`lint` are all green with zero compilation. The committed `bun.lock` pins the whole graph.

## Layout

```text
packages/   importable libraries   — scope @sandbox-benchmarks/*
  schema/       shared types + arktype schemas, vendored PTS profiles + generated metric catalog (bottom of the DAG)
  templates/    per-provider template builders + toolchain Docker images (images/)
  harness/      benchmark timing, evidence persistence → driver + schema
  results/      normalization + the comparison surface → schema, figures
  figures/      realworld charts: Run → figure model → HTML → WebP (headless Chrome) → schema
apps/
  cli/          entrypoint with bin commands → every packages/* library
tooling/        dev-only            — scope @repo/*
  tsconfig/     shared source-first TS configs (config-only)
  repo-checks/  boundary, vendor-seam and package-meta invariant tests
lib/        in-sandbox benchmark runner (bench.sh), realworld PTS runner overlay, isolation probe
data/       committed benchmark dataset (published run results)
scripts/    maintainer scripts (dataset backfill, leaderboard update)
docs/       methodology, ADRs, CI & secrets
```

## Dependency DAG (enforced)

| Member                      | Internal deps (`workspace:*`)                   | External (catalog)                  |
|-----------------------------|-------------------------------------------------|-------------------------------------|
| `@sandbox-benchmarks/schema`     | —                                               | `arktype`                           |
| `@sandbox-benchmarks/driver`     | schema                                          | `arktype`                           |
| `@sandbox-benchmarks/drivers`    | driver, provider workspace packages              | — |
| `@sandbox-benchmarks/<provider>` | driver (schema where needed)                    | `arktype`, that provider's vendor libraries (`catalog:vendors`) |
| `@sandbox-benchmarks/templates`  | schema                                          | —                                   |
| `@sandbox-benchmarks/harness`    | driver, schema                                  | —                                   |
| `@sandbox-benchmarks/figures`    | schema                                          | `arktype`, fonts (`@fontsource/*`)  |
| `@sandbox-benchmarks/results`    | schema, figures                                 | `arktype`, XML tooling (`catalog:xml`) |
| `@sandbox-benchmarks/cli` (app)  | schema, driver, drivers, modal (named subpaths only), templates, harness, results, figures | `dotenv`, `@actions/core`, `arktype` — no vendor library |
| `@repo/tsconfig`            | —                                               | —                                   |
| `@repo/repo-checks`         | —                                               | —                                   |

## Native SDK driver configuration

Each provider family owns a workspace package: for example, `packages/blaxel` exports
`@sandbox-benchmarks/blaxel`. Daytona and Modal expose their isolation variants through package
subpaths. Implementations, SDK dependencies, behavioral tests, and generated SDK provenance stay
in that provider package. `packages/drivers` contains only the generated, correlated lazy loader.

The SDK-free kit exposes `@sandbox-benchmarks/driver/vendor`, `/vendor/testing`,
`/vendor/e2b-protocol`, `/errors` and `/artifact` as explicit subpaths; the ComputeSDK bridge the
vendor kit lowers onto is internal to `packages/driver`. External values are parsed at their trust
boundaries; trusted requests are passed internally without revalidation. Vendor errors reach the
adapter's classifiers (`refused`, `transient`, `absent`) before the kit normalizes and redacts them.

### The vendor seam

A provider package is its vendor's only importer (ADR-0023 §2). Every vendor library is an entry of
the root `catalogs.vendors`; provider-neutral libraries sit in the default catalog. Each vendor
library is declared by, and referenced from, exactly one provider package (a library declared only to
satisfy another owned vendor library's peer dependency counts as owned). Everything else reaches a
provider package through the generated loaders in `@sandbox-benchmarks/drivers`, except vendor code
with a single implementation, which the CLI imports by name:

- `@sandbox-benchmarks/modal/gpu` — the Modal GPU platform (client, App, CUDA runtime image, Volumes,
  prepared allocations, tags and filesystem snapshots); the CLI keeps workload staging, harness
  lifetime and reporting in `apps/cli/src/lib/gpu/`;
- `@sandbox-benchmarks/modal/cleanup-observation` — read-only clearance of the Modal benchmark App for
  retained-allocation recovery.

`tooling/repo-checks/src/vendor-seam.test.ts` enforces this over all workspace source (`apps/`,
`packages/`, `tooling/`, `scripts/`), counting type-only imports, dynamic imports and `require`
specifiers; adding a named subpath means editing its allowlist and saying why in the ADR.

### Driver authoring (`@sandbox-benchmarks/driver/vendor`)

ADR-0023 §1: a provider package writes an adapter against two ports and `defineVendorDriver`
derives the DriverModule. The **control plane** (`create`, `get`, `remove`, `page`, optionally
`settle`, `find`, `refused`, `transient`, `absent`, `admit`) and the **data plane** (`attach`, `exec`, optionally `launch`, `files`, `prepare`)
speak provider-neutral `VendorRecord`s carrying a `Phase`. The kit starts no port call on an
already-cancelled signal; bounds each control-plane read (`get`, `page`, `find`) by
`controlTimeoutMs`, handing the adapter the bounded signal and racing an SDK that takes none
(`create`, `settle` and `remove` may wait on the vendor and stay within their own budgets; an
adapter bounds a step the kit does not with the exported `bounded`); refuses a record a read by id
returns for another id (an SDK whose read also resolves a name), including the read a removal makes
through `RemoveOp.current` before deleting by handle; and, where the control plane declares
`absent` (the vendor's own not-found, as narrow as the vendor's rule: Modal's counts only sandbox
RPCs), reads such an error from `get` or `settle` as `null` and from `remove` as `"removed"`. A
listing `find` never reads a not-found as an empty page; only a `recovery.lookup` (a `get` by name)
does. So no adapter hand-writes those rules. What adapters would otherwise restate is shared from `/vendor` too: `httpStatus` (a typed
error's status anywhere in its cause chain), `refusedOn` (refusal over listed statuses, retryable
only on 429), `httpClassifiers` (the REST reading of a status as `refused`, `transient` and
`absent`), `LEAK_EXPIRY_MS` (the vendor-side lifetime every create that can state one states) and
`isMintedMarker`. The kit owns, once for every provider:

- readiness — skipped when `create` returns a `ready` record, otherwise polled through `get`, or
  through the vendor's server-side wait (`settle`, a long poll) where it has one, still under the
  kit's deadline, phase classification and teardown. A boot failure carries the record's vendor
  `detail`, and one marked `retryCreate` (a host that gave up on the boot) is retryable once
  teardown is proven;
- cleanup confirmation — request removal, then observe removal; an `accepted` delete is not
  removal. A session the kit holds is sent its delete first; destroy-by-id and recovery observe
  first, and a record already observed gone is never sent a delete. A `transient` refusal of the
  delete (a conflicting operation, an outage) is asked again after the next read while
  `deleteTimeoutMs` remains, and is the reported failure if the budget ends on it; any other
  refusal ends teardown at once. Removal is read every `pollMs`, or every `deletePollMs` where the
  module's cleanup cadence differs from its readiness cadence;
- destroy-by-id, probes (`observe`/`describe` from `get`, a one-page `list`), and inventory (the
  owned/foreign partition by the kit-minted `benchmark-` ownership marker, where a `stopped` foreign
  record holds no compute and is not counted while a `stopped` owned one is a leftover, draining pages and
  failing closed on a repeated, omitted or runaway cursor, or a sandbox listed twice: 100 pages
  unless the module declares a larger `pageCap`, as Runloop and Namespace do for listings that keep
  terminal history);
- ambiguous-create recovery — by marker lookup (`find`, or, where the module declares
  `recovery.lookup`, a `get` of the marker's spelling: the create named the sandbox by it),
  rejecting unrelated records on a shared account, or by idempotent replay on a dedicated account; teardowns run concurrently and any failure surfaces.
  `refused` failures skip recovery; `transient` failures are reconciled and then marked retryable.
  The locator names the marker under the vendor's own `markerKey`, spelled as the vendor shows it
  (`markerSpelling`, the same spelling the adapter creates and parses with). A module whose lookups
  cannot prove an ambiguous create absent (`recovery.provesAbsence: false`: the marker is set after
  create, or a create can land after every lookup) keeps such an attempt as a cleanup failure until
  its marker finds the allocation;
- the request proof: the artifact guard and the module's `unsupported` cross-axis refusal before
  any vendor call; after readiness, `admit`, the vendor's `prepare` (a keepalive, or the
  allocation's reported resources, refusing a shape it does not honour, and optionally the boot
  artifact the control plane reports, which must agree with the request), and the `df` disk proof
  for a `runtime-verified` disk axis or a declared `diskProof` (a mount path and a
  filesystem-overhead allowance in GiB or as a fraction of the request, which also proves a mapped
  disk; a zero reading is a broken probe, not a small disk). `diskProof: "reported"` declares that
  the allocation's record reports its disk and `prepare` proves it there, so no `df` runs (Daytona
  and Freestyle).

It lowers onto the ComputeSDK bridge, so coverage proof, id parsing, cleanup double faults,
redaction and output caps are reused. Every port call outside a poll is bounded
(`controlTimeoutMs` for probes and listing pages, `snapshotTimeoutMs` for snapshots), and a response
arriving after its bound is rejected. A module's declared traits are deeply frozen. `create` is the only step before the vendor returns an id:
`attach` (before readiness), readiness, `admit`, `prepare` and the disk proof run on the bridge's
post-create path, so a failure in any of them tears the allocation down by that id and, if teardown
fails too, keeps a cleanup that retries by id (a `FailedCreateCleanupError` with an `id` locator),
never only by a marker the failed step may not have set. Vendor-family behaviour
stays on typed passthroughs:
`snapshots` (on the bound vendor), `accelerator`, `costEvidence`, a harness-owned `createBudget`,
and `execution` (default `{ syncCapMs: 60_000, durable: "shell-detach" }`; `durable:
"native-launch"` requires `data.launch`; a `shell-detach` vendor may supply one to bound the kit's
`detachedShellCommand`). `vendorDriver(module, context, { vendor, timing })` (from
`/vendor/testing`) lowers the same module against a stubbed transport for provider tests.
Brezel (a dedicated account recovered by idempotent replay, over an injected `fetch`), Novita
(a shared account recovered by a server-side marker query, over the loaded SDK), Blaxel, Vercel and
Microsandbox Cloud (name-keyed: the sandbox name carries the marker's attempt UUID and is the
recovery lookup), Namespace and Runloop (recovered by matching the marker over the drained
account), E2B (a server-side metadata query), run.cloud (name-keyed, with a lost create response
adopted by reading its name), boat (renamed to its marker on `attach`, since its create takes no
name), Daytona (both isolation variants, named by the marker and recovered by `recovery.lookup`), Modal
(both isolation variants: the marker is the sandbox name in the benchmark App, the ownership
boundary, and a listing's first page is the App's own generation) and Freestyle (marked in
metadata, found by the attempt's slug, with native snapshots on the `snapshots` passthrough) are
written this way: `src/vendor.ts` is the adapter, `src/index.ts` (or a variant family's
`src/shared.ts`) binds the real transport once. Every SDK or HTTP driver is a vendor adapter; Tama
alone stays on `defineCliDriver`. Modal's GPU allocation (`./gpu`) is the same
adapter over the caller's App and image, whose teardown also waits until the environment stops
listing the sandbox. E2B and Novita speak one protocol through different SDKs, so both adapters are
`@sandbox-benchmarks/driver/vendor/e2b-protocol`'s `e2bProtocolVendor` over the package's own
injected SDK, stating only the vendor's differences (its domain, whether its SDK takes a signal,
its create and command timeouts); the shared module imports no SDK, so the vendor seam holds.

`@sandbox-benchmarks/driver/vendor/testing` holds `memoryVendor` (an in-memory account with a fault
script, a guest shell that answers the kit's commands, and leak detectors), `vendorContract`
(the port contract every adapter passes, read as the module's kit calls it), `vendorDriver` and
`kitPort` (an adapter as the kit sees it, for translation tests). Kit behaviour is tested once against `memoryVendor`,
including ADR-0008's kit tier, which admits a module built over it.

`@sandbox-benchmarks/driver/artifact` (arktype-free) is the release lane's build seam. Its request
is a union by how the provider bakes:

- an **OCI baker** (`defineArtifactBuilder(id, build)`, a provider package's `./artifact`) takes a
  derived name, a digest-pinned base, the toolchain images directory, the Docker config directory,
  parsed credentials, the target spec and a `replace` permission. It returns the exact `ref` its
  driver boots plus how a same-name predecessor was replaced (`none`, `atomic`, or `destructive` for a
  vendor that can only delete, then create). Builders that drive a vendor CLI or Docker take the
  kit's `BuildCommandRunner` transport (`runBuildCommand` is the real one);
- a **native-snapshot baker** gets no base and no `./artifact`: `snapshotArtifactBuilder(module,
  snapshotBuild)` derives it from the driver's snapshot capability and the `snapshotBuild` options its
  driver entry exports (the stock base, and how to read the immutable identity a build booted). It
  boots the stock base (or, on a version build, the revalidated candidate), awaits the lane's
  injected `prepare(session, { base })` (recipe, smoke and provenance), captures a `durable` snapshot,
  and destroys the sandbox with cleanup confirmation. A snapshot captured by a failed build is
  deleted. The stock base is a mutable alias, so a driver boots it only from a build context: one
  whose resolved artifact is that alias, which a benchmark lane never resolves.

Snapshot capture takes a `retention`: `ephemeral` (a lifecycle measurement's snapshot, which the
vendor may expire) or `durable` (a release artifact, which a driver refuses rather than let expire).

The generated `ARTIFACT_BUILDERS` join in `@sandbox-benchmarks/drivers` sits beside `DRIVERS`: one
lazy loader per baked provider, typed per id, deriving the native-snapshot builders. The release lane
(`apps/cli/src/lib/bake/provider-artifacts.ts`) derives the name, resolves the digest-pinned base
once when an in-scope provider bakes from it, calls the loader, and records each build's `ref` as the
candidate's `buildResults`. Bake reports carry those refs, and promote pins them (`--bake-reports`),
so a native snapshot is promoted by the immutable ID its bake validated. Mirrored artifacts (Vercel)
promote by a registry retag in the CLI, which imports no vendor library for it.

`DriverError.vendorHttpStatus` carries HTTP response status; `vendorExitCode` carries process exit
status. Only the HTTP field participates in the 429 retry rule. CLI readiness can return
`{ terminal, retryable }`; the kit releases a retry mark only after failed-create cleanup succeeds.
Tama 0.1.17 exposes a status and diagnostic detail, but no documented capacity reason code. Its
terminal rows explicitly decline retry rather than interpreting `status_detail` as a typed signal.

## The provider registry

`packages/schema` owns provider identity (`PROVIDER_IDS`) and one inert metadata module per provider.
Everything else that names providers is derived from that registry rather than restated:

- pure Tier-1 projections in `@sandbox-benchmarks/schema/providers` — `providerPackage` (where a
  driver module lives; isolation variants declare `package`), `provenanceConstant`,
  `candidateArtifact` (what a release validates), `releaseUnscopable`, `figureLabel` (chart labels;
  `figureLabel` metadata only where it differs from the derived default) and
  `declaredIsolationClass` (the class a guest probe can contradict);
- one generator, `bun run generate-providers`, which validates the metadata (including that an npm
  `sdkPackage` is a runtime dependency of its own provider package and that a `{ cli }` vendor has a
  setup action pinning an exact version) and `./artifact` exactness (an OCI baker exports one; no other
  provider does; a native-snapshot baker's driver exports `snapshotBuild`), and writes the registry
  assembly, the driver and artifact-builder loaders, each package's provenance, the managed workflow,
  env and docs regions (including one setup step per pinned vendor CLI) and the reviewed registry
  snapshot. `bun run check:providers` is its drift check;
- one scaffolder, `bun run new-provider`, which writes everything mechanical about a new provider
  (its `PROVIDER_IDS` entry, catalog pin, metadata module, package, adapter skeleton, tests and, for a
  CLI, its setup action) and leaves only what the vendor makes true as typed `unfilled(...)` values.
  `packages/schema/scripts/new-provider.test.ts` is its cost guard (the files it writes, the files an
  author edits, the adapter skeleton's budget, and that generation then needs no other edit);
  `bun run check:new-provider` scaffolds, fills and gates a provider of every kind in a temporary
  copy of the repository.

Exec transport is not metadata: each driver module's `execution` policy declares its synchronous cap
and durable route, and the composition root projects it onto the harness's `ProviderTransport`.
`packages/schema/src/provider-registry.test.ts` holds the registry invariants and the one reviewed
snapshot of every projection (refreshed by `generate-providers`), so a new provider is reviewed as one
snapshot diff.

## Driver end-to-end validation (`driver-check`)

`apps/cli/src/lib/driver-run.ts` is the ADR-0007 composition root: it loads a driver module, parses
that provider's declared env slice, resolves the lane's artifact, and constructs the driver. It also
holds the two adapters that let a port `SandboxSession` drive today's `StepRunner`; both are
temporary and disappear when the harness consumes driver sessions directly.

`driver-check` is the local lane that exercises the whole path against a real sandbox:

```sh
bun apps/cli/src/bin/driver-check.ts --provider e2b
bun apps/cli/src/bin/driver-check.ts --provider tama --phase candidate --workload-seconds 10
```

It runs create → readiness → exec (including the exit-7 and split-stream clauses) → a filesystem
round-trip → a real workload on BOTH transports → destroy → idempotent destroy → control-plane
convergence, then prints a JSON conformance report. It writes **no Run document** because it is a
contract check, not a benchmark measurement; the benchmark harness is the Run v6 artifact-evidence
producer.

The durable step uses a timeout at or above the module's declared `syncCapMs`, forcing
`StepRunner` onto the detached transport. The actual workload lasts `--workload-seconds` and must
produce an observable done-file. The short default proves transport routing and completion; it does
not claim to prove a workload outlives the sync cap. Increase the workload duration for that check.

Use `--require-pass` for release validation: any failed or skipped check exits nonzero, and `--keep`
is rejected so an intentionally retained sandbox cannot produce passing release evidence. Use
`--report-file <path>` for machine-readable JSON: StepRunner emits workload logs to stdout, so the
default stdout stream contains those logs followed by the final report.

A provider whose credentials are absent SKIPS with exit 0. An id with no driver module is rejected
as a usage error.

## Driver conformance (`@sandbox-benchmarks/driver/conformance`)

ADR-0008's contract ships with the suite that verifies it. `runConformance({ module, context, tier })`
drives one driver module through the closed clause inventory and returns a report:

```ts
import { runConformance, formatConformanceReport } from "@sandbox-benchmarks/driver/conformance";

const report = await runConformance({ module, context, tier: "smoke" });
console.log(formatConformanceReport(report));
```

Three properties are load-bearing and easy to lose:

- **The inventory is closed.** Every ADR-0008 §2 row appears in every report. A row the suite could
  not observe reports `unverified` rather than being omitted, because a missing row reads as green.
- **`unverified` blocks admission exactly like `fail`.** §5 admits a provider only when every row is
  `pass` or `not-applicable`. An unobserved claim and a false claim are indistinguishable to a
  published measurement, so an honest report is frequently *not* admissible — including for a driver
  that breaks nothing.
- **Absence is not a skip where the contract defines the absent path.** A session without `files`
  exercises the kit's exec fallback, which the harness leans on just as hard; a driver without
  `probes` reports `unverified` for destroy convergence, never a pass.

The suite is verified the way a TCK should be: against deliberately-broken fake drivers, one per
violation, so each clause is shown to actually *catch* the failure it claims to. A driver that
fabricates an exit code, resolves `destroy` while the sandbox still runs, advertises a filesystem
whose reads lie, or returns a session for a GPU it cannot provide each produce a `fail`.

Secret diagnostics is `unverified` unless the caller supplies its spawn/log diagnostic surfaces,
and the GPU row is `unverified` unless a `gpu` axis is supplied. A fully observed run supplies both
along with artifact fingerprint and allocation-order evidence; the suite has a regression proving
that such a conforming report is actually admissible rather than permanently blocked.

`results` depends on `schema` and `figures` alone — it must normalize without any provider SDK,
and it now also builds the leaderboard's chart documents. `@repo/repo-checks` enforces that no
package reaches across boundaries or into another package's private `lib/`.

`figures` is typed by `schema` — the workspace's one Run contract and registry shapes — so it
re-describes nothing the workspace already owns, but the registries still arrive as ARGUMENTS:
there is no module-level dataset, so its guards run against synthetic runs instead of whatever
the committed dataset contains. Its charts are pure string building (HTML with fonts inlined
from pinned packages), and `results` owns the seam that passes the real registries. The one
impure step — headless Chrome, via `Bun.WebView` — lives behind its own entry point,
`@sandbox-benchmarks/figures/screenshot`, imported only by the CLI: everything that merely reads
the Run model or builds a document never spawns a browser.

## Command contract

| Command              | What it does                                                            |
|----------------------|-------------------------------------------------------------------------|
| `bun install`        | Resolve the graph, symlink workspaces, install catalogs (≥7-day-old releases). |
| `bun run typecheck`  | `tsc --noEmit` per member — proof of source-first/no-build.             |
| `bun run test`       | Browser-free `bun test` per member, including repo-checks invariants, excluding the Chrome-backed figures suite. |
| `bun run test:figures` | Chrome-backed figures screenshot tests; CI's `figures` job runs this on a hosted runner with pinned headless Chrome. |
| `bun run lint`       | `biome check . --error-on-warnings` — CI gate; warnings fail (root-only Biome config). |
| `bun run format`     | `biome format . --write` — formatting only (no import sorting / lint fixes). |
| `bun run lint:fix`   | `biome check . --write` — formatting + import sorting + safe lint fixes. |
| `bun run lint:fix:unsafe` | `biome check . --fix --unsafe` — also applies behavior-changing fixes; review the diff. |
| `bun run spell`      | `typos` — source-code spell check (run it before pushing).              |
| `bun run spell:fix`  | `typos --write-changes` — apply typos' suggested corrections.            |
| `bun run lint:shell` | `shellcheck` on the repo's shell scripts (toolchain images, `lib/`, mise tasks) and the `run:` blocks embedded in `.github/actions/` composite actions. |
| `bun run lint:docker`| `hadolint` on the toolchain-image Dockerfiles (`packages/templates/images`). |
| `bun run smoke`      | Boot each provider's sandbox from the baked image and smoke-test it (providers without credentials are skipped). |
| `bun run check:catalog-drift` | Fails if the generated PTS catalog drifted from the vendored profiles. |
| `bun run generate-providers` | Regenerates every output derived from provider metadata (registry assembly, driver loader, provenance, managed workflow/env/docs regions, registry snapshot). |
| `bun run check:providers` | Fails if any generated provider output drifted from the metadata registry. |
| `bun run new-provider -- --id <id> --kind sdk\|http\|cli` | Scaffolds a provider (`--sdk <name>@<version>`, `--protocol e2b`, `--baked`); see CONTRIBUTING.md "Add a provider". |
| `bun run check:new-provider` | Scaffolds, fills and gates a provider of every kind in a temporary copy of the repository (CI's `scaffold` job). |

Run a single bin during development: `bun apps/cli/src/bin/plan-matrix.ts`.

## Toolchain (mise)

Non-Bun tools are version-pinned in [`mise.toml`](../mise.toml) and managed with
[mise](https://mise.jdx.dev): [`typos`](https://github.com/crate-ci/typos) (spell check),
`shellcheck` + `hadolint` (shell/Dockerfile lint for the toolchain images), and
`actionlint` + `zizmor` (workflow lint + security audit, run by the `ci-lint` workflow). After
cloning, run `mise install` (and `mise trust` once) so the pinned binaries are available; the
`bun run` wrappers invoke these tools through `mise exec`, so they always use the pinned versions.
mise fetches from official release sources with checksum verification — no npm republisher and no
install-time postinstall.

## Continuous integration

`.github/workflows/ci.yml` runs the command contract on every pull request and every push to
`main`: `bun install --frozen-lockfile --ignore-scripts` → `bun run lint` (the Biome gate) →
`bun run lint:shell` → `bun run lint:docker` → `bun run typecheck` → browser-free `bun run test` →
`bun run check:catalog-drift` → `bun run check:providers` → `bun run spell` (typos, set up via [mise](https://mise.jdx.dev)).
A second `figures` job runs pinned-Chrome `bun run test:figures` on a hosted `ubuntu-24.04` runner —
the same image that renders the committed figures, and the one where Chrome can keep its sandbox.
A separate `ci-lint.yml` lints the workflows themselves (actionlint + zizmor). The browser-free
checks run locally; CI additionally exercises the Chrome-backed figures suite with its pinned browser.

CI runs on a maintainer-controlled runner, so it never executes fork-PR code — the gate runs only
for pushes and same-repo pull requests. Anything that needs provider credentials additionally runs
only from `main`, behind Environment [`privileged`](./ci-secrets.md); pull requests never
receive provider secrets.

## Git hooks (pre-commit)

[Lefthook](https://lefthook.dev) runs a fast local mirror of CI on every commit, configured in
`lefthook.yml`:

- **Biome** on staged files (`biome check --write`, restaging any auto-fixes; unfixable issues or
  warnings block the commit).
- **Typos** repo-wide (`bun run spell`) — read-only, so run `bun run spell:fix` to apply corrections.
- **Lockfile** check (`bun install --frozen-lockfile`) when a manifest or `bun.lock` is staged, so
  `package.json` and `bun.lock` can't drift apart.

`bun install` wires the hooks automatically via the project's own `prepare` script
(`lefthook install`) — no third-party postinstall runs. Re-install them with `bunx lefthook
install`, and bypass a single commit with `LEFTHOOK=0 git commit`.

## Supply-chain posture

`bunfig.toml` sets `minimumReleaseAge = 604800` (7 days) so freshly published — possibly
compromised — releases are not installed, and **no third-party lifecycle scripts run** (empty
`trustedDependencies`). The git hooks above are wired by the project's own first-party `prepare`
script, not a dependency's postinstall, and CI installs with `--ignore-scripts` so it runs none
either. Lint and formatting are root-only via a single `biome.json`.
