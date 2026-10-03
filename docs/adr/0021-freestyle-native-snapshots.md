---
status: accepted
---

# Freestyle benchmarks use immutable native snapshots

## Context

Opt-in CPU Run 36672158571 omitted Mastra's Test Core metric for Freestyle while Brezel emitted it.
Freestyle's [stock Ubuntu snapshot](https://www.freestyle.sh/docs/vms/base-snapshots) includes
`typescript-language-server` through NVM, changing a workload test that expects that binary to be
absent. Runtime installation over the mutable `freestyle/ubuntu` slug also leaves the environment
outside the artifact release and backfill pipeline.

## Decision

Extend ADR-0006's baked artifact lifecycle with `source: "native-snapshot"`: install the shared
toolchain recipes and exact tool/profile pins directly in a Freestyle VM, run shared smoke checks,
then capture a private persistent snapshot. The [native snapshot workflow](https://www.freestyle.sh/docs/guides/migrate-from-e2b)
matches Freestyle's model without adding a container isolation layer. Candidate validation uses the
returned immutable ID; promotion revalidates and captures that exact candidate without rebuilding
against a newer stock base. Benchmark execution requires an immutable `sh-…` ID and verifies the
booted ID. Mutable slugs serve only as release aliases.
The session retains that control-plane observation as `driver-reported` artifact evidence; arbitrary
snapshot IDs do not invent a release-owned guest fingerprint mapping. Historical stock attribution
remains readable. New frozen plans bind the immutable baked identity and require observed evidence.

Every driver exec sets a clean system PATH with the pinned mise shims and disables shell startup
files and inherited NVM/Node injection variables. The recipe removes stock runtime/global-tool
links in `/usr/local/bin`; live inspection found the language server also linked there, so PATH
cleanup alone was insufficient. This fixes the environment rather than modifying
Mastra's tests. It also removes the replaced stock runtime trees: their 3.5 GiB left only 29 GiB
available on the standard 40 GiB disk, below Mastra's 30 GiB setup guard. The setup script and provenance record retain the actual immutable base ID, recipe
hash and requested 4 vCPU / 8 GiB / 40 GiB shape. PTS profile definitions come from the same fixed
GitHub revision as the catalog; direct installation avoids OpenBenchmarking's Cloudflare challenge
and PTS's unrelated-profile cache scan while preserving payload and installation checks.
Root-built payloads stay shared through PTS's install-root override, while the unprivileged runtime
user receives its own copy of the pinned profile definitions and mutable PTS state.

## Consequences

- The shared runtime pins and workload commands match the baked providers. Ubuntu 24.04 packages,
  compiler and VM kernel remain different from the shared Debian 13 environment. Requested resources,
  effective resources and observed host hardware retain their existing separate evidence.
- Freestyle can participate in scoped bake/backfill and emit a pinned artifact reference, but stays
  opt-in and outside `RELEASE_REQUIRED` until live conformance and complete suite coverage pass.
  Mastra Test Core is a required metric; a green process exit or toolchain smoke cannot replace it.
  The [2026-09-30 promotion decision](../freestyle-default-matrix-2026-09-30.md) revisits the opt-in
  condition for default CPU collection after native release and main-branch Mastra confirmation;
  it retains experiment-level coverage checks and does not change `RELEASE_REQUIRED`.
- A private snapshot consumes build time and retained storage. Plans imposing automatic snapshot
  expiry cannot provide a durable release artifact and fail the bake. Old candidate IDs are retained
  to keep prior experiment pins usable; account owners manage their eventual retirement.
- Recording the base ID and recipe makes regeneration auditable. Apt repositories and upstream
  downloads still need availability; this is not a claim of bit-for-bit reproducible OS packages.

## Considered options

PATH cleanup alone fixes the immediate test but leaves the mutable stock base and runtime setup.
Nested Docker reuses Debian image bytes but changes the measured isolation topology to a container
inside the Freestyle VM. Accepting missing metrics leaves incomplete experiments and blocks fair
board inclusion. A native snapshot plus PATH cleanup best fits the existing release lifecycle while
keeping Freestyle's native VM as the execution boundary.

## Amendment (ADR-0024)

The builder is derived from the Freestyle driver's snapshot capability rather than written in the
CLI. Release snapshots carry no slug aliases: a candidate's immutable ID travels in its bake report,
and promotion pins that ID rather than resolving a name. The stock `freestyle/ubuntu` alias is
bootable only from a build context whose resolved artifact is that alias.
