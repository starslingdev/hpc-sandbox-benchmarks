---
status: proposed
---

# Declarative provider onboarding

## Context

Adding one benchmarked provider currently touches 25–34 files. Measured over the last four
additions:

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
bake module — is 2–4 files. Everything else re-spells the same fact in a new dialect.

### What already works

The **runtime** path is fully registry-driven. `PROVIDERS` already feeds matrix fan-out
(`apps/cli/src/lib/matrix.ts:57`), normalization (`results/src/lib/normalize-tree.ts:52`), figures
(`results/src/lib/figures.ts:96`), economics (`schema/src/economics.ts:107`), and the skip-vs-fail
credential loop (`apps/cli/src/lib/providers-run.ts`). `packages/harness` has no provider-keyed
logic at all. This ADR does not touch that half.

### Where it hurts

**1. The bake/release layer has no home for "what artifact does this provider boot?"** That one
fact is spread across six exhaustive provider-keyed structures plus four hand-written ref bags:

| Site | Projection of the same fact |
|---|---|
| `providers/src/config.ts:113-148` | candidate/version *names* (12 consts, 2 aliases) |
| `cli/src/bin/bake.ts:32-66` | `bakers` — builder at the **candidate** name |
| `cli/src/lib/bake/promote.ts:295-348` | the same list at the **version** name |
| `cli/src/lib/bake/validate.ts:39-58` | `baseImageUse` — `bakes`/`boots`/`none` |
| `cli/src/lib/bake/validate.ts:61-107` | `candidateCreateOptions` — which create key points at it |
| `cli/src/bin/release-plan.ts:61-89` | `providerArtifact` — the name, for plan display |
| `cli/src/lib/bake/validate.ts:6-23` | `CandidateRefs` — one field per artifact |
| `bake.ts:180-191`, `:232-242`, `:288-296`, `promote.ts:250-260` | four literal bags of the same names |

`bake.ts` and `promote.ts` differ *only* in candidate-vs-version name. `candidateCreateOptions` is
`adapters[id].createOptions` with the name swapped. None of this is independent information. Worse,
**seven of the thirteen `bakers` entries are no-ops** that exist only to satisfy
`Record<ProviderId, …>` — the type is forcing us to write code for providers that bake nothing.

**2. Provider identity is stringly-typed at every process boundary.** Ids leave TypeScript as CSV in
`$GITHUB_OUTPUT`, pass through `fromJSON()` in YAML, and return as `--provider e2b,daytona-vm`
argv. Each crossing re-validates ad hoc, and `plan-axis.ts:24` erases the type outright
(`select: (raw: string | undefined) => string[]`), then round-trips through
`JSON.stringify`/`JSON.parse` *within a single process* (`plan-axis.ts:29,53`) to hand downstream
code back a bare `string[]`.

**3. GitHub Actions can't import TypeScript, so the vocabulary is re-spelled by hand.** Three
near-identical credential blocks — `bench-suite.yml:240-277`, `toolchain-image.yml:511-544`, and
`toolchain-image.yml:720-751` (a third dialect using `contains(fromJSON(…))`) — plus
`bench-smoke.yml`'s choice list and `bench-matrix.yml:64`'s CSV. All are mechanical functions of
`requiredEnvVars`. `workflow-sync.ts:105` already computes `requiredCredentialKeys()` — **the
generator exists inside the checker; it just compares instead of emitting.** The other ~20 CI/doc
sites have no gate, and `setup-privileged-environment.sh:57-62` is already stale (omits
`RUNLOOP_API_KEY` and all three `VERCEL_*`).

**4. The env gatekeeper hand-syncs a schema against a key array.** `providers/src/config.ts:23-44`
declares `envSchema`; `:46-62` repeats every key in `ENV_KEYS`; `:73-76` loops over the array to
build the input. A key added to one and not the other is **silently dropped** — no compile error, no
test. This is a latent bug, not a style issue.

**5. Surfaces that fail silently rather than loudly.**

| Site | Silent failure for a new provider |
|---|---|
| `figures/src/model.ts:105-111` `figureProviderName` | prefix map; a new multi-variant vendor prints its full registry name in charts |
| `figures/src/model.ts:114-137` `isolationFromRuntime` | substring map; a novel VMM yields `undefined` and the chart chip goes **blank** |
| `results/src/lib/leaderboard.ts:646-653` `isolationClass` | order-sensitive `gvisor`→`vm`→`container` sniffing |
| `harness/src/index.ts:404-405` | capacity errors classified by regex; a provider whose wording differs **hard-fails instead of retrying** — `:402` records this happening to runcloud |

**6. Five hardcoded id-list oracles** (`providers.test.ts:24-39`, `providers-run.test.ts:33-48`,
`release-plan.test.ts:66-79`, `validate.test.ts:104-123`, `templates/src/index.test.ts:25`) in two
different sort orders. CONTRIBUTING's own checklist has a step named **"Exhaustive consumers"**
(`CONTRIBUTING.md:60`). That step is the bug.

## Decision

### Where parsing lives: three tiers

ADR-0001 established parse-don't-validate at every external boundary. The question this ADR has to
answer is *which* of the provider seams are boundaries, because the answer is measured, not
aesthetic — and the answer moves, so it has to be re-measured rather than assumed.

Marginal cost of each module, measured sequentially in one process (bun 1.3.11, arktype 2.2.0), on
`main` at `0ede640`:

| Module | Marginal cost |
|---|---|
| `arktype` (library import, cold) | 240 ms |
| `schema/src/run.ts` (the Run schema graph) | +317 ms |
| `schema/src/providers.ts` (its own schemas) | +63 ms |
| `schema/src/index.ts` (barrel, on top of the above) | +50 ms |
| `schema/src/toolchain.ts` | 1.8 ms |

**This measurement supersedes an earlier draft of this ADR.** That draft measured
`schema/providers` at 6.6 ms and argued arktype must be kept out of it. Both halves are now stale:
`providers.ts` gained `import { type } from "arktype"` and, more expensively, a *value* import of
`targetSpecSchema` from `run.ts` — which drags the entire Run schema graph into the provider
identity leaf. Importing `schema/providers` now costs ~620 ms against the barrel's ~662 ms, so
`config.ts:5-7`'s deliberate leaf import saves roughly **40 ms, not the ~457 ms its comment
claims**. The optimization is all but gone, and nothing detected that.

That changes the reasoning but not the conclusion, and it adds a finding worth acting on
independently of this ADR: **restore a genuinely cheap identity leaf.** `identifiers.ts` (added with
tama) is already that seed — `ProviderId` and its schema, nothing else — but it is not listed in
`packages/schema/package.json` `exports`, so nothing can import it. Exporting it, and moving
`TARGET_SPEC` off the `run.ts` value import, returns provider identity to single-digit
milliseconds. The registry's own validation should then stay out of that leaf on purpose:

- **Tier 1 — committed source (the registry literal): plain TypeScript.** It is not a trust
  boundary; it is type-checked source. `as const satisfies` plus discriminated unions give full
  inference at zero runtime cost.
- **Tier 2 — process boundaries (env, argv, `$GITHUB_OUTPUT`, JSON artifacts): arktype morphs.**
  These are genuinely untrusted, crossed repeatedly, and currently guarded ad hoc. One parser per
  boundary, narrowed literal types out the other side.
- **Tier 3 — generator and gates (build time): arktype for invariants types can't express.** The
  240 ms arktype import is free in a generator that runs on demand, so the descriptor schema and its `.narrow()`
  rules live here, not in the hot import path.

Everything below is verified against arktype 2.2.0, including the type-level assertions.

### 1. Model the artifact as a discriminated union, and derive the partitions (Tier 1)

```ts
export type ProviderArtifact =
  | { kind: "none" }                                                    // blaxel: vendor stock image
  | { kind: "image";  optionKey: "templateId" | "image" }               // modal, namespace, runcloud, microsandbox
  | { kind: "baked";  optionKey: "snapshotId" | "blueprint_name" | "templateId";
      nameSuffix?: string }                                             // e2b, daytona-*, novita, runloop
  | { kind: "mirror"; optionKey: "templateId"; repository: string };    // vercel
```

With `REGISTRY` declared `as const satisfies Record<ProviderId, ProviderMeta>`, the *type system*
partitions the providers:

```ts
type IdsWithArtifact<K extends ProviderArtifact["kind"]> = {
  [P in ProviderId]: (typeof REGISTRY)[P]["artifact"]["kind"] extends K ? P : never;
}[ProviderId];

export type BakedProviderId = IdsWithArtifact<"baked">;
```

`bakers` then becomes `Record<BakedProviderId, BakeFn>`, which is the payoff:

- the **seven no-op bakers become unconstructable** — giving `blaxel` a baker is a compile error;
- **omitting a real one is a compile error**, so the map stays exhaustive over exactly the right set;
- `baseImageUse`, `candidateCreateOptions`, `providerArtifact` and `CandidateRefs` all collapse into
  reads off `artifact`, narrowed by `kind` with no casts;
- `bake` and `promote` call **one** map, differing only in the name they pass.

All three negative cases above were verified to fail `tsc --strict` as intended. This is the
"behavior follows from the narrowed type" property, and it costs nothing at runtime — arktype here
would buy strictly less than the compiler already gives.

### 2. One provider-identity parser for every boundary crossing (Tier 2)

This is where arktype earns the most, because it replaces five ad-hoc validators with one:

```ts
export const providerId = type.enumerated(...PROVIDER_IDS);

/** CSV → typed ids. The only thing `--provider`, BENCH_PROVIDERS and plan-axis should use. */
export const providerSelection = type("string")
  .pipe((raw) => raw.split(",").map((s) => s.trim()).filter(Boolean))
  .to(providerId.array().atLeastLength(1));
```

Verified: the result infers as the literal union (a `readonly ("e2b")[]` annotation is correctly
rejected), and a typo produces
`value at [1] must be "daytona-vm", "e2b", … (was "typo-provider")` — strictly better than today's
hand-rolled message. `selectProviders`/`selectRegistryIds` and `plan-axis.ts`'s `string[]` erasure
and internal `JSON.stringify`/`JSON.parse` round-trip all go away; `AxisPlanConfig.select` becomes
typed rather than `=> string[]`.

### 3. Parse the cross-process JSON artifacts (Tier 2)

The release plan, the bake report and the GHA matrix are written by one process and consumed by
another through a workflow output. Use the built-in keyword rather than a bare morph:

```ts
export const releaseMatrix = type("string.json.parse").to({
  include: type({ provider: providerId, required: "boolean" }).array(),
});
```

`type("string.json.parse")` reports `must be a JSON string (SyntaxError: …)`, where
`.pipe.try(JSON.parse)` degrades to `must be valid according to an anonymous predicate` — useless in
a CI log. A bad id reports `include[0].provider must be …`, with the path.

### 4. Fix the env gatekeeper with a single morph (Tier 2)

`envSchema.props.map((p) => p.key)` recovers the declared keys, so the parallel `ENV_KEYS` array and
the imperative filter loop both disappear, and issue 4's silent-drop bug becomes unrepresentable:

```ts
const declared = envSchema.props.map((p) => p.key as string);

/** process.env → validated config input. Empty ⇒ unset stays the rule (config.ts:64-71), but it is
 *  now part of the declared parse rather than a loop that can drift from the schema. */
export const benchEnv = type("Record<string, string | undefined>")
  .pipe((raw) => Object.fromEntries(
    declared.flatMap((k) => (raw[k] ? [[k, raw[k]]] : [])),
  ))
  .to(envSchema);
```

### 5. Declare what consumers currently sniff (Tier 1)

```ts
vendor: string;                                                   // "Daytona" — kills figureProviderName's prefix map
isolation: { technology: string; class: "microVM" | "container" | "userspace" };
retryableCreatePatterns?: string[];                               // the declarative half of markRetryableCreate
```

`isolationClass` and `isolationFromDeclaration` become field reads. `isolationFromRuntime` **stays a
matcher** — it maps *observed* strings from the guest probe, which the registry cannot know in
advance. That is the line between domain modeling and genuine parsing.

### 6. Credential descriptors with a normalizing morph (Tiers 2 + 3)

`requiredEnvVars: string[]` can't express what the CI blocks need. Widen it, keep the string
shorthand, and normalize once so no consumer handles two shapes:

```ts
const credentialInput = type("string >= 1").or({
  name: "string >= 1",
  "source?": "'secret' | 'literal' | 'step-output'",
  "sharedWith?": "(string >= 1)[]",     // daytona-*/modal-* share one account credential
  "default?": "string >= 1",            // DAYTONA_TARGET → "us-west-2"
});

export const credential = credentialInput.pipe((c) =>
  typeof c === "string"
    ? { name: c, source: "secret" as const, sharedWith: [] }
    : { ...c, source: c.source ?? ("secret" as const), sharedWith: c.sharedWith ?? [] },
);
```

Verified: mixed shorthand/full input normalizes to one shape, and `""` is rejected at
`value at [0] must be non-empty`. The YAML emitter then consumes a uniform record and re-checks
nothing. ADR-0007 §3 adds two more derived consumers of the same declarations — each driver's
compile-time env slice (`EnvOf`) and its runtime env parser (`envSchemaFor`) — so the credential
descriptor becomes the single declaration behind CI wiring, type checking, and runtime validation. Two further Tier-1 fields cover the remaining per-provider CI facts that are ternaries in
YAML today: `runner?: string` and `preAuth?: "namespace-token" | "vercel-auth"`.

### 7. Generate the managed regions, gate them the way ADR-0003 gates the catalog (Tier 3)

Not whole-workflow codegen — the workflows carry hand-tuned logic worth keeping. Marker-delimited
**managed regions**, exactly the `generate-catalog` → `check-catalog-drift` pattern:

```yaml
# >>> generated: provider-credentials — bun run generate-provider-wiring
          E2B_API_KEY: ${{ matrix.provider == 'e2b' && secrets.E2B_API_KEY || '' }}
# <<< end generated
```

Regions: the three credential blocks, `bench-smoke.yml`'s choice options,
`docs/ci-secrets.md:208-227`, `scripts/setup-privileged-environment.sh:57-62`, and `.env.example`.
`bun run check:provider-wiring` re-runs the generator and `git diff --exit-code`s — byte-identical to
`check-catalog-drift.ts:14-30`.

The generator is also where the descriptor's **arktype schema** lives: the invariants currently
asserted only in `providers.test.ts` (`requiredEnvVars` non-empty; `syncCapMs` finite ⇒
`detachedPoll: true`; variants of one vendor share a pricing object) become `.narrow()` rules on a
schema the generator runs, so they are enforced against the descriptor *before* it is allowed to emit
CI wiring that grants secrets. Paying arktype's import in a build-time generator is free; paying it
in the provider identity leaf every CLI bin and harness process imports is not.

`bench-matrix.yml:64`'s default CSV stays hand-edited: joining the published matrix is a deliberate
promotion decision, not a mechanical consequence of registering, and the 18-line rationale above it
is real content. `workflow-sync.ts` invariants 1 and 3 are deleted as redundant — a generated region
cannot drift from its generator. Invariants 2, 3b, 4–7 are unrelated to onboarding and stay.
Pre-auth steps stay hand-written (Vercel's VCR mirror is ~50 bespoke lines) but gain a cheap gate: a
provider declaring `preAuth` must have the step in both lanes.

### 8. Close the loop: the generator emits `as const satisfies`

Generated TypeScript is re-checked by `tsc`, so arktype validates the generator's *input* and the
compiler validates its *output*. Neither is trusted blindly, and a generator bug that emits a
malformed registry fails typecheck rather than shipping.

### 9. Then, and only then, scaffold

`bun run new-provider <id>` takes a small descriptor file, parses it with the Tier-3 schema, appends
the `REGISTRY` entry, stubs `packages/providers/src/lib/<id>.ts` (and `apps/cli/src/lib/bake/<id>.ts`
only when `artifact.kind === "baked"`), and runs the generators.

Scaffolding is deliberately last. Generating 22 edit sites is not an improvement over typing them —
it makes duplication cheaper to create and no cheaper to maintain. It is worth writing once §1–§7
have cut its output to three files.

### Oracles

Keep the hardcoded list in `providers.test.ts:24-39` — that is the independent oracle and it earns
its place. The rest dissolve: `validate.test.ts`'s three partition oracles become tautologies once
§1 derives the partitions at the type level, and the remaining three assert properties over
`PROVIDERS` instead of re-listing membership.

## Consequences

**Adding a provider becomes:** one `REGISTRY` entry → one adapter file → optionally one bake file →
`bun run generate-provider-wiring` → review the generated diff. Three hand-edited files against
25–34 today, with the `bench-matrix.yml` promotion still a separate, deliberate step.

**We accept:**

- **A wider `ProviderMeta`.** Identity, economics, artifact and CI wiring in one record — the schema
  would know the string `"starsling-ubuntu-24.04-2"`. The alternative is today's status quo: the
  same facts across nine files with no gate. It stays declarative data; no builder or workflow logic
  moves into `schema`.
- **Two representations of the descriptor contract** — a TypeScript type (Tier 1, for inference) and
  an arktype schema (Tier 3, for the generator's narrows). They can drift. The mitigation is that
  the generator asserts the committed registry against the schema, so drift fails the gate rather
  than shipping. Collapsing them by inferring the type *from* the schema is the obvious
  simplification and is explicitly rejected here: it would pin the registry's validation cost into
  the identity leaf, which this ADR wants to get *back* to single-digit milliseconds.
- **Generated YAML regions.** Reviewers read a generated diff, and a bad generator ships bad wiring
  everywhere at once. ADR-0003 already accepted this trade; the drift gate is the same mechanism.
- **A migration touching every provider.** §1, §5 and §6 rewrite 14 registry entries and delete six
  switches. Large but mechanically backstopped (`Record<ProviderId, …>`, exhaustive switches,
  `assertProviderJoin`); it should land alone, with no new provider riding along.
- **`workflow-hardening.test.ts`'s provider-specific asserts stay hand-maintained.** The Vercel
  `toHaveLength(3)` count and the scoped `RUNLOOP_API_KEY`/`RUN_CLOUD_API_KEY` expression pins are
  security invariants about *specific* providers, not derivable facts. They are correctly special.

**We explicitly do not:** validate the registry at import time in `schema/providers` (it would add
cost to the identity leaf for guarantees `tsc` already provides on committed source); parse the
registry at runtime in the harness or CLI; or replace `isolationFromRuntime`'s matcher, which
handles genuinely open input. The adapter
contract, harness, results and figures layers are unchanged.
