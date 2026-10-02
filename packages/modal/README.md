# @sandbox-benchmarks/modal

Owns the modal driver implementation, SDK dependencies, and behavioral tests.
The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

Run `bun run --filter @sandbox-benchmarks/modal test` or `typecheck` from the repo root.

## Named subpaths

Beside the driver entries (`.`, `./gvisor`, `./vm`), the package exports the Modal-only code the CLI
imports by name (ADR-0023 §2) — the only provider-package imports outside the generated loaders:

- `./gpu` — the `bench-gpu` platform. `openModalGpuPlatform` checks the Modal tokens, resolves the
  benchmark App and builds the CUDA runtime image; the platform resolves Volumes, restores snapshot
  images, and lowers each GPU allocation (resources, env, read-only or writable mounts) onto the
  prepared V1 gVisor allocation in `src/allocation.ts`. `tagModalGpuSandbox` and
  `snapshotModalGpuSandbox` are the two native session operations the GPU lane uses. Images and
  Volumes cross the seam as opaque handles, so the CLI never names an SDK type.
- `./cleanup-observation` — `observeModalCleanupApp`, the read-only clearance of the benchmark App
  that retained-allocation recovery applies (ADR-0014).

## Benchmark App

Both `modal-gvisor` and `modal-vm` use the existing `sandbox-benchmarks` App for sandbox
creation and ownership. Admission reconciles sandboxes owned by that App; active sandboxes
in other Apps are reported as foreign and neither block admission nor become cleanup targets.
Both variants still share account capacity and the benchmark account queue. See
[ADR-0016](../../docs/adr/0016-modal-app-scoped-admission.md).
