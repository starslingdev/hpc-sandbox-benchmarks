#!/usr/bin/env bash
# Install the mise-managed language/CLI toolchain (node, python, pnpm, hyperfine, warp, jc, quarto)
# system-wide from /etc/mise/config.toml, which build.sh generated from the arktype-validated pins.ts.
# The mise binary itself is installed (from its pinned GitHub release) in 00-apt.sh; these are the
# tools it manages.
set -Eeuxo pipefail

# > Config + data dirs are system-wide (set in the Dockerfile ENV): one shared toolchain for every
# > sandbox user, exposed on PATH via /usr/local/share/mise/shims. MISE_USE_VERSIONS_HOST=0 keeps
# > version resolution off mise-versions.jdx.dev (unreachable from some sandbox networks).
mise trust /etc/mise/config.toml
MISE_USE_VERSIONS_HOST=0 mise install --yes
mise reshim
mise ls

# > Resolve the version-specific node path once and expose it at a stable path. Consumers reference
# > /usr/local/bin/bench-node and never carry the node-version coupling (see images/README.md).
node_path="$(mise which node)"
ln -sf "${node_path}" /usr/local/bin/bench-node
bench-node --version

# > PTS's test-profile installers (node-web-tooling → npm, pyperformance → pip3) run their own scripts
# > with a sanitized PATH that drops mise's non-standard shims dir, so those tools go missing. A mise
# > shim is a symlink to the mise binary that dispatches by its argv[0] basename and reads the tool
# > inventory from MISE_DATA_DIR/MISE_CONFIG_DIR (both ENV, so inherited even when PATH is stripped) —
# > so re-exposing every shim under the standard /usr/local/bin makes the *pinned* tools resolvable
# > under any PATH. Symlinking shims (not raw binaries: npm/pip find their runtime relative to their
# > own path and break when moved) keeps mise's version resolution intact and needs no distro runtimes.
for shim in "${MISE_DATA_DIR}/shims/"*; do
	ln -sf "${shim}" "/usr/local/bin/$(basename "${shim}")"
done

# > Gate: prove the pinned runtimes resolve under a PTS-style sanitized PATH (standard dirs only) for
# > both root and an E2B-style injected user HOME. The shared mise dirs make resolution HOME-independent.
# > Fails the build here, not at a later PTS test pre-install.
run_sanitized() {
	local home="$1"
	shift
	env -i PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME="${home}" \
		MISE_DATA_DIR="${MISE_DATA_DIR}" MISE_CONFIG_DIR="${MISE_CONFIG_DIR}" "$@"
}

run_sanitized /root sh -c \
	'node --version && npm --version && python --version && python3 --version && pip3 --version'
# mise deliberately ignores config when HOME itself does not exist. E2B creates this home when it
# injects its runtime user. Preserve an existing path exactly; otherwise create it only for the
# faithful build-time probe and clean it on success or failure so the Docker layer keeps no user delta.
user_home_created=false
cleanup_user_home() {
	if [[ "${user_home_created}" == true ]]; then
		rm -rf -- /home/user
	fi
}
if [[ ! -e /home/user && ! -L /home/user ]]; then
	user_home_created=true
	trap cleanup_user_home EXIT
	install -d -m 0755 /home/user
fi
run_sanitized /home/user sh -c 'python --version && python3 --version'
cleanup_user_home
trap - EXIT
