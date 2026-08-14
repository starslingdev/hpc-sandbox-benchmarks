# GPU benchmark, three ways: ComputeSDK vs the driver kit vs main

Two compiling prototypes of the **same seven-step GPU benchmark flow** — plumbing (app / built
image / model volume) → create (GPU, caps, volume mount) → tag → stage files → run benchmark →
observe → verified teardown — compared against what `main` does today in
`apps/cli/src/lib/gpu/modal.ts`. Both prototypes typecheck against the real packages
(`@computesdk/modal`, `modal`) under the repo's strict flags; the command is in each file's
header.

| File | Style |
|---|---|
| [`computesdk-modal.ts`](./computesdk-modal.ts) | **A** — through `@computesdk/modal` (`defineProvider` wrapper). Markers ⛔/⚠/✓ per step. |
| [`kit-modal.ts`](./kit-modal.ts) | **B′** — the **gap-closed** driver kit (ADR-0006/0007/0008 as amended) over the native Modal SDK. Markers ✓ G1–G6, one per closed gap. |
| `apps/cli/src/lib/gpu/modal.ts` | **main** — hand-rolled native adapter (ADR-0007's "the port already exists" evidence) |

An earlier revision of `kit-modal.ts` carried its own ⛔/⚠ markers (B1–B3). Those became the gap
ledger below, the ledger became ADR amendments, and this prototype was rebuilt against the
amended contracts — the file now demonstrates each closure in place.

## Verdict at a glance

| Dimension | A: computesdk | B′: gap-closed kit | main |
|---|---|---|---|
| Author code lines (seven steps) | ~83 | ~145 (+ ~190 kit, written once) | ~95 driver-shaped (of 234 in the file) |
| GPU / caps / volume params **typed** | ⚠ no — `[key: string]: any` passthrough; `gup: "H100!"` compiles (proof in file) | ✓ typed `gpu: { model, count }` on `CreateRequest` end-to-end; typo is a compile error (proof) — **G1** | ⚠ native-typed, but the GPU axis is bespoke to this lane |
| Built image (dockerfileCommands + kernel-snapshot cache) | ⛔ no channel for an `Image` object; id-round-trip abandons the cache | ✓ registry artifact `{ kind: "built", recipe }`; the driver's lazy `Ctx` factory resolves it — **G3** | ⚠ closure state, outside the registry |
| Registry membership / transport gate | n/a | ✓ `modal-gpu` is a registry row; `transportOf("modal-gpu")` replaces the hand-carried const, claims fall under ADR-0008 — **G3** | ⛔ routes around the registry; `MODAL_TRANSPORT` hand-carried |
| `setTags` attribution | ⛔ unwrap nominally broken (wrapper vendors its own `modal` copy; double-cast, two SDKs in-process) | ✓ `session.native` is the real typed `Sandbox` — and the bridge rule (**G4**) says wrapper drivers expose *wrapper* types, never cast across | ✓ direct |
| Stage files (writes) | ✓ `filesystem.writeFile` | ✓ `files.writeText` is port surface; absent ⇒ harness base64-over-exec fallback; conformance round-trips both directions — **G2** | ✓ native call |
| Exit fidelity | ⚠ `exitCode: number`; transport choices fixed by wrapper | ✓ `Exit` union; drain/wrapping owned by the driver | ✓ hand-rolled |
| Verified teardown | ⚠ only via wrapper `list()`, different client than terminated | ✓ **convergent destroy is an ADR-0008 clause**; `terminateConverged` implements it once for `destroy` and `destroyById` — **G5** | ✓ but folklore: exists only here, untestable without a live sandbox |
| Bare-id destroy (reaper lanes) | ✓ genuinely convenient | ✓ optional `destroyById`, same idempotency clauses — **G6** | ⚠ not available |
| Conformance-testable (ADR-0008) | ⚠ behind the wrapper's fixed choices | ✓ the table is the suite's direct target; gpu-honesty clause: provision or fail, never silent CPU | ⛔ inline adapter, no named contract |

**Bottom line.** With the gaps closed, the kit expresses everything main does — same native SDK,
same verified teardown, same staging — plus what main lacks: registry membership (so the GPU
lane's transport claims are finally gate-able), a typed vendor-neutral GPU axis, a named contract
a conformance suite can drive, pure unit-testable teardown, and bare-id reaping. ComputeSDK's
position is unchanged: its genuine conveniences (writeFile, bare-id destroy) are now port
surface, while its structural limits for this workload (private client, untyped passthrough,
vendored-SDK unwrap) are not fixable from our side.

## The gap ledger — closed

| Gap (from the first prototype) | Closure | Where |
|---|---|---|
| B1 — `CreateRequest` had no GPU axis | `gpu?: { model, count }` on the request; driver maps to vendor syntax; conformance: provision-or-fail | ADR-0007 §2, ADR-0008 §1 |
| B2 — `files` was read-only; staging writes | `SandboxFiles` = read + exists + write, all-or-nothing; harness fallbacks for both directions; round-trip conformance | ADR-0007 §2, ADR-0008 §1 |
| B3 — artifact model assumed a resolvable ref | `{ kind: "built", recipe }` artifact kind; driver `Ctx` factory resolves at run time; GPU lane joins the registry | ADR-0006 §1 |
| A4-class — bridge natives cross vendored SDKs | Rule: bridge `native` keeps the **wrapper's** types; needing repo SDK types means write a native driver | ADR-0007 §6 |
| Verified teardown was folklore | Convergent-destroy clause: MUST NOT resolve while still listed; probes-gated verification in the suite | ADR-0008 §1 |
| No bare-id destroy | Optional `destroyById` on the port, bound by the same idempotency clauses | ADR-0007 §2, ADR-0008 §1 |

## The polish round (adversarially reviewed)

A 24-item refinement list was adversarially reviewed with compiled evidence
(scratch prototypes; verdicts in `kit-modal.ts`'s header as ✓ P1–P8). Accepted/adapted:
parse-once `CreateRequest` boundary with **deep** undeclared-key rejection (`"+": "reject"` was
proven *shallow* — nested `spec.memroyGb` sails through it; `.onDeepUndeclaredKey` is required),
units reconciled with the repo's `targetSpecSchema` (the prototype had been minting a third,
unit-clashing spec shape), optional `diskGb` with loud failure when present-and-unmappable,
driver-*reported* `artifactRef` with mismatch-fails-create, `SuppressedError` teardown
preservation, memo-clear on ctx failure (bricking was reproduced), streaming `TextDecoder`
(split-UTF-8 corruption was reproduced), per-call opt-in output caps, and `destroyById` catching
only Modal's typed `NotFoundError`. Rejected, with evidence: arktype `.brand()` for `SandboxId`
(zero new checks for a 288 ms import in every driver file), branded `BenchPath`s (the staged list
is a 7-entry committed constant written into a disposable vendor-isolated sandbox — the *real*
path seam is host-side tar extraction in `collect.ts`, now an ADR-0008 conformance item), and any
kit-default stdout bound (it would truncate the multi-MB base64-tar results transport into a
retry loop that can never succeed). `verify.ts` proves P1/P4/P5/P6/P7 at runtime with no
credentials: `bun run verify.ts`.

## Line-count honesty

B′'s author section grew from ~123 to ~145 lines — closing gaps added surface (`destroyById`,
`files.exists`, the gpu mapping) rather than removing it. The wrapper (A, ~83) is still shortest
and still can't do the job: its lines exclude the second native client it forces for plumbing,
and no line count fixes the untyped passthrough or the vendored-SDK unwrap. Against **main**
(~95 driver-shaped lines), B′ carries ~50 more, which buy: registry membership, the typed join,
`Exit`, convergent-destroy-as-spec, `destroyById`, and a contract ADR-0008 can verify — main's
version has none of these and its strongest behavior (verified teardown) exists nowhere else in
the fleet.
