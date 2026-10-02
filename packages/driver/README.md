# @sandbox-benchmarks/driver

**Role:** the sandbox driver port and kit (ADR-0007): the provider-neutral session contract the
harness consumes, the mechanics every driver shares, and the authoring modules provider packages
write against. Vocabulary lives in [CONTEXT.md](./CONTEXT.md).

**Public surface:**

| Subpath | What it is |
|---|---|
| `.` | The port (`SandboxDriver`, `SandboxSession`, `CreateRequest`), `defineDriver`, policy types, typed errors, readiness polling, and the shell mechanics. Arktype-free and schema-runtime-free; `src/architecture.test.ts` fences its whole runtime graph. |
| `./env`, `./schemas` | The runtime-parsing boundaries (arktype). |
| `./computesdk`, `./native`, `./errors` | The ComputeSDK bridge, native-SDK projection, and cause-chain error inspection. |
| `./cli` | `defineCliDriver` for vendors driven through a CLI (`CliRunner` is the transport port). |
| `./vendor` | The driver authoring module (ADR-0023 §1): the control-plane and data-plane ports, coverage presets (`coverage`, `pinned`, `mapped`), `instanceOfAny`, `drainPages`, `verifyDisk`, and `defineVendorDriver`, which derives readiness, cleanup confirmation, destroy-by-id, probes, inventory, ambiguous-create recovery, the artifact guard and the disk proof. A module may also refuse cross-axis shapes before any vendor call (`unsupported`), point the disk proof at a mount with a filesystem-overhead allowance (`diskProof`, which also proves a mapped disk), and run the vendor's post-readiness preparation and reported-resource proof (`data.prepare`); an exec may withhold an exit the vendor never reported. A vendor with a server-side readiness wait offers it as `control.settle`, which replaces the kit's readiness poll under the kit's own deadline, phase classification and teardown. A vendor that spells the ownership marker its own way declares one `markerSpelling` (built by `markerSpelling(prefix)`), which its adapter creates and parses records with and the recovery locator prints. A listing that keeps terminal history may declare a larger `pageCap` than the default 100 pages. |
| `./vendor/testing` | `memoryVendor`, the in-memory adapter with a fault script and leak detectors, and `vendorContract`, the port contract every adapter must pass. Imports `bun:test`; test code only. |
| `./artifact` | The release lane's build seam (ADR-0023 §2): `defineArtifactBuilder` for an OCI baker's `./artifact` export, the `BuildCommandRunner` transport (`runBuildCommand`) its vendor CLIs run through, and `snapshotArtifactBuilder`, which derives a native-snapshot baker from a driver's snapshot capability (captured `durable`) and the `snapshotBuild` options its package exports. Arktype-free (fenced in `src/architecture.test.ts`). |
| `./conformance` | ADR-0008's suite: `runConformance` over the closed clause inventory. |

**Depends on:** `@sandbox-benchmarks/schema` (provider identity, registry types, driver schemas)
and `arktype` (outside the root entry only).

**Testing:** kit behaviour is tested once at the `./vendor` interface against `memoryVendor`
(`src/vendor.test.ts`), including end-to-end sessions through `defineVendorDriver` and the kit-tier
conformance run that admits a module built over it. Provider packages test their translation and
run `vendorContract` against their adapter over a stubbed transport.
