# @sandbox-benchmarks/boat

Owns the boat (https://boat.dev) driver implementation, SDK dependencies, and behavioral tests.
The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

Boat quirks the driver is built around:

- Boat snapshots every running sandbox about once a minute, and `stop` archives the sandbox with
  that snapshot chain. Teardown is therefore `deleteSandbox`, which removes the sandbox and its
  snapshots. Its deletion operation settles at `blocked` rather than `completed`, so the driver
  proves teardown by observing the sandbox 404, not by the operation status.
- Create pins `machineProvider: "baremetal"` (the fastest machine boat offers). `@boatdev/sdk`
  1.0.0's create serializer drops unknown fields, so the driver merges it into create's JSON body
  with a per-call init override. No other SDK call gets it; a real-SDK wire test asserts that.
- Create takes no name, so the sandbox is renamed to its `sandbox-benchmarks-<uuid>` recovery name
  in the post-create hook, where any failure is torn down by the returned id.
- Exec is accepted before the guest's outbound network is up; readiness also waits for DNS plus a
  TCP connect to boat.dev.
- Inventory owns every row with the recovery prefix, stopped or errored ones included, and ignores
  stopped foreign rows (they hold no compute). A live foreign sandbox blocks admission, so use a
  Boat account dedicated to the benchmark.

Run `bun run --filter @sandbox-benchmarks/boat test` or `typecheck` from the repo root.
