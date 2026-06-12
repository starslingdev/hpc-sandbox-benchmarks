# @sandbox-benchmarks/templates

**Role:** per-provider sandbox template builders.

**Public surface:**
- `.` — `TemplateSpec`, the three `build*Template()` functions, `templateProviders`.
- `./e2b` — `buildE2bTemplate()`
- `./daytona` — `buildDaytonaTemplate()`
- `./modal` — `buildModalTemplate()`

**Depends on:** `@sandbox-benchmarks/providers`, `@sandbox-benchmarks/schema`, `computesdk`
(`catalog:computesdk`).

**What lives here:** one module per provider, exposed at its own export subpath — the
**one-subpath-one-module** policy, so importing `@sandbox-benchmarks/templates/e2b` pulls in only the
E2B builder. Shared helpers live in `src/lib/` and are never imported across a package boundary.
