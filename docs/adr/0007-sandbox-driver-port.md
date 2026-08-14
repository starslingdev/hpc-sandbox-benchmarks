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

### What a steelman of ComputeSDK corrects

A deliberate defense of the incumbent, run against its shipped code, corrects four things this
Context would otherwise overclaim — and each correction sharpened the Decision:

- **The duplication is partly a failure to consume, not only a surface the SDK forced.**
  `@computesdk/cmd` — a dependency of `computesdk`, in `node_modules` the whole time — ships
  `shellEscape` **byte-identical** to all three repo copies, and `shell(cmd, { background: true })`
  emits the same `nohup … >/dev/null 2>&1 &` wrapper the adapters hand-wrote; zero repo files import
  it. The boilerplate indictment stands (the *mandatory surface* still forced the fabrications), but
  §2's "own the shell mechanics once" is a consolidation ComputeSDK also attempted — one package
  deeper than anyone looked.
- **"Didn't tell us" has prior art inside ComputeSDK itself.** `daemond`'s result envelope is
  `{ exitCode: number | null; signal?: string | null; … }` — the `Exit` union's semantics, shipped
  in their newest layer while the older `CommandResult` still forces `exitCode: number`.
- **`getUrl` and the wide surface fund features, not nothing.** `getUrl` is the bootstrap for their
  streaming-exec channel (an in-sandbox daemon reached over SSE), and `getById`/`list` power a
  multi-provider facade with failover and affinity routing. Dead *for this harness* — which is the
  actual argument — not dead by design. ComputeSDK even shipped its own narrow-contract precedent,
  `defineInfraProvider` (create/getById/list/destroy, no fabricated members), and its dominant
  convention is already capability-by-presence; the throwing `UnsupportedFileSystem` stub is the one
  deviation, forced by a consumer-side non-optional field.
- **The inspectable `.methods` table is why patching was possible at all.** Six providers could be
  behavior-patched precisely because `defineProvider` keeps methods in a cloneable table rather than
  sealing them in closures. Any replacement port must preserve that property — which §2's
  method-table layer does by construction, instead of rediscovering it through `assertPatchable`.

## Decision

Own the port, and ship it as a **kit**: a contract package a driver author reads top to bottom in
five minutes, and a fleet package where one file *is* one provider's behavior. Four rules govern
every choice below; each is the repo's existing discipline (ADR-0001/0002/0003) applied to the
provider seam:

1. **One declaration per fact, joined by types.** The registry entry (ADR-0006) declares identity,
   credentials and artifact once; the driver binds to it through a single typed id parameter, and
   the env types, artifact narrowing, loader table, exports map and CI wiring are all *derived* —
   by inference, by construction, or by drift-gated codegen that reads **only the registry**.
2. **A capability is present and working, or absent.** `undefined`, never a stub that lies.
3. **Errors are values, and they all speak one grammar.** The `Exit` union for command outcomes;
   arktype's `<path> must be <expected> (was <actual>)` for every boundary parse; and at authoring
   time, compiler errors that land on the field the author got wrong.
4. **The filesystem is the authoring interface.** A driver's filename is its `ProviderId`; adding a
   provider is adding a file, not threading a record through a barrel.

Everything below typechecks under `--strict --exactOptionalPropertyTypes`, including the negative
(`@ts-expect-error`) cases; quoted error messages are verbatim compiler or runtime output. The
design also survived a structured adversarial review — the strongest alternative it beat is
documented in §8, with the evidence.

### 1. Two packages: the contract and the fleet

```
packages/
  driver/          @sandbox-benchmarks/driver — the port and the kit. Deps: schema, arktype.
    src/
      port.ts        SandboxDriver, SandboxSession, Exit, ExecResult, CreateRequest  (types only)
      define.ts      defineDriver, DriverContext, EnvOf, ArtifactOf
      env.ts         envSchemaFor — the runtime dual of EnvOf
      shell.ts       shellQuote, launchDetached, readFile — harness-owned mechanics, once
      cli.ts         cliDriver — the generic driver for CLI-only vendors
      computesdk.ts  computeSdkDriver — the bridge (subpath ./computesdk)
  drivers/         @sandbox-benchmarks/drivers — the fleet. Deps: driver + the vendor SDKs.
    src/
      e2b.ts  daytona-vm.ts  daytona-container.ts  tama.ts  …   filename = ProviderId
      _daytona.ts    shared variant-pair factories (underscore = not a provider, generator skips)
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

**Generation flows registry → outward, never fleet → inward.** Every generated projection (loader,
exports map, CI regions) needs only the id list and credential names, which the registry already
owns — so the generator never imports a driver module and never evaluates a vendor SDK. The
fleet-side drift check is a file-existence and default-export-shape check, not a
thirteen-vendor-module evaluation on every PR. This directionality is load-bearing; §8 shows what
breaks without it.

### 2. The port: three members, two layers

The port has a consumer face and an author face, and they are different shapes on purpose. The
**harness** consumes sessions — the ergonomic object it already implies:

```ts
export interface SandboxDriver {
  create(request: CreateRequest): Promise<SandboxSession>;
  /** Optional: destroy by bare id, no session needed — reaper/cleanup lanes. Idempotent. */
  destroyById?(id: SandboxId): Promise<void>;
  readonly probes?: ControlPlaneProbes;    // optional: latency measurement only
  readonly snapshots?: SnapshotCapability; // optional: lifecycle measurement only
}

export interface SandboxSession {
  readonly sandboxId: SandboxId;
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  destroy(): Promise<void>;
  /** The vendor's native handle — the JDBC `unwrap()` idea, typed. */
  readonly native: unknown;
  /** Optional. A WORKING filesystem API — reads and writes — or absent; never a throwing stub. */
  readonly files?: SandboxFiles;
  /** Optional. `undefined` ⇒ the harness wraps `exec` in its own nohup double-fork. */
  launch?(command: string, options?: ExecOptions): Promise<void>;
}

export interface SandboxFiles {
  readFile(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  writeText(path: string, text: string): Promise<void>;
}
```

`CreateRequest` carries the benchmark's **full** target axis, GPUs included:
`spec`, `image`/`artifactRef`, `deadlineMs`, and `gpu?: { model: string; count: number }` — the
driver maps it to vendor syntax (Modal: `"H100!"`, `"A100:2"`). A GPU provider is therefore a
driver like any other, not a separate lane; a driver that cannot honor a requested `gpu` fails
create loudly rather than silently benchmarking CPU. `files` is all-or-nothing — every vendor
with a working filesystem API (modal, e2b, daytona) does both directions, and staging *writes*
are a real harness need (`gpu/modal.ts:158-165`) — while sessions without it get harness-owned
fallbacks for both directions in `shell.ts`: `cat` for reads, base64-over-exec for writes, so
consumers stay infallible either way.

A driver **author**, however, writes a *stateless method table* — flat, pure functions over a typed
native handle, capability-by-presence — and the kit assembles sessions from it:

```ts
export interface MethodTable<Handle, Ctx> {
  create(ctx: Ctx, request: CreateRequest): Promise<{ handle: Handle; sandboxId: SandboxId }>;
  exec(ctx: Ctx, handle: Handle, command: string, options?: ExecOptions): Promise<ExecResult>;
  destroy(ctx: Ctx, handle: Handle): Promise<void>;
  readonly files?: { readFile(ctx: Ctx, handle: Handle, path: string): Promise<string>; … };
  launch?(ctx: Ctx, handle: Handle, command: string): Promise<void>;
}
export function driverFromTable<Handle, Ctx>(table: MethodTable<Handle, Ctx>, ctx: Ctx): SandboxDriver;
```

This is ComputeSDK's genuinely good bone structure (`SandboxMethods<TSandbox, TConfig>`) with its
two pathologies removed: only three members are required, and absence is expressed by omitting a
key, never by a stub. Measured in the side-by-side anatomy (§Prior art), the table shape wins three
things closure sessions cannot offer: **one-statement unit tests** (`table.destroy(ctx, missing)`
is a pure call — the closure equivalent needed a five-statement setup *plus a full create/readiness
round-trip* to even reach the not-found path); **extraction safety** (a table is naturally a named
`satisfies MethodTable<…>` const, where extracting a closure spec severs contextual typing); and
**inspectable, patchable behavior** — composing over a table member is exactly what six providers
did to computesdk's `.methods`, now a supported shape instead of a reach into private state.
Per-driver memoized state (tama's once-per-process auth check) lives in `Ctx`, declared rather than
hidden in a closure.

Create, exec, destroy. `getById`, `getUrl`, `writeFile`, `mkdir`, `readdir`, `remove`, `runCode`
and the mandatory `getInfo` are gone, because nothing calls them; `getInstance` survives as the
typed `native` handle.

The rules that make consumers infallible:

- **Absent capabilities are `undefined`, not stubs.** `files?: SandboxFiles` is either a working
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

### 3. `defineDriver`: one typed id joins everything

The seam between "what a provider *is*" (the registry, ADR-0006) and "what it *does*" (the driver)
used to be a bare string convention. It becomes one typed parameter, and everything a driver author
touches derives from it:

```ts
export function defineDriver<P extends ProviderId>(
  id: P,                          // autocompleted; a typo or unregistered id is a compile error
  spec: DriverSpec<NoInfer<P>>,   // NoInfer: the spec can never bend P — only the id names the join
): DriverModule<P>;

export interface DriverContext<P extends ProviderId> {
  /** Exactly the credentials the registry entry declares — required → string, optional → string? */
  readonly env: EnvOf<P>;
  /** The registry's artifact descriptor, narrowed to ITS literal — not the four-way union. */
  readonly artifact: ArtifactOf<P>;
  /** The resolved boot reference for that artifact (candidate or version name, per lane). */
  readonly artifactRef: string;
}
```

One generic call signature, deliberately not overloads — convex's registration builder documents
the reason and it held up in our error-message tests: overloads prefix every mistake with a
signature dump, while a single signature lands the error on the field the author got wrong.

The whole provider file, in the shape an author actually writes:

```ts
// packages/drivers/src/tama.ts — the provider's behavior. The filename is the id.
import { defineDriver } from "@sandbox-benchmarks/driver";
import { cliDriver } from "@sandbox-benchmarks/driver/cli";
import { type } from "arktype";

const Machines = type("string.json.parse").to(
  type({ id: "string", name: "string", status: "string" }).array(),
);

export default defineDriver("tama", {
  // `tama new` blocks until ready (~2m10s cold pull) and owns failed-create cleanup, so the
  // driver owns the create budget — abandoning it mid-teardown would strand a billable machine.
  createBudget: { owner: "driver", attemptCeilingMs: TAMA_CREATE_CEILING_MS },
  driver: ({ env, artifact, artifactRef }) =>
    cliDriver({
      binary: env.TAMA_CLI ?? "tama",
      secretFlags: ["--token"],
      create: (r, name) => ["new", name, "--ttl", "0", "--json", `--${artifact.optionKey}`,
        artifactRef, "--cpu", String(r.spec.vcpus), "--memory", String(r.spec.memoryMib)],
      ready: { poll: ["list", "--json"], parse: Machines,
        select: (rows, name) => rows.find((m) => m.name === name && m.status === "ready")?.id ?? null },
      exec: (id, command) => ["exec", id, "--", "bash", "-lc", command],
      destroy: (id) => ["rm", "-y", id],
      notFound: /not found|no such machine|unknown machine/i,
    }),
});
```

What the typed join buys, each verified:

**The env slice is exact, and hovers flat.** `EnvOf<P>` maps the registry entry's credential tuple —
required credentials are `string`, optional ones `string | undefined` via absence (the
`exactOptionalPropertyTypes` distinction), wrapped in a `Prettify` flattener so the hover reads
`{ readonly TAMA_CLI?: string; readonly TAMA_TOKEN: string }`, not an alias soup. Reading a
credential the registry doesn't declare:

```
error TS2339: Property 'E2B_API_KEY' does not exist on type '{ readonly TAMA_CLI?: string; readonly TAMA_TOKEN: string; }'.
```

and near-misses get the compiler's spelling help:
`Property 'BAZ_API_KEY' does not exist … Did you mean 'BAZ_APIKEY'?`. `adapters.ts`'s "Never read
`process.env` here" comment stops being a comment; the ambient environment is simply not in scope.

**The artifact arrives narrowed, so behavior follows from the type.** For `"tama"`,
`ctx.artifact.kind` *is* the literal `"image"` and `optionKey` is `"image"` — not the four-way
`ProviderArtifact` union — so `{ [artifact.optionKey]: artifactRef }` types as `{ image: string }`
with zero casts and zero runtime checks, and asserting the wrong kind is a compile error. The
`createOptions` bags that today re-spell the registry's artifact knowledge by hand become
projections of it.

**The runtime parser is derived from the same declaration.** `envSchemaFor(id)` builds the arktype
validator from the identical registry tuple `EnvOf` maps, so type and validator cannot drift. A
missing credential reports `BL_WORKSPACE must be a string (was missing)` — the same grammar as every
other boundary in the repo. The CLI parses `process.env` once (ADR-0006 §4's `benchEnv`) and hands
each driver its typed slice.

**Variant pairs — the fleet's hardest real shape — are safe by construction.** daytona, modal and
microsandbox each register two ids over one implementation (`adapters.ts:41`). A shared factory is
typed by the union it serves, with no `as const` anywhere:

```ts
// packages/drivers/src/_daytona.ts
export function daytonaDriver(): DriverSpec<"daytona-vm" | "daytona-container"> { … }
```

Inside it, `env.DAYTONA_API_KEY` is typed (the union's common slice) and `artifact.optionKey` is
still the narrowed `"snapshotId"`. Both variant files attach it; attaching it to any id outside its
union is rejected by ordinary function-parameter contravariance — verified, along with the
unregistered-id and wrong-kind negatives, under the repo's compiler settings.

**Policy is declared next to the code it governs, without sentinels.** Today's
`createTimeoutMs: null` means "disable the harness's create race" — a sentinel a reader must know.
It becomes a self-describing union on the module, and `costEvidence` moves in beside it:

```ts
createBudget?:
  | { owner: "harness"; timeoutMs?: number }              // default: harness races create
  | { owner: "driver"; attemptCeilingMs: number };        // driver owns bounds and cleanup
```

The rich rationale comments in `adapters.ts:129-291` move into the driver files they describe —
each provider's story finally lives in one place.

One honest constraint, inherited from how contextual typing works everywhere (convex documents the
same rule): the spec literal lives **inline** in the `defineDriver(...)` call. Extracting it to an
untyped `const` first severs the contextual type and the callback's parameters fall back to
`any`-shaped inference errors. Extracting *typed* pieces — a `DriverSpec<…>`-annotated factory like
`daytonaDriver()` above — keeps every guarantee; that is the supported sharing shape.

### 4. The fleet loads lazily, and existence is compile-checked in both directions

The loader table is a correlated record — each id maps to a dynamic import of exactly its module:

```ts
export const DRIVERS: { readonly [P in ProviderId]: () => Promise<DriverModule<P>> } = {
  e2b: () => import("./e2b.ts").then((m) => m.default),
  tama: () => import("./tama.ts").then((m) => m.default),
  // …
};
```

Because the table is typed by `ProviderId` and each module's default export carries its literal id,
**both drift directions are compiler errors, not gate findings**: a driver file for an id the
registry doesn't know fails inside the file (`defineDriver("nopé", …)` rejects), and a registry id
with no driver file fails in the generated table (`TS2307: Cannot find module './novita.ts'`). A
mismatched id/module pairing in the table itself also fails (verified). The generator's own gate
adds only what types cannot see: filename = id, and one module per id. The generated table uses
plain static import specifiers, so editor go-to-definition tunnels through it — the property convex
protects deliberately in its generated `_generated/api`.

This converts the eager import wall into a per-provider cost: a bench job evaluates the one vendor
SDK it benchmarks (median ~60 ms, worst ~270 ms) instead of all twelve (~0.9 s), and harness tests
evaluate none.

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

`cliDriver` compiles its declarative spec down to a §2 method table whose handle is the **parsed
readiness row** (`ready.select` returns the row, not a bare id string) — so every generated member
is unit-testable as a pure function, and `session.native` is the vendor's own typed record rather
than an opaque string. The side-by-side anatomy confirmed the spec stays ~29 author lines while the
three per-vendor quirks each remain one field: `secretFlags`, `ready`, `notFound`.

### 6. ComputeSDK becomes a driver

It keeps all its real value — seven maintained vendor translations — and stops being mandatory:

```ts
import { computeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";

export default defineDriver("e2b", {
  driver: ({ env, artifact, artifactRef }) =>
    computeSdkDriver(e2bCommandsAsRoot(e2b({ apiKey: env.E2B_API_KEY })), {
      createOptions: { [artifact.optionKey]: artifactRef },   // types as { snapshotId: string }
      hasWorkingFilesystem: true,   // explicit, because UnsupportedFileSystem lies
    }),
});
```

The nine wrapper-based providers keep working through the bridge, including the
`snapshotId`/`templateId` create-option conventions the bake path relies on. The five hand-written
adapters stop paying the `defineProvider` tax, and `assertPatchable` disappears: patching a driver
is ordinary function composition, not a reach into a generated class's private table.

One typing rule, learned from the GPU prototype: the bridge's `session.native` is typed as **the
wrapper's `getInstance()` type — never the repo's own vendor SDK types**. Wrappers vendor their own
SDK copies (`@computesdk/modal/node_modules/modal`), so the wrapper's `Sandbox` and the repo's are
*different nominal classes*; a cast across them needs `as unknown as` and is wrong the day the
versions diverge. Code that needs the repo's SDK types is code that should be a native driver.

### 7. Where this meets ADR-0006

`CreateRequest.image` and `DriverContext.artifactRef` are resolved from ADR-0006 §1's `artifact`
descriptor, so the registry decides *what* to boot and the driver decides *how*. §6's credential
declarations gain two derived consumers (`EnvOf`, `envSchemaFor`) alongside the CI regions. The
`Record<BakedProviderId, BakeFn>` partition **stays in `apps/cli`, unchanged**: bake modules import
the harness, templates pins, and docker orchestration (`bake/e2b.ts` writes a generated Dockerfile
into `packages/templates/images/e2b/`) — that is release-pipeline altitude, and pulling it into the
fleet package would invert the DAG for a compile-time property the cli-side `Record` already
provides.

### 8. The single-file inversion, tested and rejected

The obvious next step — collapse the registry entry *into* the driver file
(`defineProvider({ id, credentials, artifact, pricing, driver })`, sibling-field inference, registry
generated from the fleet) — was built, adversarially attacked, and rejected on evidence. It is
recorded here because its failure modes are subtle and worth not re-discovering:

- **The flagship guarantee fails silently on the fleet's real shape.** Sibling-field inference
  needs the credentials tuple to stay literal. Factor a shared `const CREDS = [{ name:
  "DAYTONA_API_KEY" }]` — the natural move for the three variant pairs, minus the `as const` nothing
  reminds you to write — and `env` silently degrades to an open string record: `env.E2B_API_KEY`
  compiles for a daytona driver, with zero errors anywhere. The typed join (§3) is structurally
  immune: literalness is established once, in the reviewed registry, and drivers bind by id.
- **The generator would evaluate its own output.** Driver files import the schema barrel, whose
  provider module runs a validation loop that throws on a bad registry — so a broken generated
  registry (interrupted run, merge conflict between two provider PRs, prior emit bug) bricks the
  generator that would repair it. ADR-0003's gate works because its inputs are inert vendored XML;
  this one's inputs would be live modules downstream of its output.
- **Identity would be authored by a leaf's file listing.** Run documents, legacy aliases, figures
  and economics key on `ProviderId` — the DAG root's stability contract. Under the inversion,
  deleting a driver file and regenerating shrinks that vocabulary with no compile error anywhere;
  for a published benchmark, frictionless deletion is the wrong default. Relatedly, `id: string`
  (unavoidable when the fleet defines the namespace) makes §4's correlated loader untypeable.
- **The drift gate would evaluate thirteen vendor SDK graphs on every PR.** All currently import
  clean under `env -i` (measured, 0.88 s) — but the repo has already once fought vendor import-time
  flakiness (`bake/novita.ts`'s `createRequire` dance), and coupling every PR's CI to third-party
  module-graph behavior is a standing liability the registry-→-outward direction avoids entirely.

What the inversion got right is kept: colocation of narrative and behavior (the rationale comments
move into driver files), declarative policy on the module, and the one-command scaffold. What it
got wrong was *which* declaration moves: behavior colocates; identity does not.

### Prior art, credited

The shapes here are deliberately stolen from the ecosystem's best current practice — including from
the incumbent this ADR demotes. From **ComputeSDK**: the package model (narrow provider modules over
a small common core — kept as subpaths over a contract package), the stateless
`SandboxMethods<TSandbox, TConfig>` table §2's author layer is modeled on, capability-by-presence
feature detection, `@computesdk/cmd`'s shell mechanics, and `daemond`'s nullable-exit-code
envelope. From the **mature driver ecosystems** that have run "N vendors, one contract" for
decades: JDBC's `unwrap()` (the typed `native` handle), Kubernetes CSI's capability-honesty and
idempotency spec language and Testcontainers' wait-strategy decomposition (both taken further in
ADR-0008), and the TCK discipline that a contract ships with the suite that verifies it. From the
modern TS wave: convex's registration builders (one generic signature instead of overloads, for
error quality; a generated registry that preserves go-to-definition) and its
validate-args-then-infer handler pipeline; elysia's `NoInfer` discipline and
schema-as-single-source route contracts; better-auth's plugin object with optional capability keys
and subpath-per-plugin exports; eve's filesystem-as-authoring-interface and `define*`
default-export modules; arkenv's env-schema-with-injected-source; better-fetch's errors-as-values.
The `Prettify` hover flattener is the ecosystem-standard `{ [K in keyof T]: T[K] } & {}`. Where a
pattern didn't fit (elysia-style method chaining; arkenv's coercion; sibling-field inference per
§8), it was left out — the kit has no builder API because nothing in it accumulates type state. The
side-by-side anatomy that settled §2's two-layer shape — the same tama-style provider written
against real `@computesdk/provider`, as a closure spec, and as a stateless table, all
typechecked — found 134 author lines and 5 fabricated values for the incumbent, 29 lines and 0
fabrications for the declarative spec, and the table layer decisive for testability.

## Consequences

**Adding a provider becomes three hand-written edits, each compile-checked against the others:**

1. The id line in `schema`'s identity leaf — the deliberate act that extends the published
   vocabulary. `Record<ProviderId, …>` immediately demands the next edit.
2. The registry entry — identity, artifact, credentials, economics (ADR-0006), with the entry's
   evidence commentary alongside it.
3. The driver file, `packages/drivers/src/<id>.ts` — `defineDriver("<id>", …)` autocompletes the
   id, hands the author their typed env slice and narrowed artifact, and won't compile against an
   unregistered id; the regenerated loader won't compile without the file.

Then `bun run generate-provider-wiring` → review one diff touching the loader table, the exports
map, and the CI regions. A bake module only when `artifact.kind === "baked"` (the cli `Record`
demands exactly those); the `bench-matrix.yml` promotion stays a deliberate, separate step.
`bun run new-provider <id>` (ADR-0006 §9) scaffolds all three edits from one descriptor.

**We accept:**

- **A migration touching every adapter.** Fourteen providers move into `packages/drivers`. It is
  mechanical and compiler-checked, but it is not small, and it should land after ADR-0006 rather
  than alongside it. Until the last adapter lands, `computeSdkDriver` keeps unmigrated providers
  working, so the port and `DirectProvider` coexist during the window.
- **We own the port.** Today computesdk absorbs upstream vendor churn behind a stable interface.
  Nine providers keep that shelter via the bridge; the five hand-written ones already had no
  shelter, and this ADR only stops them pretending otherwise.
- **The inline-spec rule, narrowed by the table layer.** The `defineDriver` spec literal must stay
  inline (or flow through a `DriverSpec<…>`-typed factory); an untyped extracted const loses the
  contextual types — verified as eight implicit-`any` errors. This is a property of TypeScript's
  contextual typing, shared by convex and elysia. §2's method tables are the pressure valve: a
  table is naturally a named `satisfies MethodTable<…>` const, so the code an author most wants to
  extract and unit-test is exactly the shape that extracts safely.
- **`createOptions` stays an open passthrough on the bridge.** The `snapshotId`/`templateId`
  conventions are real computesdk knowledge the bake path depends on — though the typed
  `[artifact.optionKey]` projection now covers the common cases.
- **Losing `getInfo`/`list` as *typed* members.** Both are pure latency probes today. They move to
  the optional `probes` capability, where an absent probe is a recorded gap rather than a stub.
- **Default exports in `packages/drivers`.** The one place the repo uses them, accepted so the
  generated loader is uniform (`m => m.default`) with no id→identifier name mapping.
- **Two more packages under ADR-0002's uniform shape.** The DAG check gains the edges that make the
  design enforceable: `harness → driver` only; vendor SDKs confined to `drivers`.

**We explicitly do not:** collapse the registry into the fleet (§8 — tested, rejected on evidence);
create one workspace package per vendor (computesdk's per-package split earns its keep on npm,
where external consumers install one provider; in a private workspace every SDK lands in `bun.lock`
regardless, so fourteen `package.json`s would buy ceremony, not isolation — per-provider *subpaths*
plus the lazy loader capture the real benefits at zero package overhead); put `bake` on the driver
module (§7 — wrong DAG altitude, and the cli `Record` already provides the compile-time property);
delete or fork `@computesdk/*` (it does real vendor translation for nine providers and remains a
first-class driver); model streaming exec (declared in `transport`, never used —
`execute.ts:108-109`); or move vendor quirk-handling into the harness. The port is a shell and a
lifecycle, deliberately nothing more.
