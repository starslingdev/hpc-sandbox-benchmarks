# Freestyle driver validation — 2026-09-29

These are driver checks, not published benchmark samples. Freestyle stays outside the default
`bench-matrix` selection. Both live reports used the native `freestyle@0.2.16` SDK and the stock
`freestyle/ubuntu` image, resized to 4 vCPU / 8 GiB RAM / 40 GiB disk.

- [Conformance](./conformance.json): all applicable clauses passed, including native files read
  after a command writes them, snapshots and their deletion, durable execution, GPU refusal before
  allocation, and control-plane deletion. Stock-image artifact identity is not applicable.
- [Harness driver check](./driver-check.json): 12 checks passed with no failures or skips. A
  305-second workload completed through the actual detached step runner, beyond the synchronous
  API's five-minute maximum. Teardown was idempotent and the API confirmed the VM absent.

Native filesystem writes belong to `ubuntu`. Initial conformance exposed root's inability to
replace such files in sticky `/tmp` with `fs.protected_regular=2`; the driver now explicitly executes
as `ubuntu`, with the harness using sudo for privileged setup.

## Repository checks

The browser-free checks were exercised with Bun 1.4.0 and the repository's pinned mise tools.
The initial parallel Linux run had one failure in the unchanged driver-kit shell test
`surfaces a real target command that fails during the acceptance window`; all other workspace tests
passed. An isolated retry also hit the detached completion test's short timing window.
The stock image sources NVM in `/etc/profile.d/nvm.sh`: a measured login shell took 152 ms versus
10 ms with that hook removed, exceeding the first test's 50 ms acceptance window.

For the final repository gate, that hook was disabled only in a disposable validation VM and
workspace tests ran sequentially: **2442 passed, 0 failed**. Typecheck, lint, spelling, all three
generated-file drift checks, workflow lint, shell lint, and Dockerfile lint also passed. The driver code and shared shell tests were not changed for this
adjustment. The live conformance and 305-second harness checks above ran on the unmodified stock
image. Temporary VMs and snapshots were deleted, and temporary API keys were revoked.

The Chrome-backed figures suite and full PTS workload matrix were not run; this change provides
provider integration and does not claim comparative performance results.
