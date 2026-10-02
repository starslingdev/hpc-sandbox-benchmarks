# Proposal: provider packages behind a deep vendor seam

**Status:** proposed. It lands as ADR-0023, which amends ADR-0006, ADR-0007 and ADR-0008.

**Method:** improve-codebase-architecture. The steps were:

1. A candidate review: the HTML report (five candidates, three rated Strong).
2. Design it twice: ten sub-agent designs, compared in [DESIGNS.md](./DESIGNS.md).
3. Selection, with the refactored prototypes as proof.

**Constraint from you:** every provider keeps its own package, and that package is the only
importer of its vendor's libraries.

**Evidence:** `prototypes/provider-onboarding/` (90 tests, all green).
- Brezel's 21 original tests pass **unmodified**.
- Novita's 6 original tests pass. One is deliberately adapted; see §5.
- Kit behaviour is tested once against an in-memory vendor (23 tests).
- Registry projections reproduce today's restatements for all 16 providers.
- A vendor-seam check lists today's 31 leaks and passes for the prototype packages.

---

## 1. The three deepenings

### 1.1 The driver authoring module (candidate 1)

**What callers learn today.** A provider author learns `ComputeSdkDriverSpec`: about 15 fields with
implicit invariants. They then re-implement readiness, cleanup confirmation, destroy-by-id,
probes, inventory, recovery and the disk proof. The bugs in that shared behaviour were fixed one
provider at a time: #535, #530, #503, #500 and #493.

**The new seam** is `@sandbox-benchmarks/driver/vendor`. It has two ports and one entry point:

```ts
interface VendorRecord<Raw> { id: string; phase: Phase; marker?: string; raw: Raw }  // adapter-parsed, Tier 2
type Phase = "pending" | "ready" | "failed" | "deleting" | "gone";

interface ControlPlane<Raw> {
  create({ request, marker }, op): Promise<VendorRecord<Raw>>;   // "ready" only when the response proves it
  get(id, op): Promise<VendorRecord<Raw> | null>;                // null ONLY on the vendor's not-found
  remove(id, op): Promise<"removed" | "accepted">;               // accepted = acknowledgement, not removal
  page(cursor, op): Promise<{ records; next? }>;                 // the kit drains; a bad cursor fails closed
  find?(marker, cursor, op): Promise<{ records; next? }>;        // required on a dedicated account (replay)
  refused?(error): { retryable: boolean } | undefined;           // refused before allocating
  admit?(record): string | undefined;                            // post-readiness invariant
}
interface DataPlane<Raw, Native> { attach; exec; launch?; files? }

defineVendorDriver(id, {
  provenance, sandboxId, coverage: pinned(4, 8) | mapped(...),
  account?: "shared" | "dedicated", durable?: "native-launch", timing?, recovery?, syncCapMs?,
  vendor: (context) => ({ control, data }),     // the ONE place the package binds its SDK / fetch
})  // → DriverModule & { withVendor(bind) }
```

**What the kit derives** from the ports, once, for every provider:

| Behaviour | How it is derived |
|---|---|
| Readiness | skipped when `create` proves readiness, otherwise polled |
| Cleanup confirmation | observe, remove once, then observe removal; never delete a sandbox already observed gone |
| Destroy-by-id | the same teardown routine |
| Probes | from `get` and `page` |
| Inventory | owned/foreign partition, fail-closed paging |
| Ambiguous-create recovery | marker lookup or replay; unrelated records are rejected by the kit, not by each adapter |
| Artifact guard, disk proof, execution policy | applied uniformly |

**Lowering:** everything lowers onto the existing `computeSdkSpec` bridge. Coverage proof, id
parsing, cleanup double faults, redaction and output caps are reused, not reimplemented.

**Dependency category:** true external. The provider package is the production adapter. The
module's `withVendor` lets tests bind a stub. `memoryVendor` is the second adapter that makes the
seam real, and `vendorContract` is the reusable port-contract suite.

### 1.2 The provider package as the only vendor seam (candidate 2)

**Package shape:**

```
packages/<id>/
  package.json        deps: its vendor library + @sandbox-benchmarks/driver (+ arktype)
  src/vendor.ts       the adapter: translation only, receives its SDK or fetch
  src/index.ts        defineVendorDriver(...)  — or defineCliDriver for CLI vendors
  src/artifact.ts     defineArtifactBuilder(...) — exists exactly when the registry says "baked"
  src/provenance.ts   generated
  src/*.test.ts       translation + vendorContract over a stubbed transport
```

**The artifact builder.** `ArtifactBuilder` lives at `@sandbox-benchmarks/driver/artifact`
(arktype-free). The release lane passes it:
- the derived name;
- a digest-pinned base;
- the parsed credentials;
- the target spec;
- `replace`, `log` and `signal`.

The builder returns `{ ref }`: exactly the ref the driver boots. Nothing else crosses the seam,
so the per-provider `CandidateRefs` fields and the `candidateLaunch` switch are deleted.

**Generated joins.** `packages/drivers` generates two:
- `DRIVERS`, as today;
- `ARTIFACT_BUILDERS`, which is exhaustive over baked providers.

The generator checks `./artifact` exactness: a native-snapshot baker (Freestyle) gets a builder
derived from its driver's snapshot capability instead.

**Modal-only code.** Modal's GPU and cleanup-observation code moves to
`@sandbox-benchmarks/modal/{gpu,cleanup-observation}`. The CLI imports those by name through an
allowlist. With one adapter each, they are not generated seams.

**`packages/providers` dissolves:**

| What | Where it goes |
|---|---|
| Artifact names | `schema/provider-artifacts` |
| Vendor helpers | their provider packages |
| Cost-evidence sanitizers | harness |
| The legacy adapter lane | deleted |

**Enforcement.** `tooling/repo-checks/src/vendor-seam.test.ts` (prototype: `tooling/vendor-seam.ts`)
requires every `catalogs.computesdk` vendor library to be a dependency of, and imported by,
exactly one provider package. Type-only imports and `require` strings count. Today it reports 31
leaks: `apps/cli` depends on 6 vendor SDKs and imports them from 11 files, and
`packages/providers` depends on 11.

### 1.3 The registry answers restated facts (candidate 3)

**Deleted** (each passes the deletion test):

| What | Why it can go |
|---|---|
| `meta.transport` | dead; the harness reads `module.execution` |
| `MIGRATED_DRIVER_IDS`, the empty `adapters`, the legacy lane | the migration is done |
| `candidateCreateOptions`, per-provider `CandidateRefs` | only the dead legacy lane used them |
| `RELEASE_UNSCOPABLE_PROVIDERS` | derived from `artifact.kind` |
| `figureProviderName`'s prefix map | replaced by `figureLabel` |
| The leaderboard's isolation string sniffing | replaced by `declaredIsolationClass` |
| The provenance entry table | derived from `sdkPackage` |
| The two separate generators | merged into one `generate-providers` + `check:providers` |

**Metadata changes, the only ones:**

| Field | Change |
|---|---|
| `sdkPackage` | becomes `string \| { cli } \| { http }`, and Runloop's and Namespace's stale values are fixed |
| `package?` | new; isolation variants only |
| `figureLabel?` | new; defaults to `displayName` |

**Tier-3 check:** an npm `sdkPackage` must be a dependency of its own provider package. Run against
today's metadata, it catches both stale values.

**Pure Tier-1 projections:**
- `providerPackage`
- `candidateArtifact(id, { toolchainImage, mirrored, buildResults })`
- `releaseUnscopable`
- `figureLabel`
- `declaredIsolationClass`

**Tests:** invariants plus one reviewed registry snapshot replace the seven id-list oracles. CI
fails on a mismatched snapshot rather than rewriting it.

**Metadata stays in `packages/schema`.** Moving it into provider packages would either create a
schema→provider→driver→schema cycle, or put every vendor SDK in every registry reader's dependency
closure.

---

## 2. Adding a provider

`new-provider --id acme --transport sdk|http|cli --inputs ... [--sdk pkg@x.y.z] [--baked]` scaffolds:
- the metadata file;
- the package (manifest, tsconfig, `index.ts`, `vendor.ts`, `vendor.test.ts`, and `artifact.ts` when baked);
- the `PROVIDER_IDS` line;
- the catalog pin.

| Transport | Scaffolded | Written by hand |
|---|---|---|
| TypeScript SDK | 7 files, ~100 lines | the vendor adapter's verbs; the build call if baked |
| HTTP-only (no SDK) | 6 files, ~91 lines | the same verbs over the injected `fetch`; the package has no third-party dependency |
| CLI-only | 4 files, ~67 lines | the existing declarative `CliSpec` (argv, row schema, status classification) |

What nobody writes again: provenance, execution policy, wiring tables, release lists, id-list
tests, teardown, recovery, inventory, readiness, or the disk proof.

## 3. Domain language (add to `packages/driver/CONTEXT.md`)

- **Vendor port.** The control-plane and data-plane operations a provider package translates from
  its vendor. It is not a driver: the driver kit derives the driver from it.
- **Phase.** The provider-neutral reading of one control-plane record: pending, ready, failed,
  deleting, gone.
  - *Failed* still owns resources.
  - *Gone* is removal evidence. An acknowledged delete is not removal, consistent with *cleanup
    confirmation* in the harness context.
- **Ownership marker.** The per-attempt value a create carries (label, metadata, name or
  idempotency key) that attributes an allocation to the benchmark. Inventory and ambiguous-create
  recovery are based on it. It is never inferred from timing or shape.
- **Dedicated account.** A credential whose vendor account holds only benchmark allocations. Every
  live record is owned, and recovery replays an idempotent create.
- **Provider package.** A provider's only vendor seam. It exposes a driver, and an artifact builder
  when the provider bakes.

## 4. ADR-0023 (draft)

**Context.** Provider-neutral lifecycle behaviour is re-implemented in each driver, and lifecycle
bugs were fixed one provider at a time. Vendor libraries leak outside provider packages: 31
findings today. Six modules restate registry facts.

**Decision.**
1. Drivers are written against the vendor port (§1.1) and lowered onto the existing bridge. The
   raw `computeSdkSpec` remains an escape hatch for capabilities with one adapter (snapshots, GPU).
   CLI vendors keep `defineCliDriver`.
2. A provider package is the only importer of its vendor libraries. It exposes `.` and, when baked,
   `./artifact`. A generated `ARTIFACT_BUILDERS` join sits beside `DRIVERS`, and a repo check
   enforces the seam.
3. The registry answers derived facts through pure projections. `meta.transport`, the legacy lane,
   and the restated tables are deleted. One generator, one drift check, one reviewed snapshot.

**Amends:**
- ADR-0006: one generator; the `sdkPackage` union; `package` and `figureLabel`; no `artifact.boot`.
- ADR-0007: records per-provider packages and generated joins, replacing its stale
  `packages/drivers/src/<id>.ts` text; adds the `./vendor`, `./vendor/testing` and `./artifact`
  subpaths.
- ADR-0008: the kit tier runs through `memoryVendor` and `vendorContract`.

**Rejected** (so future reviews don't re-suggest them):
- capability lists and per-behaviour overrides on the vendor port: wide interface, and they weaken
  cleanup confirmation;
- versioned capability contracts for one-adapter capabilities: hypothetical seams;
- moving metadata into provider packages: a dependency cycle, or vendor SDKs in every registry
  reader's dependency closure;
- `artifact.boot`: vendor request syntax belongs to drivers.

## 5. Migration (each step ships alone)

| Step | Change | Exit criterion |
|---|---|---|
| 1 | C3: projections, one generator, metadata fixes, delete the legacy lane and restated tables | the equivalence tests pass, then are deleted with the code they compared |
| 2 | `driver/vendor`, `vendor/testing`, `driver/artifact` subpaths | the kit suite (23 behaviours) and the contract are green |
| 3 | Brezel and Novita on `defineVendorDriver` | the original suites pass, then shrink to translation + contract (replace, don't layer) |
| 4 | C2: bake builders into `./artifact`, Modal subpaths, dissolve `packages/providers`, turn on the vendor-seam check | the check reports zero; `apps/cli/package.json` lists no vendor library |
| 5 | Migrate the remaining 11 drivers, each the next time it needs real work | per driver: its original suite green before its tests shrink |

## 6. Accepted costs and open questions

- **Teardown always observes before deleting.** A vendor whose delete already confirms removal
  pays one extra GET. That is why Novita's destroy-by-id test needed a `getInfo` stub. In return,
  the kit never sends a destructive call for a sandbox already observed gone, which Brezel's
  original tests require.
- **Brezel's create response is not treated as readiness evidence.** The adapter maps it to
  `pending`, preserving the original contract that readiness is observed by GET within its
  deadline.
- **Vendors outside the port, for now:**
  - Snapshots, GPU and Tama's driver-owned create budget stay on the existing `computeSdkSpec` and
    `defineCliDriver` paths until a second adapter justifies a seam.
  - Data-only manifests for CLI and HTTP vendors are prototyped in `speculative/`, to adopt when a
    second vendor of either kind arrives.
- **Two outputs for a reviewer to watch:** generated per-package files (`provenance.ts`, joins)
  and the registry snapshot diff are where review of a new provider now happens.
