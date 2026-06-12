# @sandbox-benchmarks/schema

**Role:** the bottom of the dependency DAG — shared types and runtime schemas every other member
builds on.

**Public surface (`.`):** `Capability` / `capabilities`, `CapabilityFlags`, `ProviderDescriptor`,
`RawRun`, `RunDocument`, `parseRawRun()`.

**Depends on:** `arktype` only (no internal deps).

**What lives here:** the canonical type vocabulary for providers, raw runs, and normalized run
documents, plus arktype runtime validators. Private validation internals live in `src/lib/` and
must never be imported across a package boundary — import from `@sandbox-benchmarks/schema` instead.
