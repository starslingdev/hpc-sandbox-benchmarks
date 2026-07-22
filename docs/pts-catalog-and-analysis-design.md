# Design Doc: Scaling the PTS Catalog + Analysis Layer

> **Historical design notes.** Prefer [methodology](./methodology.md) and the ADRs for current truth.
> Kept for provenance of the catalog/analysis work; line numbers and branch names below may be stale.

Status: Historical (implemented in stages; not the living source of truth)
Branch base: `harness-live-suite` (PTS stack tops out at PR #38)
Audience: repo owner → stacked PR series

---

## 1. Goal & North Star

**North star:** compare sandbox **providers** (e2b / daytona / modal), not bare-metal hardware. Every design choice below is filtered through "does this make provider-to-provider comparison cleaner?"

**Concrete goals:**
- Grow `METRIC_CATALOG` (`packages/schema/src/catalog.ts:36`) from the single hand-authored `ptsCpu` entry (`node_web_tooling_runs_per_s`, catalog.ts:15-29) to N PTS suites without hand-transcribing each `<Result>` matrix — and without `<Result>` nodes silently falling into the uncatalogued path (`extract.ts:59-66`).
- Make the analysis layer correctly attribute multi-`<Result>` option matrices (c-ray `Resolution × Rays`, zstd compression/decompression) instead of collapsing them or routing them to `uncatalogued`.
- Capture provenance (test-profile version, arguments, host fingerprint, forensic logs) so the same suite is comparable across providers without version/argument drift silently shifting numbers.

**Value axis = $/run economics.** The `economics` Dimension already exists (`metrics.ts:18-28`, last in the display tuple) and is fed by `derived` metrics (`metrics.ts:60`) computed from other metrics + provider pricing. This is the comparison axis.

**Sensors / perf-per-watt: SHELVED — refined reason.** The spike confirmed PTS MONITOR data rides *inside* `composite.xml` as extra `<Result>` nodes with **empty `<Identifier>`** and a `<Parent>` link, not a separate `test-sensor-data.xml`. On the EPYC validation host sensors *do* return CPU freq/temp/usage but they are **host-level** (the 48-thread EPYC, not the sandbox quota) and there is **no power data**. Critically, these nodes are **not benign**: a MONITOR/sensor `<Result>` lacking `<Proportion>` or carrying a non-numeric `<Value>` fails `ptsCompositeSchema` (`pts-schema.ts:14,27-29`), and `parsePtsComposite` **throws** (`pts.ts:30-31`) — a hard extraction abort, not silent routing to `uncatalogued`. So we run PTS **without MONITOR** (see §4.4) — a correctness hazard, not just noise — and pursue $/run economics instead of perf-per-watt.

---

## 2. Current State

- **Catalog is hand-authored.** `ptsCpu: MetricDef[]` (catalog.ts:15-29) holds one entry. The seam is `export const METRIC_CATALOG = metricDefSchema.array().assert([...ptsCpu]);` (catalog.ts:36). `.assert(...)` validates every entry's *shape* at import (fail-fast on bad `dimension`/`direction`/missing required field) but **not** cross-registry `id` uniqueness — that is a separate import-time guard (`byId` map, catalog.ts:38-44, throws `"METRIC_CATALOG contains duplicate metric ids"`). catalog.ts:8-10 *explicitly endorses* a generated module from upstream `test-definition.xml` slotting into this seam.
- **Runtime maps `composite.xml` `<Result>` → catalog** in `ptsResultToMetric(result)` (`packages/results/src/lib/pts.ts:60-70`):
  - Join key = **versionless** identifier: `versionlessTest()` strips trailing `-\d+(\.\d+)*` (pts.ts:37-39), matched against `MetricDef.pts.test` (pts.ts:61-63). The runtime `Identifier` is the **prefixed** path `pts/node-web-tooling-1.0.1` → `pts/node-web-tooling`, and the committed catalog value is the prefixed `pts/node-web-tooling` (catalog.ts:25). **The `pts/` prefix is part of the join key.**
  - Disambiguation: exact `pts.description === result.Description` first, then the description-less **wildcard** entry (pts.ts:64-68). Exact-over-wildcard prevents a wildcard greedily shadowing a specific sub-result.
  - Returns `{ def, samples: resultSamples(result) }` or `null`. `null` → caller routes to `uncatalogued` (`extract.ts:59-66`, synthetic id `${versionlessTest(Identifier)}::${Description||"default"}`), which is **inert** — reported for visibility, never ranked/charted (run.ts:30-33). **This is exactly the gap the generator closes.**
- **Parser already emits per-`<Result>` fields.** `pts-schema.ts` already declares `AppVersion?` (line 23), `Arguments?` (24), `Description?` (26), `Scale` (27), `Proportion` (28), and `alwaysArray:["..Result","..Entry"]` (pts.ts:23) already prevents collapse of 1080p vs 4K. Those sub-results fall to `uncatalogued` **only because the catalog lacks entries** (the generator's job), not because of any parser defect.
- **Contract invariant:** each `<Result>` → exactly one Metric (metrics.ts:55, pts-schema.ts:19); `<Description>` is the disambiguator (pts-schema.ts:25-26).
- **Routing** keys on `isPtsResultFile()`, an anchored regex `^pts_.*\.xml$` (raw-files.ts, `type("string").matching(...)` — not a `startsWith`/`endsWith` pair); `.json`/`.log` siblings deliberately don't match (provenance).
- **Suites registry** (`suites.ts:32-40`) has one entry `cpu-node`; `Suite` shape at suites.ts:13-26. Sandboxes run as **root** with a **4-vCPU quota on a 48-thread host** (run.ts:48; suites.ts:24).

---

## 3. Catalog Generator Design

### 3.1 Input choice: vendored XML vs `...-to-json` CLI

| Option | Hermetic? | Version-aligned? | Notes |
|---|---|---|---|
| **A. Vendor `test-definition.xml` + `results-definition.xml`** per pinned `<name>-<ver>` into the repo, generate from those | **Yes** — build never hits network | Yes — you commit the exact version you benchmark | Pins to the same `-<ver>` dir the suite runs; survives PTS upstream churn; reviewable diff |
| B. Shell out to `phoronix-test-suite ...-to-json` at generate-time | No — needs PTS installed + network | Aligned only if the local PTS matches the run | Adds a non-hermetic toolchain dep; defeats CI determinism |

**Recommendation: Option A (vendored XML, hermetic).** Rationale, grounded in the caveats:
- Version suffixes are **mandatory and non-uniform** (no unversioned dir; node-web-tooling has only `1.0.0`/`1.0.1`; c-ray jumps `1.x` → `2.0.0` *adding* `TestSettings`). You must **pin the exact version you benchmark** — vendoring the file *is* the pin, co-located with `suites.ts`.
- The GitHub Contents API truncates at 1000 entries and `pts/` has thousands; raw-URL-by-exact-version (the URLs already verified in the PTS-XML report) sidesteps that. A small `fetch-profiles` dev script (not part of the build) writes vendored copies; the generator reads only local files.
- Hermetic build = deterministic catalog in CI; no PTS install on the producer's analysis machine.

**Vendor layout** (note: dir name has **no `pts/` prefix**):
```
packages/schema/src/pts-profiles/<name>-<ver>/test-definition.xml
packages/schema/src/pts-profiles/<name>-<ver>/results-definition.xml
```

**Two distinct repos — do not conflate:**
- **Raw base for vendoring** (repo `phoronix-test-suite/test-profiles`): `https://raw.githubusercontent.com/phoronix-test-suite/test-profiles/master/pts/<name>-<ver>/<file>.xml`. Path is `pts/`; `ob-cache/test-profiles/pts/` **404s on this repo**.
- **`sourceUrl` provenance link** (repo `phoronix-test-suite/phoronix-test-suite`): the committed value uses `ob-cache/test-profiles/pts/...` on **that** repo, where it **exists** (catalog.ts:27). Do not "fix" the working `sourceUrl`.

**XML parser:** reuse the existing two `@nodable` packages, both at the versions the supply-chain gate pins — **do not bump or align them in this stack**:
- `@nodable/flexible-xml-parser@1.2.2`
- `@nodable/compact-builder@1.0.9`

`parsePtsComposite` (pts.ts:28-34) already uses both, with the `alwaysArray` force on `..Result`/`..Entry` (pts.ts:21-25) and the documented compact-builder@1.0.9 types skew at pts.ts:18 (the `as unknown as X2jOptions["OutputBuilder"]` `CompactBuilderFactory` bridge). The generator applies the same `alwaysArray` to `..Option`, `..Entry`, `..ResultsParser` **and must carry the same `CompactBuilderFactory` cast** — do not attempt to "clean it up" by aligning compact-builder.

### 3.2 Field-mapping table (test-definition.xml → `MetricDef`)

| `MetricDef` field | Source | Derivation |
|---|---|---|
| `id` (required, metrics.ts:44) | synthesized | stable slug, e.g. `c_ray_total_time_4k_16rpp_ms`; must be unique across merged catalog (guard at catalog.ts:38-44) |
| `dimension` (required, metrics.ts:45) | **human-curated** | from `DIMENSIONS` (metrics.ts:18-28); `TestType=Processor` ≈ `cpu` but mapping stays editorial |
| `unit` (required, metrics.ts:47) | `TestInformation/ResultScale` | clean 1:1; **post-transform** unit (matches `ResultScale`), not the raw `OutputTemplate` number |
| `direction` (required, metrics.ts:48) | `TestInformation/Proportion` | `HIB`/`LIB` map directly; **guard for missing `Proportion`** (may be absent — do not assume `HIB`; see §7) |
| `headline` (required, metrics.ts:50) | **human-curated** | nothing in XML marks headline; generator emits `false`, curation flips one per dimension |
| `label` (required, metrics.ts:51) | `Title` (+`SubTitle`) folded with per-result `ArgumentsDescription`/`AppendToArgumentsDescription` | Title alone is **not unique** per sub-metric; curated short label is editorial |
| `description` (required, metrics.ts:52) | `TestInformation/Description` | long prose blurb |
| `pts.test` (optional, metrics.ts:56) | profile **repo segment + dir name**, e.g. `pts/<name>` | **`pts.test = "<repo>/" + versionless(<dir>)`** — e.g. dir `node-web-tooling-1.0.1` → `pts/node-web-tooling`. The §2 join key is the **full prefixed identifier exactly as `<Result><Identifier>` reports it** (versionless), so the prefix must mirror the profile's repo segment — **not hardcoded `pts/`.** Real evidence (runner-benchmarking run `27938578495`): a locally-defined profile reports `local/hardlink-1.0.0` → versionless `local/hardlink`, so a `pts/`-only assertion would route it to `uncatalogued`. Generator must assert the prefix **matches the source identifier's segment** (`pts/` for upstream profiles, `local/` for repo-local ones), not literally `pts/` (test-covered). |
| `pts.description` (optional within `pts`) | **synthesized** from `TestSettings` + `results-definition.xml` | see §3.3; predicts the runtime `<Result><Description>` |
| `sourceUrl` (optional, metrics.ts:58) | `TestProfile/ProjectURL` | optional provenance link (see §3.1 repo note) |
| `derived` (optional, metrics.ts:60) | n/a for PTS | economics only; never emitted by generator |

`AppVersion` ≠ profile `Version` — do not conflate (AppVersion is provenance, §4.2, not a catalog field).

### 3.3 Multi-result option-matrix handling via `pts.description`

The generator must reproduce, **deterministically and offline**, the per-`<Result>` `<Description>` string PTS emits at runtime, because that string is the disambiguator `ptsResultToMetric` matches on (pts.ts:64-67).

**Recipe** (from the PTS-XML report §4):
1. Enumerate the cartesian product of every `<Option>/<Menu>/<Entry>` in `TestSettings`.
2. For each combination, candidate parsers = each `<ResultsParser>` that either has **no `MatchToTestArguments`** (always applies) or whose `MatchToTestArguments` substring is present in the combination's `Entry/Value` set (the inverse link — john `--format=bcrypt`).
3. Base description = `{Option/DisplayName}: {Entry/Name}` per chosen option, joined.
4. Apply results-definition modifiers:
   - `AppendToArgumentsDescription` → suffix, e.g. zstd one run → `"Compression Level: 3, Long Mode - Compression Speed"` **and** `"… - Decompression Speed"` (two metrics from one run).
   - `ArgumentsDescription` → **replaces** the description, e.g. 7zip `"Test: Compression Rating"` / `"Test: Decompression Rating"`.
5. The synthesized string is `pts.description`. **`<Entry>/<Message>` is advisory — never emit it.**

**Single-metric profiles** (node-web-tooling: one `<ResultsParser>`, no `TestSettings`) → emit one entry with **no `pts.description`** (the wildcard). This is the legal "one description-less wildcard per test" case (pts.ts:66-67).

**Which combination actually runs** is a benchmark-design choice (c-ray 4K vs 5K) **not in the profile** — the generator may emit catalog entries for the full matrix, but `suites.ts` commands pick which combination executes. Entries for unrun combinations are harmless (they simply never receive samples).

**Numeric transforms** (`DivideResultBy`, `MultiplyResultBy`, `StripResultPostfix`) live only in results-definition and silently change scale vs raw stdout — `unit` reflects the **post-transform** scale (= `ResultScale`).

**Byte-match is load-bearing.** The synthesized string must **byte-for-byte** equal the runtime `<Description>` (separators, spacing, `" - "` joins). c-ray-2.0.0's `"Resolution: 1080p - Rays Per Pixel: 16"` is the canonical break point. This is validated by a committed golden test (§3.7), which gates seam wiring.

### 3.4 What stays human-authored

`headline` (no XML signal; one `true` per dimension is meaningful, `headlineMetric` returns the first — catalog.ts:57-63), curated short `label`, `dimension` assignment, and the chosen option-combination. The generator emits a **draft** with `headline:false` and verbose labels; curation is supplied by a separate, hand-authored **override map keyed by `id`**.

### 3.5 Two committed files + import-time merge (resolves draft-vs-merged ambiguity)

To keep the drift gate (§3.6) buildable, the **generator output and the curation are separate committed files, and the merge happens at import in the seam — the merged artifact is never committed:**

- **`pts-generated.ts`** — the **raw, uncurated** generator draft (`MetricDef[]`, all `headline:false`, verbose labels). Committed. **This is the only file the drift gate diffs** (§3.6).
- **`pts-overrides.ts`** — the hand-authored override map keyed by `id` (`headline`/`label`/`dimension`). Committed. **Excluded from the gate** — curation never trips drift.
- **The seam applies the merge at import time** (not committed):

```ts
// catalog.ts:36 evolves to:
import { ptsGenerated } from "./pts-generated";
import { ptsOverrides } from "./pts-overrides";

const ptsCurated = ptsGenerated.map((d) => ({ ...d, ...ptsOverrides[d.id] }));

export const METRIC_CATALOG: readonly MetricDef[] =
  catalogSchema.assert([...ptsCpu, ...ptsCurated]);
```

Hard requirements (so it slots in without touching the guard at catalog.ts:38-44):
- Every entry satisfies all 7 required fields (`.assert` fail-fast on shape).
- For PTS entries: `pts.test` = **`"<repo>/" + versionless(dir)`** — the prefix mirrors the profile's source segment (`pts/` upstream, `local/` repo-local), **not** hardcoded `pts/` (asserted, §3.2); `pts.description` = exact synthesized `<Description>` (≤1 wildcard per test).
- **Unique `id` across the merged catalog** or the import-time `byId.size !== length` guard throws — the generator owns id uniqueness (the schema does not).
- `direction` mirrors `Proportion` and `unit` mirrors `ResultScale` — unless a `<ResultsParser>` declares its own `<ResultProportion>`/`<ResultScale>` (fio does), which then wins for the metrics that parser produces.

`pts-generated.ts` is **committed**, not generated at build time — keeps the hermetic build trivial and the catalog diff reviewable.

### 3.6 Drift gate

A CI check (`pnpm check:catalog-drift`) re-runs the generator against the vendored XML and `git diff --exit-code`s **`pts-generated.ts` only**. It fails the build if the committed draft diverges from what the vendored profiles produce — catching accidental hand-edits and un-regenerated profile bumps. `pts-overrides.ts` is curation and is **not** diffed, so curation never trips the gate.

**The gate presumes byte-deterministic codegen — make it so.** `git diff --exit-code` only holds if the serialized `.ts` is byte-stable. The generator **must**:
- emit entries in a **deterministic order** (stable sort by `id`) and serialize object keys in a **fixed canonical order**;
- iterate the cartesian product and `<Entry>` sets **deterministically** (source order);
- pipe its output through the **same Biome formatter config** the repo and the gate use, so committed and re-generated bytes are identical.

### 3.7 Golden byte-match fixture (gates seam wiring)

The §3.3 byte-match is the highest-risk correctness item, so it gets its own gate **before** the seam is wired:
- Commit one **real recorded `composite.xml` per suite** as a fixture.
- A golden test asserts that, for each `<Result>` in the recorded composite, `ptsResultToMetric` resolves to a catalog entry (no `uncatalogued`) — i.e. synthesized `pts.description` byte-matches the recorded `<Description>`.
- This PR is **ordered before** the seam-wiring PR (§6). Until a recorded composite exists for a suite, that suite's generated entries must not be merged into the seam.

---

## 4. Analysis Enrichment

All below are reader/extractor-side except forensic capture (producer-side). The producer-side concrete edits are in the producer-changes report; summarized here.

### 4.1 `<System>` host fingerprint — from `composite.xml`, no separate file

Spike: the system fingerprint is **embedded in `composite.xml` `<System>`** (Hardware/Software + JSON: cpu-microcode, CFLAGS, scaling-governor, mitigations). A separate `system-info.xml` is only written on final save — do **not** depend on it.

**This requires real schema + plumbing work, not just a read:**
- `ptsCompositeSchema` (pts-schema.ts:40-45) has **no `<System>` node** — add it to the composite schema.
- `extractProviderDir` returns `{contributions, uncatalogued, gaps}` (extract.ts:20-24) — it has **no `observedSpecs`** slot. Host specs must be threaded into `ProviderRun.observedSpecs` at the **run-writer layer**, not in extract.ts. The `run.ts:50-63` citation is the *target* schema, not the wiring site.

**Host leak is by design-fit:** in a container `<System>` reports the **host** (48-thread EPYC), not the 4-vCPU sandbox quota. Map `<System>` to the **host (observed) side** of the existing `ObservedSpecs` host-vs-effective split (run.ts:50-63: `hostVcpus`/`hostMemoryGb` = host disclosure; `vcpus`/`memoryGb` = cgroup-effective). **Never** treat `<System>` as the sandbox's effective specs.

### 4.2 AppVersion / Arguments provenance — ALREADY LANDED

**This is done in the current stack; do not re-add it.** The parser surfaces `AppVersion`/`Arguments`/`Description`/`Scale`/`Proportion` per-`<Result>` (pts-schema.ts), **and** the output model already carries the provenance:
- `MetricResult` already declares optional `appVersion` and `arguments` (run.ts:30-31).
- `extract.ts` populates them from the per-`<Result>` values, but only when PTS reported non-empty ones (`extract.ts` — the `result.AppVersion ? … : {}` spreads), and `normalize-tree.ts` carries them onto the merged `MetricResult`.
- `extract.test.ts` covers the round-trip ("carries appVersion and arguments provenance when the `<Result>` populates them").

So neither the parser nor the output model needs a change for provenance. An implementer who "adds `appVersion`/`arguments` to `MetricResult`" would be redoing finished work. The only provenance still open is the `<System>` host-fingerprint threading (§4.1), which is a *different* field set.

### 4.3 Forensic log capture (`/var/lib` path + `test-logs/`)

Spike: result dir (root) = `/var/lib/phoronix-test-suite/test-results/<name>/` (NOT `~/.phoronix-test-suite`), containing `composite.xml` + `installation-logs/` + `test-logs/`. `pts_user_dir()` (bench.sh:150) already probes `/var/lib` (and `/root/.phoronix-test-suite` and `$HOME`). Gaps:
- **Capture forensics as a tarball** to avoid `.xml` leakage: `pts_<test>--forensics.tar.gz` from `dirname "$xml_found"` (bench.sh `run_pts_benchmark`, after the composite copy at lines 231-237). A flattened copy would leave nested `.xml` files that `isPtsResultFile` would misroute; the tarball is **provably disjoint** (it `startsWith("pts_")` but fails `endsWith(".xml")`, raw-files.ts:34).
- **`raw-files.ts` additions:** `ptsForensicsFile(prefix)` / `isPtsForensicsFile(filename)` with suffix `--forensics.tar.gz` (`startsWith("pts_") && endsWith("--forensics.tar.gz")`). Update the raw-files.ts:28-31 doc comment that claims siblings "deliberately don't match" — now one sibling intentionally has a recognized provenance name.
- **Scope the `composite.xml` find.** bench.sh:229 globs across all of `test-results/` and takes `ls -t | head -1`; with `TEST_RESULTS_NAME=benchmark` reused per test, this misattributes as the suite grows. Scope to this run's dir (e.g. `ls -t "$pts_base"/*benchmark*/composite.xml 2>/dev/null | head -1`, a portable glob rather than non-POSIX `find -maxdepth`/`-path`). Keep `|| true` on the `tar` so a `/var/lib` perms hiccup can't abort a `set -e` leaf. **Confirmed against real data:** in runner-benchmarking run `27938578495`, `pts_compress_zstd.xml` carried a stray `pts/git` `<Result>` (14 compress-zstd + 1 git) **and** `pts_git.xml` carried the same git result — exactly the `TEST_RESULTS_NAME`-reuse contamination this bullet predicts. The producer fix is the root cure.
- **Reader-side de-dupe is the matching defense (LANDED on the results stack).** A scoped producer find prevents *our* runs from contaminating, but the normalizer must also be robust to any producer (including third-party/replayed trees like the one above). `normalizeProviderDir` (normalize-tree.ts) now de-dupes catalogued metrics by `metricId` and uncatalogued stragglers by `id` across source files — **keep-first (deterministic file order) with a divergence warning**, never pooling samples. Pooling would inflate `n` and distort stddev; on the real cpu-generic tree this collapsed the duplicated git straggler (uncatalogued 16 → 15). One `<Result>` owns a metric's per-pass samples, so the same metric in two files is a duplicate, not extra passes.

**Dropped: the `pts_init`-before-`pts_user_dir` change.** It is **not substantiated by the call sequence.** `pts_user_dir()` is only invoked at bench.sh:224, *after* `batch-install`+`batch-run` (219) have already run PTS as root and populated `/var/lib/phoronix-test-suite`; the detection loop (bench.sh:150) already lists `/var/lib`, `/root/.phoronix-test-suite`, and `$HOME`, so the dir exists and is found by the time detection runs. The doc's claimed failure ("the glob finds nothing") is unproven. **Do not add the `pts_init` call** unless a spike produces evidence of PTS writing results to a path none of the three candidates cover; in that case, attach the spike output and reopen. The scoped-find + `unset MONITOR` changes stand independently.

### 4.4 Run WITHOUT MONITOR (explicit)

Producer never *sets* MONITOR; the risk is **inherited env** from the image/harness injecting empty-`<Identifier>` `<Result>` nodes that, as established in §1, can **throw and abort the entire extraction** (not merely route to `uncatalogued`). Make absence explicit in `_configure_pts_batch` (bench.sh:162-176, the chokepoint for both `ensure_pts` and `run_pts_benchmark`): `unset MONITOR` (and optionally `PERFORMANCE_PER_WATT` / `MONITOR_*`) with the documented intent that host-level sensors are unattributable and a correctness hazard for provider comparison. **No `suites.ts` change** — no MONITOR field, sensor direction shelved.

---

## 5. Transport Caveat

> **Status update: the detached+poll transport described below has since been IMPLEMENTED** in the harness (`StepRunner.runDetached`, execute.ts). `SandboxHandle` now carries an optional `filesystem` slice and `runCommand` takes a `RunCommandOptions` with `background`; the benchmark, the long setup installs, and the result collection all run over it. The caveat below is retained as the rationale; the work it prescribes as a "separate stack" is no longer pending.
>
> **Follow-up (ENG-62): transport selection is now capability-driven, not hardcoded.** Each provider declares a `ProviderTransport` capability in the schema (`streaming`, `syncCapMs`, `detachedPoll`), and the harness picks per step via `StepRunner.step` / `selectTransport`: a step that could outlast the provider's synchronous cap detaches where supported, everything else runs directly. Daytona's HTTP 408 is one declared capability among several (E2B caps a synchronous `commands.run` at ~60s; Modal's exec is uncapped), so the long-step path is no longer Daytona-specific — it follows whichever provider is running.

Per spike `bn2f5pmp4` (`docs/evidence/daytona-exec-transport.md`), Daytona itself caps a long synchronous `executeCommand` round-trip at **server-side HTTP 408** (FACT 2), and `@computesdk/daytona` does **not** stream — it ignores `onStdout`/`onStderr` and hardcodes `stderr:""` (FACT 1). So Daytona is **not** a safe direct-exec path for multi-minute suites: it is itself a **single-round-trip-capped provider**, alongside Blaxel's ~120s gateway. (`execute.ts`'s header now documents this, with the provider and exact HTTP 408 cap cited.)

**Implication for this stack:** real PTS suites (multi-minute) exceed a ~120s gateway cap on such providers. The fix is **detached + poll** (launch a background process, then poll for completion + collect artifacts), **not** streaming. Two concrete facts respected by the implementation:
- `SandboxHandle` originally declared only `runCommand(command)` with **no `background` param**, so detached+poll was a **real interface change** to `SandboxHandle` (+ the computesdk wiring behind it), not a drop-in flag. That change has now been made: `runCommand` takes `RunCommandOptions { background? }` and `SandboxHandle` exposes the `filesystem` slice `runDetached` polls.
- The spike **has** established it: Daytona `executeCommand` returns a **server-side HTTP 408** on long commands (spike `bn2f5pmp4` — the 1200s client timeout never fired and `c-ray` kept running in `top` after the 408; FACT 2), and `@computesdk/daytona` ignores `onStdout`/`onStderr` and hardcodes `stderr:""` so streaming can't help (FACT 1). This is now **confirmed**, not "unconfirmed against the code." Therefore `execute.ts`'s header **has been** updated to reflect it (the A1 fix on #40), with the provider and exact HTTP 408 cap cited.

This transport work was **out of scope** for the catalog/analysis stack but a hard prerequisite for running anything heavier than node-web-tooling end-to-end on a single-round-trip-capped provider (Daytona's HTTP 408 included). It has since landed in the harness stack (`runDetached`), so it is **no longer a pending prerequisite** for live runs — the catalog/analysis PRs (#39–#46) remain fixture/unit-testable against vendored/recorded `composite.xml` independently of it.

---

## 6. Build Sequence (stacked PRs on top of #38)

Each PR is single-concern, dependency-ordered, every branch green. **LOC budget <200 applies to hand-written code only; generated artifacts (`pts-generated.ts`) and committed fixtures (recorded `composite.xml`) are excluded.** Two stacks branch off the base.

### Stack A — catalog + analysis (linear, off `harness-live-suite`/#38)

| PR | Title | Scope | Depends on |
|---|---|---|---|
| **#39** | `chore(schema): vendored pts-profiles + fetch-profiles dev script` | Add `packages/schema/src/pts-profiles/<name>-<ver>/{test,results}-definition.xml` for the suites we run (node-web-tooling-1.0.1, c-ray-2.0.0); a non-build dev script using the verified `phoronix-test-suite/test-profiles` raw URLs + git-trees API. No catalog change. | #38 |
| ~~**#40**~~ | ~~`feat(results+schema): MetricResult provenance fields`~~ — **ALREADY LANDED, drop this PR** | `appVersion`/`arguments` already exist on `MetricResult` (run.ts:30-31), are populated in `extract.ts` + `normalize-tree.ts`, and are fixture-tested in `extract.test.ts` (see §4.2). No work remains; downstream rows depend on #39 directly. | — |
| **#41** | `feat(schema): <System> → ObservedSpecs host side` | Add `<System>` to `ptsCompositeSchema` (pts-schema.ts:40-45); thread host specs into `ProviderRun.observedSpecs` at the **run-writer layer** as `hostVcpus`/`hostMemoryGb` (run.ts:50-63); never as effective specs. Fixture-tested with the host-leak XML. | #39 |
| **#42a** | `feat(schema): PTS catalog generator core (field map)` | Generator lib reading vendored XML; §3.2 field mapping incl. `pts.test = "<repo>/" + versionless(dir)` — prefix mirrors the source identifier's repo segment (`pts/` upstream, `local/` repo-local), **not hardcoded `pts/`** (asserted, §3.2) — `direction`←`Proportion` (missing-guard), `unit`←`ResultScale`. Reuses `@nodable/flexible-xml-parser@1.2.2` + `@nodable/compact-builder@1.0.9` with the `CompactBuilderFactory` cast. Deterministic ordering + Biome serialization (§3.6). Emits draft `MetricDef[]` for single-metric profiles. Unit-tested. **Not wired into the seam.** | #39 |
| **#42b** | `feat(schema): option-matrix pts.description synthesis` | Cartesian product of `TestSettings`; `ResultsParser`/`MatchToTestArguments` inverse matching; `AppendToArgumentsDescription` (1→2 metrics); `ArgumentsDescription` replacement; numeric-transform-aware `unit`. Unit-tested against vendored profiles. | #42a |
| **#43** | `test(schema): golden composite.xml byte-match per suite` | Commit a real recorded `composite.xml` per suite; golden test asserting every `<Result>` resolves via `ptsResultToMetric` (no `uncatalogued`) — i.e. synthesized `pts.description` byte-matches runtime (§3.7). **Gates the seam.** | #42b |
| **#44** | `feat(schema): commit pts-generated.ts + overrides + wire seam` | Commit raw `pts-generated.ts` (draft) and hand-authored `pts-overrides.ts`; apply import-time merge in the seam `[...ptsCpu, ...ptsCurated]` (catalog.ts:36, §3.5). Verify id-uniqueness guard (catalog.ts:38-44) passes. | #43 |
| **#45** | `ci: catalog drift gate` | `check:catalog-drift` re-runs generator + `git diff --exit-code` on **`pts-generated.ts` only**; `pts-overrides.ts` excluded; requires deterministic + Biome-formatted output (§3.6). | #44 |
| **#46** | `feat(suites): register next PTS suites` | Add `suites.ts` entries (c-ray etc.) with pinned option-combination commands; `paddedSuiteToken` wiring. Live runs depend on the transport stack (§5). | #44, Stack B |

### Stack B — producer (sibling stack off #38, parallel to Stack A)

Per the "split deps into a chore PR, every branch green" convention, producer changes that depend only on #38 are a **separate Graphite stack**, not slotted mid-Stack-A (Graphite branches are linear).

| PR | Title | Scope | Depends on |
|---|---|---|---|
| **B1** | `feat(producer): scoped composite find + unset MONITOR` | bench.sh: scope `composite.xml` find to this run's dir; `unset MONITOR` in `_configure_pts_batch`. **No `pts_init` change** (§4.3). | #38 |
| **B2** | `feat(producer+schema): forensic tarball + raw-files contract` | bench.sh forensic `tar -czf …--forensics.tar.gz` (with `|| true`); `ptsForensicsFile`/`isPtsForensicsFile` + doc-comment fix in raw-files.ts. | B1 |

Detached+poll transport (§5) is a **third, independent stack**, prerequisite for #46's live runs but not a blocker for any fixture/unit-tested work above.

---

## 7. Risks & Open Questions

- **Drift between vendored profile version and the version PTS actually installs.** Mitigation: `suites.ts` commands pin `<name>-<ver>`; the drift gate (#45) only proves the *catalog* matches the *vendored* XML, not that the *runner* installed that version. **Open:** assert installed version against `<AppVersion>`/profile `Version` from `composite.xml` at extraction and warn on mismatch?
- **`pts.test` prefix.** A generator bug that drops *or hardcodes* the prefix routes generated metrics to `uncatalogued` — the exact failure this stack exists to fix. The prefix is **the source identifier's repo segment, not always `pts/`**: real data shows `local/hardlink` (repo-local profiles report `local/`). Guarded by the §3.2 assertion (prefix mirrors the source segment) and the §3.7 golden test. **Open:** the generator's vendored-profile fetch (§3.1) only covers the `phoronix-test-suite/test-profiles` (`pts/`) repo — `local/` profiles live in the producer repo, so cataloguing them needs a second vendoring source.
- **Missing `<Proportion>`.** Some profiles omit it (PTS defaults apply). Generator must guard rather than assume `HIB`. **Open:** error out vs. require a curation override when absent?
- **`label` uniqueness for multi-result.** `Title` alone is not unique; folding `ArgumentsDescription` is editorial. Two metrics may share a label (schema allows it — only `id` must be unique). Acceptable, but charts may confuse.
- **Synthesized `pts.description` byte-match.** Highest-risk correctness item; spacing/joining differences (`" - "`, c-ray `"Resolution: 1080p - Rays Per Pixel: 16"`) would silently route results to `uncatalogued`. **Mitigation:** the §3.7 golden test, **gating seam wiring (#44)**.
- **Deterministic codegen for the drift gate.** Non-canonical key/iteration order or a formatter mismatch makes #45 flap. Mitigation: §3.6 hard requirements (stable sort, fixed key order, shared Biome config).
- **Transport blocks heavier suites.** On single-round-trip-capped providers (e.g. Daytona's HTTP 408, confirmed via spike `bn2f5pmp4`; Blaxel ~120s) only short suites complete until detached+poll lands; a capped round-trip can yield a misleading "green" while the process keeps running. **Open:** does a capped/aborted round-trip leave a partial/locked result dir that corrupts the next run's scoped find?
- **`/var/lib` perms if a non-root path is introduced.** Sandboxes run as root today (suites.ts:24); `cp`/`tar` reads assume root. Documentation note; keep `|| true` on the tar.
- **Headline selection at scale.** `headlineMetric` (catalog.ts:57-63) throws if a dimension has metrics but none headline. Every populated dimension needs exactly one curated `headline:true` in `pts-overrides.ts`. **Open:** add a catalog-completeness lint (every dimension with ≥1 metric has exactly one headline)?

---

## 8. Realworld Profile Pattern (ENG-135/136/137/138)

Real OSS repos (Mastra, Better-Auth, OpenClaw) run through the CI tasks their own pipelines run —
clone, cold install, lints, typecheck, build, test — each as a **repo-local PTS profile**
(`packages/schema/src/pts-profiles/local/realworld-<repo>-1.0.0/`), reusing the whole existing
pipeline (`run_pts_benchmark` → `composite.xml` → `parsePtsComposite` → generated catalog → suite
contract → CI matrix → dataset) with zero new consumer code. Granularity comes from a single `Task`
`<Option>` axis: one `<Entry>` per CI task, one catalogued metric per task
(`realworld_<repo>_task_<slug>`), one `batch-run` measuring every task as a separate `<Result>`.

**The PTS local-profile contract** (confirmed empirically, not documented upstream): `install.sh`
runs with its working directory set to PTS's `installed-tests/local/<name>/` dir, but `$0` still
resolves to its own source location under `test-profiles/local/<name>/` — so `$(dirname "$0")` reads
install-time siblings (`target.env`, the shared runner) while relative writes (the generated
executable) land in the persistent install dir. The executable PTS looks for at `batch-run` is named
after the **versionless** profile dir (`realworld-better-auth`, not `-1.0.0`); it receives the
selected `<Entry>/<Value>` as `$1` and must pipe its own stdout/stderr to `$LOG_FILE`.

**One trap this pattern must avoid:** PTS truncates a Menu `<Entry>/<Name>` at its first `(`
character when building the runtime `<Description>` — dropping the parenthetical *and everything
after it* — but the offline description predictor (`synthesizeResults`, §3.3) has no way to
know this and predicts the literal Name. A parenthesized Entry Name (`"Lint (Biome)"`) therefore
byte-mismatches at runtime (`"Task: Lint"` vs. the predicted `"Task: Lint (Biome)"`), routing that
task to `uncatalogued` in production despite the golden gate (§3.7) looking clean against a
hand-authored fixture. **Every realworld Entry Name must avoid parentheses** (`"Lint Biome"`, not
`"Lint (Biome)"`); the `pts-profiles.test.ts` consistency test and the golden gate together catch a
regression, but neither can catch it from XML alone without a real recorded composite exercising the
name.

**`target.env` is the per-repo config seam**, adjacent to the XML: `REPO_URL`, `PIN_SHA`,
`NODE_VERSION`, and one `TASK_CMD_<value>` per `<Option>` `Entry`/`Value` (asserted 1:1 by
`pts-profiles.test.ts`, both directions). `lib/pts/realworld/realworld-runner.sh` is the one shared runner
script for all three repos — byte-identical, no per-repo branching beyond reading `target.env` — so
a repo's *quirks* (its exact CI install invocation, which lint/build/test scripts it exposes) live
entirely in that repo's `target.env`, never in the runner or `install.sh`.

**Pin bump = profile-version bump.** `AppVersion` in `test-definition.xml` is pinned to the exact
commit SHA `target.env`'s `PIN_SHA` checks out (cross-checked by `pts-profiles.test.ts`), which PTS
echoes into `composite.xml`'s `<Result><AppVersion>` and `extract.ts` already carries through as
`MetricResult.appVersion` provenance (§4.2) — for free, no extraction change needed. Moving a pin
forward is a content change to an already-versioned profile dir (`realworld-<repo>-1.0.0`), not a new
profile version: the versionless `pts.test` join key and every metric id stay stable across a pin
bump, only `AppVersion` (and whatever task set/commands changed upstream) moves.
