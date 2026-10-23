# @sandbox-benchmarks/createos

Opt-in CreateOS driver using `@nodeops-createos/sandbox`. Set `CREATEOS_API_KEY`; the optional
`CREATEOS_SANDBOX_BASE_URL` defaults to `https://api.sb.createos.sh`.

Creates `s-4vcpu-8gb` sandboxes with a 40 GiB overlay and `devbox:1`. The shared toolchain is
installed at runtime. A provider-local preflight exposes the ASDF Python interpreter to PTS.
The ownership marker is an environment key; inventory re-reads candidate rows to verify it.
Cleanup checks both item and account views because deletion is asynchronous.

Run `bun test packages/createos` for the adapter checks. Use
`bun apps/cli/src/bin/driver-check.ts --provider createos` for live conformance.
