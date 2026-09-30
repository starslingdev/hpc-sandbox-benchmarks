#!/usr/bin/env bash
# Deprecated setup entry point: read-only audit. See docs/ci-secrets.md for configuration.
# Compatibility entry point: provider credentials now have separate protected environments.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec bun "${script_dir}/audit-provider-environments.ts" "$@"
