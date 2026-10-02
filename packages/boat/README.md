# @sandbox-benchmarks/boat

Owns the boat (https://boat.dev) driver, its `@boatdev/sdk` dependency, and their tests. The fleet
loader selects this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives a `BoatApi` client and translates it:
  - Create pins `machineProvider: "baremetal"` (the fastest machine boat offers). `@boatdev/sdk`
    1.0.0's create serializer drops unknown fields, so the adapter merges it into create's JSON body
    with a per-call init override; no other SDK call gets it (a real-SDK wire test asserts that).
  - Create is idempotent under the marker's spelling, `sandbox-benchmarks-<uuid>`: a lost or
    transient response is retried with the same key (2 s apart, a 429 a fresh minute later, five
    attempts). Create takes no name, so `attach` (which the kit runs on its post-create path,
    tearing the allocation down, and keeping its cleanup, by id if it fails) renames the sandbox to
    that spelling.
  - Statuses become phases: `ready`/`idle`/`running` are ready; `error`, `archiving` and `archived`
    fail a boot. A stopped (`archived`) row holds no compute, so a foreign one is not counted, but an
    owned one still holds the benchmark's disk and is deleted.
  - Teardown is `deleteSandbox`, never stop: boat snapshots every running sandbox about once a
    minute and `stop` archives the sandbox with that snapshot chain. A delete conflicting with a
    running operation (409), timing out, rate limited or hitting an outage is `transient`, so the
    kit asks it again at every removal read; a refused delete's error names boat's code. Its
    operation settles at `blocked` rather than `completed`, so removal is the sandbox's 404,
    observed by the kit.
  - `prepare` waits for outbound network (exec is accepted before it is up: DNS plus a TCP connect
    to boat.dev) and checks the allocation's reported vCPU and memory.
- `src/index.ts` binds the SDK in `defineVendorDriver`: the default SKU (the target size, refused
  otherwise before any call), a `df` proof of the user disk, readiness read every 2 s within 8
  minutes, removal read every second, and `recovery.provesAbsence: false`, because a create whose
  response was lost was never renamed and no lookup can find it. Use a Boat account dedicated to
  the benchmark: a live foreign sandbox blocks admission.

`src/index.test.ts` tests the translation, runs `vendorContract` over a fake account, drives
sessions through the kit's `vendorDriver`, and runs one wire test over the real SDK. Run
`bun run --filter @sandbox-benchmarks/boat test` or `typecheck` from the repo root.
