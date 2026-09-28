/**
 * The fio I/O mode the publication disk suite runs every provider in. ONE value drives the suite's
 * command (`BENCH_FIO_DIRECT=<mode>`), the fio metrics its plan declares, and which 4KB random-write
 * bandwidth metric headlines the disk dimension, so the three cannot disagree (the half-missing plans
 * #459 fixed came from exactly that disagreement). Changing it changes the suite command and therefore
 * the frozen workload revision; historical Runs keep the mode they were measured in, which travels
 * in each fio metric id (`_direct_yes_` / `_direct_no_`).
 *
 * `Yes` (O_DIRECT) is the default because it measures the storage path itself: every 4KB or 1MB
 * request goes through the guest block layer, the VMM's virtual disk and the host storage, at the
 * profile's iodepth of 64. Buffered mode measures the guest page cache instead. The pinned pts/fio
 * profile writes a 1 GiB file with no fsync, so on an 8 GiB target buffered writes complete as
 * memory copies, and buffered random reads run cold and effectively serial (Linux AIO blocks on
 * buffered I/O). The two directions then describe different machinery, and neither predicts the
 * moment a slow disk costs a workload: a cold install, a database commit, a build larger than memory.
 * See docs/adr/0020-disk-suite-o-direct.md.
 *
 * A sandbox whose filesystem rejects O_DIRECT fails its fio scenarios, and that is recorded as a
 * coverage gap for that provider rather than a buffered number under the same heading.
 */
export type FioDirectMode = "Yes" | "No";

export const DISK_FIO_DIRECT: FioDirectMode = "Yes";

/**
 * The same fio scenario measured in the other mode (`_direct_yes_` <-> `_direct_no_`), or undefined
 * for a metric that is not a fio mode variant.
 */
export function fioModeTwin(metricId: string): string | undefined {
	if (!metricId.startsWith("fio_")) return undefined;
	if (metricId.includes("_direct_yes_")) return metricId.replace("_direct_yes_", "_direct_no_");
	if (metricId.includes("_direct_no_")) return metricId.replace("_direct_no_", "_direct_yes_");
	return undefined;
}

/** The metric-id token a fio scenario carries for a mode. */
export function fioDirectToken(mode: FioDirectMode): "_direct_yes_" | "_direct_no_" {
	return mode === "Yes" ? "_direct_yes_" : "_direct_no_";
}
