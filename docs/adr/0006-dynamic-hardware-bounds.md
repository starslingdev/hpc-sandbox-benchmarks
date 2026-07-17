---
status: accepted
---

# Dynamic-hardware bounds for providers with a reservation/limit spread

## Context

[`TARGET_SPEC`](../../packages/schema/src/providers.ts) pins every provider to one fixed size (2 vCPU /
8 GiB / 40 GB) so their numbers are comparable. Every shipped adapter honors that by requesting exactly
one size — except Modal, whose `client.sandboxes.create()` (the `modal` npm SDK, `@computesdk/modal`'s
raw dependency) splits CPU and memory into a RESERVATION and a hard LIMIT (`cpu`/`cpuLimit`,
`memoryMiB`/`memoryLimitMiB`): the guest can be scheduled anywhere in `[reservation, limit]` under load
rather than being clamped to one number. The harness previously pinned `cpu === cpuLimit` and
`memoryMiB === memoryLimitMiB`, collapsing that range back to a fixed size and leaving the SDK's
reservation/limit mechanism unused.

Widening the ceiling helps CPU/memory-bound suites that would otherwise be squeezed at the 2 vCPU / 8 GiB
floor, but it directly touches the comparison's fairness machinery: `specMatched`
(`packages/results/src/lib/specs.ts`) previously required the observed effective spec to equal
`TARGET_SPEC` exactly, and would flag any burst above it as a false Comparability warning — punishing
Modal for using a capability none of the other providers have.

## Decision

**Declare the burst ceiling as a per-provider schema capability, `ProviderMeta.dynamicHardware`
(`{ maxVcpus, maxMemoryGb }`), present only for providers whose SDK actually supports a reservation/limit
spread — today only Modal (`{ maxVcpus: 8, maxMemoryGb: 16 }`).** `TARGET_SPEC` stays the reservation
every provider is created at and billed/compared against (`hourlyCostAtTargetSpec` never reads
`dynamicHardware`); the harness adapter (`packages/providers/src/lib/adapters.ts`) pins Modal's
`cpu`/`memoryMiB` to `TARGET_SPEC` as before but now sets `cpuLimit`/`memoryLimitMiB` from the schema's
declared ceiling instead of equal to the reservation. `computeSpecMatched` takes the provider's
`dynamicHardware` bound (or none) and widens its accepted range to `[TARGET_SPEC, ceiling]` only when one
is declared; a provider without the field keeps the original exact-match (vCPU) / ±10% (memory) behavior
unchanged.

## Consequences

- Modal sandboxes can now legitimately observe anywhere from 2 vCPU / 8 GiB up to 8 vCPU / 16 GiB without
  tripping a Comparability warning — the SDK capability the schema declares and the fairness check that
  reads it can't drift apart, because both key off the same `dynamicHardware` field.
- Every other provider is byte-for-byte unaffected: no `dynamicHardware` entry means
  `computeSpecMatched` degenerates back to the exact-match it always did (asserted directly in
  `specs.test.ts`).
- Billing is unaffected on purpose — Modal's published rate is per requested (reservation) unit, so a
  burst above `TARGET_SPEC` is not something `hourlyCostAtTargetSpec` needs to account for; if that ever
  changes (e.g. Modal starts metering the burst), this ADR's cost side needs revisiting.
- The ceiling is a static, evidence-free policy choice (up to 8 vCPU / 16 GiB, double `TARGET_SPEC` on
  both axes) rather than a measured optimum — unlike the adapter's other Modal comments, which cite a
  probed measurement date. Revisit with live data once Modal Runs are collected under this config.
