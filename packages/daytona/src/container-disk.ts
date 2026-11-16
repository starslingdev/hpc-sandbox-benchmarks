/**
 * This org rejects container-class disk above 10 GB
 * ("Disk request 40GB exceeds maximum allowed per sandbox (10GB)", toolchain bake 43780173359).
 * daytona-container is baked and prepared at this ceiling — not TARGET_SPEC.diskGb (40),
 * which daytona-vm and the other providers still use. The create request stays TARGET_SPEC
 * (the run-level pin); v0 prepare() honors this ceiling instead of 40, observed disk is
 * recorded on the Run, and suites whose minDiskGb exceeds the guest skip with an
 * Insufficient disk gap rather than pretending the 40 GiB target was allocated.
 */
export const DAYTONA_CONTAINER_DISK_GB = 10;
