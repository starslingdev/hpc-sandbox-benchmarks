---
status: proposed
---

# The sandbox driver kit: one port, one file per provider, ComputeSDK as one driver

## Context

ADR-0006 makes *registering* a provider declarative. This ADR is about the other half: what a
provider has to **implement**, and what it feels like to implement it. That surface is currently
defined by `@computesdk/provider`'s `defineProvider`, and the evidence says it no longer fits.

### ComputeSDK is now the minority case

Census of the 14 registered providers on `main` at `0ede640`:

| How it attaches | Count | Providers |
|---|---|---|
| Published `@computesdk/*` wrapper, unmodified | **3** | `modal-gvisor`, `modal-vm`, `namespace` |
| Published wrapper, patched through its private `.methods` table | **6** | `e2b`, `daytona-vm`, `daytona-container`, `blaxel`, `runloop`, `novita` |
| Hand-written `defineProvider` | **5** | `microsandbox-local`, `microsandbox-cloud`, `vercel`, `runcloud`, `tama` |

**Only 21% consume a wrapper as shipped, and two of those three are the same vendor.** The last
three providers added — runcloud, microsandbox, tama — are all hand-written. tama has no SDK in any
language: its entire control plane is `spawn()` on a CLI binary (`tama.ts:11`).

### The harness never depended on ComputeSDK anyway

`packages/harness` and `apps/cli` contain **zero** imports from `computesdk` or `@computesdk/*`;
`packages/harness/package.json` does not even declare it. The harness already defines its own
structural interfaces that computesdk merely happens to satisfy — five of them, each a subset of the
next: `DestroyableSandbox` (`sandbox-owner.ts:11`), `ReadinessProbeSandbox` (`readiness.ts:52`),
`SandboxFilesystem` and `SandboxHandle` (`execute.ts:117,123`), `LifecycleSandbox`
(`lifecycle.ts:79`).

**The port already exists. It is just unnamed, scattered across five files, and not the thing
providers are asked to implement.**

The GPU work proves it. When the provider abstraction didn't fit, the team routed around it:
`apps/cli/src/lib/gpu/modal.ts:77-89` builds `{ sandboxId, runCommand, destroy }` from the **native
Modal SDK** and feeds it straight to `createOwnedSandbox` / `StepRunner`. It works. A non-computesdk
driver already satisfies the harness today — outside the registry, because the registry has no shape
for it.

### What the harness actually uses vs. what `defineProvider` demands

`SandboxMethods` (`@computesdk/provider/dist/index.d.ts:689`) makes seven methods mandatory:
`create`, `getById`, `list`, `destroy`, `runCommand`, `getInfo`, `getUrl`.

| Member | Harness usage |
|---|---|
| `runCommand` | 9 call sites — the workhorse |
| `destroy` | 4 sites |
| `create` | 3 sites; the only required *provider* method |
| `sandboxId` | cost attribution |
| `getInfo` | 1 site, `lifecycle.ts:283`; return value **never inspected** — a latency probe |
| `list` | 1 site; return value **discarded** — a latency probe |
| `filesystem.readFile`/`exists` | optional fast path; every use has a `cat` fallback |
| `getById` | **never called** |
| `getUrl` | **never called** — implemented 7 times across the adapters |

`writeFile`, `mkdir`, `readdir`, `remove`, `getUrl`, `getInstance`, `runCode` are all unused.
Results don't even move over the filesystem API: they come back as a base64 tar over stdout
(`collect.ts:49-51`), chosen deliberately so it survives a full disk.

Nothing the harness does requires a capability a plain "run a shell command" port lacks. Detached
execution is a `nohup` double-fork *the harness itself writes* (`execute.ts:544-545`) with
completion observed via a done-file; snapshots are an optional lifecycle measurement whose absence is
a clean `skipped` gap.

### What the mismatch costs

**Fabricated values.** A mandatory surface wider than any vendor forces adapters to invent data —
20+ instances, including `createdAt: new Date(0)` and `timeout: 0` (`tama.ts:614,616`), an invented
snapshot id `` `${sandboxId}-snap-${Date.now().toString(36)}` `` (`microsandbox.ts:550`),
`exitCode: result.exitCode ?? 1` inventing a failure (`vercel.ts:96`), a fabricated
`{ stdout: "", stderr: "", exitCode: 0 }` for background launches (`vercel.ts:90`), and a `getUrl`
that only throws, kept because *"Required by SandboxMethods, so it cannot be omitted"*
(`microsandbox.ts:508-515`).

**Duplication the vendors did not cause.** Three byte-identical `shellQuote` implementations
(`tama.ts:214`, `runcloud.ts:359`, `microsandbox.ts:125`); four independent reinventions of the same
`nohup … &` line; five `mapStatus` functions each collapsing a richer vendor state machine into
computesdk's three values, each with a comment defending the same lossy choice; six `{ sandbox,
sandboxId }` rewraps; five near-identical `assertPatchable` guards that exist only because
`defineProvider` returns a generated class with no override point, so wrappers reach into its private
`.methods` table and clone it (`novita.ts:87`, `runloop.ts:31`, `e2b-root.ts:19`,
`blaxel-volume.ts:36`, `daytona-target.ts:37`).

**An eager import wall.** `adapters.ts:5-25` statically imports every vendor SDK, and the
`providers` barrel re-exports the composed record, so **any** import of the barrel — including
`harness/src/index.ts:9` — evaluates all twelve vendor module graphs before a single line of
benchmark code runs. Measured warm (bun 1.3.11, marginal costs sequentially in one process): the
vendor graphs add **~0.9 s** (0.8–1.1 s across runs) on top of `schema`'s ~0.6 s, led by
`@computesdk/blaxel` (~267 ms), `@computesdk/daytona` (~166 ms), `@computesdk/e2b` (~163 ms) and
`@computesdk/modal` (~131 ms). A bench job benchmarks **exactly one provider**; it pays for
fourteen, on every process start, tests included.

**A production incident.** `@computesdk/provider` gives an adapter with no `filesystem` table its
`UnsupportedFileSystem` stub — *a truthy object whose every method throws*. A truthiness check
therefore selects the filesystem poll, and every poll then throws: **12 straight failures killed a
step on namespace**, which the loop could only read as a dead sandbox (`execute.ts:404-411`). The fix
in place today is to string-match `/not supported by .*sandbox environment/i` (`execute.ts:139-152`)
to tell "never going to work" from "wedged for a moment". This is the single genuinely load-bearing
computesdk *behavior* the harness depends on, and it is a workaround for a sentinel that should have
been `undefined`.

The anatomy confirms the shape of the problem: the *long* adapters are the least shim-heavy
(tama and runcloud are ~75% real vendor logic), while the *short* ones are almost pure tax —
`vercel.ts` is ~68% adapter boilerplate over an SDK that already does the work.

## Decision

Own the port, and ship it as a **kit**: a contract package a driver author reads top to bottom in
five minutes, and a fleet package where one file *is* one provider. Four rules govern every choice
below; each is the repo's existing discipline (ADR-0001/0002/0003) applied to the provider seam:

1. **One declaration per fact.** The registry entry (ADR-0006) declares identity, credentials and
   artifact once; the driver's env types, its runtime env parser, the loader table, the exports map
   and the CI wiring are all *derived* — by inference, by construction, or by drift-gated codegen.
2. **A capability is present and working, or absent.** `undefined`, never a stub that lies.
3. **Errors are values, and they all speak one grammar.** The `Exit` union for command outcomes;
   arktype's `<path> must be <expected> (was <actual>)` for every boundary parse.
4. **The filesystem is the authoring interface.** A driver's filename is its `ProviderId`; adding a
   provider is adding a file, not threading a record through a barrel.

Everything below typechecks under `--strict --exactOptionalPropertyTypes`, including the negative
(`@ts-expect-error`) cases; quoted error messages are verbatim runtime output.

### 1. Two packages: the contract and the fleet

```
packages/
  driver/          @sandbox-benchmarks/driver — the port and the kit. Deps: schema, arktype.
    src/
      port.ts        SandboxDriver, SandboxSession, Exit, ExecResult, CreateRequest  (types only)
      define.ts      defineDriver, DriverContext, EnvOf
      env.ts         envSchemaFor — the runtime dual of EnvOf
      shell.ts       shellQuote, launchDetached, readFile — harness-owned mechanics, once
      cli.ts         cliDriver — the generic driver for CLI-only vendors
      computesdk.ts  computeSdkDriver — the bridge (subpath ./computesdk)
  drivers/         @sandbox-benchmarks/drivers — the fleet. Deps: driver + the vendor SDKs.
    src/
      e2b.ts  daytona.ts  modal.ts  tama.ts  runcloud.ts  …   filename = ProviderId
      index.ts       the generated loader table (drift-gated)
```

Narrow exports, in the computesdk spirit of small surfaces over a common core:

- `@sandbox-benchmarks/driver` exports `.` (port + `defineDriver` + shell mechanics), `./cli`, and
  `./computesdk` — the *only* module in the repo allowed to import `computesdk`, so the bridge's
  cost is opt-in per driver rather than ambient.
- `@sandbox-benchmarks/drivers` exports one subpath per provider (`./tama`, `./e2b`, …) plus a root
  that contains **only** the loader table. The subpath list is generated from the registry and
  drift-gated, like every other projection of it.

The dependency flip is the architectural payoff: `@sandbox-benchmarks/harness` drops its dependency
on the providers barrel (`harness/package.json` → `@sandbox-benchmarks/providers` today) and depends
on **`driver` alone**. The harness's five overlapping structural interfaces collapse into the one
named port; vendor SDKs leave its transitive graph entirely, and ADR-0002's DAG check enforces that
they stay out. `apps/cli` is the only place the fleet and the harness meet.

### 2. The port: three members

```ts
export interface SandboxDriver {
  create(request: CreateRequest): Promise<SandboxSession>;
  readonly probes?: ControlPlaneProbes;    // optional: latency measurement only
  readonly snapshots?: SnapshotCapability; // optional: lifecycle measurement only
}

export interface SandboxSession {
  readonly sandboxId: SandboxId;
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  destroy(): Promise<void>;
  /** Optional fast path. `undefined` when the vendor has none — never a throwing stub. */
  readonly files?: FileReads;
  /** Optional. `undefined` ⇒ the harness wraps `exec` in its own nohup double-fork. */
  launch?(command: string, options?: ExecOptions): Promise<void>;
}
```

Create, exec, destroy. `getById`, `getUrl`, `writeFile`, `mkdir`, `readdir`, `remove`, `runCode`,
`getInstance` and the mandatory `getInfo` are gone, because nothing calls them.

The rules that make consumers infallible:

- **Absent capabilities are `undefined`, not stubs.** `files?: FileReads` is either a working
  filesystem or absent; the driver — the place that knows — decides, and the stub never escapes it.
  This deletes the string-matching at `execute.ts:139-152` and the entire class of bug that took out
  the namespace step: `StepRunner`'s `pollFs` field, its permanent-abandonment logic and its
  `isUnsupportedFilesystemError` matcher all go away.
- **"Didn't tell us" is representable.**

  ```ts
  export type Exit =
    | { kind: "exited"; code: number }
    | { kind: "signalled"; signal: string }
    | { kind: "unknown"; detail: string };
  ```

  No adapter forges `?? 1` (`vercel.ts:96`) or `127` (`e2b-root.ts:79`); a missing exit code becomes
  evidence in the run document instead of a fake failure — which matters for a project whose output
  is a published measurement.
- **Distinct operations get distinct types.** `exec` returns `ExecResult`; `launch` returns `void`.
  Four adapters currently fabricate a `CommandResult` for background launches; with the split there
  is nothing to fabricate, and the harness supplies the fallback.
- **Shell mechanics live in `shell.ts`, once.** `shellQuote`, the `nohup` double-fork, the done-file
  poll and the `cat` fallback are harness concerns expressed over `exec`. Three byte-identical
  `shellQuote` copies and four `nohup` lines collapse to one each:

  ```ts
  export async function launchDetached(s: SandboxSession, command: string): Promise<void> {
    if (s.launch) return s.launch(command);
    await s.exec(`nohup /bin/sh -lc ${shellQuote(command)} </dev/null >/dev/null 2>&1 &`);
  }
  ```

### 3. `defineDriver`: the registry types the driver

A driver module is a plain object with one required capability and declarative keys for the rest —
the shape better-auth uses for plugins, eve for tools. It is the file's default export so the
generated loader needs no name mapping:

```ts
// packages/drivers/src/tama.ts — the whole provider. The filename is the ProviderId.
import { defineDriver } from "@sandbox-benchmarks/driver";
import { cliDriver } from "@sandbox-benchmarks/driver/cli";
import { type } from "arktype";

const Machines = type("string.json.parse").to(
  type({ id: "string", name: "string", status: "string" }).array(),
);

export default defineDriver({
  id: "tama",
  // `tama new` blocks until ready (~2m10s cold pull) and owns failed-create cleanup, so the
  // driver owns the create budget — abandoning it mid-teardown would strand a billable machine.
  createBudget: { owner: "driver", attemptCeilingMs: TAMA_CREATE_CEILING_MS },
  driver: ({ env }) =>
    cliDriver({
      binary: env.TAMA_CLI ?? "tama",
      secretFlags: ["--token"],
      create: (r, name) => ["new", name, "--ttl", "0", "--json", "--image", r.image,
        "--cpu", String(r.spec.vcpus), "--memory", String(r.spec.memoryMib)],
      ready: { poll: ["list", "--json"], parse: Machines,
        select: (rows, name) => rows.find((m) => m.name === name && m.status === "ready")?.id ?? null },
      exec: (id, command) => ["exec", id, "--", "bash", "-lc", command],
      destroy: (id) => ["rm", "-y", id],
      notFound: /not found|no such machine|unknown machine/i,
    }),
});
```

Three properties make this the load-bearing DX improvement rather than a cosmetic one:

**The env slice is derived from the registry, at the type level.** ADR-0006 §6's credential
declarations already say which variables each provider may see. A mapped type turns that literal
into the driver's context — required credentials are `string`, optional ones `string | undefined`:

```ts
type Creds<P extends ProviderId> = (typeof REGISTRY)[P]["credentials"][number];

export type EnvOf<P extends ProviderId> = {
  readonly [C in Extract<Creds<P>, { optional: true }> as C["name"]]?: string;
} & {
  readonly [C in Exclude<Creds<P>, { optional: true }> as C["name"]]: string;
};
```

Inside `driver: ({ env }) => …` for `id: "tama"`, `env.TAMA_TOKEN` is a `string` and
`env.E2B_API_KEY` **does not exist** — verified as a `tsc` error. `adapters.ts`'s "Never read
`process.env` here" comment stops being a comment: a driver can only see the slice its registry
entry declares, because that is the only shape its context has. Reading an undeclared credential, or
registering an id the registry doesn't know, fails compile.

**The runtime parser is derived from the same declaration.** The dual of `EnvOf` is built by
construction, so the type and the validator cannot drift (arkenv's design, minus its coercion —
credentials are strings already):

```ts
export function envSchemaFor<P extends ProviderId>(id: P): Type<EnvOf<P>> { /* built from REGISTRY[id].credentials */ }
```

A missing credential reports `BL_WORKSPACE must be a string (was missing)` — same grammar as every
other boundary in the repo. The CLI parses `process.env` once (ADR-0006 §4's `benchEnv`), then hands
each driver its typed slice; drivers never touch the ambient environment, in tests or production.

**Policy is declared next to the code it governs, without sentinels.** Today's
`createTimeoutMs: null` means "disable the harness's create race" — a sentinel a reader must know.
It becomes a self-describing union on the module:

```ts
createBudget?:
  | { owner: "harness"; timeoutMs?: number }              // default: harness races create
  | { owner: "driver"; attemptCeilingMs: number };        // driver owns bounds and cleanup
```

`costEvidence` and computesdk's `createOptions` remain driver-level concerns; they move into the
driver file next to the vendor knowledge they encode, and the rich rationale comments in
`adapters.ts:129-291` move with them — each provider's story finally lives in one place.

### 4. The fleet loads lazily, and its wiring is generated

The loader table is a correlated record — each id maps to a dynamic import of exactly its module,
typed so a mismatched id/module pairing fails compile:

```ts
export const DRIVERS: { readonly [P in ProviderId]: () => Promise<DriverModule<P>> } = {
  e2b: () => import("./e2b.ts").then((m) => m.default),
  tama: () => import("./tama.ts").then((m) => m.default),
  // …
};
```

`index.ts` (this table) and the package's `exports` map are emitted by ADR-0006's generator in the
same pass that emits the CI credential regions, and gated by the same `git diff --exit-code` check —
a registered provider with no driver file, or a stray driver file with no registry entry, fails the
gate with a message naming the missing half.

This converts the eager import wall into a per-provider cost: a bench job evaluates the one vendor
SDK it benchmarks (median ~60 ms, worst ~270 ms) instead of all twelve (~0.9 s), and
harness tests evaluate none.

### 5. `cliDriver`: vendor stdout is a trust boundary

runcloud, microsandbox and tama arrived in one quarter; two of the three drive CLIs or raw HTTP.
For CLI vendors the *entire* control plane is untyped text crossing a process boundary — exactly
what ADR-0001 says must be parsed, and today it is `JSON.parse` + hand-rolled checks. In the kit,
the table's `parse` fields are arktype pipelines, so a vendor changing its output shape produces a
path-bearing report in the CI log —

```
value at [0].status must be a string (was missing)
```

— instead of an `undefined` threading through readiness logic. The generic driver owns spawn,
timeout-and-kill, argv secret redaction and not-found matching once; a new CLI vendor is a table of
argv templates and parsers, ~15 declarative lines against tama's 636 hand-written ones, with no
`getUrl` regex-scraping prose, no `createdAt: new Date(0)`, no `mapStatus` collapse. Where a
vendor's CLI needs logic a table can't express, the escape hatch is the port itself — `cliDriver` is
a convenience over `SandboxDriver`, not a second contract.

### 6. ComputeSDK becomes a driver

It keeps all its real value — seven maintained vendor translations — and stops being mandatory:

```ts
import { computeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";

export default defineDriver({
  id: "e2b",
  driver: ({ env }) =>
    computeSdkDriver(e2bCommandsAsRoot(e2b({ apiKey: env.E2B_API_KEY })), {
      createOptions: { snapshotId: /* resolved artifact, ADR-0006 §1 */ },
      hasWorkingFilesystem: true,   // explicit, because UnsupportedFileSystem lies
    }),
});
```

The nine wrapper-based providers keep working through the bridge, including the
`snapshotId`/`templateId` create-option conventions the bake path relies on. The five hand-written
adapters stop paying the `defineProvider` tax, and `assertPatchable` disappears: patching a driver
is ordinary function composition, not a reach into a generated class's private table.

### 7. Where this meets ADR-0006

`CreateRequest.image` is the boot artifact resolved from ADR-0006 §1's `artifact` descriptor, so the
registry decides *what* to boot and the driver decides *how*. §6's credential declarations gain two
derived consumers (`EnvOf`, `envSchemaFor`) alongside the CI regions, which strengthens that ADR's
"one declaration" claim. The generator's output grows by two files (loader table, exports map) under
the same drift gate. ADR-0006 §1's `Record<BakedProviderId, BakeFn>` partition applies unchanged.

### Prior art, credited

The shapes here are deliberately stolen from the ecosystem's best current practice: computesdk's own
package model (narrow provider modules over a small common core — kept as subpaths over a contract
package); better-auth's plugin object with optional capability keys and subpath-per-plugin exports;
eve's filesystem-as-authoring-interface and `defineTool` default-export modules; arkenv's
env-schema-with-injected-source and its derive-don't-redeclare stance; elysia's and Convex's
schema-as-single-source-of-truth with thin wrappers over plain-TS helpers. Where a pattern didn't
fit (elysia-style method chaining; arkenv's coercion), it was left out — the kit has no builder API
because nothing in it accumulates type state.

## Consequences

**Adding a provider becomes** (the whole workflow):

1. One registry entry in `schema` — identity, artifact, credentials, economics (ADR-0006).
2. One file, `packages/drivers/src/<id>.ts`, whose default export is `defineDriver({...})` — a
   `cliDriver` table for CLI vendors, a `computeSdkDriver` bridge for wrapped ones, or a native-SDK
   port implementation (the existing `gpu/modal.ts` shape) for the rest.
3. `bun run generate-provider-wiring` → review one diff that touches the loader table, the exports
   map, and the CI regions.

A bake module only when `artifact.kind === "baked"`; the `bench-matrix.yml` promotion stays a
deliberate, separate decision. Three hand-edited files against 25–34 today — and the third is a
reviewed generated diff.

**We accept:**

- **A migration touching every adapter.** Fourteen providers move into `packages/drivers`. It is
  mechanical and compiler-checked, but it is not small, and it should land after ADR-0006 rather
  than alongside it. Until the last adapter lands, `computeSdkDriver` keeps unmigrated providers
  working, so the port and `DirectProvider` coexist during the window.
- **We own the port.** Today computesdk absorbs upstream vendor churn behind a stable interface.
  Nine providers keep that shelter via the bridge; the five hand-written ones already had no
  shelter, and this ADR only stops them pretending otherwise.
- **`createOptions` stays an open passthrough on the bridge.** The `snapshotId`/`templateId`
  conventions are real computesdk knowledge the bake path depends on. They remain a bridge-level
  concern, not a port concept — the port does not model every vendor's create surface.
- **Losing `getInfo`/`list` as *typed* members.** Both are pure latency probes today. They move to
  the optional `probes` capability, where an absent probe is a recorded gap rather than a stub.
- **Default exports in `packages/drivers`.** The one place the repo uses them, accepted so the
  generated loader is uniform (`m => m.default`) with no id→identifier name mapping.
- **Two more packages under ADR-0002's uniform shape.** The DAG check gains the edges that make the
  design enforceable: `harness → driver` only; vendor SDKs confined to `drivers`.

**We explicitly do not:** create one workspace package per vendor. computesdk's per-package split
earns its keep on npm, where external consumers install one provider; in a private workspace every
SDK lands in `bun.lock` regardless, so fourteen `package.json`s would buy ceremony, not isolation.
Per-provider *subpaths* plus the lazy loader capture the real benefits — dependency visibility,
import-cost isolation, one-file-per-provider — at zero package overhead. We also do not delete or
fork `@computesdk/*` (it does real vendor translation for nine providers and remains a first-class
driver); model streaming exec (declared in `transport`, never used — `execute.ts:108-109`); or move
vendor quirk-handling into the harness. The port is a shell and a lifecycle, deliberately nothing
more.
