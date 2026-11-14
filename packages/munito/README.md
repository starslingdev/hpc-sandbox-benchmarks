# @sandbox-benchmarks/munito

Opt-in Munito Sandboxes driver using the official `@munitoai/cli` SDK. Set `MUNITO_API_KEY`; a plan that
supports the benchmark's three-hour sandbox lifetime and concurrent replicas is required.
`MUNITO_SANDBOXES_URL` optionally overrides the API base URL. Use a dedicated workspace: admission
inventories the whole account.

The driver maps the target to the 4 vCPU / 8 GiB `large` preset and a 40 GiB root disk. It records
an ownership marker in metadata and as the idempotency key, streams command output, and reads and
writes files through the API. Deleted or failed sandboxes remain as stopped records. The driver kit
checks resources, proves disk capacity, recovers ambiguous creates and confirms cleanup.

Run `bun test packages/munito` for the adapter tests. When `MUNITO_API_KEY` is set, the suite also
runs a live smoke that creates and deletes a sandbox and can incur charges.
