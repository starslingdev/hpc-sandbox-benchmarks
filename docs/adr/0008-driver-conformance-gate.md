---
status: proposed
---

# Driver conformance: the behavioral drift gate

## Context

This repo gates every **data** projection it depends on. ADR-0003 holds the generated catalog
byte-stable against its XML source; ADR-0006 drift-gates the CI wiring, loader and exports against
the registry; ADR-0007 makes registry↔driver existence a compile error in both directions. But the
registry also makes **behavioral** claims, and nothing gates those:

| Claim | Declared at | Steers |
|---|---|---|
| `transport.detachedPoll` | registry | whether a long step may detach (`execute.ts` transport selection) |
| `transport.syncCapMs` | registry | which steps are forbidden from synchronous exec |
| `transport.streaming` | registry | transport choice |
| `hasWorkingFilesystem` | driver (ADR-0007 §6 bridge) | whether the harness polls files or falls back to `cat` |
| `retryableCreatePatterns` | registry (ADR-0006 §5) | retry-vs-fail on create |
| `artifact.optionKey` | registry | how the boot artifact reaches `create` |

Every one of these is asserted by hand and verified by nothing. The repo has already paid for that
twice, and both incidents are the same failure class — *a declared capability that did not match
observed behavior, discovered only inside a live benchmark*:

- **namespace, `detachedPoll: false`** — a wrong hand-written claim (misread as "needs a filesystem
  API") forced a 55-minute benchmark onto a synchronous exec its own server cut at ~4m19s, stranding
  the run (`providers.ts:55-58`).
- **namespace, `UnsupportedFileSystem`** — a truthy stub advertised a filesystem that throws on
  every call; 12 straight poll failures killed the step (ADR-0007 Context).

The mature "N vendors, one contract" ecosystems all converged on the same answer, decades before us:
**the contract ships with the suite that verifies implementations against it.** Kubernetes CSI's
`csi-sanity` runs against any driver over its socket and is *capability-gated* — it first queries
the driver's advertised capabilities, then tests exactly what was advertised, so one suite verifies
behavior **and** capability honesty. JDBC's `jdbcCompliant()` may only return true after passing the
compliance tests — a claim socially backed by a suite. Terraform's `terraform-plugin-testing`
drives providers through real plan/apply/refresh/destroy cycles and ships `CheckDestroy`, which
verifies the remote resource is *actually gone*. CSI's spec text is the model for operation
semantics: "This operation MUST be idempotent … If the volume does not exist, the Plugin MUST reply
OK", with per-operation error tables that specify what the **caller may do next**.

The repo already owns the perfect host: the smoke lane (`bench-smoke.yml`) boots one live sandbox
per provider and is explicitly designed so "a green smoke must never hide that the provider was
never actually smoked."

## Decision

### 1. The port gets spec language, not just types

ADR-0007's port acquires per-operation normative semantics, CSI-style — short, testable clauses in
the contract's JSDoc:

- `destroy` MUST be idempotent; destroying a sandbox that does not exist MUST succeed. (Today this
  is a convention each adapter re-implements as a `notFound` regex; it becomes a required property
  the suite exercises.) The same clauses bind the optional `destroyById`.
- `destroy` MUST be **convergent**: it MUST NOT resolve while the vendor control plane still
  reports the sandbox as running. Where the driver declares a `probes.list`/`describe` capability,
  the suite verifies the sandbox is absent-or-terminal *after* `destroy` resolves. This promotes
  the strongest teardown in the repo — the GPU lane's terminate-then-verify-unlisted loop
  (`gpu/modal.ts:55-75`) — from folklore in one adapter to a clause every driver answers.
- `exec` MUST report the guest's real exit status: `sh -c 'exit 7'` yields
  `{ kind: "exited", code: 7 }`; a vendor that withholds the code MUST yield `kind: "unknown"` —
  never a forged number. stdout and stderr MUST NOT be merged.
- `launch` (or the harness fallback over `exec`) MUST produce *observable completion*: a detached
  command's done-file is readable afterwards. This clause is precisely the `detachedPoll` claim.
- A declared `files` capability MUST round-trip both directions: `writeText` then `readFile`
  returns the same bytes, and a file written via `exec` is readable via `readFile`. A driver with
  no working filesystem MUST omit the key (never a stub — ADR-0007 rule 2, now enforced rather
  than trusted); the suite then exercises the harness's exec-based read *and write* fallbacks.
- A `create` request carrying `gpu` MUST either provision it (verified: `nvidia-smi` succeeds and
  reports the requested model count) or fail create — never silently benchmark CPU.
- `create` failures MUST be classifiable: an error matching the registry's
  `retryableCreatePatterns` is a capacity signal the harness may retry; anything else is terminal.
  (The CSI pattern: error semantics defined by what the caller is entitled to do next.)

### 2. `@sandbox-benchmarks/driver/conformance`: one suite, any driver

A capability-gated suite in the contract package, embeddable as ordinary `bun test` and drivable
against **any** `SandboxDriver` — the `csi-sanity` shape:

```ts
import { conformance } from "@sandbox-benchmarks/driver/conformance";

conformance({
  driver: () => loadDriver("tama", { env }),
  declared: REGISTRY["tama"],          // the claims under test
});
```

The suite reads the declared capabilities and tests exactly those: lifecycle round-trip; exit-code
fidelity (0, 7, signal, and the unknown arm); stdout/stderr separation; cwd/env option handling;
detached launch + done-file observability (**verifies `detachedPoll`**); filesystem
read-what-you-wrote (**verifies `hasWorkingFilesystem` / `files` presence**); destroy idempotency
and destroy-of-missing; snapshot create/delete when declared; and **secret hygiene** — no declared
credential value may appear in any argv, log line or thrown error the suite observed (the redaction
promise, tested instead of assumed).

Two tiers, matching the repo's existing gate altitudes:

- **Kit tier (every PR, no credentials):** the suite runs against the kit's own machinery —
  `cliDriver` over a fake CLI, `computeSdkDriver` over a mock compute — so the *generic* drivers
  are conformant by construction, and a kit regression fails in-editor-fast CI. This tier also
  owns the kit's robustness invariants, each of which was reproduced as a real failure before
  being specified: a request whose reported boot artifact contradicts its requested one fails
  create (and tears down the orphan); a request carrying a spec axis the driver cannot map
  (`diskGb` on Modal) fails loudly rather than silently dropping it; a teardown failure after a
  primary failure surfaces **both** errors; partial staged-write failures aggregate; a failed
  lazy-context load is retried, not memoized forever; opt-in output caps truncate visibly
  (`truncated: true`) and are never applied by default — the results tar rides uncapped stdout;
  and host-side extraction of the sandbox-produced results archive rejects `..`/absolute members
  (the one genuinely hostile path seam, `collect.ts`'s `tar -xzf`).
- **Smoke tier (live, per provider):** the existing smoke lane runs the suite against the real
  vendor before the benchmark steps. One sandbox, a few extra minutes, on a lane that already
  boots one.

### 3. Capability honesty is the gate's verdict, not a side effect

The suite's output is a typed **declared-vs-observed report** (arktype-parsed at the process
boundary, per ADR-0001):

- **Overclaim** — declared but not observed (`detachedPoll: true` but the done-file never
  appears) — **fails the gate**. This is the namespace incident, caught in smoke instead of
  mid-benchmark.
- **Underclaim** — observed but not declared (a working `files` the driver omits) — is a recorded
  finding, not a failure: the sandbox merely runs slower paths, and the report says what's being
  left unused.
- **Bounded claims are bounded-verified.** `syncCapMs` cannot be cheaply proven (that would mean
  running a cap-length exec per smoke); the suite instead verifies the *consequence machinery* —
  that the declared durable path works — so a wrong cap degrades a measurement rather than
  stranding one.

TCK discipline follows: **a provider does not enter the published matrix until its smoke
conformance passes**, and the committed report is part of the provider's evidence. This is the
part that only makes sense because of what this repo *is*: the product is published measurement,
and "what the vendor's integration actually supports, verified on date X" is itself a measured,
publishable fact — the conformance report joins the run document as integration evidence, the way
`isolationFromRuntime` already records observed isolation rather than trusting the brochure.

### 4. Readiness is a strategy, not a loop

runcloud, microsandbox and tama each hand-roll a readiness poll with its own deadline handling and
terminal-state logic — the code the anatomy study showed is easiest to get wrong. Testcontainers'
decomposition applies directly: readiness is a **declared strategy object** with three orthogonal
axes — startup shape (create-returns-ready vs create-then-poll), the readiness signal (a
`cliDriver` poll+parse+select, an exec probe, a vendor state field), and a timeout. The kit owns
the loop once; drivers declare the strategy; the conformance suite exercises the declared strategy
and times it — which turns readiness itself into comparable evidence across providers, in a repo
whose business is exactly that comparison.

## Consequences

**Adding a provider gains one step that pays for itself:** the first smoke run now tells the author
"destroy is not idempotent: second destroy threw" or "declared detachedPoll but the done-file never
appeared" — the two mistakes that today surface as stranded benchmarks weeks later. The failure
names the operation and the spec clause, not a stack trace in a 55-minute run.

**We accept:**

- **Suite maintenance.** The conformance suite is code the team owns, and a gate's own bugs fail
  open. Mitigations are structural: the kit tier runs it against the kit's fakes on every PR (a
  broken suite breaks visibly), and the smoke tier is live, so fake-vs-vendor divergence is caught
  by the tier that matters.
- **Smoke minutes.** A few extra minutes and one sandbox per provider per smoke, on a lane that
  exists precisely to spend that.
- **Bounded verification of time-based claims.** `syncCapMs` and pricing-adjacent claims are not
  fully provable in a smoke; the gate verifies their consequence machinery, and the benchmark
  itself remains the deep verifier.
- **Spec language discipline.** Normative clauses in JSDoc can drift from the suite. The rule is
  ADR-0003's: the clause and its test are reviewed together; a clause without a test is marked
  `unverified` in the report schema, so untested normativity is at least visible.

**We explicitly do not:** publish a TCK for external consumers (the suite serves this repo's
fourteen providers, not an ecosystem); conformance-test streaming (unmodeled, per ADR-0007);
enforce performance thresholds in conformance (latency is the benchmark's job — conformance only
verifies *contract* behavior); or block on underclaims (honest under-declaration costs speed, not
correctness).
