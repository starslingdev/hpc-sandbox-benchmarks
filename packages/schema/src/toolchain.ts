// Canonical identity of the shared toolchain image, in ONE place at the bottom of the dependency DAG
// so the build pins (@sandbox-benchmarks/templates) and the runtime config
// (@sandbox-benchmarks/providers) both derive from the same constants and cannot drift. The version
// tag is immutable: a change to the toolchain image means bumping TOOLCHAIN_VERSION.

export const TOOLCHAIN_IMAGE_NAME = "sandbox-benchmarks-toolchain";
// v3: the 4 vCPU / 8 GiB target spec. The e2b/daytona/novita templates are version-scoped, so this
// bump forces new artifacts to be baked+promoted at cpu_count=4 rather than silently reusing the
// immutable v2 templates (baked at 2 vCPU). Re-bake all providers before the runs that consume v3.
export const TOOLCHAIN_VERSION = "v3";
