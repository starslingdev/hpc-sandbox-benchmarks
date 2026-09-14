# CPU benchmark fixes and validation

`codex/cpu-benchmark-readiness-fixes` is rebased onto main
`da9d58927acf94a214e97b467805908be341ef0c`. The branch contains prospective execution,
workload, evidence-collection and publication fixes. The original
[run 34781421576](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34781421576)
used `08dfc6eb132dee567352ffa97abb96daa4db3153`; its immutable evidence is unchanged.

**The partial dataset and leaderboard are published; full-run readiness still requires provider
validation.** [PR #468](https://github.com/starslingdev/hpc-sandbox-benchmarks/pull/468) published
528 metric records and 4,255 verified observations across twelve providers, retaining all 648
planned cells: 349 complete and 299 incomplete. [PR #469](https://github.com/starslingdev/hpc-sandbox-benchmarks/pull/469)
regenerated the leaderboard and all three figures with an explicit partial-results banner.
Local promotion independently reverified the original attempts; the remote dataset and Markdown
match the local candidate and render. Partial publication does not certify the next full benchmark.

## Account scheduling and admission

The frozen experiment has twelve provider variants, eleven account quota domains, and 648 cells.
Actions capacity observed during the investigation declared 75 Modal sandboxes, 26 Runcloud sandboxes,
and 40 for every other account (variable updated 2026-09-13 at 20:36:59 UTC). These are configured
limits, not independently established vendor quotas. This branch does not change them.

Compatible provider variants now share one account worker pool within each wave. The worker verifies
its frozen provider list, account and credentials, reconciles inventory once, then fills its available
slots. Existing account exclusion still prevents other allocating jobs from using those credentials.

| Account | Synthetic demand / configured capacity | Real-world demand / configured capacity |
| --- | --- | --- |
| Modal, VM and gVisor together | 36 / 75 | 72 / 75 |
| Runcloud | 18 / 26 | 36 / 26 |
| Other single-variant accounts | 18 / 40 | 36 / 40 |

Thus capacity 75 admits both Modal variants concurrently, including every real-world cell. Runcloud
refills slots as earlier allocations finish. Replicate counts and pass counts remain unchanged.
Tama is included in the default twelve-variant scope; an explicitly blank provider selection still
means all thirteen registered variants, including Daytona Container.

A quota rejection, unresolved allocation or cleanup, or failed journal write stops new admissions.
Already allocated peers finish and persist their cleanup. A peer waiting on an intent write rechecks
before issuing create, so an intervening failure cannot reopen admission. Unstarted cells retain
terminal failed/not-allocated evidence. Planner validation rejects more than 64 queued batch jobs
before dispatch, preserving GitHub's queue bound without dropping cells.

Deterministic execution tests cover shared capacity, rolling refill, concurrent failures, ambiguous
creates, cleanup, journal persistence and the intent/create race. They also exercise a real
executor capacity stop through raw collection, partial aggregation and promotion: a never-allocated
cell has no Run, but its verified terminal receipt and failure remain in the dataset denominator.
Such a receipt contributes no measurements; missing expected Runs, unknown cleanup, measurement
claims without Runs and missing raw digests still block publication.

## Workload corrections and local evidence

OpenClaw remains pinned to `623534400684eca7c451cf587189fae714f2abe2`. Whole-repository lint uses
bounded, sequential, type-aware file batches with the pinned upstream selection and rules. It
rejects empty discovery and propagates command failures. This removes the old refusal to run on
providers lacking delegated cgroup creation while retaining enforceable containment where available.
The empty extension-channel command is replaced by a distinct all-extension task and metric identity;
its timings cannot be conflated with the historical no-op. Generated catalog and fixture checks
cover the revised contract.

Mastra's Core command uses supported Vitest 4 flags. The shared PTS runner canonicalizes trailing
slashes in HOME before executing workloads, correcting the demonstrated tilde-expansion failures
without changing upstream tests. The selftest covers canonical and trailing-slash HOME.

| Exact local workload | Verified result |
| --- | --- |
| Mastra Core | 11,844 tests passed, zero failures/type errors; 858.749-second positive measurement |
| OpenClaw full lint | All 17,137 files processed; 553.851-second positive measurement |
| OpenClaw all-extension lint | All 6,264 files processed; 289.957-second positive measurement |
| OpenClaw Test Types | Positive local 81.594-second measurement; native AMD64 compiler also passes under Docker translation |

The lint measurements include independent preparation/reset and warm-up. Combined lint wall cost
was 26.98 minutes including warm-ups, within the 80-minute suite budget. Local containment recorded
no OOM events. The PTS selftest checks positive intended metrics, warm-up/preparation counts,
timeout/OOM failures, cgroup placement and no leaked processes. Local compiler success does not
reproduce or resolve Blaxel's compiler crashes.

The pybench mise header is corrected so its task description parses. The historical warning was
not established as the cause of an entire batch failure.

## Provider findings and fixes

**Runcloud status and admission.** The native SDK's HTTP status now reaches the shared typed error
contract, allowing the scheduler to recognize a concurrent-capacity rejection. No generic
message-only retry rule or hidden create retry was added. The real-world wave accepted 25
allocations before eleven HTTP 429 refusals under configured capacity 26; no accepted allocation
was released before that cascade. This disproves 26 under the observed account conditions, but
does not identify a sandbox-count versus aggregate CPU/RAM quota. The new worker stops the cascade;
it cannot raise provider capacity.

**Runcloud complete inventory.** SDK 0.9.0 drops `nextCursor` from its array return. A live scan found
566 records, including 565 destroyed tombstones and one older stopped benchmark allocation on
page eight. The original first-page admission check missed that allocation. The driver now requests
200 records per page, permits five minutes for a complete scan with thirty-second request limits,
propagates cancellation and rejects malformed pages, duplicate IDs, cursor cycles and incomplete
scans. Production inventory reports the owned resource correctly. The read-only investigation did
not delete it; whether it explains the lost concurrency slot requires confirmation.

**Tama diagnostics.** A failed provisioning command can leave a terminal row with useful detail.
The shared CLI driver now preserves and redacts that reason before cleanup removes the row, while
retaining the original process exit and retry policy. Cleanup still runs if optional diagnostic
classification fails. Historical evidence contains 23 provisioning failures: two synthetic and 21
real-world. The latter wave had fifteen allocations and 21 not-allocated outcomes, all released.
Fifteen concurrent successes do not establish a fifteen-sandbox quota. Read-only account inspection
found no retained machines and positive credit, but exposed no retrospective cause or account quota.

**Blaxel remains unresolved.** All twelve OpenClaw Test Types replicas failed. Five logs show Go
collector crashes in TypeScript native preview `7.0.0-dev.20260704.1` built with Microsoft's Go
1.26.4 toolset; seven report only a nonzero exit. Local ARM64 and translated AMD64 runs with the same
3-GiB Go memory policy and one checker pass. No evidence yet justifies changing the pinned compiler
or suppressing its tests. Reproduction in Blaxel and a validated correction remain required.

The final fleet audit verified all 648 original Run/raw-tree digests with zero conflicts. Cleanup
was confirmed for 614 allocations; 34 creates were not allocated (eleven Runcloud, 23 Tama).
The final main aggregate job correctly rejected incomplete coverage, uploaded its report and skipped
promotion. Later explicit partial publication retained those failures under ADR-0012.

## Collection performance

Main's serial collect step took 392 seconds (02:35:47–02:42:19 UTC). The revised command uses a
bounded 32-worker artifact pool and overlaps the eleven independent account-journal reads.
`BENCH_ARTIFACT_DOWNLOAD_CONCURRENCY` accepts 1–64 independently of sandbox capacity. One ArkType
range contract governs both environment coercion and explicit options.

Cold local execution of `bun apps/cli/src/bin/workflow-experiment.ts collect` fetched the plan and
all 648 original attempt artifacts, then verified their journals in **18.857 seconds end to end**.
There was no retained artifact cache.

| Measurement | Observed value |
| --- | --- |
| Attempt inventory | 1.875 seconds |
| Download and verification | 15.090 seconds, including 0.931 seconds synchronous verification |
| Journal reads, overlapping downloads | 1.188 seconds |
| Peak concurrent downloads | 32 |
| Compressed archives | 49,302,201 bytes |
| Peak process RSS | About 374 MiB |
| Host NIC received bytes | 60,446,170 |
| Sampled peak receive rate | 59.916 Mbps over roughly half-second intervals |

The NIC counters include unrelated traffic and protocol overhead and do not establish physical link
saturation. The improvement is consistent with request latency dominating serial downloads. The
local measurement meets the one-minute target; the 20.8-fold wall-time difference compares different
hosts, and a timed Actions execution of the revised collector remains to be observed.

Provenance, original Run/raw-tree digests, durable release checks and interrupted intents remain
mandatory. Duplicate download destinations are rejected before extraction. A failed transfer stops
refill and drains active writers before returning, so later inspection cannot race late writes.
The command reports transfer, verification, journal and total timings separately.

## Publication and rendering

Fixed-pass coverage requires positive PTS trials matching the frozen count exactly. RawString
proves individual samples. A PTS Value without RawString proves one trial only when the original
XML metadata records exactly one error-free execution and its value matches the shard. Bare Value
is insufficient. Metadata is parsed through ArkType, and normalization and verification share the
same selection of the measured PTS entry and sample source.

Raw reads stay within the verified provider directory and actual source file. Historical shards
can prove their trial counts without being rewritten. Retired catalog metrics remain unverified;
removing a definition never gives a PTS metric the independent harness sampling contract.

Strict completeness is still the default. Both aggregate and promote require `--allow-partial`
to publish incomplete experiments. Promotion independently recomputes the candidate from the
original plan and attempts. Run v8 retains selected attempt IDs, all frozen cells, exclusions,
shortfalls and retained metrics, plus an explicit partial status. Failed preallocation attempts
without Runs remain non-numerical failure evidence. The full publication flow and negative cases
are exercised through real CLI commands, including candidate substitution, unproven trials,
escaped paths, unresolved cleanup and stopped-admission receipts.

The rebase preserves published run `34781421576` and its partial banner. Its OpenClaw figure is
regenerated for the revised catalog; unchanged BetterAuth and Mastra images are retained from main.
Missing-task captions describe absent measurements rather than inventing a failed execution for a
workload added after the historical run. Dataset observations remain unchanged.

## Review and remaining acceptance criteria

After the rebase and review fixes, all 2,272 workspace tests pass, along with typecheck, Biome,
spelling and workflow validation. The original 648-attempt replay produces exactly the published
partial dataset. The actual executor capacity-stop regression crosses aggregation and promotion,
and negative variants still reject missing or contradictory evidence. Chart artifact consistency
passes after regenerating only the OpenClaw image whose catalog changed.

The parallel code-review axes found two boundary-schema violations and one duplicated PTS
selection heuristic; all three were corrected. The Spec axis found the stopped-admission partial
publication bug, now covered from the executor through promotion. Its remaining two findings concern
Blaxel workload validation and full-run acceptance, detailed below.

| Requirement | Evidence still needed |
| --- | --- |
| Blaxel OpenClaw Test Types | Reproduce the exact compiler failure on Blaxel, validate a justified correction and obtain positive fixed-pass measurements for every planned replica. |
| Runcloud capacity | Confirm managed reconciliation of the older owned allocation and validate the intended account capacity without quota rejection; revise configuration only from established limits. |
| Tama provisioning | Capture the preserved terminal reason on failure, correct its cause and validate the declared capacity. |
| Modal concurrency | Observe both variants overlapping within each wave, including all 72 real-world cells under shared capacity 75. |
| Complete experiment | Run the intended scope and default replica/pass policy on the corrected revision; verify all 648 cells, raw/Run digests, metrics, trial counts, cleanup and journal release, then exercise strict promotion. |
| Actions collection speed | Confirm the revised collect command stays within one minute on the Actions runner as it did locally. |

An earlier stressed check exposed an existing 50-ms shell test and a one-off blank-suite-label render
difference. Focused tests, four concurrent artifact checks, 1,000 cached/fresh renders with forced
GC, and subsequent complete local and CI runs passed. No speculative workaround was added.

A full-run percentage confidence claim remains unsupported until the provider acceptance evidence
exists. Partial publication and passing offline checks must not be represented as that evidence.
