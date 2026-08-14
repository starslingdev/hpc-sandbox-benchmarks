# GPU benchmark, three ways: ComputeSDK vs the driver kit vs main

Two compiling prototypes of the **same seven-step GPU benchmark flow** — plumbing (app / built
image / model volume) → create (GPU, caps, volume mount) → tag → stage files → run benchmark →
observe → verified teardown — compared against what `main` does today in
`apps/cli/src/lib/gpu/modal.ts`. Both prototypes typecheck against the real packages
(`@computesdk/modal`, `modal`) under the repo's strict flags; the command is in each file's
header. Markers in the sources: ⛔ inexpressible, ⚠ expressible but degraded, ✓ genuinely good.

| File | Style |
|---|---|
| [`computesdk-modal.ts`](./computesdk-modal.ts) | **A** — through `@computesdk/modal` (`defineProvider` wrapper) |
| [`kit-modal.ts`](./kit-modal.ts) | **B** — ADR-0007 driver kit over the native Modal SDK |
| `apps/cli/src/lib/gpu/modal.ts` | **main** — hand-rolled native adapter (the ADR-0007 "the port already exists" evidence) |

## Verdict at a glance

| Dimension | A: computesdk | B: kit | main |
|---|---|---|---|
| Author code lines (seven steps) | ~83 | ~123 (+ ~61 kit, written once) | ~95 driver-shaped (of 234 in the file) |
| GPU / caps / volume params **typed** | ⚠ no — `[key: string]: any` passthrough; `gup: "H100!"` compiles (proof in file) | ✓ native `SandboxCreateParams`; typo is a compile error (proof in file) | ✓ native |
| Built image (dockerfileCommands + kernel-snapshot cache) | ⛔ no channel for an `Image` object; id-round-trip through `snapshotId`, cache abandoned | ✓ typed `Ctx` member | ✓ closure state |
| Pre-create plumbing (app/volumes) | ⛔ wrapper's client is private → a **second native client** | ✓ explicit typed `Ctx`, built once by the CLI | ⚠ works, but implicit in closures |
| `setTags` attribution | ⛔ unwrap is **nominally broken** — wrapper vendors its own `modal` copy; `as unknown as` double-cast, two SDKs in-process | ✓ `session.native` is the real typed `Sandbox`, one hop | ✓ direct (`sandbox.sdk`) |
| Stage files (writes) | ✓ `filesystem.writeFile` — the wrapper's best moment | ⚠ needs the `files.writeText` extension (gap B2) | ✓ `sdk.filesystem.writeText` |
| Exit fidelity | ⚠ `exitCode: number` fine here; transport choices (stream draining, shell wrapping) fixed by wrapper | ✓ `Exit` union; drain/wrapping owned by the driver | ✓ hand-rolled |
| Verified teardown (terminate + not-listed poll) | ⚠ only via wrapper `list()` (heavyweight rows, different client than terminated) | ✓ pure `destroy` in the table — directly unit-testable | ✓ but untestable without a live sandbox |
| Bare-id destroy (no session needed) | ✓ genuinely convenient | ⚠ needs a session or a probes-level op | ⚠ same |
| Conformance-testable (ADR-0008) | ⚠ behind the wrapper's fixed choices | ✓ the table is the suite's direct target | ⛔ inline adapter, no named contract |
| Registry / typed join | n/a (outside both) | ⚠ needs a `modal-gpu` entry; artifact model gap B3 | ⛔ routes around the registry entirely |

**Bottom line.** ComputeSDK's wrapper is the wrong altitude for this workload: the four things the
GPU benchmark exists to control — which GPU, the resource caps, the built image, the volume
mount — are exactly the things that go untyped (A3), unreachable (A1/A2), or nominally broken
(A4) through it. The kit costs more lines than the wrapper *in this one driver* because the
genuine Modal complexity (stream draining, verified teardown) has to live somewhere — on main it's
the same code, minus the contract. What the kit buys over main for the same logic: the GPU path
stops being a bespoke lane (named port → registry join → lazy loader → ADR-0008 conformance), its
teardown/exec become pure, unit-testable table members, and `StepRunner`'s transport facts come
from the registry instead of a hand-carried const.

## Remaining DX gaps the prototypes exposed (the actual payload)

1. **B1 — `CreateRequest` is CPU-shaped.** No GPU axis. Options: an optional `gpu?: string` on
   the port request (Modal-only today, but tama/runcloud GPU tiers exist) or a per-driver create
   extension typed in the driver spec. Decide in ADR-0007 before migration.
2. **B2 — `files` is read-only, but staging writes.** Producer staging (`writeText`) is a real
   harness-side need the port can't express; main uses the native API, prototype B extends the
   table. Modal, e2b and daytona all support writes — promote `files.write` to an optional port
   capability, verified by ADR-0008's read-what-you-wrote check.
3. **B3 — the registry artifact model assumes a resolvable ref.** The GPU image is *built
   in-process* (dockerfileCommands + kernel-snapshot cache keyed by content). ADR-0006's
   `artifact` needs a `built` kind (resolver runs at create time, in the driver's `Ctx` factory)
   or the GPU lane stays registry-external — currently it is, and that's why it has no transport
   gate (the `MODAL_TRANSPORT` const is hand-carried at `gpu/modal.ts:14-18`).
4. **A4-class risk applies to the bridge too.** The wrapper vendoring its own `modal` copy means
   `computeSdkDriver`'s `native` handle for wrapper-based providers is typed against a *different*
   SDK instance than any native code in the repo. The kit's bridge should surface the wrapper's
   vendored types, not the repo's, and say so.
5. **Verified teardown should be spec, not folklore.** Main's terminate-then-verify-unlisted loop
   is the strongest destroy semantics in the repo and exists nowhere else. Candidate ADR-0008
   clause: *destroy MUST NOT return while the control plane still lists the sandbox* — Modal's
   driver already implements it; conformance would force the question for the other thirteen.
6. **Bare-id destroy is a real ComputeSDK convenience the port lacks.** Reaper/cleanup flows want
   `destroy(id)` without a live session. Candidate: an optional `probes`-adjacent
   `destroyById(id)` capability, instead of resurrecting `getById`.

## Line-count honesty

Prototype B's author section (~123 lines) is *larger* than A's (~83) — the wrapper really does
absorb stream-draining and file plumbing. The comparison that matters is against **main** (~95
lines of driver-shaped code for the same steps, plus the untyped/unverifiable properties above)
and against what A *cannot do at all*: A's 83 lines only reach parity by running a second native
client for plumbing, double-casting across two vendored SDK copies for tags, and giving up
compile-checking on the four parameters the benchmark publishes.
