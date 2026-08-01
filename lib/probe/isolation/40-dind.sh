#!/usr/bin/env bash
# shellcheck disable=SC2034
# The globals this file assigns are part of this probe's OUTPUT CONTRACT (see main.sh) — read by the
# task that sources the facade, never by this file itself.
# isolation_dind — can a container run INSIDE this sandbox?
#
# A capability of the isolation boundary, and exactly the axis the techniques differ on. Reads the
# containment signals isolation_collect already gathered rather than re-probing.
# =============================================================================
# isolation_dind — can a container run INSIDE this sandbox?
# =============================================================================
# A capability of the isolation boundary, and exactly the axis the techniques differ on: a microVM
# with a real kernel usually can, a gVisor sandbox usually cannot (no overlayfs, no cgroup
# delegation), an unprivileged OCI container only in rootless mode. Assessed PASSIVELY — prerequisites
# are read and an already-running daemon is asked for its version under a hard timeout. No daemon is
# started, no module loaded, nothing mounted, no container run.
isolation_dind() {
	have docker && DIND_DOCKER_CLI="true"
	have dockerd && DIND_DOCKERD="true"
	have podman && DIND_PODMAN="true"
	{ [ -S /var/run/docker.sock ] || [ -S "${XDG_RUNTIME_DIR:-/run/user/${EUID}}/docker.sock" ]; } &&
		DIND_SOCKET="true"
	grep -qw overlay /proc/filesystems 2>/dev/null && DIND_OVERLAYFS="true"
	[ "$EUID" = "0" ] && DIND_IS_ROOT="true"

	if [ "$DIND_DOCKER_CLI" = "true" ] && have timeout; then
		# `timeout` is mandatory rather than optional: `docker version` against a socket whose daemon
		# is wedged blocks indefinitely, and this probe runs inside a benchmark's time budget. The two
		# calls stay split because `docker info` is an order of magnitude slower than `docker version`
		# and the common case here is no daemon at all — asking the cheap question first is what keeps
		# the unreachable path cheap.
		DIND_SERVER_VERSION="$(timeout 3 docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
		if [ -n "$DIND_SERVER_VERSION" ]; then
			DIND_REACHABLE="true"
			DIND_STORAGE_DRIVER="$(timeout 3 docker info --format '{{.Driver}}' 2>/dev/null || true)"
		fi
	fi

	# ONE declaration of the nested-rootful prerequisites, feeding both the decision and the
	# explanation. Spelling them once as a condition and again as a list of failure strings is how
	# the two drift: a prerequisite added to the branch but not the list goes unexplained, and one
	# removed from the branch but not the list is reported as blocking when it no longer is.
	local -a prereqs=(
		"$([ "$DIND_DOCKERD" = "true" ] || [ "$DIND_PODMAN" = "true" ] && echo true)|a dockerd or podman binary"
		"${DIND_IS_ROOT}|running as root"
		"${ISO_CAP_SYS_ADMIN}|CAP_SYS_ADMIN"
		"${ISO_CGROUP_RW}|a writable cgroup root"
		"$([ "$DIND_OVERLAYFS" = "true" ] || [ "$ISO_HAS_FUSE" = "true" ] && echo true)|overlayfs or /dev/fuse"
	)
	local prereq missing=""
	for prereq in "${prereqs[@]}"; do
		[ "${prereq%%|*}" = "true" ] || missing="${missing:+${missing}|}no ${prereq#*|}"
	done

	if [ "$DIND_REACHABLE" = "true" ]; then
		DIND_MODE="existing-daemon"
		DIND_READINESS="ready"
		DIND_REASONS="a Docker daemon answered (server ${DIND_SERVER_VERSION})"
		[ "$DIND_SOCKET" = "true" ] &&
			DIND_REASONS="${DIND_REASONS}|the daemon may be a mounted host socket rather than a nested one"
	elif [ -z "$missing" ]; then
		DIND_MODE="nested-rootful"
		DIND_READINESS="likely-ready"
		DIND_REASONS="every nested-rootful prerequisite is available"
	elif [ "$DIND_DOCKERD" = "true" ] && [ "$ISO_HAS_FUSE" = "true" ] && [ "$ISO_USERNS_MAPPED" = "true" ]; then
		DIND_MODE="nested-rootless"
		DIND_READINESS="possibly-ready"
		DIND_REASONS="dockerd with /dev/fuse in a remapped user namespace suggests rootless mode could work|${missing}"
	else
		DIND_REASONS="$missing"
	fi
	return 0
}
