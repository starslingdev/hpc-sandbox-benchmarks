# @sandbox-benchmarks/modal

Owns the modal driver implementation, SDK dependencies, and behavioral tests.
The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

Run `bun run --filter @sandbox-benchmarks/modal test` or `typecheck` from the repo root.

## Benchmark App

Both `modal-gvisor` and `modal-vm` use the existing `sandbox-benchmarks` App for sandbox
creation and ownership. Admission reconciles sandboxes owned by that App; active sandboxes
in other Apps are reported as foreign and neither block admission nor become cleanup targets.
Both variants still share account capacity and the benchmark account queue. See
[ADR-0016](../../docs/adr/0016-modal-app-scoped-admission.md).

## Standard-pool variants

`modal-gvisor-standard` and `modal-vm-standard` repeat `modal-gvisor` and `modal-vm` without
`experimentalOptions.performance_sensitive`, so Modal schedules them on its general instance pool
instead of the low-variance Zen 5 pool
([docs](https://modal.com/docs/guide/performance-sensitive-sandboxes)). Everything else matches:
runtime, image, CPU and memory requests. Each variant has its own App (`sandbox-benchmarks-standard`,
`sandbox-benchmarks-vm-standard`) so inventory, cleanup and billing stay disjoint, and carries the
`perf_sensitive: "false"` tag. They are not in the default matrix.
