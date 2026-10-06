---
status: accepted
---

# The publication disk suite measures fio with O_DIRECT

## Context

#459 pinned the publication disk suite to one fio mode so every provider's plan declared exactly
the metrics it could emit. The mode it pinned was buffered (`BENCH_FIO_DIRECT=No`). Every Run
since 2026-09-14 therefore reports buffered fio, and ADR-0015 headlined disk with buffered 4KB
random-write bandwidth.

The pinned `pts/fio-2.1.0` job is a 1 GiB file, Linux AIO, iodepth 64, a 60s time-based run, and
no fsync. On the 4 vCPU / 8 GiB target, buffered mode measures the guest page cache, and the two
directions end up describing different machinery:

- **Buffered writes complete as memory copies.** A 1 GiB file fits in the cache and nothing forces
  writeback, so the number is how fast the guest's page cache absorbs dirty pages.
- **Buffered random reads run cold and effectively serial.** Linux AIO blocks on buffered I/O, so
  iodepth 64 collapses to one request in flight, and each cache miss waits a full round trip to
  the virtual disk.

Run 36356024651 shows the result: nearly every provider reads several times slower than it
writes. Run 31066359914, the last complete O_DIRECT Run, had reads and writes of the same order
on every provider (for example Blaxel 218,000 / 210,000 IOPS, Daytona (VM) 271,500 / 237,500),
which is how a storage device behaves.

## Decision

The publication disk suite runs fio with O_DIRECT (`BENCH_FIO_DIRECT=Yes`). The mode lives in one
place, `DISK_FIO_DIRECT` in `packages/schema/src/fio-mode.ts`. It derives the suite command, the
eight fio metrics the plan declares (`diskFioMetrics`), and which 4KB random-write bandwidth
metric headlines disk. Supersede ADR-0015's disk headline: disk now leads with fio rand write 4KB,
O_DIRECT (MB/s), and moves with `DISK_FIO_DIRECT`. ADR-0015's other headlines are unchanged.

A Run leads disk with the scenario it measured. `runHeadlineIds` (in the schema catalog) keeps each
catalog headline, except that a fio headline a Run did not emit is replaced by its other-mode twin
when the Run emitted that. The leaderboard resolves headlines through it, so its tables, summaries
and figures agree.

O_DIRECT is the better measure of the disk because:

- **It measures the storage path.** Each request goes through the guest block layer, the VMM's
  virtual disk (virtio-blk, NVMe emulation, or a user-space file system), and the host storage
  behind it, with 64 requests in flight. Differences between providers are differences in
  storage, not in guest RAM or page-cache policy.
- **It predicts the moments disk speed costs a workload.** A cold dependency install, a database
  commit, a build larger than memory, and anything that calls fsync all wait on the device once
  the cache stops absorbing the work.
- **It is the convention storage figures are quoted in.** Cloud block-storage IOPS and standard
  fio methodology use direct I/O, so readers can set these numbers beside the ones they know.

Buffered behaviour stays measured where it is realistic: the real-world pipelines' clone and
cold-install tasks, hardlink throughput and pgbench all run through the page cache, as the
software they model does.

## Consequences

- The suite command changes, so new disk plans carry a new frozen workload revision. Historical
  Runs are unchanged: the mode is part of every fio metric id (`_direct_yes_` / `_direct_no_`),
  both variants stay catalogued, and a buffered Run keeps rendering under its buffered labels.
  Runs are comparable only within one mode.
- A sandbox whose filesystem rejects O_DIRECT fails its fio scenarios. That is a coverage gap for
  that provider under the O_DIRECT heading.
- A buffered Run keeps rendering exactly as before, led by its buffered random-write bandwidth, so
  the committed leaderboard does not change until an O_DIRECT Run is published. The first O_DIRECT
  Run's leaderboard leads disk with O_DIRECT random-write bandwidth with no further change.
- Standalone fio leaves outside the publication suite keep automatic mode selection
  (`fio_direct_choice` in `lib/bench.sh` probes O_DIRECT when `BENCH_FIO_DIRECT` is unset).
- Switching back is a one-line change to `DISK_FIO_DIRECT`; the command, plan metrics and
  headline follow it.
