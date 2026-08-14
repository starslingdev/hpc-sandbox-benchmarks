---
status: proposed
---

# The sandbox driver port: own the interface, demote ComputeSDK to a driver

## Context

ADR-0006 makes *registering* a provider declarative. This ADR is about the other half: what a
provider has to **implement**. That surface is currently defined by `@computesdk/provider`'s
`defineProvider`, and the evidence says it no longer fits.

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

Define the port the harness already implies, own it in `packages/harness`, and make
`@computesdk/*` **one driver among several** rather than the substrate every provider must
impersonate.

The design principle is the repo's own (ADR-0001) applied to capabilities rather than data: a
capability is either present and working, or absent — never a stub that lies. Everything below
typechecks under `--strict --exactOptionalPropertyTypes`.

### 1. The required surface is three members

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

### 2. Absent capabilities are `undefined`, not stubs (`type-no-sentinels`)

`files?: FileReads` is either a working filesystem or absent. The driver — the place that knows —
decides; the stub never escapes it:

```ts
...(hasWorkingFilesystem && s.filesystem ? { files: s.filesystem } : {}),
```

This deletes the string-matching at `execute.ts:139-152` and the entire class of bug that took out
the namespace step. `StepRunner`'s `pollFs` field, its permanent-abandonment logic and its
`isUnsupportedFilesystemError` matcher all go away — the consumer becomes infallible
(`domain-infallible-consumers`).

### 3. "Didn't tell us" is representable (`type-no-sentinels`)

```ts
export type Exit =
  | { kind: "exited"; code: number }
  | { kind: "signalled"; signal: string }
  | { kind: "unknown"; detail: string };

export const succeeded = (e: Exit): boolean => e.kind === "exited" && e.code === 0;
```

No adapter has to forge `?? 1` (`vercel.ts:96`) or `127` (`e2b-root.ts:79`). A missing exit code
becomes evidence in the run document instead of a fake failure — which matters for a project whose
output is a published measurement.

### 4. Distinct operations get distinct types (`domain-enums-over-bools`)

`runCommand(cmd, { background: true })` returns a `CommandResult` with nothing meaningful in it, so
four adapters fabricate one. Splitting `exec` (returns `ExecResult`) from `launch` (returns `void`)
means there is nothing to fabricate. `launch` is optional, and the harness supplies the fallback.

### 5. Shell mechanics move into the harness, once

`shellQuote`, the `nohup` double-fork, the done-file poll and the `cat` fallback are **harness**
concerns expressed over `exec`. They stop being per-adapter code:

```ts
export async function launchDetached(s: SandboxSession, command: string): Promise<void> {
  if (s.launch) return s.launch(command);
  await s.exec(`nohup /bin/sh -lc ${shellQuote(command)} </dev/null >/dev/null 2>&1 &`);
}

export async function readFile(s: SandboxSession, path: string): Promise<string | null> {
  if (s.files) return s.files.readFile(path);
  const r = await s.exec(`cat ${shellQuote(path)}`);
  return succeeded(r.exit) ? r.stdout : null;
}
```

Three `shellQuote` copies and four `nohup` lines collapse to one each.

### 6. ComputeSDK becomes a driver

It keeps all its real value — seven maintained vendor translations — and stops being mandatory:

```ts
export function computeSdkDriver(
  compute: ComputeSdkLike,
  createOptions: Record<string, unknown>,
  hasWorkingFilesystem: boolean,
): SandboxDriver
```

The nine wrapper-based providers keep working through it, including the `snapshotId`/`templateId`
create-option conventions the bake path relies on. The five hand-written adapters stop paying the
`defineProvider` tax, and `assertPatchable` disappears: patching a driver is ordinary composition,
not a reach into a generated class's private table.

### 7. The payoff: a CLI-only provider becomes a table

The port is narrow enough that whole *classes* of provider collapse into one generic driver. CLI
providers need spawn, timeout-and-kill, argv redaction and not-found matching — all generic:

```ts
export const tamaDriver = cliDriver({
  binary: { env: "TAMA_CLI", fallback: "tama" },
  secretFlags: ["--token"],
  create: (r, name) => ["new", name, "--ttl", "0", "--json",
    "--image", r.image, "--cpu", String(r.spec.vcpus), "--memory", String(r.spec.memoryMib)],
  ready: { poll: ["list", "--json"], isReady: (raw, name) => /* → id | null */ },
  exec: (id, command) => ["exec", id, "--", "bash", "-lc", command],
  destroy: (id) => ["rm", "-y", id],
  notFound: /not found|no such machine|unknown machine/i,
});
```

That is tama's control plane as a declarative table, against 636 hand-written lines today — and with
no `getUrl` regex-scraping prose, no `createdAt: new Date(0)`, no `mapStatus` collapse, no
`getById`/`list` it does not have. This is the "few declarative files" ADR-0006 aims at, extended
from *registration* to *implementation*.

### 8. Where this meets ADR-0006

`CreateRequest.image` is the boot artifact resolved from ADR-0006 §1's `artifact` descriptor, so the
registry decides *what* to boot and the driver decides *how*. The two ADRs compose: ADR-0006 removes
the per-provider edits, this one removes the per-provider implementation surface. ADR-0006 §1's
`Record<BakedProviderId, BakeFn>` partition applies unchanged.

## Consequences

**Adding a provider becomes:** a registry entry (ADR-0006) plus a driver that implements create,
exec, destroy — or, for a CLI vendor, a `cliDriver` table. `runcloud`'s and `tama`'s genuine vendor
logic (ambiguous-create reconciliation, readiness polling, bounded teardown, credential redaction)
survives intact; only the impersonation goes.

**We accept:**

- **A migration touching every adapter.** Fourteen providers move to the port. It is mechanical and
  compiler-checked, but it is not small, and it should land after ADR-0006 rather than alongside it.
- **We own the port.** Today computesdk absorbs upstream vendor churn behind a stable interface. Nine
  providers keep that shelter via `computeSdkDriver`; the five hand-written ones already had no
  shelter, and this ADR only stops them pretending otherwise.
- **`createOptions` stays an open passthrough.** The `snapshotId`/`templateId` conventions are real
  computesdk knowledge the bake path depends on. They remain a driver-level concern, not a port
  concept — the port does not try to model every vendor's create surface.
- **Losing `getInfo`/`list` as *typed* members.** Both are pure latency probes today. They move to
  the optional `probes` capability, where an absent probe is a recorded gap rather than a stub.
- **Two abstractions during migration.** Providers not yet moved keep working through
  `computeSdkDriver`, so the port and `DirectProvider` coexist until the last adapter lands.

**We explicitly do not:** delete or fork `@computesdk/*` — it does real vendor translation work for
nine providers and remains a first-class driver; model streaming exec (declared in `transport` but
never used by the harness, `execute.ts:108-109`); or move vendor quirk-handling into the harness.
The port is a shell and a lifecycle, deliberately nothing more.
