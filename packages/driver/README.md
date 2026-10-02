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
| `./vendor` | The driver authoring module (ADR-0023 §1): the control-plane and data-plane ports, coverage presets (`coverage`, `pinned`, `mapped`), `instanceOfAny`, `drainPages`, `verifyDisk`, and `defineVendorDriver`, which derives readiness, cleanup confirmation, destroy-by-id, probes, inventory, ambiguous-create recovery, the artifact guard and the disk proof. A module may also refuse cross-axis shapes before any vendor call (`unsupported`), point the disk proof at a mount with a filesystem-overhead allowance in GiB or as a fraction of the request (`diskProof`, which also proves a mapped disk), and run the vendor's post-readiness preparation and reported-resource proof (`data.prepare`, which may also return the boot artifact the control plane reports, and proves the disk itself under `diskProof: "reported"`, so no `df` runs); an exec may withhold an exit the vendor never reported. A vendor with a server-side readiness wait offers it as `control.settle`, which replaces the kit's readiness poll under the kit's own deadline, phase classification and teardown. A vendor that spells the ownership marker its own way declares one `markerSpelling` (built by `markerSpelling(prefix)`), which its adapter creates and parses records with and the recovery locator prints. A listing that keeps terminal history may declare a larger `pageCap` than the default 100 pages. A record may say it is `stopped` (holds no compute: a foreign one is not counted, an owned one is still a leftover), carry the vendor's `detail` of a failed phase into the boot failure, and mark a boot its host gave up on `retryCreate` (retryable once teardown is proven); `timing.deletePollMs` reads removal at its own cadence, and `recovery.provesAbsence: false` keeps an ambiguous create no lookup can find as a cleanup failure (the marker is set after create, or a create can land after every lookup). Every step after `create` (`attach`, readiness, `admit`, `prepare`, the disk proof) keeps its cleanup by the vendor's id; a delete the vendor refuses as `transient` is asked again while the delete budget remains; `abortableDelay` paces an adapter's own vendor retries. |
| `./vendor/e2b-protocol` | `e2bProtocolVendor`, the one adapter for every SDK of the E2B protocol (E2B's own, Novita's E2B-compatible one). It imports no SDK: a provider package injects its own and states only its differences (`domain`, `signals`, create and command timeouts). |
| `./vendor/testing` | `memoryVendor`, the in-memory adapter with a fault script and leak detectors, and `vendorContract`, the port contract every adapter must pass. Imports `bun:test`; test code only. |
| `./artifact` | The release lane's build seam (ADR-0023 §2): `defineArtifactBuilder` for an OCI baker's `./artifact` export, the `BuildCommandRunner` transport (`runBuildCommand`) its vendor CLIs run through, and `snapshotArtifactBuilder`, which derives a native-snapshot baker from a driver's snapshot capability (captured `durable`) and the `snapshotBuild` options its package exports. Arktype-free (fenced in `src/architecture.test.ts`). |
| `./conformance` | ADR-0008's suite: `runConformance` over the closed clause inventory. |

**Depends on:** `@sandbox-benchmarks/schema` (provider identity, registry types, driver schemas)
and `arktype` (outside the root entry only).

**Testing:** kit behaviour is tested once at the `./vendor` interface against `memoryVendor`
(`src/vendor.test.ts`), including end-to-end sessions through `defineVendorDriver` and the kit-tier
conformance run that admits a module built over it. Provider packages test their translation and
run `vendorContract` against their adapter over a stubbed transport.
