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
| `./vendor` | The driver authoring module (ADR-0023 §1): the control-plane and data-plane ports, coverage presets (`coverage`, `pinned`, `mapped`), `instanceOfAny`, `drainPages`, `verifyDisk`, and `defineVendorDriver`, which derives readiness, cleanup confirmation, destroy-by-id, probes, inventory, ambiguous-create recovery, the artifact guard and the disk proof. |
| `./vendor/testing` | `memoryVendor`, the in-memory adapter with a fault script and leak detectors, and `vendorContract`, the port contract every adapter must pass. Imports `bun:test`; test code only. |
| `./artifact` | The release lane's build seam (ADR-0023 §2): `defineArtifactBuilder` for an OCI baker's `./artifact` export, and `snapshotArtifactBuilder`, which derives a native-snapshot baker from a driver's snapshot capability. Arktype-free (fenced in `src/architecture.test.ts`). |
| `./conformance` | ADR-0008's suite: `runConformance` over the closed clause inventory. |

**Depends on:** `@sandbox-benchmarks/schema` (provider identity, registry types, driver schemas)
and `arktype` (outside the root entry only).

**Testing:** kit behaviour is tested once at the `./vendor` interface against `memoryVendor`
(`src/vendor.test.ts`), including end-to-end sessions through `defineVendorDriver` and the kit-tier
conformance run that admits a module built over it. Provider packages test their translation and
run `vendorContract` against their adapter over a stubbed transport.
