# @sandbox-benchmarks/results

**Role:** normalize raw benchmark runs into stable run documents for reporting/promotion.

**Public surface (`.`):** `normalize()`.

**Depends on:** `@sandbox-benchmarks/schema` **only**. By design this package must normalize results
*without* any provider SDK — the boundary test enforces that it never reaches into
`@sandbox-benchmarks/providers` or a vendor SDK.

**What lives here:** normalization logic. Timestamp/formatting internals live in `src/lib/` and are
never imported across a package boundary.
