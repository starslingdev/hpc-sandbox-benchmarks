# Freestyle default CPU benchmark selection

Freestyle joins the default `bench-matrix.yml` provider selection after the native snapshot fix
landed in [PR #540](https://github.com/starslingdev/hpc-sandbox-benchmarks/pull/540).
This enables routine collection with the suite registry's usual replicate counts and pass policy.
The release-required provider set is a separate policy and remains unchanged.

## Released environment

[Toolchain release 36779847593](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/36779847593)
ran on `7414d1e6cdfcce4f410f7c4e1cf1735425bd3495` with `providers=freestyle`, `build=skip`,
`promote=true`, and `force_republish=false`. Bake, all 13 fresh-boot toolchain checks, and promotion
passed. The scoped release did not rebuild the shared OCI base.

- Candidate: `sh-9ea13540f99f401aa27719e037340f9d`.
- Promoted v8 snapshot: `sh-6a95035201854de993d7b231c4c6c142`.
- Repository Actions variable `FREESTYLE_SNAPSHOT_ID` was set to the promoted ID and read back.
- The Freestyle account capacity declaration is 400 running sandboxes, 16,000 vCPU and 32,000 GiB RAM.

The snapshot uses the shared pinned tools and PTS definitions inside a native Ubuntu 24.04 VM.
Ubuntu packages, compiler and kernel differ from the shared Debian 13 OCI environment; this remains
disclosed in provider metadata. Snapshot IDs are immutable; release aliases are not benchmark pins.

## Mastra confirmation on the promoted snapshot

[Smoke 36782739370](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/36782739370)
ran on the merged revision above, with one Freestyle sandbox and one fixed PTS pass per task.
The frozen artifact identity and driver-reported boot identity both bind the promoted snapshot.
The requested shape was 4 vCPU / 8 GiB / 40 GiB, with `specMatched=true`; guest observations were
4 vCPU, 7.76 GiB RAM and 39.1 GiB disk. Setup measured 32.3 GiB free, above Mastra's 30 GiB guard.

| Mastra task | Seconds |
| --- | ---: |
| Git Clone | 5.605 |
| Cold Install | 79.132 |
| Lint Format | 176.124 |
| Build Core | 151.498 |
| Test Core | 1663.089 |

All five required metrics were recorded, with no failed or skipped suite gaps. Test Core finished
within the unchanged 2400-second deadline. The raw PTS XML agrees with the normalized result;
the Run digest was verified against the attempt record. The attempt reports `known-success` and
`cleanup=confirmed`; the raw cleanup receipt records `confirmedAbsent=true`.
Evidence is retained in that run's
`experiment-attempt-36782739370-freestyle-realworld-mastra-r0-a1-9299cb8b-1246-491d-bde8-1232ec63298f`
artifact. No dataset was published by the smoke workflow.

## Evidence scope and promotion decision

Before release, candidate `sh-17797a574ff244cd84c1f68702ffb248` passed all nine suites in local
single-pass diagnostics: all 47 required metrics, no gaps, and matching requested resources.
Its live driver checks passed 12/12, including a 305-second detached command, file round-trip,
exit-code preservation, idempotent deletion and observed absence. These are local diagnostics,
not a committed replicated benchmark or the formal clause report described by ADR-0008.

The default collection decision revisits ADR-0021's initial opt-in condition: complete diagnostic
coverage on the earlier candidate, followed by a successful native release and the previously
failing Mastra workload on the promoted snapshot, is sufficient to start routine collection.
All-suite replicated coverage on the promoted ID has not yet been established. Each default
experiment must still validate its actual attempts, artifact evidence, eligible metrics and cleanup;
partial publication must retain any shortfalls. Default selection does not certify a complete
published comparison or waive those checks.
