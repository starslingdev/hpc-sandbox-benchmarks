# CPU run 35221839824 diagnosis and recovery

[Source run](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/35221839824)
used revision `5b02fbc5f474abdfbd763752f31e6de2833044ea`. All 648 immutable attempt artifacts
were downloaded and independently verified. Coverage is 493 complete cells and 155 failed cells.
Nine execution jobs failed. The tenth failed job stopped at aggregation; promotion never ran.

## Publication failure

Partial publication was enabled. Two original attempts had unresolved cleanup:

- `modal-vm-system-r1-a1-212795e6-dc59-46a2-816b-969459606796`: preparation and rollback both
  failed before the harness obtained the session. The raw tree retained sandbox
  `sb-l9GF2MazCFMKi0ow2OI8QD`, but the journal only held the intent. Recovery required an execution
  receipt that this failure could not produce. This is a repository recovery bug.
- `blaxel-realworld-mastra-r2-a1-ef020874-47e1-4841-b51f-529964476e17`: clone exited 128 and an
  accepted operation outlived the immediate cleanup wait. Its exact allocation was retained in
  both the raw tree and the journal. Later observation showed it absent.

The aggregation message listed the first 20 incomplete cells and hid the actual cleanup blockers.
The fix reports publication blockers before the bounded metric-shortfall list.

## Execution failures

| Account / wave | Failed cells | Evidence and classification |
| --- | ---: | --- |
| Modal synthetic | 5 | One preparation/rollback double fault; four subsequent cells blocked by unresolved ownership. |
| Modal realworld | 72 | Account admission refused the unresolved synthetic create. These workloads never started. |
| Runcloud synthetic | 15 | Create/boot failures: host image extraction ran out of disk, ext4 preparation failed, or boot was interrupted. |
| Runcloud realworld | 17 | Six create timeouts, one concurrent-quota refusal, and ten cells blocked after that refusal. |
| Tama synthetic | 2 | Provider CLI reported failed provisioning. |
| Tama realworld | 20 | Provider CLI reported failed provisioning; no more specific vendor cause was retained. |
| Blaxel realworld | 21 | Nine gateway/background-launch/clone failures; twelve OpenClaw Test Types failures. |
| Runloop realworld | 2 | Mastra Git fetch returned HTTP 503; one Better Auth PTS installation was absent despite installer exit 0. |
| Novita realworld | 1 | OpenClaw PTS installation was absent despite installer exit 0. |

All twelve Blaxel OpenClaw Test Types forensic archives contain native Go TypeScript compiler
crashes, including SIGSEGV, index-out-of-range, and garbage-collector pointer errors. Three cells
also missed Typecheck. These are recurrent workload/runtime failures, not evidence of ordinary
quota pressure or a successful measurement. The archives do not establish whether the compiler or
provider runtime is responsible. No compiler substitution, exclusion, or workload modification was
made to turn them into passing results.

## Runcloud ownership bug

After a timed-out POST, the driver previously treated a finite sequence of empty exact-name reads
as cancellation. The server can finish allocating after those reads. A deterministic regression
reproduces a late allocation after the driver incorrectly reports clean failure.

Live inventory found six benchmark-owned allocations created between 13:07:54 and 13:08:04 UTC,
in the six timeout requests' window. Four were paused and two stopped with retained disks; the
latter reported host disk exhaustion during timeout-driven pause. This is strong evidence of the
late-create path, although the original receipts did not retain a per-attempt name-to-ID mapping.
The exact-name API finds these allocations now. Its current behavior does not establish when each
allocation became visible during the original request.

Ambiguous creates now remain unresolved until a definitive rejection or positive removal evidence
exists. Empty reads cannot release the journal or free a local capacity slot. A later matching
allocation can still be destroyed through the retained recovery callback. This also handles
ambiguous transport/5xx failures, rather than depending on which timeout exception won the race.

## Completed state preparation

- Used local provider credentials and checked workflow quiescence before recovery.
- Restored Modal's retained allocation to its protected journal, observed the exact sandbox terminal,
  and appended a later cleanup attestation. Original raw/Run digests remain unchanged.
- Observed Blaxel's exact sandbox absent and appended its cleanup attestation.
- Removed all six benchmark-owned Runcloud leftovers, recording intent before each deletion and
  verifying absence afterward. Final Runcloud inventory: owned 0, foreign 0.
- Audited all eleven protected account journals: no unresolved attempts remain.
- Preserved foreign Modal and Novita resources. Both use benchmark-scoped admission at this revision.

[Recovery journal](./cpu-35221839824-recovery.ndjson) records exact observations. Modal and Blaxel
attestations also live on the protected `benchmark-account-journal-modal` and
`benchmark-account-journal-blaxel` branches. Runcloud cleanup is an operator inventory journal;
it does not invent missing associations or rewrite the original `not-allocated` attempt records.

Fresh collection from GitHub obtained both attestations. Aggregation and independent promotion
verification succeeded into local scratch directories, retaining the original 493/155 coverage and
both recoveries. No dataset was published remotely and no benchmark was dispatched.

## Rerun plan

Do not use GitHub's **Re-run failed jobs** for this run. Its frozen retry allowance is zero and
`executeExperimentBatch` refuses cells already present in the journal. New attempts would not
constitute authorized retry lineage. A fresh experiment is required after the fix is merged.

The six affected accounts (seven providers; both Modal variants share the `modal` quota domain)
are now clear for admission. To repeat the affected providers at the
corrected main revision, preserving normal suite replica/pass defaults:

```sh
gh workflow run bench-matrix.yml --repo starslingdev/hpc-sandbox-benchmarks --ref main \
  -f providers=modal-gvisor,modal-vm,runcloud,tama,blaxel,runloop,novita \
  -f allow_partial=true
```

This creates a new comparison and does not replace measurements in the original experiment.
Provisioning health and the Blaxel compiler crashes may still produce failures. The original
verified partial dataset can instead be published after merge with:

```sh
scripts/backfill-dataset.sh 35221839824 --allow-partial
```

## Validation

- Regression tests reproduced the pre-execution recovery rejection and late-create false clearance
  before fixes; both now pass, including fresh artifact collection and late positive cleanup.
- Recovery rejects mismatched attempt/account/provider identities and measurement-bearing attempts.
- Full repository tests pass with loopback enabled; restricted execution blocked three SDK fixture
  servers. Typecheck, lint and spelling checks pass.
- Replayed all 648 original artifacts after fresh collection; aggregation and promotion verification
  pass with both recovery attestations, without altering original measurements.
