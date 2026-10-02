# Provider onboarding prototypes

> The final proposal, which keeps one package per provider, is in [PROPOSAL.md](./PROPOSAL.md).
> This README is the evidence behind it.

Working prototypes and an evaluation of ways to make adding a sandbox provider a small,
mostly-declarative change. The goal is to scale to about 100 providers: some API-only, some
CLI-only, some with TypeScript SDKs.

Everything here runs against the real driver kit. Three existing providers were rebuilt on the
prototype kits, and **their original, unmodified test suites pass** (38/38). On top of that, 13 new
tests cover the declarative path, the manifest validation and the wiring derivations.

```sh
bunx tsc -p prototypes/provider-onboarding          # typecheck
bun test prototypes/provider-onboarding/src         # 51 tests
bun prototypes/provider-onboarding/scripts/measure.ts
bun prototypes/provider-onboarding/scripts/new-provider.ts --id demo --kind http --inputs DEMO_TOKEN --out /tmp/x
```

This directory is not a workspace member, so the existing CI gates ignore it. Nothing outside
`prototypes/` changed.

---

## 1. Where the cost is today

The most recent addition was Brezel ([#539](https://github.com/starslingdev/hpc-sandbox-benchmarks/pull/539)), and it touched 32 files:

| Bucket | Files | Notes |
|---|---:|---|
| Novel work: the driver package (5 files), metadata, version entry in the catalog, `bun.lock` | 8 | `index.ts` alone is 300 logical lines |
| Generated: `.env.example`, 3 workflows, `ci-secrets.md`, setup script, `provenance.ts`, drivers loader and package | 9 | Free (`bun run generate-provider-wiring`), but noisy in review |
| Hand-written wiring: `provider-ids.ts`, provenance table, `MIGRATED_DRIVER_IDS`, `candidateLaunch` switch, `RELEASE_UNSCOPABLE_PROVIDERS` | 5 | Already generated: `provider-meta/index.ts`, by `generate-provider-registry` |
| Hard-coded id lists in tests | 7 | `drivers/index.test.ts`, `driver-run.test.ts`, `providers.test.ts`, `provider-meta.test.ts`, `release-plan.test.ts`, `bench-suite.test.ts`, `generate-provider-wiring.test.ts` |
| Unrelated | 2 | |

The bigger cost is inside the driver. All 13 ComputeSDK drivers hand-write the same skeleton over
`computeSdkSpec`, because they all need the same capabilities:

- `lifecycle`, `createRecovery`, `prepareAndVerifyCreatedRequest`, `probes.observe`, `inventory` and `destroyById` appear in all 13.
- The `df -Pk` disk proof is copied about 10 times.
- `absenceConfirmationMs` is 2000 in 12 of them and `maxAttempts` is 4 in 12.
- The coverage block's fixed axes are identical everywhere.
- Every `map` starts with the same artifact guard.

A typical driver is 240–685 logical lines, and about two thirds of that is this skeleton.

## 2. The architecture the prototypes converge on

The design is layered: **data first, verbs second, code only for real quirks**. Each layer lowers
onto the one below it, and the bottom layers are the existing kits. That means no new safety logic:
coverage, id parsing, cleanup double faults, redaction, output caps and deadlines all stay exactly
where they are.

```
 provider-meta/<id>.ts  ── inert data (Tier 1): metadata + optional `driver` manifest
        │   validated at generate time by an arktype scope + cross-field checks (Tier 3)
        ▼
 ┌─────────────────────┬──────────────────────────┬─────────────────────────────┐
 │ CLI manifest        │ HTTP manifest            │ SDK provider (TypeScript)    │
 │ kit/cli.ts          │ kit/http.ts (+ data hook)│ writes SandboxOps directly   │
 └─────────┬───────────┴────────────┬─────────────┴──────────────┬──────────────┘
           ▼                        ▼                            ▼
  existing defineCliSpec    kit/ops.ts: SandboxOps verbs → derived readiness, convergent delete,
  (driver/cli.ts)           destroyById, observe/describe/list, inventory, recovery, disk proof
                                    │
                                    ▼
                    existing computeSdkSpec / defineComputeSdkDriver / driverFromTable
```

## 3. Approaches prototyped

### A. Derive the remaining hand-written wiring from metadata (`src/wiring/derive.ts`)

| Hand-written today | Proposed metadata field | Proof |
|---|---|---|
| `renderDriversProvenance` table (15 entries) | none by default (uses `sdkPackage`, plus `" CLI"` → setup action) | `derive.test.ts`: same constants and packages for every file |
| `candidateLaunch` switch (14 cases) | `artifact.boot: { key, suffix?, target? }` | Same `createOptions` and artifact for all 16 ids |
| `RELEASE_UNSCOPABLE_PROVIDERS` | none (derived from `artifact.kind === "none"`) | Same key set |

Finding: the provenance table is hand-written partly because **two metadata files are stale**.
Runloop and Namespace still declare `sdkPackage: "@computesdk/*"`, but their drivers pin the native
SDKs. With the derivation, that drift shows up as an explicit override (`PROVENANCE_OVERRIDES`)
instead of hiding in a generator table.

### B. Replace the id-list tests with invariants plus one snapshot (`src/wiring/registry-snapshot.test.ts`)

The literal lists exist so that a human looks at every new provider row. One reviewed snapshot of
the registry projection (artifact kind, required inputs, isolation, runtime identity, quota domain)
keeps that property. Adding a provider becomes `bun test -u` plus a diff in one file, instead of
edits in seven files written in two different sort orders.

### C. SandboxOps: the SDK path (`src/kit/ops.ts`, `src/providers/novita`)

A provider supplies vendor verbs, and the kit derives everything else:

```ts
interface SandboxOps<Row, Native> {
  sandboxId; coverage;                         // coverage: pinnedShape(4, 8) or coverage({...})
  create({ request, marker }); get(id); remove(id); list();
  idOf(row); phase(row): "pending" | "ready" | "failed" | "deleting" | "gone";
  ownership: { kind: "marker", key, of(row), find? } | { kind: "dedicated", key, find };
  connect(row); exec(native, cmd); files?; launch?;   // launch present → native-launch
  errors: { notFound; definitive?; retryable? };       // statusIn(...) / instanceOfAny(...)
  readiness?: "poll" | "on-create"; removeConfirms?; verify?(row); timing?; recovery?;
}
```

Novita went from 243 to 119 logical lines, and its 6 original tests pass. To fit 3 real providers,
the core needed 4 knobs: `readiness`, `removeConfirms`, `ownership.find` and `verify`. Each one is a
real semantic difference between vendors, not a style preference.

### D. HTTP kit: the API-only path (`src/kit/http.ts`, `src/providers/brezel`)

The REST control plane (POST/GET/DELETE/LIST of one sandbox record) is pure data:

- paths with `{id}`;
- bodies and headers with `{{env.X}}` / `{{request.spec.vcpus}}` / `{{marker}}` templates;
- an arktype row definition, which is just a JSON object, so arktype's string DSL keeps the schema serializable;
- an ordered **phase table**;
- HTTP status classification;
- an ownership strategy (`shared` + marker field, or `dedicated` + idempotent **replay** recovery).

The kit handles fetch, signal composition, timeouts, status errors and arktype parsing of every
response.

The data plane is either declarative (`json-exec`) or a **hook**. Brezel streams command output as
base64 NDJSON, so its hook wraps the SDK for exec and files only. The result is 50 lines of manifest
data plus 51 lines of code, down from 300, with **all 21 original tests passing unmodified**,
including the deadline, ambiguous-create replay, failed-state ownership and cancellation regressions.

### E. Data-only providers: no package, no TypeScript (`src/kit/manifest.ts`, `src/providers/{tama,acme}`)

When a manifest has no hook, the whole provider is one inert object next to its metadata:

- **CLI:** the Tama manifest is 63 lines of data and replaces a 97-line TypeScript module plus its package. It compiles into the existing `defineCliSpec`, and all 11 original tests pass. The file `tama/index.ts` exists only to re-export names the old tests import.
- **HTTP:** `acme` is a fixture vendor with metadata and driver in 54 lines. Its tests drive create, readiness polling, disk proof, exec, inventory (owned vs. foreign), convergent delete, ambiguous-create recovery by marker, and artifact refusal against a fake API.

Manifests follow the ADR-0006 tiers:

| Tier | Where | Prototype |
|---|---|---|
| 1 (import) | metadata file | Inert `as const satisfies CliManifest` literals, no arktype at import |
| 3 (generate) | generator / drift gate | `manifest-schema.ts`: arktype `scope()` for structure, plus `manifestFailures()` for cross-field rules (every `{{env.X}}` names a declared input, every field read is declared in the row schema, patterns compile, the recovery strategy fits the marker transport). It reports all failures in one pass. |
| 2 (runtime) | kit | Every vendor response parsed by the manifest's own arktype row schema |

`driverManifestSchema.toJsonSchema()` works, so a YAML or JSON authoring format could get editor
validation for free. I'd still keep TypeScript literals: they type-check, get autocomplete, and
need no new parser.

### F. Scaffolder (`scripts/new-provider.ts`)

It writes a dry-run tree and prints the in-place edits it would make (append to `PROVIDER_IDS`;
for SDK providers, the catalog entry).

| Kind | Files | Lines |
|---|---:|---:|
| `--kind http` | 1 | 29 |
| `--kind cli` | 1 | 36 |
| `--kind sdk` | 5 | 76 |

The templates are thin on purpose: if the scaffold had to emit 300 lines, that would mean a kit is
missing an abstraction. The SDK template's test calls `kitConformance(...)`, a shared in-memory
vendor suite that **is not built yet** (see §6).

## 4. Considered and not pursued

| Option | Why not |
|---|---|
| Discover provider ids from the filesystem | ADR-0006 explicitly keeps `PROVIDER_IDS` as the one hand-written identity list. Its cost is 1 line per provider, and order matters to workflows. Keep it. |
| Move metadata into each provider package | Creates a `schema` ↔ provider cycle (ADR-0002 boundary test), and data-only providers would then need a package anyway. Putting the manifest in the metadata file gets the same locality. |
| YAML/JSON manifest files | No type checking or autocomplete, and needs a loader. The JSON Schema export keeps the option open. |
| Generate drivers from OpenAPI | Vendor specs describe endpoints, not lifecycle semantics (phases, ownership markers, idempotency, removal evidence). Better used to pre-fill a scaffold. |
| Abstract base class with template methods | Breaks literal type inference for rows/options, hides the lowering, and makes overriding one behavior an inheritance puzzle. Plain objects compose better. |
| Back to `@computesdk/*` wrappers | The fleet moved off them because they erase vendor errors. The ops core keeps the native SDK and typed errors. |
| An expression language in manifests | Lookups, `{{path}}` templates and match tables covered every control plane tried. Anything richer belongs in a hook. |
| Runtime credential lookup in workflows instead of generated env lines | Would need `toJSON(secrets)`-style access, which weakens the per-provider credential isolation [#539](https://github.com/starslingdev/hpc-sandbox-benchmarks/pull/539) added. Generated lines are free. |

## 5. Evaluation

### Measured: logical lines, house-formatted

Logical lines are non-blank, non-comment lines, counted with `scripts/measure.ts` after Biome.

| Provider | Interface | Today | Prototype | Proof |
|---|---|---:|---:|---|
| brezel | HTTP API, plus SDK data plane | 300 | 101 (50 data + 51 code) | 21/21 original tests |
| tama | CLI only | 97 | 63 data, no package | 11/11 original tests |
| novita | TypeScript SDK | 243 | 119 | 6/6 original tests |
| acme (fixture) | HTTP API, JSON exec | — | 54 (metadata + driver) | 3 new tests |

The one-time kit cost is 903 logical lines (`ops` 318, `http` 240, `cli` 145, `manifest-schema`
118, `rules` 58, `manifest` 24). It is paid back after about 5–6 providers, at the measured average saving of ~150 lines each.

### Files a new provider touches by hand

Counted excluding generated files, `bun.lock`, and the reviewed snapshot update.

| Path | Today | Target |
|---|---:|---:|
| Data-only (CLI, or HTTP with JSON exec) | ~21 | **2**: the metadata file with its `driver` manifest, plus one `PROVIDER_IDS` line |
| HTTP with a data-plane hook | ~21 | 5: metadata, ids, `package.json`, `index.ts` hook, test |
| TypeScript SDK | ~21 | 6: the above, plus the catalog entry |

### Against the criteria

| Criterion | A: wiring | B: snapshot | C: ops | D: HTTP kit | E: data-only | F: scaffold |
|---|---|---|---|---|---|---|
| Removes hand-written code | 3 tables | 7 test edits | ~50% of an SDK driver | ~65% of an HTTP driver | the whole package | none (generates it) |
| Type safety | same | same | same (bridge unchanged) | rows inferred from arktype literal | checked at generate time, not compile time | n/a |
| arktype placement | n/a | n/a | Tier 2 only | Tier 2 only | Tier 1 inert, Tier 3 validation | n/a |
| Escape hatch | override field | n/a | override any verb | `hook` data plane | drop to D or C | edit output |
| Migration risk | low (equivalence tests) | low | medium (per-driver semantics) | medium | low for new providers | none |

### Projection at 100 providers

This is an assumption, not a measurement. Assume a mix of 40 data-only, 30 HTTP with a hook and 30
SDK providers, at the sizes measured above (~55, ~100 and ~120 lines).

- **Target:** about 9k lines of provider code, plus 0.9k of kits.
- **Today:** about 35k lines (100 × ~350), plus ~13 boilerplate file edits per provider.

That is roughly 4× less hand-written code. What really changes is that about 40% of providers would
need no package and no TypeScript at all.

## 6. Recommendation

Do it in this order. Each step ships on its own.

1. **Wiring, low risk.** Land A and B, and merge `generate-provider-registry` and `generate-provider-wiring` into one `generate-providers` command. Fix the stale Runloop and Namespace `sdkPackage` values. Delete `MIGRATED_DRIVER_IDS` and the empty legacy `adapters` table: the migration is finished and `packages/drivers/migration-waivers.json` is `{}`.
2. **Promote `ops` into `packages/driver`** as the `./ops` subpath, with the knobs listed in C. Build `ops-testing`: an in-memory vendor that implements the verbs, together with the conformance clauses from ADR-0008 that are not wired up today. Then SDK providers test only their quirks instead of each copying about 400 lines of fakes.
3. **Promote the HTTP kit and the manifest compilers.** Add an optional `driver` field to `ProviderMetaSource`, have the generated loader route manifest providers to `manifestDriver`, and run `manifestFailures` inside the generator.
4. **Migrate opportunistically.** Rebuild a driver on the kits the next time it needs real work, rather than as a big-bang change. Use its existing tests as the bar, the same way the prototypes do.
5. **Scaffolder last**, once the templates point at real subpaths.

### Fidelity notes: what the prototypes changed, so the promotion can decide deliberately

- Novita's `probes.list` measured **one page**; `ops` drains the whole list. Keep a `probes.list` override if that measurement must stay comparable.
- Novita's recovery reported `contradictedPriorAbsence` when rows were found but nothing was killed; `ops` reports `destroyed` whenever owned rows are found.
- The HTTP kit adds `Idempotency-Key: benchmark-delete-<id>` to delete only when the manifest asks for it (`remove.idempotencyHeader`), matching Brezel.
- Data-plane variety is the main limit of pure data. Each reusable codec added (`json-exec` today; `ndjson-events` or `sse` next) moves a whole class of vendors from "hook" to "no code".
- Templates are checked at generate time. They could be checked at compile time with template-literal types over `EnvOf<P>`, if that is worth the type complexity.

### Other findings, independent of this design

- `schema/providers.ts:52` does `export * from "./provider-pricing.ts"`, which imports arktype. So the `schema/providers` subpath evaluates arktype despite the Tier-1 intent, and neither import-graph fence covers that file.
- `runConformance` (ADR-0008) is used only by its own unit test. No provider test or CI lane runs it.
- With Bun 1.3.14, `bun install --ignore-scripts` rewrites `bun.lock` to lockfile version 1 and sets the executable bit on `apps/cli` bins. The update script pins 1.4.0 for a reason.
