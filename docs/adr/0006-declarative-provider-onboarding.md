---
status: proposed
---

# Declarative provider onboarding

## Context

Adding one benchmarked provider currently touches 25–34 files. Measured over the last four
additions (`4ee64f2` microsandbox, `6da0dce` vercel, `22f36c4` runcloud, `36a802a` runloop):

| Commit | Files changed |
|---|---|
| `4ee64f2` Microsandbox local + cloud | 25 |
| `6da0dce` Vercel Sandbox | 25 |
| `22f36c4` run.cloud | 34 |
| `36a802a` Runloop | 34 |

**Eighteen** of those files were touched by *all four*. That set is the boilerplate spine — it is
not where the provider-specific work lives:

```
packages/schema/src/providers.ts            packages/schema/src/providers.test.ts
packages/providers/src/lib/adapters.ts      packages/providers/src/index.test.ts
packages/providers/package.json             package.json + bun.lock
apps/cli/src/lib/providers-run.test.ts      apps/cli/src/lib/bake/validate.ts(.test.ts)
apps/cli/src/lib/bake/promote.ts            apps/cli/src/bin/release-plan.ts(.test.ts)
apps/cli/src/bin/bake.ts                    .github/workflows/toolchain-image.yml
.github/workflows/bench-suite.yml           .github/workflows/bench-smoke.yml
.env.example
```

The genuinely novel work — the adapter (`runcloud.ts` is 576 lines, `microsandbox.ts` 630) and its
bake module — is 2–4 files. Everything else is re-spelling the same fact in a new dialect.

### What already works

The **runtime** path is fully registry-driven and needs no edit per provider. `PROVIDERS` (derived
from `REGISTRY` in `packages/schema/src/providers.ts`) already feeds the matrix fan-out
(`apps/cli/src/lib/matrix.ts:57`), normalization (`packages/results/src/lib/normalize-tree.ts:52`),
figures (`packages/results/src/lib/figures.ts:96`), economics
(`packages/schema/src/economics.ts:107`), and the skip-vs-fail credential loop
(`apps/cli/src/lib/providers-run.ts`). `packages/harness` contains no provider-keyed logic at all.
That half of the design is right and this ADR does not touch it.

### Where it hurts

**1. The bake/release layer has no home for "what artifact does this provider boot?"**

That single fact is currently spread across six exhaustive provider-keyed structures plus four
hand-written literal bags, each encoding a different projection of it:

| Site | Projection of the same fact |
|---|---|
| `providers/src/config.ts:113-148` | the candidate/version *names* (12 consts, 2 of them aliases) |
| `cli/src/bin/bake.ts:32-66` | `bakers` — name → builder, at the **candidate** name |
| `cli/src/lib/bake/promote.ts:295-348` | the same list again, at the **version** name |
| `cli/src/lib/bake/validate.ts:39-58` | `baseImageUse` — `bakes` / `boots` / `none` |
| `cli/src/lib/bake/validate.ts:61-107` | `candidateCreateOptions` — which create key points at it |
| `cli/src/bin/release-plan.ts:61-89` | `providerArtifact` — the name, for the plan display |
| `cli/src/lib/bake/validate.ts:6-23` | `CandidateRefs` — one field per artifact |
| `bake.ts:180-191`, `:232-242`, `:288-296`, `promote.ts:250-260` | four literal bags of the same names |

`bake.ts` and `promote.ts` differ *only* in whether they pass the candidate or the version name.
`candidateCreateOptions` is `adapters[id].createOptions` with the name swapped. `baseImageUse` is a
three-way classification derivable from whether an artifact exists and whether it derives from the
base. None of this is independent information.

**2. GitHub Actions can't import TypeScript, so the provider vocabulary is re-spelled by hand.**

Three near-identical credential blocks exist — `bench-suite.yml:240-277` (15 keys),
`toolchain-image.yml:511-544` (bake cell), `toolchain-image.yml:720-751` (promote, a third dialect
using `contains(fromJSON(…))` instead of `matrix.provider ==`) — plus `bench-smoke.yml:55-70`'s
choice list and `bench-matrix.yml:64`'s default CSV. All are mechanical functions of
`requiredEnvVars`.

The repo already *verifies* two of these: `tooling/repo-checks/src/lib/workflow-sync.ts:105`
computes `requiredCredentialKeys()` — provider `requiredEnvVars` folded into a key → owners map —
and asserts each key is present. **The generator already exists inside the checker; it just
compares instead of emitting.** The other 20 CI/doc edit sites (`bench-matrix.yml`'s CSV, both
`toolchain-image.yml` blocks, `docs/ci-secrets.md:208-227`,
`scripts/setup-privileged-environment.sh:57-62`, `.env.example`) have no gate at all, and
`setup-privileged-environment.sh` is already stale — it omits `RUNLOOP_API_KEY` and all three
`VERCEL_*` entries.

**3. A layer of surfaces that fail *silently* rather than loudly.**

The compile errors and drift gates are the easy half — they tell you what to fix. These don't:

| Site | Silent failure for a new provider |
|---|---|
| `figures/src/model.ts:105-111` `figureProviderName` | prefix map (`daytona*`→"Daytona", …); a new multi-variant vendor prints its full registry name in charts |
| `figures/src/model.ts:114-137` `isolationFromRuntime` | substring map over VMM names; a novel VMM yields `undefined` and the chart chip goes **blank** |
| `results/src/lib/leaderboard.ts:646-653` `isolationClass` | order-sensitive `gvisor`→`vm`→`container` sniffing of the declared isolation string |
| `harness/src/index.ts:404-405` | capacity errors are classified by regex (`/quota\|rate.?limit\|too many\|capacity\|429/i`); a provider whose wording matches none of it **hard-fails instead of retrying** — the comment at `:402` records exactly this happening to runcloud |
| `AGENTS.md:46` | hand-listed "E2B/Daytona/Modal/Blaxel/Novita" — already stale by five providers |
| `.env.example` | has no Namespace stanza at all |

The first three are the same mistake as the bake layer above: a fact the provider *knows about itself* (its vendor,
its isolation vocabulary) is being re-derived by string-sniffing at the consumer.

**4. Five independent hardcoded id-list oracles.**

`providers.test.ts:24-39`, `providers-run.test.ts:33-48`, `release-plan.test.ts:66-79`,
`validate.test.ts:104-123`, `templates/src/index.test.ts:25`. The "deliberately hardcoded
independent oracle" property is worth keeping — it stops a registry typo from self-approving — but
it is worth keeping *once*, not five times in two different sort orders (some alphabetical, some
`REGISTRY` declaration order).

CONTRIBUTING's own "Add a provider" checklist has a step named **"Exhaustive consumers"**
(`CONTRIBUTING.md:60`). That step is the bug.

## Decision

Six moves, in dependency order. Each is independently shippable, and each removes edit sites the
next one would otherwise have to generate — which is why the scaffold comes last, not first.

### 1. Give the boot artifact a declarative home

Add one field to `ProviderMeta`. Data only — no builder functions, so it stays in `schema` without
inverting the dependency DAG (ADR-0002):

```ts
export type ProviderArtifact =
  /** Boots a vendor image we don't control (blaxel). */
  | { kind: "none" }
  /** Boots the shared toolchain image by ref; nothing to bake (modal, namespace, runcloud,
   *  microsandbox). `optionKey` is how create() is told which image. */
  | { kind: "image"; optionKey: "templateId" | "image" }
  /** Bakes its own named artifact FROM the base (e2b, daytona-*, novita, runloop). */
  | { kind: "baked"; optionKey: "snapshotId" | "blueprint_name" | "templateId";
      /** Appended to the shared `<TOOLCHAIN_IMAGE_NAME>-<TOOLCHAIN_VERSION>` stem. */
      nameSuffix?: string }
  /** Mirrors the base into a vendor registry (vercel). */
  | { kind: "mirror"; optionKey: "templateId"; repository: string };
```

Everything in the table above becomes a derivation:

- **Artifact names** — one formula in `config.ts` (`stem`, `+ nameSuffix`, `+ "-candidate"`)
  replaces 12 consts. The e2b/novita/runloop aliasing (and the comment explaining why they must not
  drift) disappears: they share a name because they declare no suffix.
- **`baseImageUse`** — `kind === "baked" ? "bakes" : kind === "image" ? "boots" : "none"`. Delete
  the switch *and* `validate.test.ts`'s three partition oracles, which then assert a tautology.
- **`candidateCreateOptions`** — `{ [artifact.optionKey]: candidateName(id) }`. Delete
  `CandidateRefs` and its four construction sites; callers pass a scope, not a bag.
- **`providerArtifact`** — the name, or the standard note keyed off `kind`.
- **`bakers` + promote's switch** — collapse to one `Record<ProviderId, BakeFn>` in `apps/cli`
  holding entries only for `kind === "baked"`, called with the candidate or version name. The bake
  modules already share the signature `(name, baseImage, log) => Promise<void>`, so this needs no
  change to `e2b.ts` / `daytona.ts` / `novita.ts` / `runloop.ts`.
- **`adapters[id].createOptions`** — the `snapshotId`/`templateId`/`image` line stops being
  hand-spelled; the adapter keeps only what is genuinely per-provider (sizing, timeouts, keep-alive).

Six structures and four literal bags → one field and one builder map.

### 2. Declare what the consumers are currently sniffing

Three small fields kill the string-matching in the table above:

```ts
/** Short chart label. Variants of one vendor share it — replaces figureProviderName's prefix map. */
vendor: string;                        // "Daytona", "Modal", "E2B", …
/** Chip vocabulary, declared rather than substring-matched out of isolation.technology. */
isolation: { technology: string; class: "microVM" | "container" | "userspace"; ... };
/** Extra error substrings that mean "capacity, retry me" for this vendor's control plane. */
retryableCreatePatterns?: string[];
```

`figureProviderName` and `isolationFromDeclaration` become field reads. `isolationFromRuntime`
stays — it maps *observed* runtime strings from the guest probe, which is genuinely not something
the registry can declare. The capacity-error field is the declarative half of the escape hatch
`markRetryableCreate` already provides in `packages/providers/src/lib/retryable-create.ts`; a
provider that needs richer logic keeps using the function.

### 3. Widen `requiredEnvVars` into a credential descriptor

`string[]` can't express what the CI blocks need. Widen it (keeping the bare-string shorthand, so
most entries don't change):

```ts
type ProviderCredential =
  | string                                    // scoped secret, this provider only
  | { name: string; source?: "secret" | "literal" | "step-output";
      /** Variants that share one account credential (daytona-*, modal-*). */
      sharedWith?: ProviderId[];
      /** Workflow-side fallback, e.g. DAYTONA_TARGET → "us-west-2". */
      default?: string;
      value?: string };                       // for MICROSANDBOX_LOCAL_BENCH: '1'
```

Plus two optional per-provider CI facts that are currently ternaries in YAML:

```ts
runner?: string;        // microsandbox-local → "starsling-ubuntu-24.04-2"
preAuth?: string;       // "namespace-token" | "vercel-auth"
```

### 4. Generate the managed regions, gate them the way ADR-0003 gates the catalog

Not whole-workflow codegen — the workflows carry substantial hand-tuned logic and rationale that
should stay hand-written. Instead, marker-delimited **managed regions**, exactly the
`generate-catalog` → `check-catalog-drift` pattern already accepted in ADR-0003:

```yaml
# >>> generated: provider-credentials — bun run generate-provider-wiring
          E2B_API_KEY: ${{ matrix.provider == 'e2b' && secrets.E2B_API_KEY || '' }}
          ...
# <<< end generated
```

Regions to manage, all derived from §3's descriptors:

| File | Region |
|---|---|
| `bench-suite.yml:240-277` | benchmark-cell credential env |
| `toolchain-image.yml:511-544` | bake-cell credential env |
| `toolchain-image.yml:720-751` | promote credential env (its own `contains(fromJSON(…))` dialect) |
| `bench-smoke.yml:55-70` | `provider` choice options |
| `docs/ci-secrets.md:208-227` | Environment secret table |
| `scripts/setup-privileged-environment.sh:57-62` | operator checklist (already stale) |
| `.env.example` | per-provider stanzas |

`bun run check:provider-wiring` re-runs the generator and `git diff --exit-code`s — byte-identical
to `check-catalog-drift.ts:14-30`. `bench-matrix.yml:64`'s default CSV stays hand-edited: a
provider joining the *published* matrix is a deliberate promotion decision, not a mechanical
consequence of registering it, and the 18-line rationale comment above it is real content.

`workflow-sync.ts`'s invariants 1 and 3 become redundant and get deleted — a generated region can't
drift from its generator. Invariants 2, 3b, 4–7 (suite vocabulary, lane delegation, timeout/budget
equality, nesting) are unrelated to provider onboarding and stay. Pre-auth steps (§3's `preAuth`)
also stay hand-written — Vercel's VCR mirror is ~50 lines of genuinely bespoke logic — but gain a
cheap gate: a provider declaring `preAuth` must have the step present in both lanes.

### 5. One id oracle

Keep the hardcoded list in `providers.test.ts:24-39` — that is the independent oracle and it earns
its place. Convert the other four: `validate.test.ts`'s partitions become tautological after §1 and
are deleted; `providers-run.test.ts`, `release-plan.test.ts` and `templates/index.test.ts` assert
*properties* over `PROVIDERS` (every provider resolves, every baked provider has a builder) rather
than re-listing membership.

### 6. Then, and only then, scaffold

`bun run new-provider <id>` appends a `REGISTRY` entry from a prompt, stubs
`packages/providers/src/lib/<id>.ts` (and `apps/cli/src/lib/bake/<id>.ts` when
`artifact.kind === "baked"`), runs the generators, and prints what remains.

Scaffolding is deliberately last. Generating 22 edit sites is not an improvement over typing them —
it just makes the duplication cheaper to create and no cheaper to maintain. The scaffold is only
worth writing once §1–§4 have reduced its output to three files.

## Consequences

**Adding a provider becomes:** one `REGISTRY` entry (identity, pricing, transport, artifact,
credentials) → one adapter file → optionally one bake file → `bun run generate-provider-wiring` →
review the generated diff. Three hand-edited files plus a generated diff, against 25–34 today. The
`bench-matrix.yml` default CSV remains a separate, deliberate promotion step, as it should be.

**We accept:**

- **A wider `ProviderMeta`.** Identity, economics, artifact and CI wiring all live in one record.
  That is a real cost — the schema now knows the string `"starsling-ubuntu-24.04-2"` — but the
  alternative is what exists today: the same facts scattered across nine files with no gate. The
  entry stays declarative data; no builder or workflow logic moves into `schema`.
- **Generated YAML regions.** Reviewers must read a generated diff rather than authored lines, and
  a bad generator ships bad wiring everywhere at once. ADR-0003 already accepted this trade for the
  PTS catalog, and the drift gate is the same mechanism.
- **A migration that touches every provider.** §1–§3 rewrite 14 registry entries and delete
  six switches. This is a large mechanical diff with strong compile-time backstops
  (`Record<ProviderId, …>`, exhaustive switches, `assertProviderJoin`), and it should land as its
  own change with no new provider riding along.
- **`workflow-hardening.test.ts`'s provider-specific asserts stay hand-maintained.** The Vercel
  `toHaveLength(3)` count and the scoped `RUNLOOP_API_KEY`/`RUN_CLOUD_API_KEY` expression pins are
  security invariants about *specific* providers, not derivable facts. They are correctly special.

**We do not change:** the adapter contract (`ProviderAdapter`), the harness, the results and
figures layers, or the runtime registry join — all already provider-agnostic or registry-driven.
