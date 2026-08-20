---
status: accepted
---

# Driver conformance: the behavioral drift gate

## Context

This repo gates every **data** projection it depends on. ADR-0003 holds the generated catalog
byte-stable against its XML source; ADR-0006 drift-gates CI wiring and generated fleet files against
the registry; ADR-0007 makes registry↔driver existence a compile error in both directions. But the
current registry also carries behavioral claims, and nothing gates them:

| Current claim | Current owner | Failure mode |
|---|---|---|
| `transport.detachedPoll` | registry | sends long work to a path that may not complete durably |
| `transport.syncCapMs` | registry | permits synchronous work beyond the integration's safe policy |
| `transport.streaming` | registry | unused by any transport decision, so no meaningful verifier exists |
| working filesystem | adapter shape | a truthy throwing stub is mistaken for a capability |
| retryable create prose | harness regex | vendor wording changes retry-vs-fail behavior |
| artifact option key | CLI/registry switches | the requested artifact can differ from what booted |

The repo has already paid for this twice:

- **namespace, `detachedPoll: false`** — a wrong hand-written claim forced a 55-minute benchmark onto
  a synchronous exec its server cut at ~4m19s, stranding the run (`providers.ts:55-58`).
- **namespace, `UnsupportedFileSystem`** — a truthy stub advertised a filesystem whose every method
  threw; 12 straight poll failures killed the step (ADR-0007 Context).

The mature “N vendors, one contract” ecosystems converge on the same answer: the contract ships
with the suite that verifies implementations against it. Kubernetes CSI's `csi-sanity` is
capability-gated; Terraform provider tests drive real create/read/destroy cycles and verify remote
resources are gone; JDBC attaches compliance meaning to a test suite rather than a type name.

The repo already owns the right live host: the smoke lane boots one sandbox per provider and is
designed so a green result cannot hide that the provider was never exercised.

## Decision

### 1. The port gets normative, testable semantics

ADR-0007's port acquires short CSI-style clauses in its JSDoc:

- `destroy` MUST be idempotent. Calling it twice, or destroying an already-absent sandbox by id,
  MUST succeed.
- `destroy` MUST be **convergent**. It MUST NOT resolve while the control plane reports the sandbox
  as running. After it resolves, `probes.observe(sandboxId)` MUST report `terminal` or `absent`.
- `exec` MUST preserve stdout and stderr as separate streams and report the guest's real exit status:
  `sh -c 'exit 7'` yields `{ kind: "exited", code: 7 }`; a withheld code yields `kind: "unknown"`,
  never an invented number.
- A durable execution strategy MUST produce observable completion: after launch, the command's
  done-file is readable afterward. This binds both `native-launch` and `shell-detach` strategies.
- A present `files` capability MUST round-trip both directions: `writeText` then `readFile` returns
  the same bytes, and a file written through `exec` is readable through `files`. If `files` is absent,
  the kit's exec-based read and write fallbacks MUST pass the same round-trip.
- A `create` request carrying a GPU MUST either provision the requested model/count or fail with a
  typed `invalid-request`/unsupported error before returning a session; it MUST never benchmark CPU
  silently.
- When create reports a `ResolvedArtifact`, it MUST match the request; a contradiction MUST tear down
  the orphan and fail. When the vendor cannot report it, smoke MUST match an expected immutable
  fingerprint from inside the guest. Request fallback without either observation is `unverified`.
- Create failures crossing the port MUST be `SandboxCreateError` values. The harness retries only
  stable kinds, never vendor error prose.

Every clause names an observable caller guarantee. Implementation notes and vendor-specific error
tables remain in drivers; they are not elevated into universal contract text.

### 2. Capabilities have one owner and one verifier

There is no second boolean capability registry. Capability-by-presence is the declaration:
`session.files`, `session.launch`, `driver.snapshots`, and `driver.probes` are present and working or
absent. Driver-module policy owns readiness and execution strategy. The data registry owns neither.

The conformance inventory is closed and explicit:

| Claim | Declaration source | Observation criteria | When absent |
|---|---|---|---|
| core lifecycle | port (always) | create, readiness, live exec 0/7, split streams, destroy twice; kit fakes cover signalled/unknown mapping | `fail` |
| artifact identity | request + session evidence | reported ref equals requested or guest fingerprint matches; contradiction fake proves orphan teardown | `not-applicable` for `none`; otherwise `unverified` without observation |
| durable execution | `module.execution.durable` | done-file becomes readable through the selected strategy | `not-applicable` only when durable is `none` and sync is uncapped; `{ durable: "none", syncCapMs: number }` is a construction error |
| sync routing | `module.execution.syncCapMs` | kit router selects durable at the boundary; live durable probe passes | `not-applicable` when cap is `null` |
| filesystem | `session.files` presence | native round-trip when present; exec fallback round-trip when absent | fallback is tested, not skipped |
| control-plane convergence | `driver.probes.observe` | post-destroy observation is `terminal` or `absent` | `unverified` |
| snapshots | `driver.snapshots` presence | create, identify, delete; cleanup runs on failure | `not-applicable` |
| GPU | request `gpu` axis (`CreateRequest.gpu?`) + `module.accelerator` | when requested, the module's accelerator strategy observes the normalized model/count in-guest, or typed rejection | typed rejection is a pass for drivers with no accelerator strategy |
| readiness | module readiness strategy | declared signal reaches ready within its declared budget | `fail` |
| secret diagnostics | secret-sourced registry inputs + driver spawn/log sinks | no secret in any observable diagnostic surface | `fail` |

`transport.streaming`, registry `retryableCreatePatterns`, and `artifact.optionKey` are deliberately
not in this inventory. Streaming has no consumer; retry classification is a typed driver error; and
vendor artifact syntax is driver code. `syncCapMs` is treated as a conservative routing policy: smoke
does not sleep for the cap, but it does prove the router and the durable consequence used at that
boundary.

Two of these rows lean on module-side declarations that ADR-0007 makes structural rather than
conventional. Execution is a discriminated union, so the `{ durable: "none", syncCapMs: number }`
combination the durable row excludes is a compile-time or boundary-validation failure — never a
conformance row asking the suite to exercise an undefined route. The GPU row reads the module's
accelerator strategy for its guest probe: the shared NVIDIA strategy uses `nvidia-smi`, while each
future accelerator family supplies its own command, parser, and normalized model/count matcher. The
gate stays vendor-neutral; only the strategy knows the tool.

This design also drops the old “observed-but-undeclared” promise. A generic port cannot safely
discover a native filesystem or snapshot API that the driver did not expose, and probing vendor
internals would make the TCK provider-specific. Presence capabilities cannot underclaim: exposing
the member is the declaration. A module that declares `native-launch` without a `launch` member is a
construction/type error; a working but intentionally unexposed vendor feature is simply outside this
repo's integration contract.

### 3. `@sandbox-benchmarks/driver/conformance`: one suite, any driver

The contract package exports a suite embeddable in ordinary `bun test` and usable against any
driver module:

```ts
import { conformance } from "@sandbox-benchmarks/driver/conformance";

conformance({
  module: await loadDriverModule("tama"),
  context: tamaContext,
});
```

The module itself supplies behavior policy; the registry supplies only inputs and artifact
resolution through the already-built context. There is no `declared: REGISTRY[id]` capability bag.

Two tiers match the repo's gate altitudes:

- **Kit tier (every PR, no credentials):** the contract package runs the suite against `cliDriver`
  over a fake executable and the pure routing/readiness helpers; the fleet package embeds the same
  suite against its private `computeSdkDriver` over a fake compute. This tier owns
  contradiction cleanup, deep request rejection, typed create failures, retryable lazy context,
  `SuppressedError` preservation, staged-write aggregation, UTF-8 stream `TextDecoder`
  correctness (chunk-boundary decoding — not transport streaming), visible opt-in truncation,
  uncapped results transport, safe archive extraction, and secret redaction at the spawn boundary.
- **Smoke tier (live, per provider):** run the closed inventory against the selected real vendor
  before benchmark steps. It uses the smallest number of sandboxes compatible with teardown and
  snapshot cleanup and emits one parsed report.

The existing stub `CapabilityFlags`/`ProviderDescriptor` model in `schema/index.ts` and
`@repo/test-utils` is removed during implementation. Keeping it beside this suite would create two
capability vocabularies with different owners and make the new gate cosmetic.

### 4. Secret hygiene distinguishes execution from diagnostics

CLI authentication sometimes has no channel except a flag. In that case the secret necessarily
exists in the child process's **real execution argv**. `secretFlags` does not claim otherwise; it
defines which following values must be replaced in the separately constructed diagnostic argv.

The rule is:

- prefer environment, stdin, or a protected config file when the vendor supports one;
- never reconstruct a command string from raw argv;
- never place a declared secret in logged, reported, serialized, error-rendered, or test-snapshot
  argv, stdout/stderr annotations, or thrown error messages; and
- keep the raw argv local to the spawn call while every observer receives only the redacted form.

The kit tier injects sentinel secrets, captures the spawn call and every diagnostic sink, and proves
that execution receives the sentinel where required while observers receive the redaction token. The
live tier inspects only observable diagnostics; it does not make the false claim that a vendor-mandated
flag is absent from the operating system's process table. Drivers that require such a flag record that
transport as security evidence so the exposure is reviewable.

### 5. Report statuses and matrix admission are unambiguous

Each inventory row produces one of:

- `pass` — the required observation succeeded;
- `fail` — behavior contradicted the contract or declaration;
- `not-applicable` — an optional capability is absent and the contract defines the absent path; or
- `unverified` — the suite lacked an observation path or no verifier exists.

For a **new provider**, matrix admission accepts only `pass` and `not-applicable`. Any `fail` or
`unverified` status blocks admission. In particular, omitting `probes.observe` does not turn destroy
convergence green; it reports `unverified`, which blocks publication.

Because pull requests intentionally receive no provider secrets, admission is a two-step promotion,
not an impossible PR-time live gate: the registration/driver PR lands with the provider absent from
`bench-matrix.yml`; the privileged smoke lane on `main` produces a workflow artifact tied to its
run; a follow-up promotion PR commits the parsed report and adds the provider to the matrix. The
drift gate rejects a matrix edit without a current passing report. “Current” means the report's
contract version and hashes of the driver module plus behavior-relevant metadata match the tree;
changing any of them requires a new live report. Local credentials may exercise the same suite
earlier, but local output is not publication evidence.

Existing matrix providers may use a temporary, committed migration waiver with an owner, reason,
and expiry while the fleet is moved to the port. A waiver never admits a new provider, never changes
the report status to `pass`, and fails CI after expiry. There are no implicit exceptions.

The arktype-parsed report records provider id, driver revision, test tier, requested/reported
artifact, observation provenance and fingerprint, timestamps, clause ids, statuses, and bounded
diagnostics. The latest passing smoke report is committed under a deterministic provider path and
referenced from the Run as integration evidence.

### 6. Readiness is a strategy, not a copied loop

runcloud, microsandbox, and tama each hand-roll readiness polling with different deadline and
terminal-state behavior. The module instead declares a strategy with three orthogonal parts:

- startup shape: `create-returns-ready` or `create-then-poll`;
- signal: CLI poll+parse+select, exec probe, or typed vendor-state probe; and
- total budget plus per-attempt timeout.

The kit owns backoff, jitter policy, deadline accounting, terminal-state handling, and cleanup. The
suite drives every strategy against deterministic fakes and times the live strategy. This keeps the
provider file declarative without pretending vendors share one readiness signal.

## Consequences

Adding a provider gains one meaningful step: its first smoke run names the exact failed clause—such
as destroy convergence, durable completion, or artifact identity—before a long benchmark can strand.

**We accept:**

- **Suite maintenance.** The kit tier tests the TCK itself against deterministic fakes; the live tier
  catches fake/vendor divergence.
- **Smoke minutes.** A few extra minutes and the minimum live resources necessary to prove cleanup,
  on a lane whose purpose is to spend them.
- **No generic feature discovery.** Capability-by-presence is honest and type-safe but cannot report
  vendor features the integration chose not to expose.
- **Bounded verification of time policy.** Smoke proves routing and durable consequences, not a
  multi-hour vendor cutoff.
- **A mandatory observation path for publication.** A driver can run locally without
  `probes.observe`, but it cannot enter the published matrix because destroy convergence would be
  unverified.

**We explicitly do not:** conformance-test streaming until the port consumes it; enforce performance
thresholds in conformance; classify vendor failures by shared regex; probe undeclared native APIs;
allow `unverified` to pass new-provider admission; or publish a general-purpose external TCK. This
suite serves this repository's fleet and its measurement-integrity contract.
