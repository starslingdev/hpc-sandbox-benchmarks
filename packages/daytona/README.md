# @sandbox-benchmarks/daytona

Daytona's two isolation variants, `daytona-vm` (`./vm`) and `daytona-container` (`./container`),
as one vendor adapter on the driver kit's port (ADR-0023). `src/vendor.ts` translates
`@daytona/sdk` onto the port; `src/shared.ts` binds the real client once per variant in
`defineVendorDriver` (the variant's target region and snapshot class). Readiness, cleanup
confirmation, recovery, inventory and probes are the kit's. SDK versions are pinned in the root
catalog.

- Every create boots the resolved class-pinned snapshot with auto-stop off, named by its ownership
  marker (`benchmark-<uuid>`). The SDK's create returns a started sandbox and its waited delete a
  destroyed one, so both are evidence. A lost create is found by a get by that name
  (`recovery.lookup`); the kit refuses a read by id that resolves a sandbox named like the id.
- Both variants share one org and one concurrency queue, so each variant's inventory claims every
  benchmark-named sandbox it finds; a sibling's later teardown of the same id converges on
  not-found. A `destroying` sandbox is not counted as foreign capacity.
- The snapshot pins 4 vCPU / 8 GiB; `prepare` refuses a different class, CPU or memory, and proves
  the disk from the allocation's reported size (`diskProof: "reported"`, no guest `df`).
- A 400 on an inactive snapshot activates it and is retryable; other 4xx refusals allocate nothing.
- Commands run through a reused control session; anything past 60s launches in its own session
  (`native-launch`). The snapshot capability stops a VM before capture and restarts it.

`src/vm/artifact.ts` and `src/container/artifact.ts` (`./vm/artifact`, `./container/artifact`) build
each variant's class-pinned snapshot through `src/snapshot-build.ts`: a transient-registry upload,
then delete-then-create, reported as a `destructive` replacement when a predecessor was deleted.

Run `bun run --filter @sandbox-benchmarks/daytona test` or `typecheck` from the repo root.
