# Design it twice: three candidates, ten designs, one selection each

This file records the *design-it-twice* step of the improve-codebase-architecture method, applied
to the three **Strong** candidates from the architecture review.

For each candidate, 3–4 sub-agents designed an interface independently, each under a different
constraint:
- minimise the interface;
- maximise flexibility;
- optimise for the most common caller;
- ports & adapters.

Below, the designs are compared on **depth**, **locality** and **seam placement**, and one
selection is made per candidate. The selections are what the refactored prototypes implement.

Facts the sub-agents established, and that I verified before selecting:

| Fact | Evidence |
|---|---|
| The candidate create options are dead | `apps/cli/src/lib/bake/validate-run.ts` uses `candidateCreateOptions` only in the `legacy` branch. The driver lane passes `{ ref }`, and `packages/drivers/migration-waivers.json` is `{}`. |
| `meta.transport` is dead at runtime | The harness gets its transport from `driverTransport(module.execution)` (`apps/cli/src/lib/driver-run.ts`). |
| `sdkPackage` is stale for 2 providers | Runloop and Namespace name `@computesdk/*`, but their packages depend on `@runloop/api-client` and `@namespacelabs/sdk`. |
| `vendor` does not reproduce chart labels | `figureProviderName` prints `microsandbox` and `Vercel`; `vendor` is `Microsandbox` / `Vercel`, and Boat's vendor is `ASCII`. |
| Common vendor shape (13 drivers + Tama) | Ownership by a create-time marker or name: 14/14. Module readiness `create-returns-ready`: 13/13. Recovery 2000 ms / 4 attempts: 12/13. `syncCapMs` 60 s: 11/13. `df` proof copied: 10/13. Native launch: 7 vs. shell-detach: 7. |
| Needs beyond the driver | 9 of 17 ids need **only** the driver. 7 bake an artifact (one of them via native snapshot). Only Modal has GPU and cleanup-observation code. |

---

## Candidate 1: deepen the driver authoring module

| Design | Interface | Depth | Locality | Seam placement | Weak fit |
|---|---|---|---|---|---|
| A. Minimise ("record port") | 5 verbs `put/scan/drop/view/open` + `refused`; traits | highest per verb | high | one port | a live native handle carried on a data row; the revision check lives inside `view` |
| B. Flexibility | control + data + ownership + errors, plus capabilities and per-behaviour overrides | lowest (wide interface) | split: overrides move logic back into providers | 3 seams + plugin lists | overrides weaken the cleanup-confirmation guarantee; ordering rules leak into the interface |
| C. Common caller | 6 required verbs + opt-ins; measured defaults; `pinned`/`mapped` presets | high | high | one port | `get → null` puts the not-found duty on the adapter (it does in every design) |
| D. Ports & adapters | `ControlPlane` + `DataPlane`; `VendorRecord`; `remove → "removed" \| "accepted"`; kit-drained `page`; `withVendor`; `vendorContract` | high | highest (tests move to the kit) | control and data are separate seams, each with ≥2 adapters | CLI lowering conflicts with Tama's driver-owned create budget |

**Selected: D's seams, with A's derivations and C's defaults.**

- **From D:**
  - two planes (control: create/get/remove/page/find; data: attach/exec/launch/files);
  - a normalised `VendorRecord`;
  - not-found expressed as a value (`get → null`, `remove → "removed"`), so no not-found classifier;
  - the kit drains paginated listings and fails closed on a repeated cursor;
  - `withVendor` for test injection;
  - a shared `vendorContract` suite plus an in-memory `memoryVendor`, so the seam has two real adapters.
- **From A:**
  - no readiness knob: a `ready` record returned from `create` skips the poll;
  - no removal knob: `"removed"` skips convergence;
  - one `account` trait chooses both ownership and recovery;
  - the kit, not the adapter, rejects unrelated rows returned by `find`.
- **From C:**
  - the measured defaults (2000 ms / 4 attempts, 60 s sync cap, shell-detach);
  - `pinned` / `mapped` coverage presets;
  - adapters *receive* their SDK, client or `fetch` and never create one.
- **Rejected:**
  - B's capability lists and overrides: a wide interface for one-adapter needs, and overrides would let a provider re-implement teardown.
  - A's single `scan`/`view`: it mixes data with live capabilities.
- **Deferred:**
  - **CLI:** Tama keeps `defineCliDriver`. Its `CliRunner` is already a port with two adapters, and lowering it onto the vendor port would need a driver-owned create budget the bridge forbids.
  - **Snapshots and GPU:** they stay on the raw `computeSdkSpec` escape hatch until a second adapter makes a seam real.

**Cost accepted:** teardown always observes the sandbox (`get`) before it deletes, so a vendor
whose delete already confirms removal pays one extra GET. That is the price of never issuing a
destructive call against an allocation already confirmed gone. Brezel's original tests require
exactly this.

## Candidate 2: make the provider package the only vendor seam

| Design | Interface | Depth | Locality | Seam placement | Weak fit |
|---|---|---|---|---|---|
| A. One entry point (`definePackage` record) | `.` only; lazy thunk record `drivers` / `artifacts` / `extensions` | high | high | one root per package | inert-root rule needs a custom loader and import scan; drops variant subpaths |
| B. Open capability set | versioned contracts per capability, one generated join each | medium | high | one subpath per capability | GPU and cleanup observation have one adapter, so those are hypothetical seams; joins multiply |
| C. Common caller | `./artifact` only where it's true; derived builder for native snapshots; Modal-only subpaths allowlisted | high | high | one subpath per *real* seam | Modal extras are a named exception |

**Selected: C, plus A's "publish returns the artifact the driver boots".**

- **Subpaths:**
  - `.` exports the driver (variant subpaths stay);
  - `./artifact` exists **exactly** for baked providers, with that exactness checked by the generator;
  - the generated join `ARTIFACT_BUILDERS` sits beside `DRIVERS`.
- **Builder interface:** `ArtifactBuilder` lives at `@sandbox-benchmarks/driver/artifact` (arktype-free).
  - It receives a digest-pinned base, the parsed `EnvOf<P>`, the target spec, `replace`, `log` and `signal`.
  - It returns `{ ref }`: exactly the ref the driver will boot. Because nothing else crosses the seam, `CandidateRefs` and `candidateLaunch` are deleted.
- **Modal-only code:** Modal's GPU and cleanup-observation code move into `@sandbox-benchmarks/modal/{gpu,cleanup-observation}`. The CLI imports them by name through an allowlist, not through a generated seam, because each has only one adapter.
- **Enforcement:** a vendor-seam check requires that every vendor library is a dependency of, and imported by, exactly one provider package (type-only imports and `require` strings count). Only `@sandbox-benchmarks/drivers` and the allowlist may import provider packages, and `packages/providers` must not exist.
- **Rejected:**
  - B's versioned capability contracts: they build seams before a second adapter exists.
  - A's record: its gains (exact keys, lazy loading) already come from the generated joins, without an inert-root convention.

## Candidate 3: let the provider registry answer restated facts

| Design | New metadata | Depth | Locality | Weak fit |
|---|---|---|---|---|
| A. Derive everything | none (retype `sdkPackage`) | highest | high | package location inferred from `quotaDomain` (coincidental coupling); two chart labels change |
| B. Explicit facts | 5–6 fields (`package`, `provenance[]`, `release`, `mechanism`, `figureLabel`) | lower (more to author) | high | every provider pays ~5 lines for facts most derive |
| C. Generated facts per package | `package?`, `provenance`, `durable`, `boot`, `unscopable`, `shortName?` | medium | high | keeps `transport` alive and adds `boot`, but its consumer is dead code |

**Selected: A's deletions and derivations, plus B's two explicit facts where a derivation would be coincidental.**

- **Delete** (all pass the deletion test):
  - `meta.transport`
  - `MIGRATED_DRIVER_IDS` and the legacy adapter lane
  - `candidateCreateOptions` and the per-provider fields of `CandidateRefs`
  - `RELEASE_UNSCOPABLE_PROVIDERS`
  - `figureProviderName`'s prefix map and the leaderboard's string sniffing
  - the provenance entry table
  - `artifact.boot`, which my own earlier prototype proposed and the review rejected
- **Retype** `sdkPackage: string | { cli: string }`, and fix the stale Runloop and Namespace values. A Tier-3 check requires the npm package to be in that provider package's `dependencies`, which would have caught both.
- **Add only:**
  - `package?: { directory; entry }`, for isolation variants. It is explicit rather than inferred from `quotaDomain`.
  - `figureLabel?`, defaulting to `displayName`, to keep today's chart labels.
- **Schema projections** (pure, Tier 1):
  - `providerPackage`
  - `candidateArtifact(id, { toolchainImage, mirrored, buildResults })`
  - `releaseUnscopable`
  - `figureLabel`
  - `declaredIsolationClass`
- **Tooling:** one `generate-providers` command and one drift check.
- **Tests:** invariants plus one registry snapshot replace the seven id lists. CI fails on a mismatched snapshot rather than rewriting it. One-shot equivalence tests prove each move changes no behaviour.
- **Metadata stays in `packages/schema`** (B's analysis). Moving it into provider packages either creates a schema→provider→driver→schema cycle, or makes every registry reader carry every vendor SDK in its dependency closure.
