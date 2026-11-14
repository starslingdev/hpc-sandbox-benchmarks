# @sandbox-benchmarks/spawnbox

Driver for [Spawnbox](https://github.com/TulipFarm/spawnbox), an open-source, self-hosted sandbox
server that runs each sandbox as a Firecracker microVM. The adapter speaks Spawnbox's documented
`/v1` HTTP API; no client library is used.

## Inputs

| Variable           | Kind     | Meaning                                                    |
| ------------------ | -------- | ---------------------------------------------------------- |
| `SPAWNBOX_API_KEY` | secret   | An organization key (`sbx_org_...`) for the Spawnbox host. |
| `SPAWNBOX_URL`     | variable | The API base URL, such as `https://spawnbox.example:8443`. |

## Preparing the host

Spawnbox sizes a sandbox by its template, so the operator builds one template from the toolchain
image at the target shape before a run. The adapter derives the template name from the image ref:
`ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8` becomes `sandbox-benchmarks-toolchain-v8`.

```sh
curl -fsS -X POST "$SPAWNBOX_URL/v1/templates" \
  -H "Authorization: Bearer $SPAWNBOX_API_KEY" -H 'Content-Type: application/json' \
  -d '{"name":"sandbox-benchmarks-toolchain-v8",
       "base":"ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8",
       "resources":{"vcpus":4,"memory_mib":8192,"disk_gib":42}}'
```

Wait until `GET /v1/templates/sandbox-benchmarks-toolchain-v8` reports a `latest_build.state` of
`ready`. The disk is a little larger than the 40 GB target so the guest filesystem still reports
at least 40 GiB after its own metadata.

Before returning a session, the adapter checks that the template's `base` is exactly the resolved
image ref and that it pins 4 vCPU and 8 GiB. The kit then checks the guest's disk with `df`.

Run the host with KVM, so sandboxes are Firecracker microVMs rather than the gVisor fallback, and
with enough capacity for the suite's concurrency without memory overcommit.
