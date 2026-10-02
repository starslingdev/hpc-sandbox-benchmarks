# @sandbox-benchmarks/modal

Modal's two isolation variants, `modal-vm` (`./vm`, the V1 service with the VM runtime) and
`modal-gvisor` (`./gvisor`, the V2 service), as one vendor adapter on the driver kit's port
(ADR-0023). `src/vendor.ts` translates the pinned `modal` SDK onto the port; `src/shared.ts` binds
the real client once per variant in `defineVendorDriver`, and `src/cost.ts` is the cost-evidence
passthrough. Readiness, cleanup confirmation, recovery, inventory, probes, the `df` disk proof and
the shell-detach launcher's command are the kit's. SDK versions are pinned in the root catalog.

- Modal 0.9 ignores its client timeouts, so every RPC runs inside a control runner that injects the
  operation's deadline into the SDK's middleware: 5s for a lookup, poll, exec start or a whole
  background launch (`data.launch` runs the kit's detached shell with the server-side exec timeout
  set too, so a launch never waits on an unbounded result read), 55s for a
  waited terminate or a name lookup, 60s for one listing page, 300s for the create transaction.
- Every create is named by its ownership marker. A lost create is found by name on both
  generations, this variant's first. Only a sandbox RPC's NOT_FOUND is absence; a native
  RESOURCE_EXHAUSTED or an expired control budget is transient.
- A read by id reports no name, so the adapter reports the name its create, listing or lookup
  learned. An exited sandbox (a poll with an exit code) holds nothing and reads as gone.
- Commands run as `sh -c` with joined, validated output streams; suite-length steps past 30 minutes
  detach (`shell-detach`) because the exec stdio stream is unreliable over long runs.

Run `bun run --filter @sandbox-benchmarks/modal test` or `typecheck` from the repo root.

## Named subpaths

Beside the driver entries (`.`, `./gvisor`, `./vm`), the package exports the Modal-only code the CLI
imports by name (ADR-0023 §2) — the only provider-package imports outside the generated loaders:

- `./gpu` — the `bench-gpu` platform. `openModalGpuPlatform` checks the Modal tokens, resolves the
  benchmark App and builds the CUDA runtime image; the platform resolves Volumes, restores snapshot
  images, and lowers each GPU allocation (resources, env, read-only or writable mounts) onto the
  prepared V1 gVisor allocation in `src/allocation.ts`, the same adapter over the caller's App and
  image, whose teardown also waits until the environment stops listing the sandbox. `tagModalGpuSandbox` and
  `snapshotModalGpuSandbox` are the two native session operations the GPU lane uses. Images and
  Volumes cross the seam as opaque handles, so the CLI never names an SDK type.
- `./cleanup-observation` — `observeModalCleanupApp`, the read-only clearance of the benchmark App
  that retained-allocation recovery applies (ADR-0014).

## Benchmark App

Both `modal-gvisor` and `modal-vm` use the existing `sandbox-benchmarks` App for sandbox
creation and ownership. Admission reconciles the benchmark-named sandboxes of the variant's own
generation in that App (a listing's first page); active sandboxes in other Apps are reported as
foreign (its second page) and neither block admission nor become cleanup targets.
Both variants still share account capacity and the benchmark account queue. See
[ADR-0016](../../docs/adr/0016-modal-app-scoped-admission.md).
