# @sandbox-benchmarks/munito

Owns the Munito Sandboxes driver and its tests. Each sandbox is a Firecracker microVM with its own
guest kernel. Sandboxes is a public preview. The driver uses Munito's TypeScript SDK,
`@munitoai/cli`, whose `Client` calls the REST API at `https://api.munito.ai/sandboxes/v1`. It
parses each answer with arktype. Shared session mechanics live in `@sandbox-benchmarks/driver`. The provider is opt-in and is not in the default
matrix.

## Configuration

- `MUNITO_API_KEY` (secret): an API key of an organization with a Sandboxes plan. The trial runs
  2 sandboxes at once with a `timeout` of at most 2 h, and a realworld suite starts 12 sandboxes
  with a 3 h timeout, so the trial refuses a benchmark run.
- `MUNITO_SANDBOXES_URL` (optional variable): another base URL for the same API.

Use a workspace that holds only benchmark sandboxes. Admission lists the whole workspace, and a
running sandbox that the benchmark did not create blocks a run.

## Behaviour

- **Disk:** a create asks for a root disk of 10 to 100 GiB with `disk_gib`. The driver maps the
  target's disk onto whole GiB (40 for the benchmark's target), and refuses a disk over 100 GiB
  before any create. `prepare` checks the disk that the API reports, and the kit proves it with
  `df`: a 40 GiB disk shows 38.75 GiB, inside the proof's 4% allowance for ext4's own metadata.
- **Size:** a shape maps to a preset by its ceiling (4 vCPU and 8 GiB is `large`) or to a custom
  size. `prepare` checks the size that the API reports.
- **Create:** the attempt's marker goes into metadata (`sandbox-benchmarks-attempt`) and into the
  `Idempotency-Key`. A create that gets no answer, or `503 start_unknown`, is sent again with the
  same key and gets the same sandbox. A refusal is not sent again. Each sandbox gets a 3 h timeout,
  so a leaked one stops by itself.
- **Exec:** a command runs in `bash -lc` as root with a 300 s server limit. The answer streams as
  NDJSON, so output is not cut at the 1 MiB limit of a buffered answer. Steps near the 60 s policy
  cap detach through the kit's shell launcher.
- **Files:** the files API reads and writes them.
- **Teardown:** a delete answers `stopped` at once, and the API keeps the record. A read never
  answers 404 for it, so `stopped` and `failed` read as removal. A sandbox also stops at its timeout.
- **Pricing:** the registry records the published rates: $0.0072 per vCPU-hour and $0.0009 per
  GiB-hour up to 8 vCPUs and 16 GiB, so the 4 vCPU / 8 GiB target costs $0.036 an hour. The disk
  has no price of its own.

Run `bun run --filter @sandbox-benchmarks/munito test` or `typecheck` from the repo root. The live
smoke in `vendor.integration.test.ts` runs only when `MUNITO_API_KEY` is set. It creates one `large`
sandbox with the benchmark's 40 GB disk, runs a command, writes and reads a file, and deletes it.
