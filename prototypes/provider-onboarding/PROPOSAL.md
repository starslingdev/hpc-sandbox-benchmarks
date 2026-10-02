# Proposal: provider packages as deep modules

**Status:** proposed. It would land as ADR-0023, which amends ADR-0006, ADR-0007 and ADR-0008.

**Goal:** adding the Nth sandbox provider (API-only, CLI-only, or TypeScript SDK) should mean
writing only what is true about that vendor. Everything provider-neutral should live once, behind
small interfaces.

**Constraints:**

- Every provider keeps **its own package**.
- That package is the only place its third-party libraries are imported.
- The approach follows the *improve-codebase-architecture* method: deep modules, real seams,
  locality and leverage, the deletion test, and tests written at the interface.

**Evidence:** `prototypes/provider-onboarding/` (see its README). Brezel, Tama and Novita were
rebuilt on the proposed interfaces and pass their **original, unmodified test suites (38/38)**.
The metadata derivations reproduce today's hand-written tables for all 16 providers.

---

## 1. Diagnosis

### Where the cost sits today

| Kind of work | Share of a provider addition (Brezel, #539: 32 files) |
|---|---|
| Vendor-specific translation | ~8 files, of which ~⅓ of `index.ts` is really vendor-specific |
| Provider-neutral lifecycle behavior re-implemented inside the driver | ~⅔ of a 240–685-line `index.ts` |
| Hand-edited wiring and id-list test oracles | 12 files |
| Generated output | 9 files |

### Five deepening candidates

The candidates below are ranked by leverage. Each one is described in the method's terms: the
module and its files, the problem, the solution, and what changes for tests.

#### C1. The driver authoring interface is shallow

- **Files:** `packages/driver/src/computesdk.ts` (`ComputeSdkDriverSpec`), plus every
  `packages/<id>/src/index.ts`.
- **Problem: interface.** A provider author has to learn about 15 fields and their unwritten
  invariants. For example: `runtime-verified` requires `prepareAndVerifyCreatedRequest`;
  `maxAttempts` must be at least 2; account admission requires `inventory`, `destroyById` and
  `probes` together.
- **Problem: behavior behind it.** All 13 drivers then implement the *same* behaviors: readiness
  polling, convergent teardown, destroy-by-id, observe, inventory partitioning, ambiguous-create
  recovery, and the disk proof.
- **Deletion test.** Delete the per-driver implementations and the complexity reappears 13 times.
  It is real behavior, living in the wrong module.
- **Locality evidence.** The same behavior keeps being fixed provider by provider:
  - #535 runcloud: asynchronous DELETE against a deadline
  - #530 microsandbox: a draining sandbox that never settles
  - #503 modal: destroy budgets
  - #500 boat: delete conflicts
  - #493 runcloud: ambiguous creates
  - several of the commits inside #539 for Brezel: cleanup and control-plane deadlines

  Each bug was found and fixed once per vendor instead of once.
- **Solution.** A deep **vendor ops** interface. The provider states vendor verbs; the kit derives
  the seven behaviors (§3.1).
- **Seam check.** 13 adapters exist today, so this is a real seam.

#### C2. The provider package does not encapsulate its vendor

- **Files:** `apps/cli/package.json` depends directly on `@daytona/sdk`, `@daytona/api-client`,
  `@runloop/api-client`, `modal`, `freestyle` and `novita-sandbox`. Vendor code sits in:
  - `apps/cli/src/lib/bake/{daytona,runloop,freestyle}.ts`
  - `apps/cli/src/lib/gpu/*`
  - `apps/cli/src/lib/modal-cleanup-observation.ts`

  The legacy `packages/providers` depends on the Blaxel, Runloop and Novita SDKs, and serves bake
  helpers through `./config`.
- **Problem.** Knowledge about a vendor is split across three packages. A vendor SDK upgrade
  touches the CLI app. Nothing enforces the boundary you want.
- **Solution.** The **provider package** becomes the vendor boundary. It exposes vendor-specific
  capabilities only through declared subpaths (`.` driver, `./artifact` bake builder, and later
  `./gpu`) behind provider-neutral interfaces. Generated loaders join them (§3.2). A repo check
  forbids importing a vendor SDK outside its owning package. `packages/providers` dissolves.

#### C3. The wiring re-states metadata by hand

- **Files:**
  - `renderDriversProvenance`'s entry table
  - `apps/cli/src/lib/bake/validate.ts#candidateLaunch`
  - `RELEASE_UNSCOPABLE_PROVIDERS`
  - `MIGRATED_DRIVER_IDS` and the empty `adapters` table
- **Deletion test.** Each of these is a pass-through: delete it, derive the same answer from
  `REGISTRY`, and nothing reappears elsewhere. Proven by `src/wiring/derive.test.ts`.
- **Side effect.** It surfaces real drift: Runloop's and Namespace's `sdkPackage` still name
  `@computesdk/*` wrappers the drivers no longer use.

#### C4. Tests sit at the wrong interface

- **Problem: duplicated kit behavior.** Brezel's 409-line test spends ~48% of its lines on a fake
  HTTP router. Most of its assertions test kit behavior: deadlines, convergence, cancellation.
  Every provider re-tests that behavior through its own fake.
- **Problem: id-list oracles.** Seven files hard-code the full provider id list.
- **Problem: unused gate.** ADR-0008's `runConformance` is used only by its own unit test.
- **Solution.** The interface is the test surface:
  - Kit behavior is tested **once**, at the vendor-ops seam, against an in-memory vendor adapter.
    That in-memory adapter is also the second adapter that proves the seam is real.
  - Provider tests cover **only translation and quirks**.
  - One reviewed registry snapshot replaces the id lists.
  - Replace the old tests; don't layer new ones on top of them.

#### C5. Declarative control planes (HTTP and CLI manifests)

- **Status:** designed and prototyped; adoption is **staged** by the seam rule.
- **Why staged.** Today there is one CLI provider (Tama) and zero pure-REST providers (Brezel uses
  an SDK for its data plane). One adapter only makes a hypothetical seam.
- **When to ship.** Each manifest compiler ships when its **second** adapter arrives:
  - the CLI manifest with the second CLI vendor;
  - the HTTP manifest with the second API-only vendor.

  Both lower onto C1, so they never need new safety logic.

---

## 2. Design it twice: alternatives weighed

The table compares the interface shapes for C1. Each one was prototyped or sketched against the
real kit.

| Shape | Interface size | Leverage | Verdict |
|---|---|---|---|
| Status quo: `ComputeSdkDriverSpec` | ~15 fields + implicit invariants | low (every behavior is the author's) | keep only as an internal lowering target and escape hatch |
| Minimal verbs: `VendorOps` | 11 verbs + an error classifier | 7 behaviors derived | **chosen**. Smallest interface that fit three very different vendors |
| Abstract base class with template methods | similar | similar | rejected: breaks literal inference of record and option types, makes overriding one behavior an inheritance puzzle, and hides the lowering |
| Full data manifests for every provider | zero code | maximal | rejected as the *only* path: data-plane variety (NDJSON, websockets, SDK-only exec) needs code. Kept as C5 on top of the same seam |
| Back to `@computesdk/*` wrappers | small | low | rejected: the fleet left them because they erase vendor errors |

For C2 (where capabilities live), the options were:

| Option | Verdict |
|---|---|
| Keep bake and GPU code in `apps/cli` | rejected: fails the vendor-boundary goal |
| Merge every capability into the default export | rejected: loading a driver would evaluate bake dependencies |
| Capability **subpaths** of the provider package, each joined by a generated loader | **chosen**: lazy, typed, and checked by the same generator that already checks `.` |

---

## 3. The design

### 3.1 The vendor ops interface (`@sandbox-benchmarks/driver/vendor`, new subpath)

```ts
/** What a provider package must know about its vendor. Everything else is derived. */
export interface VendorOps<Record, Handle> {
  readonly sandboxId: Type<string>;                 // arktype id boundary (Tier 2)
  readonly coverage: CreateRequestCoverage;         // coverage({...}) | pinnedShape(4, 8)
  create(attempt: { request: CreateRequest; marker: string }, signal?: AbortSignal): Promise<Record>;
  get(id: string, signal?: AbortSignal): Promise<Record>;
  remove(id: string, signal?: AbortSignal): Promise<void>;
  list(signal?: AbortSignal): Promise<readonly Record[]>;
  idOf(record: Record): string;
  phase(record: Record): Phase;                     // pending | ready | failed | deleting | gone
  readonly ownership: OwnershipMarker<Record>;      // marker read back from records, or dedicated account + find()
  connect(record: Record): Handle | Promise<Handle>;
  exec(handle: Handle, command: string, options?: ExecOptions): Promise<ExecOutcome>;
  readonly files?: VendorFiles<Handle>;             // omitted → shell fallback, hasWorkingFilesystem false
  launch?(handle: Handle, command: string, options?: ExecOptions): Promise<void>; // present → native-launch
  readonly errors: { notFound: Classifier; definitive?: Classifier; retryable?: Classifier };
  verify?(record: Record): void;                    // post-readiness invariant (e.g. revision match)
  readonly policy?: {                               // the only four knobs three vendors required
    readiness?: "poll" | "on-create";
    removal?: "converge" | "confirmed-by-delete";
    timing?: Partial<{ pollMs: number; readyTimeoutMs: number; deleteTimeoutMs: number }>;
    recovery?: Partial<{ absenceConfirmationMs: number; maxAttempts: number }>;
  };
}

export function defineVendorDriver<P extends ProviderId, Record, Handle>(
  id: P,
  module: {
    readonly registry: GeneratedRegistryFacts<P>;   // provenance + execution, generated per package
    readonly vendor: (context: DriverContext<P>) => VendorOps<Record, Handle>;
  },
): DriverModule<P, Handle>;
```

**What the kit derives** from those verbs:

| Behavior | Derived from |
|---|---|
| readiness | `get` + `phase` |
| convergent teardown with removal evidence (harness glossary: *cleanup confirmation*) | `get` + `remove` + `phase` / `notFound` |
| `destroyById` | the convergent teardown above |
| `probes.observe` / `describe` / `list` | `get`, `list` |
| inventory partition into owned vs. foreign | `list` + `ownership` |
| ambiguous-create recovery | `ownership` (marker lookup or idempotent replay) |
| the artifact guard | the resolved artifact |
| the `df` disk proof | `exec`, when disk is `runtime-verified` |
| execution policy | `launch` present or absent, plus the generated sync cap |

It all lowers onto the existing `computeSdkSpec` / `driverFromTable` bridges. Coverage checks, id
boundaries, cleanup double faults, redaction, output caps and deadlines stay where they are, so
no safety logic moves.

`syncCapMs`, provenance and any other registry facts the driver needs come from a **generated**
per-package file. It is today's `provenance.ts`, renamed `registry.generated.ts`. That removes
the current duplication of `transport.syncCapMs` between metadata and driver, and keeps the
driver kit's root free of schema runtime imports (ADR-0007's architecture test still holds).

### 3.2 The provider package contract

Every provider is one workspace package, and the only importer of its vendor libraries.

```
packages/<id>/
  package.json            deps: its vendor SDK(s) only + @sandbox-benchmarks/driver (+ arktype)
  tsconfig.json  README.md                                   (scaffolded)
  src/index.ts            default: DriverModule<"<id>">       ← required
  src/artifact.ts         default: ArtifactBuilder<"<id>">    ← only when artifact.kind is "baked" or "mirror"
  src/registry.generated.ts   provenance + execution facts    (generated)
  src/index.test.ts       translation + quirk tests at the VendorOps interface
```

Enforcement, extending the existing `tooling/repo-checks` and `driverFleetProjection`:

1. **Vendor boundary.** Every package in `workspaces.catalogs.computesdk` may be a runtime
   dependency of exactly one provider package. Isolation variants already share one package
   (`daytona-vm`/`daytona-container`, `modal-gvisor`/`modal-vm`). `apps/cli`, `harness`, `templates` and
   `providers` may not depend on any of them.
2. **Package shape.** Each registered id resolves to a package that default-exports `.`. A
   provider whose metadata says `artifact.kind: "baked"` must export `./artifact`. A provider
   that doesn't bake must not.
3. **Generated joins.** `packages/drivers` generates `DRIVERS` (exists today) and
   `ARTIFACT_BUILDERS` (new, replacing `apps/cli`'s hand-written `BAKED_ARTIFACT_BUILDERS`).
   Both are lazy, so loading a driver never evaluates bake dependencies.
4. **Dissolve `packages/providers`.**
   - Artifact naming in `config.ts` → `schema/provider-artifacts` (`bakedArtifactName` already lives there).
   - Vendor helpers → their owning provider's `./artifact`.
   - `support` → `driver`.

   The `MIGRATED_DRIVER_IDS` / `adapters` join is deleted, since the migration is complete and
   `migration-waivers.json` is `{}`.
5. **Templates are shared, not vendor-specific.** Provider `./artifact` modules may depend on
   `@sandbox-benchmarks/templates` (images, pins). The DAG stays acyclic once `templates` stops
   depending on `providers`.

### 3.3 What a provider package contains, by vendor interface

| Vendor interface | `src/index.ts` | Third-party deps | Hand-written size (measured) |
|---|---|---|---|
| **TypeScript SDK** (Novita) | `defineVendorDriver` with SDK verbs | the SDK | 119 lines (today 243) |
| **API-only with an SDK data plane** (Brezel) | HTTP control-plane data + `hook` for exec/files | the SDK | 50 data + 51 code (today 300) |
| **API-only, JSON exec** (fixture) | `defineHttpDriver(id, manifest)`, after C5 lands | none | 54 lines, metadata included |
| **CLI-only** (Tama) | `defineCliDriver(id, manifest)`, after C5 lands | none (binary pinned by setup action) | 63 lines of data (today 97 TS) |

In every row, the package still exists and still owns its dependencies. For API-only and CLI
providers that means owning *no* third-party code, which the boundary check also verifies.

### 3.4 Where arktype lives (ADR-0001 and ADR-0006 tiers, unchanged)

| Tier | What | Where |
|---|---|---|
| 1, import-time inert | provider metadata (`schema/provider-meta/<id>.ts`), manifest literals in provider packages | `as const satisfies …`, no arktype at import |
| 2, process boundary | every vendor response: records, ids, command envelopes, CLI JSON | the provider's own arktype schemas, invoked by the kit |
| 3, generate / gate | metadata (existing `provider-meta-schema.ts`) + manifests (`scope()` + cross-field `manifestFailures`) | the single `generate-providers` command and the drift gate |

### 3.5 Tests at the interface

| Layer | Tests | Replaces |
|---|---|---|
| `driver/vendor` | derived behaviors once, against an **in-memory `VendorOps` adapter**: deadlines, convergence, recovery, inventory, readiness, disk proof, cancellation | the kit-behavior half of every provider test file |
| `driver/testing` | `vendorConformance(module, fake)` runs ADR-0008's kit-tier clauses through a real adapter. This finally wires up `runConformance` | per-provider happy-path plumbing |
| provider package | translation and quirks only: phase table, marker read-back, error classes, request mapping, data-plane codec | the rest of today's per-provider files |
| registry | invariants + one reviewed snapshot (`bun test -u`) | 7 hard-coded id lists |
| live | the existing smoke conformance lane | unchanged |

### 3.6 Wiring (C3)

- Merge `generate-provider-registry` and `generate-provider-wiring` into **one**
  `bun run generate-providers`.
- `PROVIDER_IDS` stays the single hand-written identity list (ADR-0006).
- New optional metadata field: `artifact.boot: { key, suffix?, target? }`.
- Provenance comes from `sdkPackage`. A `" CLI"` package resolves through its setup action.
- Release scope is derived from `artifact.kind`.
- Fix the stale Runloop and Namespace `sdkPackage` values.

---

## 4. Adding a provider, end to end

`bun run new-provider --id acme --kind sdk|http|cli --inputs ACME_TOKEN,var:ACME_URL [--sdk pkg@x.y.z]`

| Step | SDK | API-only | CLI |
|---|---|---|---|
| Scaffolded: metadata file, `PROVIDER_IDS` line, package shell, catalog pin | ✓ | ✓ (no catalog) | ✓ (no catalog; pin in setup action) |
| Write: metadata facts (isolation, pricing, inputs) | ~40 lines | ~40 lines | ~40 lines |
| Write: vendor translation | ~120 lines of verbs | ~55 lines of data (+ hook if needed) | ~60 lines of data |
| Write: tests | quirks only | quirks only | quirks only |
| Run | `bun run generate-providers && bun install && bun test -u` | same | same |

Hand-touched files drop from **~21 to 3** substantive ones (metadata, `src/index.ts`,
`src/index.test.ts`), plus scaffolded shells. Generated output and the snapshot diff stay
reviewable but cost nothing to produce.

## 5. Domain language (add to `packages/driver/CONTEXT.md`)

- **Vendor ops**: the minimal operations a provider package translates from its vendor: create,
  get, remove, list, phase, ownership, connect, exec, and optionally files and launch. They are
  not a driver; the kit derives the driver from them.
- **Phase**: the provider-neutral reading of one control-plane record: pending, ready, failed,
  deleting, gone. *Failed* still owns resources. *Gone* requires removal evidence; a successful
  delete request is not removal (consistent with *cleanup confirmation* in the harness context).
- **Ownership marker**: the per-attempt value a create carries (label, metadata or idempotency
  key) that attributes an allocation to the benchmark. It is the basis of inventory and of
  ambiguous-create recovery. Never inferred from timing or shape.
- **Provider package**: the module that is a provider's only vendor boundary. It exposes a driver
  and, when it bakes, an artifact builder.

Add to `CONTEXT-MAP.md`: *Provider packages implement vendor ops; the driver kit derives sandbox
sessions and lifecycle behavior from them.*

## 6. ADR impact

| ADR | Change |
|---|---|
| **0023 (new)** | Vendor ops seam and the provider package contract (§3.1–3.2) |
| 0006 | Amend: one generator; `artifact.boot`; derived provenance and release scope. `PROVIDER_IDS` as the single identity list is **kept** |
| 0007 | Amend: its text still places drivers in `packages/drivers/src/<id>.ts`; record per-provider packages + generated loaders as the current architecture, and the `./vendor` subpath |
| 0008 | Amend: the kit tier runs through `driver/testing` for every provider |
| 0002 | No conflict; strengthened by the vendor-boundary check |

No proposal here conflicts with an accepted decision. The one ADR-0006 alternative I had
floated, discovering provider ids from the filesystem, is withdrawn.

## 7. Migration (each step ships alone; none is a big-bang change)

| Step | Change | Exit criterion |
|---|---|---|
| 1 | C3 wiring + registry snapshot; delete `MIGRATED_DRIVER_IDS`/`adapters`; fix stale metadata | the derivation equivalence tests pass in `tooling/repo-checks`; the id lists are deleted |
| 2 | `driver/vendor` + in-memory adapter + `driver/testing` | kit tests cover the seven derived behaviors |
| 3 | Move Novita and Brezel onto `defineVendorDriver` | their existing suites pass unmodified (already shown in the prototype), then shrink to quirk tests |
| 4 | C2: `./artifact` subpaths + generated `ARTIFACT_BUILDERS`; move bake, GPU and cleanup vendor code out of `apps/cli`; dissolve `packages/providers`; add the vendor-boundary check | `apps/cli/package.json` lists no vendor SDKs |
| 5 | Migrate the remaining drivers opportunistically, each when it next needs real work | per driver: original suite green before its tests shrink |
| 6 | C5 manifests: CLI with the 2nd CLI vendor, HTTP with the 2nd API-only vendor; scaffolder templates point at real subpaths | two adapters per manifest kind |

## 8. Risks and open questions

- **Knob creep in `policy`.** Three vendors needed four knobs. The rule: a knob is added only for
  a semantic difference that two providers share. Anything else overrides a verb in that package.
- **Behavior changes found while migrating**, to be decided deliberately rather than by accident:
  - Novita's `probes.list` measured one page, while the kit drains every page.
  - Novita's recovery reported `contradictedPriorAbsence` in a case where the kit reports `destroyed`.
- **CLI pins at scale.** Each CLI vendor currently needs its own checksum-pinned setup action.
  At ~100 providers, generalize to one `setup-provider-cli` action driven by a metadata `cli`
  descriptor.
- **Import cost.** `schema/providers` re-exports `provider-pricing.ts`, which evaluates arktype
  (`providers.ts:52`). Fix it independently, or the Tier-1 promise erodes as the registry grows.
- **Expected outcome**, using the measured sizes: about 4× less hand-written provider code at
  100 providers. Each lifecycle fix lands once instead of once per vendor.
