# Freestyle driver validation — 2026-09-29

Validation used the PR working tree, Bun 1.4.0 on macOS, the native `freestyle@0.2.16` SDK,
and the account's configured API key. Live VMs booted unmodified `freestyle/ubuntu`
(Ubuntu 24.04.5), then grew to **4 vCPU / 8 GiB RAM / 40 GiB disk**.
Freestyle retains `artifact: { kind: "none" }`, stock-image release exclusion, and explicit
provider selection. These receipts are validation evidence outside the published dataset.

## Live checks

- [Conformance](./conformance.json): every applicable clause passed. This includes native files,
  split output and exit codes, detached completion, snapshot creation/deletion, GPU refusal before
  allocation, diagnostic secret redaction, and confirmed VM deletion. Stock-image artifact identity
  is not applicable.
- [Harness driver check](./driver-check.json): 12 checks passed with no failures or skips, including
  a **1,205-second** workload through the real detached step runner. This exceeds the original
  1,200-second TTL computed from this command's ten-minute create budget. Both teardown calls
  succeeded, and the API reported the VM absent.
- [Lifecycle measurement](./lifecycle.json): 13 samples and no gaps, including three info probes,
  three list probes, a 64 KiB exec payload, snapshot creation, and teardown. The list probe now
  returns the array consumed by the harness. Cold-start timing ends at the first successful exec;
  runtime toolchain installation occurs afterward during suite setup.
- [Background protocol](./background-protocol.json): actual HTTP 202 responses were resolved through
  bounded polling. Two six-second synchronous commands completed. Caller cancellation was reported
  after accepted work settled, with its completion file readable before rejection returned.
- [Failed-create recovery](./create-recovery.json): withholding an accepted allocation's response
  caused the driver to find the exact attempt marker through its slug and delete the VM. Exactly
  one create and one delete occurred; the API confirmed absence.
- [Runtime setup](./runtime-setup.json) and [PTS result](./pts-hardlink.xml): the shared harness setup
  installed mise 2026.7.11, Node 22.23.1, pnpm 10.34.5, PTS 10.8.4, and build dependencies on stock
  Ubuntu. `mise run benchmark:disk:pts:hardlink` produced two numeric trials in real XML, with no skip
  marker. The in-guest producer checkout was pinned to PR commit
  `87506488dd43fc815823fbcccaa2243e0ffda3ee` in its public fork; the host exercised the updated driver.
  The runtime validation VM was deleted. Its before/after inventory includes only the separate
  long-duration driver-check VM while that check was running.

The native filesystem and exec both use `ubuntu`; harness setup elevates with sudo. The Ubuntu
stock image pays runtime installation costs rather than using the shared Debian bake. The published
snapshot slug remains mutable. Pricing and sizing metadata were checked against
[Freestyle's published pricing](https://www.freestyle.sh/pricing).

## Regression and repository checks

The focused driver/transport suite has **26 passing tests**. Regressions cover lifetime independent
of create deadlines, array-shaped lifecycle listing, bounded pending deletion and inventory,
background polling deadlines/cancellation, unsafe result locators, uncapped GET fallback, uncertain
allocation cleanup, expired create signals, and cooperative exec cancellation. A missing background
request record cannot prove a create was rejected or a VM was deleted.

**2,458 workspace tests and 98 Chrome-backed figures tests passed, with zero failures.** Typecheck,
lint, spelling, catalog drift, provider wiring, provider registry drift, workflow lint, shell lint,
and Dockerfile lint passed using the repository's pinned tools. The host suite used the existing
local toolchain; no profile hook or shared test was modified.

Live checks used the existing account key without recording or revoking it. All validation VMs and
snapshots were removed; [final account cleanup](./cleanup.json) records the post-validation state.
The full PTS workload matrix and a 330-minute job were not run. The hardlink result validates runtime
wiring and is not a comparative performance claim or default-matrix promotion.
