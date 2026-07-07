#!/bin/sh
# PTS local-profile install script (ENG-135/136/137/138), SHARED by every realworld-<repo>-1.0.0
# profile: the profiles vendor only XML + target.env, and run_realworld_pts (lib/bench.sh) overlays
# this file (and realworld-runner.sh, adjacent here) into the installed profile dir, where PTS
# executes it as the profile's install.sh. All per-repo config lives in target.env. Copies
# target.env + the runner from $(dirname "$0") into the install dir, writes the PTS executable
# wrapper the runtime convention expects (an executable named after the versionless profile dir,
# receiving the selected Task Option's Value as $1, stdout/stderr piped to $LOG_FILE), then does
# the UNMEASURED provisioning: pin the toolchain, shallow-fetch the pinned SHA into work/, one warm
# install -- so every measured task starts from a deps-ready workspace. See realworld-runner.sh for
# the per-task measured logic the wrapper invokes at batch-run.
set -eu

# shellcheck disable=SC1007 # CDPATH= (no value) is the idiom that disables CDPATH's cd-echoes-a-path
# behavior for this one invocation; shellcheck misreads it as a mistyped assignment.
SRC_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# The versionless profile dir name, e.g. "realworld-better-auth-1.0.0" -> "realworld-better-auth" --
# the executable name PTS looks for at batch-run (mirrors versionless()/versionlessTest() in schema).
PROFILE_DIR_NAME="$(basename "$SRC_DIR")"
EXE_NAME=$(printf '%s' "$PROFILE_DIR_NAME" | sed -E 's/-[0-9]+(\.[0-9]+)*$//')

if [ ! -f "${SRC_DIR}/target.env" ] || [ ! -f "${SRC_DIR}/realworld-runner.sh" ]; then
	echo "ERROR: target.env or realworld-runner.sh missing next to install.sh (${SRC_DIR})" >&2
	echo 1 > ~/install-exit-status
	exit 1
fi
cp "${SRC_DIR}/target.env" .
cp "${SRC_DIR}/realworld-runner.sh" .
chmod +x realworld-runner.sh

cat <<EOF > "$EXE_NAME"
#!/bin/sh
"\$(dirname "\$0")/realworld-runner.sh" "\$1" > "\$LOG_FILE" 2>&1
echo \$? > ~/test-exit-status
EOF
chmod +x "$EXE_NAME"

# shellcheck source=/dev/null
. ./target.env

# Warm the SAME cache locations realworld-runner.sh pins at run time (relative to this install
# dir, which is the runner's SCRIPT_DIR), so the unmeasured provisioning below populates exactly
# what the runner reads: a fresh COREPACK_HOME would otherwise make the first measured pnpm task
# of a batch pay a pnpm-toolchain download inside its sample. The runner's cold_install branch
# still wipes the store + XDG cache before measuring, so this never warms a cold-install sample.
export XDG_CACHE_HOME="${PWD}/.cache"
export COREPACK_HOME="${PWD}/.corepack"
export npm_config_store_dir="${PWD}/.pnpm-store"

if ! command -v node >/dev/null 2>&1; then
	echo "ERROR: node not found (the sandbox harness's setupNode step provisions it)" >&2
	echo 1 > ~/install-exit-status
	exit 1
fi
node_have="$(node --version | sed 's/^v//')"
if [ "$(printf '%s\n%s\n' "$NODE_VERSION" "$node_have" | sort -V | head -1)" != "$NODE_VERSION" ]; then
	echo "ERROR: node ${node_have} does not satisfy this profile's required >= ${NODE_VERSION}" >&2
	echo 1 > ~/install-exit-status
	exit 1
fi
corepack enable >/dev/null 2>&1 || true

rm -rf work
mkdir -p work
# Pessimistic status: POSIX suspends `set -e` inside any compound run as an `if !` condition, so
# wrapping the subshell that way would let an intermediate failure (e.g. `git fetch`) fall through
# to the next command. Written as a plain subshell, -e stays live inside it and any failure aborts
# the whole script (outer -e) with the 1 already on disk; only full success overwrites it below.
echo 1 > ~/install-exit-status
(
	cd work
	git init -q .
	git remote add origin "$REPO_URL"
	git fetch --depth 1 origin "$PIN_SHA"
	git checkout -q FETCH_HEAD
	head_sha="$(git rev-parse HEAD)"
	if [ "$head_sha" != "$PIN_SHA" ]; then
		echo "install: cloned HEAD ${head_sha} != PIN_SHA ${PIN_SHA}" >&2
		exit 1
	fi
	corepack install >/dev/null 2>&1 || true
	# The warm install IS the profile's cold_install command (single source of truth in target.env) —
	# no un-frozen fallback: a lockfile that can't install frozen at PIN_SHA must fail HERE, loudly,
	# not provision warm node_modules from a regenerated (unpinned) package set while every measured
	# cold_install sample fails against the restored lockfile.
	# shellcheck disable=SC2154 # sourced from target.env above.
	eval "$TASK_CMD_cold_install"
)

echo 0 > ~/install-exit-status
