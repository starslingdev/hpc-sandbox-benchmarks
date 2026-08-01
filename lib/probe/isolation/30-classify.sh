#!/usr/bin/env bash
# shellcheck disable=SC2034
# The globals this file assigns are part of lib/probe/isolation/main.sh's OUTPUT CONTRACT — read by the
# task that sources the facade, never by this file itself.
# isolation_classify — score, rank and name the isolation, PURELY over the ISO_* signals.
#
# No filesystem access lives here, deliberately. Every conclusion this function reaches is a function
# of signals the record publishes, so a reader who disagrees can re-derive it offline, and a change to
# the rules can be exercised against synthetic signal sets for hardware nobody has to own.
# =============================================================================
# isolation_classify — pure over the ISO_* signals
# =============================================================================
_iso_rank() {
	# Emits "<order-index>\t<candidate>\t<score>\t<reasons>\t<self-declared>" for every candidate
	# that scored, sorted by score descending then by the authored specificity order — never
	# alphabetically, so a tie resolves toward the more specific candidate.
	#
	# THIS ROW SHAPE IS PART OF THE LIBRARY'S CONTRACT, not a private format: MACHINE_ROWS and
	# CONTAINER_ROWS are published for the caller to render and to serialize, so the columns are
	# named here and callers may rely on them.
	local layer="$1" idx=0 entry cand rows=""
	shift
	for entry in "$@"; do
		cand="${entry%%|*}"
		if [ "${ISO_SCORE[$layer:$cand]:-0}" -gt 0 ]; then
			rows+="${idx}	${cand}	${ISO_SCORE[$layer:$cand]}	${ISO_WHY[$layer:$cand]:-}	${ISO_DECL[$layer:$cand]:-0}"$'\n'
		fi
		idx=$((idx + 1))
	done
	[ -n "$rows" ] && printf '%s' "$rows" | sort -t'	' -k3,3nr -k1,1n
	return 0
}
# The isolation class a candidate belongs to, read from the registry that also defines the ranking
# order — so there is exactly one list of candidates in the file.
_iso_class() {
	local entry
	for entry in "${_ISO_MACHINE_ORDER[@]}" "${_ISO_CONTAINER_ORDER[@]}"; do
		[ "${entry%%|*}" = "$1" ] && { printf '%s' "${entry#*|}"; return 0; }
	done
	printf 'unknown'
}
# The runner-up CONFIDENCE is measured against skips the generic buckets, which is not the same
# question as the runner-up that gets displayed — see _ISO_GENERIC. One awk either way; the generic
# filter is switched off when the top candidate is itself generic.
_iso_runner_up() {
	local skip=1
	_iso_in "$_ISO_GENERIC" "$2" && skip=0
	printf '%s\n' "$1" | awk -F'\t' -v g=",${_ISO_GENERIC}," -v s="$skip" \
		'NR > 1 && (!s || index(g, "," $2 ",") == 0) { print $3; exit }'
}
# Confidence is a property of the evidence CLASS, not of the arithmetic: a self-declaration with a
# clear margin is `confirmed`, an exclusive signature is `strong`, a shared one is `likely`.
_iso_confidence() {
	local top="${1:-0}" runner="${2:-0}" declared="${3:-0}"
	if [ "$top" -eq 0 ]; then printf 'unknown'
	elif [ "$declared" = "1" ] && [ "$((top - runner))" -ge 40 ]; then printf 'confirmed'
	elif [ "$top" -ge 60 ] && [ "$((top - runner))" -ge 20 ]; then printf 'strong'
	elif [ "$top" -ge 40 ]; then printf 'likely'
	else printf 'weak'
	fi
}

isolation_classify() {
	ISO_SCORE=() ISO_WHY=() ISO_DECL=()

	# --- Derived signals: gVisor and Kata ---
	# Both are conclusions ABOUT the signals, not observations, so they are re-derived here rather
	# than collected — which keeps every input to them published, and keeps this function a pure
	# function of the record. gVisor's two observations (the kernel names it, the boot log names it)
	# and Kata's (its marker directory, its boot-argument tokens) are collected; the inference is not.
	ISO_GVISOR="false"
	ISO_GVISOR_WHY=""
	if [ "$ISO_KERNEL_NAMES_GVISOR" = "true" ]; then
		ISO_GVISOR="true"
		ISO_GVISOR_WHY="kernel version string names gVisor"
	elif [ "$ISO_BOOTLOG_NAMES_GVISOR" = "true" ]; then
		ISO_GVISOR="true"
		ISO_GVISOR_WHY="boot log carries the gVisor banner"
	elif [ "$ISO_HAS_ACPI" = "false" ] && [ "$ISO_HAS_SMBIOS" = "false" ] &&
		[ "$ISO_VIRTIO_TRANSPORT" = "none" ] &&
		{ iso_fstype_has overlayfs || iso_fstype_has goferfs || iso_fstype_has 9p; }; then
		# No firmware, no virtio, and a filesystem type name Linux does not use: the real overlay
		# driver is `overlay`, and `overlayfs`/`goferfs` are the sentry's own spellings.
		ISO_GVISOR="true"
		ISO_GVISOR_WHY="no firmware or virtio, and a gVisor-only filesystem type is mounted"
	fi
	# Kata is load-bearing in BOTH layers: it is a container runtime whose guest is a microVM booted
	# by QEMU, Firecracker or Cloud Hypervisor — and that guest presents virtio-fs plus a
	# virtio-console and, on a pmem root, no virtio-blk. That is exactly libkrun's device shape, so
	# without the contradiction below the machine layer names the wrong VMM on every Kata sandbox.
	ISO_KATA_DECLARED="false"
	ISO_KATA_INFERRED="false"
	case "${ISO_DMI} ${ISO_CONTAINER_MARKERS}" in
	*"kata containers"* | *kata-containers* | *kata-agent* | *kata-dir*) ISO_KATA_DECLARED="true" ;;
	esac
	iso_cmdline_has "systemd.unit=kata-containers.target" && ISO_KATA_DECLARED="true"
	# The bare `agent.` token is corroborated by the transport that agent needs (vsock) or the share
	# it mounts (virtio-fs), so an unrelated `agent.*` boot option cannot claim Kata on its own.
	if iso_cmdline_has "agent." && { [ "$ISO_HAS_VSOCK" = "true" ] || [ "$ISO_HAS_VIRTIOFS" = "true" ]; }; then
		ISO_KATA_INFERRED="true"
	fi

	# --- Machine layer: firmware self-declaration ---
	[ -n "$ISO_ACPI_OEM" ] && _iso_rule_first _iso_m "$ISO_ACPI_OEM" "" "${_ISO_ACPI_RULES[@]}"
	_iso_rule_first _iso_m "${ISO_ACPI_OEM_TABLE,,}${ISO_ACPI_CREATOR,,}" "" "${_ISO_ACPI_TABLE_RULES[@]}"
	# The DMI/kernel tables are written in lowercase; normalise here so the tables state their own
	# matching rule instead of depending on how the collector happened to store the signal.
	_iso_rule_first _iso_m "${ISO_DMI,,}" "" "${_ISO_DMI_RULES[@]}"

	# --- Machine layer: paravirt buses, drivers, PCI vendors, detectors ---
	[ "$ISO_HAS_XEN_NODE" = "true" ] && _iso_m xen 100 "the kernel exposes a Xen hypervisor node"
	[ "$ISO_HAS_VMBUS" = "true" ] && _iso_m hyper-v 100 "the kernel exposes the Hyper-V VMBus"
	[ "$ISO_CPU_IS_UML" = "true" ] && _iso_m uml 100 "/proc/cpuinfo reports User Mode Linux"
	_iso_rule_first _iso_m "${ISO_KERNEL_BUILD,,}" "" "${_ISO_KERNEL_RULES[@]}"
	_iso_rule_each _iso_m "$ISO_NET_DRIVERS" "" "${_ISO_NETDRV_RULES[@]}"
	_iso_rule_each _iso_m "$ISO_PCI_VENDORS" "" "${_ISO_PCI_RULES[@]}"
	_iso_rule_each _iso_m "$ISO_BLOCK_DEVICES" "" "${_ISO_BLOCK_RULES[@]}"
	_iso_rule_first _iso_m "${ISO_VIRT_VM,,}" "" "${_ISO_DETECTOR_RULES[@]}"
	_iso_rule_each _iso_m "${ISO_VIRT_WHAT,,}" "" "${_ISO_DETECTOR_RULES[@]}"

	# --- Machine layer: boot-argument and device-topology signatures ---
	# Reached when no firmware identity exists, the normal case for the minimal VMMs.
	if iso_cmdline_has "rootfstype=virtiofs" || iso_cmdline_has "init=/init.krun" ||
		[ "$ISO_ROOT_FSTYPE" = "virtiofs" ]; then
		# Rooting the guest on virtio-fs — no block device at all — is libkrun's model. Kata also
		# shares files over virtio-fs but boots from a block or pmem root.
		_iso_m libkrun 60 "the guest is rooted on virtio-fs"
	fi
	[ "$ISO_HAS_VIRTIOFS" = "true" ] && [ "$ISO_HAS_HVC0" = "true" ] && ! iso_virtio_has blk &&
		_iso_m libkrun 60 "virtio-fs and virtio-console present with no virtio-blk"
	iso_cmdline_has "no-kvmapf" && _iso_m libkrun 30 "no-kvmapf is in libkrun's default command line"
	# libkrun's default networking is TSI: the guest gets NO interface, yet sockets reach the internet
	# because the VMM intercepts them. Scored only once egress has actually been demonstrated, which
	# the caller reports through ISO_EGRESS_OK.
	[ -z "$ISO_NET_IFACES" ] && [ "$ISO_EGRESS_OK" = "true" ] &&
		_iso_m libkrun 60 "public egress with no network interface at all (libkrun TSI)"
	iso_cmdline_has "reboot=k" && iso_cmdline_has "panic=1" &&
		_iso_m firecracker 60 "Firecracker's default boot arguments"
	# `pci=off` and `virtio_mmio.device` are Firecracker's classic companions but are no longer
	# required: recent Firecracker can attach virtio over PCIe, so they add weight without being a
	# precondition.
	iso_cmdline_has "pci=off" && _iso_m firecracker 30 "pci=off, Firecracker's default"
	iso_cmdline_has "virtio_mmio.device" && _iso_m firecracker 30 "explicit virtio-mmio device windows"
	iso_cmdline_has "nvme_core.io_timeout" && _iso_m amazon-nitro 30 "EC2's default NVMe timeout boot argument"
	iso_cmdline_has "console=hvc0" && {
		_iso_m libkrun 15 "console on virtio-console"
		_iso_m cloud-hypervisor 15 "console on virtio-console"
	}
	iso_cmdline_has "console=ttyS0" && _iso_m firecracker 15 "console on an emulated 8250"
	# Contradictions. Firecracker and libkrun ship no SMBIOS at all, so its presence argues against
	# them far more strongly than their supporting signals argue for them.
	if [ "$ISO_HAS_SMBIOS" = "true" ]; then
		_iso_m firecracker -80 "SMBIOS tables are present; Firecracker exposes none"
		_iso_m libkrun -60 "SMBIOS tables are present; libkrun exposes none"
	fi
	iso_virtio_has blk && _iso_m libkrun -40 "a virtio-blk device is present; libkrun boots without one"
	{ [ "$ISO_KATA_DECLARED" = "true" ] || [ "$ISO_KATA_INFERRED" = "true" ]; } &&
		_iso_m libkrun -60 "the virtio-fs/virtio-console shape here belongs to a Kata guest, not to libkrun"

	# --- Machine layer: generic buckets, capped below any named match ---
	if [ "$ISO_HYPERVISOR_FLAG" = "true" ] || [ -n "$ISO_CPU_HYPERVISOR" ]; then
		if [ "$ISO_HAS_SMBIOS" = "false" ] && [ "$ISO_VIRTIO_TRANSPORT" != "none" ]; then
			_iso_m microvm-unidentified 45 "a virtio guest with no SMBIOS: a minimal VMM, not identified"
		elif [ "$ISO_VIRTIO_TRANSPORT" = "mmio" ]; then
			_iso_m microvm-unidentified 45 "virtio over MMIO: a minimal VMM, not identified"
		fi
		_iso_m vm-unidentified 40 "CPUID reports a hypervisor"
		_iso_m bare-metal -200 "CPUID reports a hypervisor"
	elif [ "$ISO_CPUINFO_FLAGS" = "true" ]; then
		# An x86 `flags` line WITHOUT the hypervisor bit is positive evidence of bare metal — no VMM
		# leaves it clear. Gated on the line existing so an aarch64 guest, which has no such bit to
		# miss, stays unidentified rather than being declared bare metal.
		_iso_m bare-metal 60 "x86 CPUID flags present without the hypervisor bit"
	fi

	# --- Container layer ---
	if [ "$ISO_GVISOR" = "true" ]; then
		# gVisor is an OCI runtime whose boundary is a user-space kernel, so it belongs to this layer
		# even though it presents a machine. Only the fs-shape fallback is an inference.
		case "$ISO_GVISOR_WHY" in
		*"filesystem type"*) _iso_c gvisor 60 "$ISO_GVISOR_WHY" ;;
		*) _iso_c gvisor 100 "$ISO_GVISOR_WHY" ;;
		esac
	fi
	[ "$ISO_KATA_DECLARED" = "true" ] &&
		_iso_c kata-containers 100 "Kata names itself in SMBIOS, the boot arguments, or its agent runtime directory"
	[ "$ISO_KATA_INFERRED" = "true" ] &&
		_iso_c kata-containers 60 "Kata agent boot arguments with vsock or virtio-fs present"
	_iso_rule_each _iso_c "$ISO_CONTAINER_MARKERS" "" "${_ISO_MARKER_RULES[@]}"
	_iso_rule_first _iso_c "$ISO_CGROUP_ENGINE" "the cgroup path is " "${_ISO_ENGINE_RULES[@]}"
	_iso_rule_first _iso_c "$ISO_OVERLAY_ENGINE" "the overlay upperdir is " "${_ISO_ENGINE_RULES[@]}"
	_iso_rule_first _iso_c "${ISO_LSM_PROFILE,,}" "" "${_ISO_LSM_RULES[@]}"
	[ -n "$ISO_VIRT_CONTAINER" ] && [ "$ISO_VIRT_CONTAINER" != "none" ] &&
		_iso_rule_first _iso_c "${ISO_VIRT_CONTAINER,,}" "" "${_ISO_CONTAINER_DETECTOR_RULES[@]}"

	# Structural containment — live state no image copy reproduces. Enough of it names a container
	# even when no engine does.
	[ "$ISO_MASKED_PROC" = "true" ] && _iso_c oci-container 30 "kernel-introspection paths under /proc are masked"
	[ "$ISO_CAP_SYS_ADMIN" = "false" ] && _iso_c oci-container 30 "CAP_SYS_ADMIN has been dropped"
	[ "$ISO_ROOT_FSTYPE" = "overlay" ] && _iso_c oci-container 20 "the root filesystem is an overlay"
	[ "$ISO_HAS_VETH" = "true" ] && _iso_c oci-container 20 "a veth pipe into another network namespace is present"
	if [ "$ISO_USERNS_MAPPED" = "true" ]; then
		_iso_c oci-container 20 "running inside a remapped user namespace"
		_iso_c sysbox 20 "Sysbox always remaps the user namespace"
		_iso_c lxd 10 "unprivileged LXD remaps the user namespace"
		_iso_c podman 10 "rootless Podman remaps the user namespace"
	fi

	# --- Rank both layers ---
	# One tab-split per layer reads all four cells of the winning row; the alternative spelling forks
	# an awk per cell, which is most of this function's cost for no gain.
	local m_idx m_why m_decl c_idx c_why c_decl
	MACHINE_ROWS="$(_iso_rank machine "${_ISO_MACHINE_ORDER[@]}")"
	CONTAINER_ROWS="$(_iso_rank container "${_ISO_CONTAINER_ORDER[@]}")"
	MACHINE_VMM="" MACHINE_SCORE=0 m_why="" m_decl=0
	CONTAINER_RUNTIME="" CONTAINER_SCORE=0 c_why="" c_decl=0
	[ -n "$MACHINE_ROWS" ] &&
		IFS=$'\t' read -r m_idx MACHINE_VMM MACHINE_SCORE m_why m_decl <<<"${MACHINE_ROWS%%$'\n'*}"
	[ -n "$CONTAINER_ROWS" ] &&
		IFS=$'\t' read -r c_idx CONTAINER_RUNTIME CONTAINER_SCORE c_why c_decl <<<"${CONTAINER_ROWS%%$'\n'*}"
	MACHINE_RUNNER_UP="$(_iso_runner_up "$MACHINE_ROWS" "$MACHINE_VMM")"
	CONTAINER_RUNNER_UP="$(_iso_runner_up "$CONTAINER_ROWS" "$CONTAINER_RUNTIME")"
	MACHINE_SCORE="${MACHINE_SCORE:-0}" MACHINE_RUNNER_UP="${MACHINE_RUNNER_UP:-0}"
	CONTAINER_SCORE="${CONTAINER_SCORE:-0}" CONTAINER_RUNNER_UP="${CONTAINER_RUNNER_UP:-0}"

	if [ -z "$CONTAINER_RUNTIME" ] || [ "$CONTAINER_SCORE" -lt "$_ISO_CONTAINER_FLOOR" ]; then
		[ -n "$CONTAINER_RUNTIME" ] && c_why="below the containment floor: ${c_why}"
		CONTAINER_RUNTIME="none"
		CONTAINER_SCORE=0
	fi
	[ -n "$MACHINE_VMM" ] || MACHINE_VMM="unknown"
	if [ "$ISO_GVISOR" = "true" ]; then
		# The sentry IS the kernel here; whatever runs under the runsc process is not observable from
		# inside, so naming a VMM would be an invention.
		MACHINE_VMM="not-observable"
		m_why="a user-space kernel hides the machine layer"
	fi
	MACHINE_CONFIDENCE="$(_iso_confidence "$MACHINE_SCORE" "$MACHINE_RUNNER_UP" "${m_decl:-0}")"
	CONTAINER_CONFIDENCE="none"
	[ "$CONTAINER_RUNTIME" != "none" ] &&
		CONTAINER_CONFIDENCE="$(_iso_confidence "$CONTAINER_SCORE" "$CONTAINER_RUNNER_UP" "${c_decl:-0}")"

	# --- Headline: the innermost boundary is the one that confines the workload ---
	if [ "$CONTAINER_RUNTIME" != "none" ]; then
		ISOLATION_RUNTIME="$CONTAINER_RUNTIME"
		ISOLATION_CONFIDENCE="$CONTAINER_CONFIDENCE"
		ISOLATION_WHY="$c_why"
	else
		ISOLATION_RUNTIME="$MACHINE_VMM"
		ISOLATION_CONFIDENCE="$MACHINE_CONFIDENCE"
		ISOLATION_WHY="$m_why"
	fi
	ISOLATION_CLASS="$(_iso_class "$ISOLATION_RUNTIME")"
	# Memory encryption does not change which VMM is running, only how much the host can see.
	[ -n "$ISO_CC_TECH" ] && ISOLATION_WHY="${ISOLATION_WHY}|confidential computing active: ${ISO_CC_TECH}"
	return 0
}
