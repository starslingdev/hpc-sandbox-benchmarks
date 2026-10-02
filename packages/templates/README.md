# @sandbox-benchmarks/templates

**Role:** per-provider sandbox template builders.

**Public surface:**
- `.` — `TemplateSpec`, the three `build*Template()` functions, `templateProviders`.
- `./e2b` — `buildE2bTemplate()`
- `./daytona` — `buildDaytonaTemplate()`
- `./modal` — `buildModalTemplate()`

**Depends on:** `@sandbox-benchmarks/schema` only (toolchain identity and baked artifact names).

**What lives here:** one module per provider, exposed at its own export subpath — the
**one-subpath-one-module** policy, so importing `@sandbox-benchmarks/templates/e2b` pulls in only the
E2B builder. Shared helpers live in `src/lib/` and are never imported across a package boundary.

**Toolchain image:** every builder defaults to the published version ref,
`toolchainImageRef("version")` from `@sandbox-benchmarks/schema/toolchain`. The repo-global
`BENCH_TOOLCHAIN_IMAGE` override was removed with `packages/providers` (ADR-0023). To iterate on a
different image, bake a provider artifact from it with
`bun apps/cli/src/bin/bake.ts --provider <id> --base-image <ref>` and boot the result through the
planner's `BENCH_ARTIFACT_<PROVIDER>` input; `buildModalTemplate(tag)` takes the image directly.
