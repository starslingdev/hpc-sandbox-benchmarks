# fio result parser repair

The pinned upstream fio profile drops bandwidth trials reported in GiB/s. Its older KiB/s and MiB/s
conversions also do not match the declared decimal MB/s scale. The vendored parser converts KiB/s,
MiB/s, and GiB/s to MB/s using 0.001024, 1.048576, and 1073.741824 respectively; IOPS stays unchanged.
The benchmark stages these definitions after installation, preserving the installed fio executable.

This is a prospective measurement revision, bound to the source revision in each new experiment.
It does not rewrite historical values or supply missing historical samples. Compare runs only within
matching workload revisions. The separate direct/buffered eligibility contract remains an independent concern. The
[PTS identity repair](../patches/README.md) handles equal-valued metrics without changing their values.

Exercise the actual pinned PTS parser without running a benchmark:

```sh
php lib/pts/patches/result-parser.php /path/to/phoronix-test-suite-10.8.4/pts-core/objects/pts_test_result_parser.php
php lib/pts/fio/parser-selftest.php /path/to/phoronix-test-suite-10.8.4
```

The self-test requires PHP with XML support and the PTS 10.8.4 source tree. It checks exact conversions
for all three bandwidth units and preserves numeric and abbreviated IOPS values. The ordinary Bun
suite also verifies that staging replaces stale definitions without deleting the installed executable.

The publication disk suite runs every provider in one explicit mode, `DISK_FIO_DIRECT` in
`packages/schema/src/fio-mode.ts` (default `Yes`, O_DIRECT; see
[ADR-0020](../../../docs/adr/0020-disk-suite-o-direct.md)). That one value sets the suite command
(`BENCH_FIO_DIRECT=Yes mise run benchmark:disk:all`), the eight fio metrics the plan requires beside
hardlink, and the disk headline. O_DIRECT measures the storage path; buffered mode on this 1 GiB,
no-fsync job measures the guest page cache (writes complete as memory copies, cold reads run
serially). Both modes stay catalogued, so historical buffered Runs remain readable.
Standalone leaves without an explicit mode retain their filesystem probe. Invalid explicit modes
fail before measurement. Changing the suite command and eligible metrics changes its frozen workload
identity; no old experiment denominator is modified.
