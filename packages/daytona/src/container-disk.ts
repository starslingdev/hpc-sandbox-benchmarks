/**
 * This org rejects container-class disk above 10 GB
 * ("Disk request 40GB exceeds maximum allowed per sandbox (10GB)", toolchain bake 43780173359).
 * daytona-container is baked, prepared, and coverage-pinned at this ceiling — not
 * TARGET_SPEC.diskGb (40), which daytona-vm and the other providers still use.
 * Observed disk is recorded on the Run; suites whose minDiskGb exceeds the guest skip
 * with an Insufficient disk gap rather than pretending the 40 GiB target was honored.
 */
export const DAYTONA_CONTAINER_DISK_GB = 10;
