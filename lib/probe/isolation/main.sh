#!/usr/bin/env bash
# shellcheck disable=SC2034
# The globals this file assigns are its OUTPUT CONTRACT — read by the task that sources it,
# never by the file itself. Scoped to the whole file because that is what the contract is.
# Which sandboxing technique is confining this workload? Sourced after lib/bench.sh:
#
#   source "${REPO_ROOT}/lib/probe/isolation/main.sh"
#   isolation_collect     # reads /proc, /sys, /dev, dmesg -> the ISO_* signal globals
#   isolation_classify    # PURE over those globals   -> the verdict globals + ranked candidate rows
#   isolation_dind        # container-in-sandbox readiness, passive
#   isolation_report      # human evidence table on stdout
#
# The collect/classify split is the point of this file. `isolation_classify` touches no filesystem,
# so it can be exercised against recorded signal sets for hardware nobody has to own, and the task
# that sources this stays a thin orchestrator.
#
# WHY THIS EXISTS AT ALL. `systemd-detect-virt` — and the `System Layer` field the Phoronix Test
# Suite derives the same way — answer a strictly coarser question than a provider comparison needs.
# Every KVM-backed microVM reads exactly `kvm`: Firecracker, libkrun, Cloud Hypervisor, crosvm and
# stock QEMU are one indistinguishable bucket, while gVisor reads `container-other` and a plain OCI
# container reads `docker`. That matters because the isolation boundary is what decides whether two
# providers' numbers may be read side by side — a gVisor syscall trap, a Firecracker virtio
# round-trip and a Sysbox namespace boundary have different overhead profiles for the same work.
# Worse, those detectors consult marker FILES before they look at hardware, so a rootfs built from a
# container image that baked in `/run/systemd/container` makes a genuine microVM report `docker`
# (observed on this repo's own dev sandbox: a Firecracker guest, ACPI OEM id `FIRECK`, that both
# systemd-detect-virt and `phoronix-test-suite system-info` call a container).
#
# METHOD — evidence, then score, then rank.
#   1. Collect independently meaningful SIGNALS and publish every one of them.
#   2. Score CANDIDATES with weighted, individually attributed reasons. Weight is the CLASS of the
#      evidence, not a guess at a probability:
#        100  the runtime NAMES ITSELF (ACPI OEM id, SMBIOS vendor, a gVisor banner, a sysboxfs
#             mount, an LXD socket). A self-declaration, not an inference.
#         60  a signature no other deployed implementation produces.
#         30  a signature consistent with this implementation and a few others.
#         15  compatible-with, i.e. it does not argue against.
#        <0   evidence that ARGUES AGAINST (a microVM exposing SMBIOS is not Firecracker).
#      A generic bucket is capped below any specific match, and ties break toward the more specific
#      candidate, so "some microVM" can never outrank a named one.
#   3. Rank, and report the runners-up with their reasons. The verdict is never the only thing kept:
#      a reader who disagrees can re-derive it from the signals in the committed record.
#
# TWO LAYERS, scored separately, because a sandbox is routinely both and one ranked list would have
# to hide one of them. The machine layer is the virtualization under the kernel we can see; the
# container layer is the namespace/kernel-emulation boundary on top of it (Daytona's container class
# is Sysbox inside a VM; Modal's default is gVisor; Kata is an OCI runtime whose boundary is a
# microVM). The headline is the innermost boundary — the one that actually confines the workload —
# and it is a single token so no consumer has to parse a compound label.

# --- Signal globals, in the order isolation_collect fills them ----------------
ISO_ACPI_OEM="" ISO_ACPI_OEM_TABLE="" ISO_ACPI_CREATOR=""
ISO_DMI="" ISO_MANUFACTURER="" ISO_PRODUCT_NAME="" ISO_BIOS_VENDOR=""
ISO_VIRT="" ISO_VIRT_VM="" ISO_VIRT_CONTAINER="" ISO_VIRT_WHAT=""
ISO_CPU_HYPERVISOR="" ISO_HYPERVISOR_FLAG="false" ISO_CPUINFO_FLAGS="false"
ISO_VIRTIO_DEVICES="" ISO_VIRTIO_TRANSPORT="none" ISO_PCI_VENDORS="" ISO_BLOCK_DEVICES=""
ISO_NET_IFACES="" ISO_NET_DRIVERS="" ISO_HAS_VETH="false"
ISO_ROOT_FSTYPE="" ISO_MOUNT_FSTYPES="" ISO_OVERLAY_ENGINE="" ISO_MASKED_PROC="false"
ISO_CMDLINE_MARKERS="" ISO_KERNEL_BUILD=""
ISO_HAS_SMBIOS="false" ISO_HAS_ACPI="false" ISO_HAS_HVC0="false" ISO_HAS_VSOCK="false"
ISO_HAS_VIRTIOFS="false" ISO_HAS_KVM="false" ISO_HAS_FUSE="false"
ISO_HAS_XEN_NODE="false" ISO_HAS_VMBUS="false" ISO_CPU_IS_UML="false"
ISO_CONTAINER_MARKERS="" ISO_CGROUP_ENGINE="" ISO_CGROUP_RW="false"
ISO_USERNS_MAPPED="false" ISO_CAP_SYS_ADMIN="unknown" ISO_LSM_PROFILE=""
ISO_KERNEL_NAMES_GVISOR="false" ISO_BOOTLOG_NAMES_GVISOR="false"
ISO_CC_TECH=""
# Set by the CALLER between collect and classify: did the sandbox demonstrate public egress? Passed
# in rather than read from lib/probe/egress.sh's PUBLIC_IP so the two libraries stay independent — the
# libkrun TSI rule needs "egress works AND there is no interface", and the egress half is not this
# file's to observe.
ISO_EGRESS_OK="false"
# Derived by isolation_classify from the signals above; not observations, so they are re-derived
# rather than collected, and every input to them is published.
ISO_GVISOR="false" ISO_GVISOR_WHY="" ISO_KATA_DECLARED="false" ISO_KATA_INFERRED="false"
# Private classifier inputs: per-sandbox strings (container ids, control-plane arguments) that must
# never enter the report or committed record, where they would both leak and defeat the host-record fold.
ISO_RAW_CMDLINE="" ISO_RAW_CGROUP="" ISO_RAW_OVERLAY_UPPER="" ISO_PID1=""

# --- Verdict globals, filled by isolation_classify ---------------------------
ISOLATION_RUNTIME="unknown" ISOLATION_CLASS="unknown" ISOLATION_CONFIDENCE="unknown" ISOLATION_WHY=""
MACHINE_VMM="unknown" MACHINE_CONFIDENCE="unknown" MACHINE_SCORE=0 MACHINE_RUNNER_UP=0 MACHINE_ROWS=""
CONTAINER_RUNTIME="none" CONTAINER_CONFIDENCE="none" CONTAINER_SCORE=0 CONTAINER_RUNNER_UP=0 CONTAINER_ROWS=""

# --- Docker-in-Docker globals, filled by isolation_dind ----------------------
DIND_READINESS="blocked" DIND_MODE="unavailable" DIND_REASONS=""
DIND_DOCKER_CLI="false" DIND_DOCKERD="false" DIND_PODMAN="false" DIND_SOCKET="false"
DIND_REACHABLE="false" DIND_SERVER_VERSION="" DIND_STORAGE_DRIVER=""
DIND_OVERLAYFS="false" DIND_IS_ROOT="false"

# =============================================================================
# Primitives
# =============================================================================
# First line of a pseudo-file, whitespace-collapsed and trimmed, or empty when unreadable.
# (/proc/self/attr/current is NUL-terminated and /sys/class/dmi/* values carry trailing blanks; the
# `read` builtin stops at the newline and drops the NUL, so both are handled.)
#
# Built entirely from builtins because of how often it runs: this is called once per virtio device,
# once per DMI field and twice per network interface, so on a host with many interfaces it is the
# probe's hottest path. The obvious `tr | head | tr | sed` spelling costs four forks a call — around
# 100 forks per probe, measured at ~2.8ms each — for work bash does for free.
_iso_line() {
	[ -r "$1" ] || return 0
	local line=""
	IFS= read -r line <"$1" 2>/dev/null
	line="${line//$'\t'/ }"
	while [[ "$line" == *"  "* ]]; do line="${line//  / }"; done
	line="${line#"${line%%[![:space:]]*}"}"
	printf '%s' "${line%"${line##*[![:space:]]}"}"
}
# Append to a comma-joined set variable, named indirectly. The idiom is short but it appeared eight
# times across four accumulators before this existed, which is where the ninth copy gets it wrong.
_iso_add() {
	local -n _set="$1"
	_set="${_set:+${_set},}$2"
	return 0
}
_iso_rstrip() {
	local s="$1"
	printf '%s' "${s%"${s##*[![:space:]]}"}"
}
# A trailing-blank-padded ASCII field at <offset>/<length> of an ACPI table blob.
_iso_acpi_field() {
	_iso_rstrip "$(dd if="$1" bs=1 skip="$2" count="$3" 2>/dev/null | tr -cd '[:print:]')"
}
# Comma-join the unique lines on stdin. The compact, order-stable form every set-valued signal is
# recorded in, so two sandboxes of the same shape produce the same string.
_iso_joinset() {
	local joined
	joined="$(LC_ALL=C sort -u | tr '\n' ',')"
	printf '%s' "${joined%,}"
}
# Is $2 a member of the comma-joined set $1?
_iso_in() { case ",${1}," in *",${2},"*) return 0 ;; esac; return 1; }

iso_cmdline_has() { _iso_in "$ISO_CMDLINE_MARKERS" "$1"; }
iso_virtio_has() { _iso_in "$ISO_VIRTIO_DEVICES" "$1"; }
iso_fstype_has() { _iso_in "$ISO_MOUNT_FSTYPES" "$1"; }

# --- The engine, split by role ------------------------------------------------
# Each file answers one question, sourced in dependency order: the rule tables and scoring primitives
# first, then the three stages that use them, then the renderer.
#
# These are LIBRARIES, not mise tasks, and the distinction is load-bearing rather than historical. A
# task is a process that communicates through stdout; a library is sourced and shares state. The
# collect/classify contract is ~50 shared signal globals and a purity guarantee over them — across a
# process boundary that becomes a serialization format to marshal out and back in, and a `mise run`
# dispatch measured at ~190ms against ~140ms of actual probe work. The runnable surface is a task
# group (.mise/tasks/benchmark/system/provider/), which is where a process boundary belongs.
# The numeric prefixes ARE the dependency order: rules are data the stages read, and each stage
# consumes what the previous one produced. Sourcing them in filename order is therefore correct by
# construction, and a reader can see the pipeline without opening a file.
_ISO_STAGES="${BASH_SOURCE[0]%/*}"
# shellcheck source=lib/probe/isolation/10-rules.sh
source "${_ISO_STAGES}/10-rules.sh"
# shellcheck source=lib/probe/isolation/20-collect.sh
source "${_ISO_STAGES}/20-collect.sh"
# shellcheck source=lib/probe/isolation/30-classify.sh
source "${_ISO_STAGES}/30-classify.sh"
# shellcheck source=lib/probe/isolation/40-dind.sh
source "${_ISO_STAGES}/40-dind.sh"
# shellcheck source=lib/probe/isolation/50-report.sh
source "${_ISO_STAGES}/50-report.sh"
