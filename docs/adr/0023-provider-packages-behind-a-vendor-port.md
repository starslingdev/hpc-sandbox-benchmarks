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
| | `get` | returns `null` only on the vendor's own not-found |
| | `remove` | returns `"removed"` when the vendor proved removal, `"accepted"` when it only acknowledged |
| | `page` | one page of the whole account; the kit drains it and fails closed on a bad cursor |
| | `find` | optional |
| | `refused` | optional; the vendor refused before allocating |
| | `transient` | optional; retryable once the kit proved nothing remains allocated |
| | `admit` | optional |
| Data | `attach`, `exec` | |
| | `launch`, `files` | optional |

Both planes speak in provider-neutral `VendorRecord`s carrying a `Phase`. A provider package
supplies an adapter, which translates only. `defineVendorDriver` derives everything else:
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

`@sandbox-benchmarks/driver/vendor/testing` provides the test adapters:
- `memoryVendor`, the in-memory adapter that makes the seam real;
- `vendorContract`, the port contract every adapter must pass.

Behaviour unique to one vendor family stays on explicit, typed passthroughs and does not become a
port knob:
- snapshots
- accelerators
- cost evidence

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
of, and imported by, exactly one provider package. Type-only imports and `require` strings count.
A vendor library is an entry of the root `catalogs.vendors`, so the vendor set is defined by catalog
structure rather than an exception list. A library declared only to satisfy a peer dependency of
another vendor library the same package owns counts as imported by that package.

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

**Tooling:** one `generate-providers` command and one drift check replace the two generators.
Invariants plus one reviewed registry snapshot replace the hard-coded id lists.

### Amendments

| ADR | Amendment |
|---|---|
| 0006 | `PROVIDER_IDS` remains the single identity list. Generation is one command. Metadata gains the fields above. |
| 0007 | Records per-provider packages and generated joins as the architecture, and the `./vendor`, `./vendor/testing` and `./artifact` subpaths. |
| 0008 | The kit tier runs against `memoryVendor` and `vendorContract`. |

## Consequences

- **What a new provider costs.** Its metadata file, one `PROVIDER_IDS` line, and a package holding
  only vendor translation, plus an artifact builder when it bakes. Lifecycle fixes land once.
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
