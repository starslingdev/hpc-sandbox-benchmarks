# Provider onboarding prototypes

These are working prototypes behind [PROPOSAL.md](./PROPOSAL.md), the final design. They follow
the *improve-codebase-architecture* method:

1. An architecture review found five candidates, three of them Strong.
2. Ten sub-agents designed interfaces for those three ([DESIGNS.md](./DESIGNS.md)).
3. One hybrid was selected per candidate and implemented here.

```sh
bunx tsc -p prototypes/provider-onboarding      # typecheck
bun test prototypes/provider-onboarding         # 90 tests
bun prototypes/provider-onboarding/scripts/measure.ts
bun prototypes/provider-onboarding/scripts/new-provider.ts --id demo --transport sdk --sdk demo-sdk@1.0.0 --baked --out /tmp/x
```

This directory is not a workspace member, so the repository's CI gates ignore it. Nothing outside
`prototypes/` changed. Imports across prototype packages use relative paths. In the real change
they become the subpaths named in each file header.

## Layout (mirrors the target repository)

| Path | Target | What it proves |
|---|---|---|
| `packages/driver-vendor/src/vendor.ts` | `packages/driver` `./vendor` | The deepened driver authoring module: control and data ports, with lifecycle behaviour derived once and lowered onto the existing bridge |
| `packages/driver-vendor/src/testing.ts` | `packages/driver` `./vendor/testing` | `memoryVendor` (the second adapter) and `vendorContract` (the port contract) |
| `packages/driver-vendor/src/vendor.test.ts` | the same | Kit behaviour tested once: readiness, cleanup confirmation, inventory, recovery, request proof (23 tests) |
| `packages/driver-vendor/src/artifact.ts` | `packages/driver` `./artifact` | The artifact builder interface |
| `packages/brezel/` | `packages/brezel` | HTTP control plane via SDK plus injected `fetch`, on a dedicated account. **21/21 original tests, unmodified.** |
| `packages/novita/` | `packages/novita` | SDK vendor with an injected SDK. 6/6 original tests, one adapted (see PROPOSAL §6). Also covered: translation, the port contract, and the template bake moved out of `apps/cli` (`./artifact`). |
| `packages/drivers/src/render.ts` | `packages/drivers` (generated) | `DRIVERS` + `ARTIFACT_BUILDERS`, with `./artifact` exactness checked against the registry. It also lists the 6 baked providers whose builder still lives in `apps/cli`. |
| `registry/src/projections.ts` | `packages/schema` | Restated facts answered by the registry, with equivalence proofs for all 16 providers. The Tier-3 `sdkPackage` check catches today's two stale values. |
| `registry/src/registry-snapshot.test.ts` | `packages/schema` | Invariants plus one reviewed snapshot, replacing seven id-list oracles |
| `tooling/vendor-seam.ts` | `tooling/repo-checks` | One vendor library, one provider package. It snapshots today's 31 leaks and passes for the prototype packages. |
| `scripts/new-provider.ts` | `scripts/` | Scaffolds the selected package shape for SDK, HTTP-only or CLI vendors |
| `speculative/` | not adopted yet | Data-only manifests for CLI and HTTP vendors (rated *Speculative*: one adapter each today). Tama's 11 original tests pass on a pure-data manifest. |

## Measurements (`scripts/measure.ts`, logical lines, house-formatted)

| Module | Today | Prototype | Proof |
|---|---:|---:|---|
| Brezel driver | 308 | 174 | 21/21 original tests, unmodified |
| Novita driver | 243 | 145 | 6/6 original tests (1 adapted) |
| Novita bake | 27 | 27 | moved into the provider package |

The written-once shared code is:
- the kit: 382 lines;
- the in-memory vendor plus port contract: 175 lines;
- the registry projections: 150 lines;
- the fleet joins: 49 lines;
- the vendor-seam check: 50 lines.

The prototype driver counts include seams kept only so the legacy suites run unmodified.

The larger reduction is in tests. Each provider stops re-testing teardown, recovery and inventory
through a hand-written fake (Brezel's file is 409 lines, about half of it fake router). Those
behaviours are tested once in the kit. Provider tests become translation tests plus one
`vendorContract` line, the "replace, don't layer" rule.
