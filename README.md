<div align="center">

# High-Performance Sandbox Benchmarks

**Reproducible performance benchmarks for remote code sandboxes.**

[Leaderboard](./LEADERBOARD.md) · [Methodology](./docs/methodology.md) · [Dataset](./data/dataset/) · [Architecture](./docs/architecture.md) · [Contributing](./CONTRIBUTING.md)

</div>

## What this measures

Every provider is tested on the same target shape — **4 vCPU · 8 GiB RAM · 40 GB disk** — and
measured on what developers actually wait on:

- sandbox creation, exec, snapshot, teardown, and control-plane latency;
- clone, install, lint, build, and test workflows on real OSS repositories;
- CPU, disk, memory, network, and database performance;
- isolation technology and in-sandbox Docker capability;
- cost normalized against measured runtime.

Real-world workflows are the primary result; synthetic benchmarks explain the performance
characteristics underneath them. A provider can top a creation-time or CPU chart and still lose the
run — dependency install is thousands of small random writes that a network-attached disk turns into
the longest step, cloning is sequential and network-bound, and most developer tooling is
single-threaded.

## Why the Phoronix Test Suite

Synthetic workloads use versioned [Phoronix Test Suite](https://www.phoronix-test-suite.com/)
profiles published through [OpenBenchmarking](https://openbenchmarking.org/), rather than a benchmark
harness invented for this comparison. Each result therefore has an inspectable definition for
installation, arguments, repetition, parsing, units, and result direction, and can be reproduced
independently outside this repository. The profiles are vendored, their metric definitions are
generated rather than transcribed, and [CI rejects
drift](./docs/adr/0003-generated-pts-catalog-and-drift-gate.md).

Custom instrumentation is limited to measurements PTS cannot represent: provider lifecycle latency,
sandbox capabilities, pricing, and complete developer workflows. Those workflows are still authored
as repo-local profiles in the same PTS format, so a workload we own inherits the same execution and
parsing contract as an upstream one.

## Methodology

Each result is produced from fresh, independently created sandboxes. Workloads, toolchains,
arguments, and target resources are pinned; raw samples and observed machine properties are retained;
normalized runs are schema-validated before publication.

Within-sandbox passes and between-sandbox replicates are tracked separately. Failed, missing,
unsupported, and resource-mismatched results are disclosed rather than treated as zero or silently
excluded.

Read the full [methodology](./docs/methodology.md).

## Development

```bash
mise install                     # pinned non-Bun tools (typos, shellcheck, hadolint)
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run lint
```

The full command contract, workspace layout, and enforced dependency DAG are in
[Architecture](./docs/architecture.md).

Provider benchmarks, dataset publication, and toolchain releases require protected credentials and
run only from maintainer-controlled workflows; pull requests never receive provider secrets. See
[CI & secrets](./docs/ci-secrets.md).

## Contributing

Contributions must preserve three invariants:

1. Every provider performs equivalent work.
2. Every number is traceable to raw samples and exact workload provenance.
3. Missing or non-comparable results remain visible.

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).
