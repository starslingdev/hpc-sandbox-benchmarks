# CPU benchmark fixes and validation — 2026-09-13

These changes start from remote main `08dfc6eb132dee567352ffa97abb96daa4db3153` on
`codex/cpu-benchmark-readiness-fixes`. They apply to newly frozen experiments. The active
[run 34781421576](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34781421576)
continues using its original main revision and evidence.

**Merge readiness remains blocked on provider validation.** The corrected commands and local
pipeline checks pass, but Blaxel's native compiler crashes and the Runcloud/Tama provisioning
envelopes still need confirmation on the fixes revision. The acceptance criteria below distinguish
these remaining requirements from already verified code changes.

## Account scheduling

The frozen live plan has 648 cells across twelve provider variants and eleven quota domains.
The current Actions capacity variable declares 75 Modal sandboxes, 26 Runcloud sandboxes, and
40 for every other domain. Its last update was 2026-09-13 at 20:36:59 UTC. Remote main and
these values were rechecked during implementation; no variable was changed.

Main separated provider variants into different jobs sharing the same account concurrency group.
That serialized Modal gVisor and VM even when their combined demand fit the declared capacity.
The revised planner groups compatible cells by account and wave. One job receives the entire
frozen provider list, verifies its account and credential scope, reconciles the account once,
and runs one shared pool. The other allocating workflows retain the same account exclusion.

| Account | Synthetic cells / concurrency | Real-world cells / concurrency |
| --- | --- | --- |
| Modal, both variants together | 36 / 75 | 72 / 75 |
| Runcloud | 18 / 26 | 36 / 26 |
| Other single-variant accounts | 18 / 40 | 36 / 40 |

At these capacities, both Modal variants can start every cell in each wave concurrently.
Runcloud refills its real-world pool as allocations finish. No replica or pass count is reduced.
The default provider list includes Tama, restoring the twelve-variant, 648-cell scope; explicitly
blank provider selection still means all thirteen registered variants, including Daytona Container.

Additional admission defects are closed:

- A settled task no longer releases capacity when allocation ownership remains unresolved.
  Unconfirmed cleanup, ambiguous create cleanup, or failed journal persistence stops new
  admissions. Already admitted peers can still finish and release their own allocations.
  Unstarted cells retain explicit failed evidence in the original denominator.
- A typed concurrent-quota rejection also stops new admissions. Previously, each clean rejection
  freed a scheduler slot and immediately sent another queued cell into the same exhausted quota.
  The worker preserves the frozen capacity and failed-cell evidence; it does not replay creates or
  silently lower the requested policy. A regression verifies accepted peers still complete and
  persist their release records.
- The workflow flattened multiple planner rounds into one released axis. Large replica overrides
  could therefore exceed GitHub's pending-job limit. Planning now rejects more than 64 batches in
  either account wave before dispatch. The pure planner can still represent multiple rounds.

Tests cover simultaneous measurement by both Modal variants, bounded refill, unresolved cleanup,
failed release persistence, healthy peer cleanup, exact provider-list binding, and queue overflow.

A final concurrency review reproduced two additional races through the real execution harness.
An allocation journal failure originally stopped refill only after its cleanup settled; a healthy
peer could finish first and admit a third allocation during that delay. Also, a worker waiting
for its intent append did not recheck a quota refusal that arrived from another worker. Both
regressions failed before the correction. Admission now stops immediately when persistence or
failed-create ownership becomes uncertain, and checks the shared stop state immediately before
each vendor create. Existing allocations still finish and release; waiting and unstarted cells
retain failed receipts without allocating. All seventeen execution integration tests pass.

## Workload corrections

**Mastra:** PTS 10.8.4 supplies a profile-directory `HOME` ending in `/`. Node preserves that slash
in `homedir()`, while `path.join()` removes it, breaking the pinned filesystem tests' tilde
substitution. The shared runner canonicalizes the same existing directory before preparation or
measurement. Against Mastra's exact pinned checkout, the original environment produced five
failures and 121 passes; the corrected environment produced 126 passes in the same filesystem file.
The core command invokes pinned Vitest 4 directly with supported fork/worker flags and the same
`--exclude` argument as upstream `test:unit`. Discovery remains controlled by the pinned project
configuration, which still runs some tool-builder tests; no additional files are filtered out.
Direct invocation avoids the nested pnpm/npm script chain and the removed `poolOptions` option.
The current main run forwards that invalid option and fails before test discovery.

The full pinned Core workload then passed through the shared runner: 738 test files passed and
one skipped; 11,844 tests passed, 110 skipped, 33 todo, zero failures or type errors. This recovers
exactly the five failures reported alongside 11,839 passes in the handoff. The measured task
returned exit 0 and `REALWORLD_RESULT_SECONDS: 858.749`. The local Linux ARM64 container had
four CPUs and an 8-GiB limit; the runner's task cap was 7,142,756,352 bytes and observed peak use
was 4,654,530,560 bytes. These timings verify completion locally, not a provider ranking.

**OpenClaw:** monolithic type-aware lint exceeds the target memory budget. The replacement helper
uses upstream declaration preparation, pinned Oxlint file discovery, upstream shard configurations,
and type-aware rules. It runs deterministic, sequential groups of at most 1,000 selected files.
The whole-repository lint task retains its scope. The former extension-channel command selected
no files at this pin, so it is replaced by a distinct `lint_extensions_all` metric covering the
actual upstream extension file set. Empty or duplicate file discovery fails. The menu, task
commands, suite metrics, overrides, and generated catalog change together.

The shared runner retains its timeout and memory containment. The final PTS selftest passes after
all installer/helper changes: five intended metrics have positive values; deliberate timeout and
OOM probes have none; preparation and warm-up counts match; the cap engages; and no processes
leak. The normal workspace tests also execute file-union, empty-input, and extension subprocess
regressions.

The full exact-pin lint passed through the production runner with exit 0 and
`REALWORLD_RESULT_SECONDS: 553.851`. Warm-up and measured execution each covered 17,137 files
across nineteen batches: 10,309 core files, 6,264 extension files, and 564 script files. Peak memory
was 5,827,125,248 bytes with zero memory-cap or OOM events under the same four-CPU container and
7,142,756,352-byte task cap. Total runner wall time, including warm-up, was about 1,050 seconds;
each individual command remained below the existing 1,200-second timeout.

The independent all-extension task also passed through its own warm-up and measured execution,
covering all 6,264 files in seven batches each time. It returned exit 0 and
`REALWORLD_RESULT_SECONDS: 289.957`, with peak memory of 5,770,985,472 bytes and no cap or OOM events.
These checks exercise the repaired commands, installer, shared runner, preparation, reset, and
warm-up behavior. They do not constitute a rerun of every unchanged task or provider environment.

Together the two repaired lint tasks consumed 1,618.857 seconds (26.98 minutes), including
preparation and warm-ups, under the default one-pass policy. That leaves 53.02 minutes of the
80-minute suite command budget for the other four tasks and overhead on this local machine.
Two passes would double the observed lint cost to 53.96 minutes. The smallest individual-command
margin is Mastra Core: 341.251 seconds below its 1,200-second timeout. These bounds establish local
fit; slower provider environments still require the monitored measurements and a fresh fixes run.

## Aggregation, dataset, and leaderboard

Fixed-pass completeness requires positive measured PTS trials matching the frozen count exactly.
`RawString` proves individual samples, but PTS 10.8.4 deliberately omits it when a single trial
equals the final value. That case is accepted only when the original XML's `test-run-times`
metadata proves exactly one error-free execution and its original `Value` matches the stored
measurement. A bare headline `Value` remains insufficient. Normalization records sample origin,
and aggregation preserves it per sandbox replicate. Known harness timings keep their independent
sampling contract.

Publication verifies the original raw-tree and Run digests, confines reads to the expected raw
provider directory, and checks the exact samples in the shard's original XML source. Historical
shards without the new origin field can still prove their trials from that XML. Retired catalog
metrics remain unverified; removing a definition cannot silently grant the harness exemption.
No original artifact or frozen denominator is rewritten.

The integration tests run actual normalization, aggregate and promote commands, build the dataset
index, and invoke the leaderboard. A complete OpenClaw fixture uses the producer's real one-trial
XML shape across two providers, two sandbox replicates, and all six current tasks, including the
new all-extension metric. Each replicate keeps its original one-trial evidence; figure ingestion
includes all six tasks and both providers with no dropped or incomplete entries, correct totals
and deterministic HTML. Negative tests cover partial,
aggregate-only, substituted, and escaped raw evidence. Separate Chrome-backed figure tests verify
image rendering.

The committed leaderboard and its three figures are regenerated from the same published
`33804295335` dataset. Retiring the no-op channel metric removes its eleven provider records
from the current catalogued view; the dataset and raw observations are unchanged. Missing-task
captions now say that measurements are absent, rather than inventing a failed execution for a
task added after that historical run. The OpenClaw figure was visually inspected after rendering.

## Live evidence and remaining validation

Runcloud's synthetic wave completed successfully: all eighteen attempts have confirmed cleanup,
all expected metrics, and verified two-pass evidence across 78 PTS measurements. The new evaluator
accepts those immutable artifacts without rewriting them. No 429 or interrupted-boot failure was
observed in that wave. Main opened the real-world wave despite Tama's failure, confirming the
earlier wave-gate correction. Its external approval cleared and real-world execution was observed
by 21:38:50 UTC.

The real-world Runcloud wave disproved the declared capacity of 26 for this run: its journal records
25 accepted, unreleased allocations followed by eleven creates rejected with HTTP 429, "concurrent
sandbox resource limit reached." No successful allocation was released before that cascade. This
establishes that 26 was unsafe under the observed account conditions; it does not distinguish a
sandbox-count quota from an aggregate CPU or memory quota. The Actions variable remains unchanged.
Before the next run, reconcile the effective account limits: 25 was the observed accepted pool,
and a higher setting requires confirmed additional capacity. The worker now stops the cascading
refill; this code fix cannot raise vendor capacity.

That incident also exposed a Runcloud driver defect: the native SDK's `status` field was not mapped
to `DriverError.vendorHttpStatus`, so the existing typed capacity classifier missed the rejection.
The Runcloud adapter now projects its SDK-owned status and detail before crossing the shared driver
boundary. A native-SDK-error reproduction now preserves HTTP 429 and reaches the capacity classifier;
all thirty Runcloud tests pass. No generic message-based classification or hidden create retry was added.

The live Runcloud Mastra log independently confirms that main's Core command fails before test
discovery: pinned Vitest 4.1.9 rejects `--poolOptions.forks.singleFork=true` as an unknown option.
The revised direct Vitest command and normalized HOME passed the full local workload described above.

Runcloud OpenClaw replica zero independently confirms both lint defects on main. Whole-repository
lint refuses to run without an enforceable cgroup cap; the extension-channel task prints
"No extension channel files found." in both executions but still records 69.733 seconds.
The bounded replacement removes that cgroup-only refusal, preserves memory/time containment where
available, and rejects empty discovery. The replacement extension workload has a new metric identity
so its actual lint timings cannot be conflated with that historical no-op.

By 22:00:55 UTC all 54 Runcloud receipts were present. There were 43 completed attempts with
confirmed cleanup and eleven rejected creates with no allocation. The journal independently
confirms all 54 releases. All eighteen synthetic and twelve Better Auth cells have the expected
metric IDs; all twelve Mastra cells lack Test Core, and OpenClaw replica zero lacks full lint.
No Runcloud cleanup or receipt collection remains outstanding. An attempt marked completed still
requires metric and trial completeness before publication.

The final raw replay verifies every original Runcloud ZIP's digests and yields zero conflicts.
Thirty cells are complete: eighteen synthetic and twelve Better Auth, proving 198 PTS measurements.
The other 24 remain incomplete: twelve Mastra cells, the executed OpenClaw cell, and eleven quota
refusals. Within Runcloud, the frozen plan has 79 absent metrics; the retired empty OpenClaw metric
adds one unverified observation under the revised catalog, for eighty strict coverage shortfalls.
The denominator and original evidence are unchanged. The real single-trial XML is now also a
regression fixture exercised through candidate aggregation, dataset promotion, and rendering.

Tama also failed two synthetic and 21 real-world creates before measurement. In the real-world
wave its journal records 36 intents, fifteen allocations, and all 36 released records: fifteen
confirmed cleanups and 21 not allocated. Retained CLI diagnostics report only failure to provision;
they do not establish a quota or transient cause. Fifteen accepted allocations are an observed
envelope, not proof of a fifteen-sandbox quota. The configured capacity of 40 therefore still needs
provider-side validation, along with the provisioning failures. There is no evidence supporting a
blanket retry change. These cells also prevent complete publication of this run.

Monitoring is read-only and continues through final aggregation. A fresh complete experiment on
the fixes revision is still required for a publishable leaderboard update and validation of revised
workloads on provider environments. Local tests establish implementation behavior, not vendor
availability or account capacity beyond the live observations above.

At 22:08 UTC the only remaining main job was Modal VM's real-world batch, waiting for a fresh
`privileged` environment approval. No workflow approval was submitted by this investigation.
The combined Modal worker removes that separate variant job within each wave on future plans.

## Final fleet audit and follow-up fixes

All 648 original attempt receipts have now been downloaded and replayed across all twelve
variants. Every Run and raw-tree digest verifies, with zero conflicts. The revised evaluator
accepts 349 complete cells and retains 299 incomplete cells. Cleanup is confirmed for 614
allocations; 34 failed creates have no allocation (eleven Runcloud and 23 Tama). The actual
aggregate CLI refuses to generate a publishable dataset from these incomplete results.

The fleet audit also found twelve Blaxel OpenClaw `test_types` failures that the earlier
Runcloud/Tama investigation did not expose. The exact pinned TypeScript native preview
`7.0.0-dev.20260704.1`, built with Microsoft's Go 1.26.4 toolset, produced five
Go collector crash traces (one bounds panic and four segmentation violations); seven other
replicas report only a nonzero exit. The unchanged command passes locally, including its
warm-up, with an 81.594-second measured result. The exact AMD64 compiler also passes the
previously failing core test tree under local Docker translation, using the same 3-GiB Go
memory policy and one checker. These local passes do not reproduce Blaxel's runtime. This is an additional
readiness blocker under investigation, not a failure already covered by the lint fix.

The last Modal VM benchmark job finished at 00:13 UTC on September 14. Final GitHub aggregation
is waiting for the `privileged` environment approval; no approval was submitted here.
The local full-artifact replay is independent of that pending job.

**Runcloud inventory is now fixed and live-verified.** SDK 0.9.0 drops the API's `nextCursor`,
so its unfiltered array was only the first fifty records. A complete live scan found 566
records: 565 destroyed tombstones and one older stopped benchmark allocation. That older
allocation was on page eight, invisible to the original admission check. The initial
pagination candidate's thirty-second total deadline was too short: the complete default-page
scan took 99.3 seconds. The final implementation requests the supported 200-row page size,
uses a five-minute total deadline with thirty-second individual request limits, propagates
cancellation to HTTP, and rejects malformed pages, duplicate identities, repeated cursors,
and incomplete scans. The production account-inventory command now correctly reports one
owned resource and zero foreign resources. It makes no resource changes. Existing managed
admission can now reconcile that older allocation before a new batch. Whether that stopped
resource explains the lost Runcloud slot still requires vendor capacity verification.

**Tama provisioning diagnostics are preserved before cleanup.** The CLI can exit nonzero with
a generic provisioning error while a machine row carries the useful terminal reason. The
shared CLI driver previously deleted that row without retaining its reason. It now attaches
the provider's redacted terminal detail to the original failure, preserves the process exit
code and retry policy, and completes cleanup even if optional diagnostic classification fails.
A regression exercises this exact path and checks secret redaction. This improves the evidence
from future failures; it does not retroactively explain the 23 historical failed creates.
Read-only Tama API inspection found positive credit and no retained machines, but exposes no
account concurrency/CPU/RAM quota or retrospective provisioning reason.

## Repository verification

The latest fresh workspace run passes 2,268 tests across twenty packages, with zero failures.
Full typecheck, Biome, spell check, ShellCheck, Hadolint, workflow validation, offline Zizmor,
and catalog/provider generation checks pass. The separate Chrome-backed figure suite passes
53 tests; regenerated figures and the leaderboard pass their artifact consistency checks.

One earlier stressed check exposed the unchanged 50-ms shell acceptance test and an intermittent
blank-suite-label difference between two leaderboard renders. The isolated driver suite passed
308 tests. The leaderboard symptom did not reproduce in the full repository-check package, four
concurrent artifact-check runs, or 1,000 cached/fresh renders with forced garbage collection.
The final fresh full suite passed. No speculative renderer or timing workaround was added; the
determinism gate remains in place because the one-off label discrepancy's cause is unconfirmed.

The earlier signed commit attempt passed its Biome and spelling hooks, then failed in the
configured 1Password signer (`failed to fill whole buffer`). Signing has since succeeded and
the fixes are saved in a signed commit. A protected branch canary and further provider runtime
diagnosis remain pending. No unsigned commit, resource mutation, capacity-variable change,
or workflow approval was substituted for that missing validation.

## Collection performance and final publication replay

The final main job ran collection from 02:35:47 to 02:42:19 UTC: 392 seconds. It then evaluated
the 648-cell experiment in two seconds and correctly failed with 349 complete and 299 failed
cells. The coverage report uploaded successfully; promotion was skipped after that failure.
Its counts match the original-artifact replay. There was no separate promotion execution failure.

Collection now uses a bounded 32-worker artifact pool and overlaps the eleven independent account
journal reads. Concurrency is configurable from 1 to 64 through
`BENCH_ARTIFACT_DOWNLOAD_CONCURRENCY`; it is independent of benchmark sandbox capacity. All provenance,
raw-tree and Run digest checks, durable release checks, and interrupted-intent preservation remain.
On failure the pool stops refill and drains active extractions before returning, preventing writes
after a caller starts inspecting or removing the failed collection. Duplicate artifact destinations
are rejected before any downloads. The command reports transfer and verification timings separately.

The actual branch command was run locally against GitHub into an empty directory, with no retained
artifact cache: `bun apps/cli/src/bin/workflow-experiment.ts collect`. It fetched the plan plus all
648 original attempt artifacts and validated their account journals in **18.857 seconds end to end**.
Attempts inventory took 1.875 seconds; download plus verification took 15.090 seconds, including
0.931 seconds of synchronous verification. Journal reads took 1.188 seconds concurrently. Peak
download concurrency was 32 and the archives totaled 49,302,201 bytes. Process peak RSS was about
374 MiB. This meets the one-minute target locally; the updated command has not yet run on Actions.

The host NIC received 60,446,170 bytes during the measured command and peaked at 59.916 Mbps over
roughly half-second intervals. Those counters include unrelated host traffic and protocol overhead;
they do not establish the physical link's saturation point. The improvement from serial to concurrent
transfers is consistent with request latency dominating the old collector. The local end-to-end
time is about 20.8 times shorter than the observed Actions baseline, across different hosts.

Running `aggregate-experiment` on this newly downloaded tree reproduces the previous verified
coverage byte for byte after JSON parsing: 648 cells, 349 complete, 299 failed, zero conflicts.
The diagnostic `aggregate` command also produces a local candidate from all 648 shard Runs in
0.405 seconds. Passing that actual candidate, original plan and fresh attempt tree to `promote`
rechecks coverage and refuses publication in 1.992 seconds; no dataset directory is created.
Successful publication remains covered by the end-to-end CLI fixtures. Publishing this particular
incomplete experiment requires an explicit partial-results policy decision; it cannot acquire
missing measurements from a collector fix.

## Remaining acceptance criteria

| Requirement | Evidence needed before calling the branch ready |
| --- | --- |
| Blaxel OpenClaw test types | Reproduce the exact pinned compiler failure on Blaxel under managed account ownership, verify a justified fix, and obtain positive fixed-pass measurements for every planned replica. The local ARM64 and translated AMD64 passes do not close this requirement. |
| Runcloud capacity | Confirm the managed inventory removes the old owned allocation and the declared 26-sandbox pool can run and refill without quota rejection. Change capacity only from observed or provider-confirmed limits. |
| Tama provisioning | Capture the newly preserved terminal reason if provisioning fails, correct its cause, and validate the declared capacity. Fifteen successful simultaneous allocations alone do not establish a quota. |
| Modal concurrency | Observe both variants overlapping within each wave, including all 72 real-world cells under the shared 75-sandbox capacity. |
| Full experiment and dataset | Run a fresh branch experiment at the intended provider scope and default replica/pass policy. Verify all 648 attempt digests, complete metric/trial coverage, confirmed cleanup and journal release, then aggregate and exercise dataset promotion and leaderboard generation in a temporary destination. Branch workflows keep publication main-only. |
| Rendering determinism | Keep the cached/fresh Markdown and chart determinism checks passing. The earlier isolated blank-label symptom remains unclassified; no runtime workaround is justified by the current evidence. |

The main run's final aggregation has now rejected the known incomplete results, as expected.
That negative check is separate from the successful publication required of a new complete
experiment. A percentage confidence claim is not supported until these provider and end-to-end
requirements have evidence.
