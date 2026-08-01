#!/usr/bin/env bash
set -euo pipefail

vercel_bin="${VERCEL_BIN:-./node_modules/.bin/vercel}"
env_file="$(mktemp "${RUNNER_TEMP}/vercel-env.XXXXXX")"
pull_env_file=".vercel/.env.production.local"
trap 'rm -f "$env_file" "$pull_env_file"' EXIT

"$vercel_bin" pull --yes --non-interactive --environment=production --token="$VERCEL_TOKEN"
"$vercel_bin" env pull "$env_file" --yes --non-interactive --environment=production --token="$VERCEL_TOKEN"

oidc_token="$(node - "$env_file" <<'NODE'
const { readFileSync } = require("node:fs");
const line = readFileSync(process.argv[2], "utf8")
  .split(/\r?\n/)
  .find((entry) => entry.startsWith("VERCEL_OIDC_TOKEN="));
if (!line) throw new Error("vercel env pull did not return VERCEL_OIDC_TOKEN");
const encoded = line.slice("VERCEL_OIDC_TOKEN=".length).trim();
const token = encoded.startsWith('"')
  ? JSON.parse(encoded)
  : encoded.startsWith("'") && encoded.endsWith("'")
    ? encoded.slice(1, -1)
    : encoded;
if (!token || /[\r\n]/.test(token)) throw new Error("VERCEL_OIDC_TOKEN is empty or malformed");
process.stdout.write(token);
NODE
)"
rm -f "$env_file" "$pull_env_file"

printf '::add-mask::%s\n' "$oidc_token"
printf 'VERCEL_OIDC_TOKEN=%s\n' "$oidc_token" >> "$GITHUB_ENV"
export VERCEL_OIDC_TOKEN="$oidc_token"

if [[ "$VCR_LOGIN" == "true" ]]; then
	"$vercel_bin" vcr login docker
fi
