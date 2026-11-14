# @sandbox-benchmarks/createos

Opt-in CreateOS driver using `@nodeops-createos/sandbox`. Set `CREATEOS_API_KEY`.

Creates `s-4vcpu-8gb` sandboxes with a 40 GiB overlay and `devbox:1`. The shared toolchain is
installed at runtime. A provider-local preflight exposes the ASDF Python interpreter to PTS.
Names are capped at 22 characters, so the full ownership marker travels as an environment key,
which both get and list views return. Destroyed sandboxes remain readable as tombstones.

Run `bun test packages/createos` for the adapter checks. Use
`bun apps/cli/src/bin/driver-check.ts --provider createos` for live conformance.
