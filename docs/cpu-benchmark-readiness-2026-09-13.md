# CPU benchmark readiness — September 13, 2026

**Verdict: latest remote main is not ready for a full, valid CPU comparison.** Planning now works with the current Actions variables, all eleven account journals are clear, and several handoff issues have been fixed. Remaining work includes an allocation-capacity bug in the rolling scheduler, an unsatisfiable OpenClaw metric on sandboxes without memory containment, workload-validity issues, and live validation of Runcloud's revised capacity. A workflow reaching its last job is insufficient: every frozen cell must have the required measurements and confirmed cleanup.

This audit examines remote main **08dfc6eb132dee567352ffa97abb96daa4db3153**, verified by both fetch and the GitHub branch API on September 13. The handoff describes failed run **34672199543** at **5b543ed3**. Four commits have landed since then: PRs [464](https://github.com/starslingdev/hpc-sandbox-benchmarks/pull/464), [463](https://github.com/starslingdev/hpc-sandbox-benchmarks/pull/463), [465](https://github.com/starslingdev/hpc-sandbox-benchmarks/pull/465), and [466](https://github.com/starslingdev/hpc-sandbox-benchmarks/pull/466). Three untracked rejected-create recovery files in the working directory are not part of remote main and were excluded from the assessment of shipped functionality. The original [handoff](/var/folders/10/fpn_pqdn7mn31m7k5csln7g00000gn/T/cpu-benchmark-34672199543-handoff/handoff.md) remains historical evidence, not an instruction to repair or launch anything during this audit.

**What GitHub currently establishes**

Current main has successful [CI](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34744780476) and [CI Lint](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34744780471), but no CPU benchmark run at that SHA. The newer CPU run [34726484305](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34726484305/job/103641380836), on 0179f733, stopped during journal audit with eight unresolved Tama OpenClaw creates, r4–r11. The next run, [34726600997](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34726600997), excluded Tama and reached synthetic execution.

Its retained [coverage artifact](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34726600997/artifacts/10313338290) contains **594 cells: 189 complete, 9 failed, 396 missing, no conflicts**. All missing cells are real-world cells skipped by the former wave dependency gate. All nine failed cells belong to Runcloud. This is substantial synthetic evidence for ten providers, but supplies no live evidence that the merged real-world fixes work.

The read-only journal audit finds **zero unresolved attempts in all eleven domains**, and all snapshots pass the production recovery function's provenance/consistency checks with writes disabled: e2b, daytona, blaxel, microsandbox-cloud, modal, novita, runloop, namespace, vercel, runcloud, and tama. The eight formerly blocked Tama intents now have released/not-allocated records. At the final activity check, GitHub reported no in-progress, queued, or waiting workflows. This closes the *current journal-admission blockage* reported by the handoff. It does not independently establish the vendor provisioning cause or repeat an all-provider live inventory/probe audit. The audit CLI itself is read-only and explicitly does not implement probe mode. [Journal audit source](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/apps/cli/src/bin/audit-account-journals.ts#L15-L19); [snapshot](/tmp/cpu-readiness-journals.json); [journal revisions](/tmp/cpu-readiness-journal-heads.json).

**Actions configuration and what it actually schedules**

The repository has one Actions variable: **BENCH_ACCOUNT_CAPACITY**, updated **2026-09-13T20:36:59Z** and reread at **20:39 UTC**. It changed during the audit: Runcloud increased from 9 to 26 and Modal from 60 to 75. The table and regenerated plans below use the latest snapshot. The privileged environment has no variables. The organization variable inventory contains only unrelated TURBO_TEAM.

| Account domains | Declared sandbox cap | Maximum occupied slots per default synthetic / real-world provider batch |
| --- | ---: | ---: |
| e2b, daytona, blaxel, microsandbox-cloud, novita, runloop, namespace, vercel, tama | 40 | 18 / 36 |
| modal, shared by both variants | 75 | 18 / 36, variants serialized |
| runcloud | 26 | 18 / 26 |

These are scheduler declarations, not verified vendor quotas. There are no vcpus or memoryGb limits in the configured policy, although the planner supports both. At the 4-vCPU/8-GiB target, 36 concurrent cells request **144 vCPUs and 288 GiB**; Runcloud's real-world cap of 26 requests **104 vCPUs and 208 GiB**. Modal's cap of 75 does not make its two variants run together: they share the account concurrency group and are separate batches. [Capacity calculation](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/apps/cli/src/lib/experiment-plan.ts#L66-L86); [target](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/packages/schema/src/target-spec.ts#L12-L16); [account exclusion](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/.github/workflows/bench-suite.yml#L30-L37).

I executed the pure planner against the live variable value:

| Provider selection | Providers / domains | Cells | Execution batches |
| --- | ---: | ---: | ---: |
| Workflow form's default | 11 / 10 | 594 | 22 |
| Same providers plus Tama: original handoff scope | 12 / 11 | 648 | 24 |
| Explicitly blank provider input: all registered providers | 13 / 11 | 702 | 26 |

**The default is not the handoff's full scope.** It omits Tama; blank input also adds daytona-container. For a fresh run intended to cover the original twelve-provider comparison, explicitly select the handoff's twelve providers. Do not treat a green 594-cell result as completion of that scope. Replica defaults remain three per synthetic suite and twelve per real-world suite, with two and one PTS passes respectively. [Dispatch defaults](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/.github/workflows/bench-matrix.yml#L6-L25); [planner results](/tmp/cpu-readiness-planner-summary.json).

The current Runcloud plan fits the 330-minute job ceiling: one 18-cell synthetic batch budgeted at 145 minutes, followed by one 36-cell real-world batch with 26 slots and a 300-minute budget. Other providers get 145-minute synthetic and 150-minute real-world batch budgets. These are reserved budgets, not observed durations. The latest setting still launches all eighteen Runcloud synthetic cells concurrently, exactly the attempted allocation count in the newer failed run; changing its declared cap from 30 to 26 does not reduce that wave's offered load.

All provider credential names required by the worker are present in the privileged environment. Namespace uses OIDC token minting rather than the stored NSC_TOKEN. Provider artifact override variables are absent; source defaults resolve, and the newer synthetic run demonstrates their use for the selected providers. Missing optional overrides are not a current configuration blocker. Secret contents and validity were not retrieved. The privileged environment requires review; that operational approval remains necessary when its jobs become eligible. GitHub allows Actions to create PRs, and the current main rules do not require status checks or approving reviews that would obviously strand the dataset bot. No settings were changed.

**Remaining gap 1 — the rolling pool releases capacity while ownership is unresolved**

This is a reproduced implementation defect. executeExperimentBatch records cleanup=unresolved and preserves the journal, but the scheduler tracks pending promises rather than held allocations. Every settled promise is removed from the pending set and another cell is launched, regardless of cleanup or durable release success. [Cleanup/release logic](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/apps/cli/src/lib/execute-experiment.ts#L266-L292); [unconditional refill](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/apps/cli/src/lib/execute-experiment.ts#L338-L363).

An isolated test reused the real harness/normalizer fixture, planned two cpu-node replicas in one batch with sandbox capacity one, and made destroy fail. Result:

    declaredCap: 1
    peakLive: 2
    liveAfter: 2
    cleanup: ["unresolved", "unresolved"]

The evidence remains unpublishable, but the account capacity guarantee has already been violated. Runcloud's current real-world batch has 36 cells and 26 slots, making refill part of the normal full-run path. The existing cleanup test uses as many slots as cells and therefore cannot expose refill after an unresolved allocation. [Reproduction log](/tmp/cpu-readiness-pool-repro.log); [isolated reproduction](/tmp/cpu-readiness-main-08dfc6eb/apps/cli/src/lib/cpu-readiness-repro.test.ts).

**Closure:** tie admission slots to proven ownership release. If a create or cleanup leaves uncertain ownership, retain its capacity reservation or stop admitting further cells in that account while already-running peers finish and persist evidence. Include tests with more cells than slots for cleanup failure, ambiguous create, and release-append failure, plus normal successful refill. Do not weaken journal admission to obtain a green run.

**Remaining gap 2 — OpenClaw still declares a metric that the runner refuses**

PR 465 prospectively removed shrinkwrap_check and test_unit_fast, reducing the declared OpenClaw set from eight to six. It retained **realworld_openclaw_task_lint_oxlint**. The task still requires an enforceable memory cap. When BENCH_CG is unavailable, the runner exits before measurement; the handoff already captured this on Namespace. Current main makes no change to that boundary. A strict six-metric OpenClaw cell consequently cannot complete in that environment. [Mandatory metric](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/packages/schema/src/suites.ts#L304-L324); [task contract](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/packages/schema/src/pts-profiles/local/realworld-openclaw-1.0.0/target.env#L65-L92); [deterministic refusal](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/lib/pts/realworld/realworld-runner.sh#L279-L291).

The documentation also contradicts itself: suites.ts says lint_oxlint sometimes produces Values; target.env and the runner describe it as unsampled and beyond the target memory budget. Occasional values would still not satisfy every planned replica/provider.

**Closure:** establish a prospectively versioned workload that can perform meaningful work and emit all declared metrics at the chosen resource target, or use a reviewed metric-scoped exclusion supported by the experiment contract. Preserve containment. Validate the chosen contract under both working-cgroup and no-cgroup conditions. Do not retroactively alter the failed 648-cell plan.

**Remaining gap 3 — Runcloud's new cap is unvalidated and the newer failure differs from the handoff**

The handoff found five HTTP 429 quota refusals. The newer run froze a cap of 30 but had only 18 synthetic cells. Its [Runcloud diagnostic artifact](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34726600997/artifacts/10308920477) contains nine completed/confirmed attempts and nine failed/not-allocated attempts. Every failure says the sandbox entered terminal state **interrupted while booting**. All cpu-node, system, and pgbench replicas failed before measurement; memory, disk, and network completed. These receipts do not establish that HTTP 429 was the newer cause.

The latest cap of 26 has no live validation and still offers the same eighteen simultaneous synthetic allocations that failed previously. Exactly nine successes is not proof that nine is the vendor's quota. Likewise, raising other accounts to 40 and Modal to 75 does not verify their CPU/memory supply. Vendor-side changes may have occurred, but GitHub variables and retained receipts cannot establish them.

**Closure:** establish the actual boot interruption cause and effective account limits, then validate all affected synthetic suites and the real-world workload at the new allocation shape. Require successful creates, metrics, and cleanup. If the acceptance target still demands 30 simultaneous Runcloud machines, a cap of 26 cannot meet it; obtaining capacity is necessary. Current runs have maxPremeasurementRetries=0, so retrying a failed workflow does not repair its immutable experiment. [Retry default](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/apps/cli/src/lib/experiment-plan.ts#L153-L168); [repeat-attempt refusal](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/apps/cli/src/lib/execute-experiment.ts#L155-L159).

**Remaining gap 4 — OpenClaw extension lint records time without linting files**

The handoff's empty-file warning is now traceable to a deterministic defect at the pinned upstream revision. channelTestRoots consists of src/channels plus the split-extension roots. extensionChannelTestRoots then filters for extension paths while excluding every one of those split roots, leaving an empty set. The wrapper permits an empty set. The runner performs package-boundary preparation and returns before invoking Oxlint. [Pinned root calculation](https://github.com/openclaw/openclaw/blob/623534400684eca7c451cf587189fae714f2abe2/test/vitest/vitest.channel-paths.mjs#L12-L19); [allowEmpty wrapper](https://github.com/openclaw/openclaw/blob/623534400684eca7c451cf587189fae714f2abe2/scripts/run-extension-channel-oxlint.mjs#L5-L12); [preparation and early return](https://github.com/openclaw/openclaw/blob/623534400684eca7c451cf587189fae714f2abe2/scripts/lib/run-extension-oxlint.mjs#L28-L56).

The retained Namespace task log reports no extension channel files and then a 53.307-second result. That positive sample measures preparation, not the declared lint operation. This defect can survive the new positive-sample completeness check. [Original artifact](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34672199543/artifacts/10291421781).

**Closure:** use a prospective pin/command with a verified nonempty intended file set and real Oxlint execution; fail validation when discovery is empty. A successful wrapper and a positive duration are insufficient.

**Remaining gap 5 — Mastra's changed fork flags do not establish a fix for the actual failed tests**

Mastra retains its original pin and five metrics. PR 465 adds fork/single-fork flags to Test Core, but does not change HOME handling or the shared runner. The handoff's final verdict is five tilde-expansion failures in local-filesystem.test.ts, with 11,839 tests passing and 935.41 seconds spent. Incidental model-error stderr is not the final failure cause. [Current target command](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/packages/schema/src/pts-profiles/local/realworld-mastra-1.0.0/target.env#L6-L20); [immutable failed attempt](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34672199543/artifacts/10291183243).

The pinned test computes a joined home path and then replaces the original home string with a tilde. A focused Node reproduction produces ~/.mastra-tilde-test-A with canonical HOME but ~.mastra-tilde-test-A with a trailing slash, matching the malformed path in the failure log. This proves a relevant boundary sensitivity; it does not yet prove the complete PTS environment transport or that HOME normalization fixes every test. [Pinned test](https://github.com/mastra-ai/mastra/blob/b6eeb9d08ebeaf27bc6fd16b6b88087040aaf767/packages/core/src/workspace/filesystem/local-filesystem.test.ts#L1125-L1216).

**Closure:** reproduce the exact pin under PTS with both HOME spellings, capture the final child test-runner arguments through the nested package scripts, and fix the confirmed boundary or prospective workload pin. Require real Test Core samples and all five metrics. The newer GitHub run skipped all real-world execution, so it provides no validation of the fork change.

**Remaining gap 6 — completeness does not verify the observed fixed-pass count**

The evaluator checks that the receipt's declared passes equals the plan, then requires nonempty, finite positive samples. It does not establish that the requested number of PTS passes actually produced evidence. A focused reproduction built from the successful two-pass STREAM fixture reduced each metric to one sample, recomputed its Run digest, and retained ordinary identity/cleanup receipts. Evaluation still returned complete=true with no missing metrics. [Declared-policy check](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/packages/results/src/lib/experiment.ts#L279-L287); [sample check](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/packages/results/src/lib/experiment.ts#L338-L350); [reproduction](/tmp/cpu-pass-coverage-probe.ts).

**Closure:** verify observed completed trials for fixed-pass PTS metrics. Use a metric-aware contract: the parser treats RawString as per-pass samples but can fall back to a single aggregate Value, and harness metrics have different sampling rules. Blindly requiring every sample array's length to equal passes would introduce other errors. This is a validity gap for the two-pass synthetic portion, even if a particular job completes successfully. [PTS sample extraction](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/packages/results/src/lib/pts.ts#L41-L53).

The workload audit ran **97 targeted tests with zero failures**; those cover contracts and plumbing, not full upstream workloads. The two test selections overlap, so their counts should not be added as distinct tests. [Workload audit details](/tmp/cpu-readiness-workload-findings.md); [test log](/tmp/cpu-workload-tests.log).

The Daytona pybench warning is lower priority: the retained log proceeds after the warning and writes pybench XML with 407, 407, and 444 ms results. Its comment beginning with MISE_DISABLE_TOOLS is misread as a task-header directive, but this did not prevent those measurements. Reword the comment without presenting it as a diagnosed batch-failure cause. [Leaf](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/.mise/tasks/benchmark/system/pts/pybench#L13-L19).

The OpenClaw profile's display version remains 1.0.0, but frozen workload/environment identity includes the repository SHA, so the prospective six-metric workload is separated from the old eight-metric experiment. Merely changing those declarations does not establish a need for a new toolchain image; runtime profile staging already uses repository source. [Revision binding](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/apps/cli/src/lib/workflow-experiment.ts#L63-L69).


**Handoff items that are closed or materially improved**

| Handoff finding | Current assessment |
| --- | --- |
| Namespace token-name collision | Fixed in source: token name includes batch, run, and attempt; mint failure is fatal. Newer synthetic Namespace batch completed. Same-run two-batch live validation remains absent because real-world was skipped. [Worker](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/.github/workflows/bench-suite.yml#L65-L84). |
| Lost coverage after incomplete aggregation | Fixed and live-demonstrated by the newer coverage artifact. Upload is conditional on a report having been written; collection failure before aggregation still cannot produce that report. Strict promotion remains gated. [Workflow](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/.github/workflows/commit-dataset.yml#L77-L101). |
| One synthetic failure skips every account's real-world work | Fixed by PR 466's explicit condition. No CPU execution on that SHA yet. [Wave gate](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/.github/workflows/bench-matrix.yml#L101-L120). |
| Repeated round planning layer | bench-round.yml removed. Account/wave readers remain, each with checkout/setup; they read one frozen plan rather than creating duplicate experiments. [Reader](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/.github/workflows/bench-account.yml#L17-L37). |
| No rolling refill | Implemented within a batch; ownership correctness needs gap 1's fix. It does not refill across serialized batches/providers or across the global wave barrier. |
| Old Tama unresolved intents | Remote journal blockage cleared. Provider failure cause and a new full-scope workload run remain unproven. Local recovery files are not shipped on main. |
| Daytona pybench warnings | Not demonstrated to be a measurement blocker; see workload findings above. |

Remaining efficiency work is separate from minimum execution correctness: measure occupancy and queue time, consider sharing available Modal capacity across variants, reduce repeated account-wave setup and sequential artifact downloads, and account separately for prep, warm-up, measured execution, collection, and cleanup. The real-world runner still performs prep or unmeasured warm-up before measured tasks. None of these changes should silently parallelize measurements inside a sandbox or change the frozen replica count. [Artifact download loop](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/apps/cli/src/lib/experiment-transfer.ts#L37-L58); [real-world runner](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/08dfc6eb132dee567352ffa97abb96daa4db3153/lib/pts/realworld/realworld-runner.sh#L355-L419).

**Required evidence before calling a full run ready**

1. Close the scheduler ownership bug and validate the workload contracts described above with meaningful regression cases.
2. Confirm the intended provider denominator and reviewed capacity policy, including Runcloud's real capacity and aggregate CPU/memory limits.
3. Obtain positive live receipts for all retained real-world metrics at the exact prospective source/workload revisions; verify Namespace credentials in multiple same-run batches and exercise Runcloud's 18-concurrent synthetic allocation and 26-slot real-world refill.
4. Before dispatch, repeat journal admission and provider inventory/probe checks under the existing ownership rules, with all account writers controlled. Today's clear journals are a point-in-time observation.
5. Launch a **fresh** experiment only after those checks. For the original twelve-provider scope, require 648 terminal cell outcomes, no missing eligible metrics, the correct fixed-pass evidence, confirmed cleanup, no provenance conflicts, and a retained complete coverage report before promotion. Historical artifacts and the newer 594-cell run cannot substitute for this proof.

**Audit validation and limits**

The audit ran 59 existing targeted tests covering planning, workflow axes, execution, capacity diagnostics, journals, GitHub journal persistence, and artifact transfer: all passed. The additional isolated capacity reproduction confirmed the defect rather than testing a fix. Workload-specific test results are recorded above. Current-main CI is also green. [Targeted test log](/tmp/cpu-readiness-targeted-tests.log).

I read live GitHub repository/environment configuration, credential names, workflow statuses, selected immutable artifacts, and all eleven journals. I did not create provider allocations, run the expensive full workloads, alter Actions variables, recover/delete resources, or publish results. The original handoff did not reconstruct every one of its 648 failure causes; this audit adds complete coverage for the newer 594-cell plan and all eighteen newer Runcloud receipts, not a retrospective claim to have diagnosed every old cell. Provider-side credential validity, quotas, inventory, and full-load performance therefore remain live evidence requirements.
