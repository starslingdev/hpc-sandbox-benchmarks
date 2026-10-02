---
status: accepted
---

# Provider packages behind a vendor port

## Context

Three costs remained after ADR-0006 and ADR-0007 made registration declarative and gave every
provider its own package.

**Lifecycle behaviour is re-implemented in every driver.** Each ComputeSDK driver hand-writes the
same sandbox lifecycle against `ComputeSdkDriverSpec`:

- readiness polling
- convergent teardown with removal evidence
- destroy-by-id
- probes
- the owned/foreign inventory partition
- ambiguous-create recovery
- the artifact guard
- the `df` disk proof

Bugs in that shared behaviour were found and fixed one provider at a time (#493, #500, #503, #530,
#535, plus several commits inside #539). Drivers run from 240 to 685 logical lines, roughly two
thirds of them provider-neutral.

**Vendor libraries leak out of provider packages.**
- `apps/cli` declares six vendor SDKs and imports them for image baking, GPU runs and Modal
  cleanup observation.
- The legacy `packages/providers` declares eleven vendor libraries.

The rule that a provider package is its vendor's only importer was intended but not enforced.

**Registry facts are restated by hand.**
- the provenance entry table
- the candidate-launch switch, with one `CandidateRefs` field per provider
- the release-scope refusal list
- the migrated-driver id list
- the chart-label prefix map
- the leaderboard's isolation-class string sniffing
- seven hard-coded id lists in tests

Two `sdkPackage` values (Runloop and Namespace) had already drifted from the packages the drivers
actually pin. Each new provider meant editing roughly 21 files by hand.

The design was chosen by an architecture review followed by "design it twice": ten independent
interface designs across the three candidates, compared on depth, locality and seam placement.

## Decision

### 1. Drivers are written against a vendor port

`@sandbox-benchmarks/driver/vendor` defines two ports: a **control plane** and a **data plane**.

| Plane | Operations | Contract |
|---|---|---|
| Control | `create` | |
| | `get` | returns `null` only on the vendor's own not-found; the kit bounds it by `controlTimeoutMs` and refuses a record with another id |
| | `settle` | optional; the vendor's server-side readiness wait (a long poll) with `get`'s contract, used in place of the kit's readiness poll; the kit still owns its deadline, the classification of the phase it settles on, and teardown |
| | `remove` | returns `"removed"` when the vendor proved removal, `"accepted"` when it only acknowledged; `RemoveOp.current` is the kit's `get` of the id, for a vendor that deletes through a looked-up handle |
| | `absent` | optional; classifies the vendor's own not-found, which the kit reads as `null` from `get` and `settle` and as `"removed"` from `remove` |
| | `page` | one page of the whole account; the kit drains it and fails closed on a bad cursor |
| | `find` | optional; or `recovery.lookup`, a `get` of the marker's spelling where the create named the sandbox by it |
| | `refused` | optional; the vendor refused before allocating |
| | `transient` | optional; retryable once the kit proved nothing remains allocated |
| | `admit` | optional |
| Data | `attach`, `exec` | `attach` runs straight after `create`, so a vendor whose create takes no marker applies it there (a rename); a failure is torn down by id |
| | `launch`, `files` | optional |
| | `prepare` | optional; post-readiness preparation and the allocation's reported-resource proof, including the boot artifact the vendor reports and, under `diskProof: "reported"`, the disk in place of the kit's `df` |

Both planes speak in provider-neutral `VendorRecord`s carrying a `Phase`. A provider package
supplies an adapter, which translates only. Where the vendor spells the ownership marker its own
way (the attempt's UUID under a vendor prefix in a sandbox name or a documented purpose), the
module declares one `markerSpelling`; the adapter builds its create request and parses records
with it, and the recovery locator prints it, so a cleanup diagnostic names what the vendor shows.
A record also states what only the vendor knows about it: that it is `stopped` (holds no compute),
the vendor's `detail` of a failed phase, and whether a failed boot is worth a fresh create
(`retryCreate`). A module whose marker lookups cannot prove an ambiguous create absent declares
`recovery.provesAbsence: false`, and the kit keeps such an attempt as a cleanup failure.
`defineVendorDriver` derives everything else:
- readiness
- cleanup confirmation
- destroy-by-id
- probes
- inventory
- recovery
- the artifact guard
- the disk proof
- execution policy

It lowers onto the existing ComputeSDK bridge, so coverage proof, id parsing, cleanup double faults,
redaction and output caps are reused, not reimplemented.

What a module declares beside its adapter, each with a safe default (`VendorTraits`, the port's
optional hooks and the passthroughs):

| Hook | What it states |
|---|---|
| `sandboxId`, `coverage` | the vendor's id schema; how the create honours each request axis (`mapped()`, `pinned(vcpus, gb)`) |
| `unsupported` | a cross-axis request shape the vendor cannot honour, refused before any vendor call |
| `account` | `"shared"` (default): records carry the create-time marker; `"dedicated"`: every live record is owned, and an ambiguous create is recovered by replay, so `control.find` (an idempotent replay) or `recovery.lookup` is required |
| `markerKey`, `markerSpelling` | the name the marker travels under (default `<provider>-marker`); how the vendor spells it (default verbatim; `markerSpelling(prefix)` for a UUID under a vendor prefix) |
| `pageCap` | pages one listing may span before its cursor counts as runaway (default 100) |
| `diskProof` | `{ path?, allowanceGb?, allowanceRatio? }`: the `df` proof's mount and filesystem-overhead allowance (also proving a mapped disk); `"reported"`: `data.prepare` proves the disk from the control-plane record and no `df` runs |
| `timing` | `pollMs` (250), `readyTimeoutMs` (3 min), `deleteTimeoutMs` (1 min), `deletePollMs` (removal's own read cadence, default `pollMs`), `removeRetryMs` (least interval between two removal requests after a transient refusal or a timed-out `RemoveOp.current`, default the cleanup cadence), `controlTimeoutMs` (one control-plane read or probe, 30 s), `inventoryTimeoutMs` (one whole listing, every page, 5 min), `snapshotTimeoutMs` (one capture or delete, 10 min) |
| `recovery` | `absenceConfirmationMs` (2 s), `maxAttempts` (4), `provesAbsence` (default `true`; `false` keeps an ambiguous create no lookup finds as a cleanup failure), `lookup` (a `get` of the marker's spelling replaces `find`) |
| `control.settle`, `control.absent`, `control.find`, `control.refused`, `control.transient`, `control.admit` | the optional control-plane hooks in the table above |
| `RemoveOp.current` | the kit's bounded, identity-checked `get` of the id being removed, for a vendor that deletes through a looked-up handle |
| `data.prepare`, `data.launch`, `data.files` (`read`, `write`, optional `exists`) | the optional data-plane hooks; omitted `files` falls back to the kit's shell |
| `execution`, `createBudget` | passthroughs: the synchronous cap and durable route (default 60 s over the kit's shell detach; `native-launch` requires `data.launch`), and a harness-owned create ceiling |
| `snapshots`, `accelerator`, `costEvidence` | passthroughs for one vendor family's behaviour |

`@sandbox-benchmarks/driver/vendor/e2b-protocol` holds what every SDK of the E2B protocol shares,
importing no SDK (each provider package injects its own):
- `e2bProtocolVendor`, the one adapter, stating only how a vendor differs (its domain, whether its
  SDK honours a signal, request bounds and command timeout);
- `e2bProtocolArtifactBuilder`, the OCI baker: `Template().fromImage` of the digest-pinned base
  (plus any vendor build steps), then `Template.build` under the release lane's name. Novita bakes
  through it, stating its regional domain and a root build step; E2B keeps its own CLI build of the
  committed Dockerfile variant, whose requests differ.

`@sandbox-benchmarks/driver/vendor/testing` provides the test adapters:
- `memoryVendor`, the in-memory adapter that makes the seam real;
- `vendorContract`, the port contract every adapter must pass;
- `e2bProtocolStub`, the stand-in SDK (including its `Template` build) every E2B-protocol package
  (and its scaffold) tests over;
- `restStub`, a REST API stand-in as a route table, each sandbox a row with a guest shell, that an
  HTTP package (and its scaffold) tests over;
- `sdkStub`, the same account for another SDK, whose test states only the SDK's shape over it;
- `ociBuildRequest`, an artifact builder's request with the provider's test credentials.

> **Amendment (legacy removal).** Once every SDK and HTTP driver was a vendor adapter, the bridge
> became internal to `packages/driver`: its `./computesdk` and `./native` subpaths and authoring
> helpers were removed, and `vendorDriver` in `/vendor/testing` lowers a module over a stubbed
> transport. The port gained `absent` and `recovery.lookup` (table above), and the kit starts no port
> call on a cancelled signal, bounds each control-plane read (`get`, `page`, `find`) by
> `controlTimeoutMs` and refuses a read by id that returns another sandbox, so adapters no longer
> hand-write those rules. `absent` reads as an empty lookup only through `recovery.lookup`: a listing
> `find` never turns a not-found into proven absence. The bridge's spec fields the kit always
> declares (lifecycle, recovery, probes, inventory, destroy-by-id) are required.

Behaviour unique to one vendor family stays on explicit, typed passthroughs and does not become a
port knob:
- snapshots
- accelerators
- cost evidence
- the execution policy (`execution`) and a harness-owned create ceiling (`createBudget`)

CLI vendors keep `defineCliDriver`, whose `CliRunner` is already a transport port.

### 2. A provider package is its vendor's only importer

Each provider package exposes:
- `.`, its driver (variants keep their subpaths);
- `./artifact`, exactly when the provider bakes from the OCI base. This is a
  `defineArtifactBuilder` from `@sandbox-benchmarks/driver/artifact`.

A native-snapshot baker (Freestyle) has no `./artifact`: it gets the builder that
`snapshotArtifactBuilder(module)` derives from its driver's snapshot capability.

The builder's contract:
- An OCI baker receives a derived name, a digest-pinned base, parsed credentials and the target
  spec.
- A native-snapshot baker receives no base. It receives an injected `prepare(session)` seam,
  through which the release lane supplies the recipe and smoke, so provider packages never import
  harness or templates code. On a version build it also receives the revalidated candidate.
- Either way it returns the exact ref its driver boots.

A generated `ARTIFACT_BUILDERS` join sits beside `DRIVERS`, and the generator checks `./artifact`
exactness against the registry.

Vendor code that has only one implementation lives in named subpaths of its provider package and
is imported by name, not through a generated join:
- Modal's GPU code;
- Modal's cleanup-observation code.

`packages/providers` is removed. A repo check enforces that every vendor library is a dependency
of, and imported by, exactly one provider package. Type-only imports, `import.meta.resolve`,
`require` strings and triple-slash `types`/`path` references count.
A vendor library is an entry of the root `catalogs.vendors`, so the vendor set is defined by catalog
structure rather than an exception list. A library declared only to satisfy a peer dependency of
another vendor library the same package owns counts as imported by that package. So that nothing
enters around that set, every member takes third-party libraries only from the root catalogs (no
inline pins), every file references a third-party library only when its own member declares it (a
vendor SDK's transitive dependency is not reachable through hoisting), and no file reaches into
`node_modules` by path.

### 3. The registry answers derived facts

**Deleted:**
- `meta.transport` (the harness reads the driver's execution policy)
- the legacy adapter lane and `MIGRATED_DRIVER_IDS`
- per-provider candidate create options
- every restated table listed above

**Metadata changes:**

| Field | Change |
|---|---|
| `sdkPackage` | becomes `string \| { cli } \| { http }` |
| `package` | new, optional; only for isolation variants |
| `figureLabel` | new, optional; for chart labels that differ from `displayName` and `vendor` |

**Pure Tier-1 projections:**
- `providerPackage`
- `candidateArtifact`
- `releaseUnscopable`
- `figureLabel`
- `declaredIsolationClass`

**Tier-3 check:** an npm `sdkPackage` must be a dependency of its own provider package.

**Tooling:** one `generate-providers` command and one drift check (`check:providers`) replace the two
generators. Invariants plus one reviewed registry snapshot replace the hard-coded id lists; the
snapshot is refreshed by `generate-providers` and checked by `bun run test` (the registry test's
snapshot comparison), not by `check:providers`.

### Amendments

| ADR | Amendment |
|---|---|
| 0006 | `PROVIDER_IDS` remains the single identity list. Generation is one command. Metadata gains the fields above. |
| 0007 | Records per-provider packages and generated joins as the architecture, and the `./vendor`, `./vendor/testing`, `./vendor/e2b-protocol` and `./artifact` subpaths; the ComputeSDK bridge is internal to `packages/driver` (no public bridge subpath). |
| 0008 | The kit tier runs against `memoryVendor` and `vendorContract`. |

## Consequences

- **What a new provider costs.** Its metadata file and its adapter, plus an artifact builder when it
  bakes; `bun run new-provider` scaffolds everything else (the `PROVIDER_IDS` line, the catalog pin,
  the package, its entry and tests) and `generate-providers` derives the rest. Lifecycle fixes land
  once. Measured by `check:new-provider`, which scaffolds each kind into a copy of the repository
  (each SDK a fake npm package of its own, installed offline), fills it the way an author would and
  takes it through every repository gate (`check:providers`, `lint`, `lint:workflows`,
  `lint:shell`, `spell`, `typecheck` and the whole `test`). Lines are hand-written lines in the
  files the author edits; pricing there is `unavailable`, so a published price list adds its
  components to the metadata:

  | Provider kind | Scaffolder writes | Author edits | Hand-written lines |
  |---|---|---|---|
  | E2B-protocol SDK | 9 files, 2 in place (the id, the SDK pin) | metadata | 10 |
  | ... that bakes | 10 files, 2 in place | metadata | 10 |
  | SDK | 9 files, 2 in place | metadata, `vendor.ts`, the test's `sdkStub` surface | 65 (10 + 39 + 16) |
  | HTTP | 8 files, 1 in place | metadata, `vendor.ts`, the test's `restStub` routes | 55 (11 + 34 + 10) |
  | CLI | 9 files, 1 in place (with its setup action) | the action's pin, metadata, `vendor.ts`, the test's CLI stand-in | 59 (2 + 11 + 27 + 19) |

  An E2B-protocol adapter is final as scaffolded (its `signals` default is the safe `false`), and so
  is a baking one's builder: the scaffold binds the real `e2bProtocolArtifactBuilder` and its test
  runs that builder over `e2bProtocolStub`'s `Template`, so the baked row counts a real builder, not
  a stub. A vendor SDK already in `catalogs.vendors` is refused, since its owning package takes the
  new provider as an isolation variant. The SDK row is the honest cost of a vendor SDK with its own
  surface: its adapter and its test's surface are written against that surface, over the `sdkStub`
  account, where an E2B-protocol one reuses `e2bProtocolStub` and an HTTP one states only `restStub`
  routes. An OCI baker for a vendor outside the E2B protocol is not in the table because it is the
  vendor's own build, written by hand at its real cost: today's are 65 (Blaxel's CLI build), 65
  (E2B's CLI build of the Dockerfile variant) and 77 (Runloop's blueprint build) code lines, against
  Novita's 16 on the shared builder. `generate-providers` then rewrites 15 files for all four. Before this ADR a provider meant roughly 21 hand-edited files. The cost guard
  (`packages/schema/scripts/new-provider.test.ts`) fails if the scaffold writes another file, leaves
  another file to edit, or grows its adapter skeleton; `check:new-provider` fails on any file it had
  to touch beyond the scaffold, the fills and the generator's outputs, and on any gate, so a new
  hand-wired requirement on providers fails it.
- **Provider tests.** They test translation and quirks over a stubbed transport. Kit behaviour is
  tested once.
- **Teardown of a held session deletes first; every other teardown observes first.** The kit
  created and holds a session's allocation, so it requests removal and then observes it (one call
  when the delete proves removal). Destroy-by-id and recovery hold no such proof: they observe
  before they delete, so a vendor whose delete already proves removal pays one extra read there.
  No destructive call is ever sent for an allocation already observed gone.
- **Create acknowledgements and readiness.** A create response proves readiness only when the
  adapter says so. Adapters whose create acknowledgement is not readiness evidence report
  `pending`.
- **Review moves.** Reviewers now read the generated outputs and the registry snapshot diff
  instead of seven hand-edited lists.

**Rejected alternatives, so future reviews do not re-suggest them:**
- **Capability lists and per-behaviour overrides on the port.** They make the interface wide and
  let a provider re-implement teardown, weakening cleanup confirmation.
- **Versioned capability contracts for capabilities with one adapter.** These are hypothetical
  seams.
- **Moving provider metadata into provider packages.** That either creates a
  schema→provider→driver→schema cycle or puts every vendor SDK into every registry reader's
  dependency closure.
- **An `artifact.boot` create-option field.** Vendor request syntax belongs to drivers, and its
  only consumer was dead code.
- **Data-only manifests for CLI and HTTP vendors, for now.** Each kind has one adapter today.
  Revisit when a second arrives.
