# @sandbox-benchmarks/freestyle

Native [Freestyle](https://www.freestyle.sh/docs/vms) VM driver using the exact SDK version in the
root catalog. Set `FREESTYLE_API_KEY` and select `freestyle` explicitly in `bench-smoke` or the CLI.
Use a dedicated benchmark account: managed admission rejects live foreign allocations.

The driver boots `freestyle/ubuntu`, then grows CPU, memory and disk to the requested shape.
The standard target is **4 vCPU / 8 GiB RAM / 40 GiB disk**; it needs Hobby or higher because Free
caps disk at 32 GiB. Shapes below the snapshot's 4 vCPU / 8 GiB / 32 GiB are rejected before creation.
The API's returned resource allocation is checked after resizing; the harness separately records
effective guest resources. A resize or readiness failure deletes the accepted VM.

This is a stock Ubuntu 24.04 snapshot, with the pinned tools installed by the harness during setup,
not the shared Debian 13 toolchain image. The public snapshot slug can change between runs.
Freestyle remains opt-in; this addition does not publish results or promote it into the default matrix.
There is no provider artifact to bake or release.

- Exec runs as the snapshot's `ubuntu` user (with passwordless sudo), preserves stdout/stderr and
  exit codes, and reports missing/timeout status as unknown. Steps of 60 seconds or longer use the harness's detached shell and completion-file polling;
  the underlying synchronous API has a five-minute maximum.
- Files use the SDK's native guest filesystem. Snapshots capture memory and disk and are explicitly
  deleted, with a ten-minute TTL as a cleanup backstop.
- Each VM has a unique slug and attempt metadata for failed-create recovery and paginated account
  inventory. Only an exact marker match authorizes recovery deletion. Teardown deletes the VM and
  waits for a typed 404; pausing does not count as removal. VM TTL is the attempt budget plus ten
  minutes, and idle pausing is disabled so CPU-bound workloads can finish.
- The firewall permits outbound public traffic for dependency installation and network benchmarks.
  No public inbound rule, domain, VPC, or SSH credential is created.

Run `bun run --filter @sandbox-benchmarks/freestyle test` and `typecheck` from the repo root.

With credentials, exercise the real harness transports and cleanup with:

```sh
bun apps/cli/src/bin/driver-check.ts --provider freestyle --require-pass --workload-seconds 305
```

This checks driver behavior without publishing benchmark samples.
