# CPU matrix accuracy spec

## Sources of truth

- `packages/schema/src/suites.ts` owns wave membership. Every `Suite` declares a required
  `wave`, and `BENCHMARK_WAVE_ORDER` defines the only execution order:
  `synthetic-memory` → `synthetic-system` → `realworld`.
- **Synthetic - Memory** (`synthetic-memory`) contains only the `memory` suite.
  **Synthetic - System** (`synthetic-system`) contains every other non-realworld suite. Plan
  verification rejects a batch or round whose declared wave disagrees with any member cell,
  including any memory/non-memory mix.
- The same suite registry owns the cpu-node sample floor. `CPU_NODE_MIN_SAMPLES` is 10, and the
  default cpu-node plan must satisfy
  `defaultReplicas × ptsTimesToRun >= CPU_NODE_MIN_SAMPLES`.

## Decisions

Synthetic - Memory runs first because STREAM is short and especially sensitive to shared-host level
shifts; its wave finishes before longer work can contend for account capacity. Synthetic - System
runs next, preserving the existing realworld-last boundary.

For cpu-node, use five replicate sandboxes and two fixed PTS passes per sandbox. A complete normal
matrix cell therefore publishes `5 sandboxes × 2 trials = 10` pooled
`node_web_tooling_runs_per_s` samples. Increasing replicas also improves the independent-sandbox
axis; relying on PTS convergence would not guarantee a published count because managed plans pin
fixed passes.

## Invariants and non-goals

- Journal and plan immutability, fail-independent account scheduling, coverage checks, and partial
  publication semantics remain unchanged.
- A partial Run may retain fewer than 10 Node samples when planned cells fail; the permanent
  complete-plan default is the guarantee, and the coverage report records the shortfall.
- Workflow overrides can intentionally request lower counts, but blank/default matrix inputs cannot.
- No in-run cell retry or retry-policy change is introduced.
