// Canonical identity of the shared toolchain image, in ONE place at the bottom of the dependency DAG
// so the build pins (@sandbox-benchmarks/templates) and the runtime config
// (@sandbox-benchmarks/providers) both derive from the same constants and cannot drift. The version
// tag is immutable: a change to the toolchain image means bumping TOOLCHAIN_VERSION.

export const TOOLCHAIN_IMAGE_NAME = "sandbox-benchmarks-toolchain";
export const TOOLCHAIN_VERSION = "v1";
