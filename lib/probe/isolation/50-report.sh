#!/usr/bin/env bash
# shellcheck disable=SC2034
# The globals this file assigns are part of this probe's OUTPUT CONTRACT (see main.sh) — read by the
# task that sources the facade, never by this file itself.
# isolation_report — the human evidence table.
#
# The only consumer of the report-only signals: values that identify a single sandbox, or can carry a
# control-plane token, are printed here and never published to the record.
# =============================================================================
# isolation_report — the human evidence table
# =============================================================================
# Report-only by design. The raw command line, cgroup paths and overlay upperdir printed here are
# NOT in the JSON record: they identify a single sandbox (container ids) or can carry a control-plane
# token, and the committed dataset folds host records by identity, so a per-sandbox string in a
# published field would both leak and defeat the fold. They are useful when debugging a run, which is
# what stdout is for.
isolation_report() {
	echo "=== Isolation ==="
	bench_row "technique" "$ISOLATION_RUNTIME ($ISOLATION_CLASS, confidence=$ISOLATION_CONFIDENCE)"
	bench_row "machine layer" "$MACHINE_VMM ($MACHINE_CONFIDENCE, score=$MACHINE_SCORE, runner-up=$MACHINE_RUNNER_UP)"
	bench_row "container layer" "$CONTAINER_RUNTIME ($CONTAINER_CONFIDENCE, score=$CONTAINER_SCORE, runner-up=$CONTAINER_RUNNER_UP)"
	bench_row "confidential computing" "$ISO_CC_TECH"
	bench_rows "why" "$ISOLATION_WHY"
	echo
	echo "-- ranked candidates --"
	printf '%s\n%s\n' "$MACHINE_ROWS" "$CONTAINER_ROWS" |
		awk -F'\t' 'NF > 1 {printf "  %-22s %4s  %s\n", $2, $3, $4}'
	echo
	echo "-- evidence --"
	[ -n "${ISO_MANUFACTURER}${ISO_PRODUCT_NAME}${ISO_BIOS_VENDOR}" ] &&
		bench_row "smbios identity" "${ISO_MANUFACTURER:-—} / ${ISO_PRODUCT_NAME:-—} / ${ISO_BIOS_VENDOR:-—}"
	bench_row "acpi ids" "${ISO_ACPI_OEM}${ISO_ACPI_OEM_TABLE:+ / ${ISO_ACPI_OEM_TABLE}}${ISO_ACPI_CREATOR:+ / ${ISO_ACPI_CREATOR}}"
	bench_row "smbios (all fields)" "$ISO_DMI"
	bench_row "detectors" "systemd=${ISO_VIRT:-none} vm=${ISO_VIRT_VM:-none} container=${ISO_VIRT_CONTAINER:-none}${ISO_VIRT_WHAT:+ virt-what=${ISO_VIRT_WHAT}}"
	bench_row "cpu hypervisor" "${ISO_CPU_HYPERVISOR:-none} (cpuid bit=${ISO_HYPERVISOR_FLAG}, x86 flags=${ISO_CPUINFO_FLAGS}, uml=${ISO_CPU_IS_UML})"
	bench_row "virtio" "${ISO_VIRTIO_DEVICES:-none} over ${ISO_VIRTIO_TRANSPORT}"
	bench_row "pci vendors" "$ISO_PCI_VENDORS"
	bench_row "block devices" "$ISO_BLOCK_DEVICES"
	bench_row "network" "${ISO_NET_IFACES:-none} drivers=${ISO_NET_DRIVERS:-none} veth=${ISO_HAS_VETH}"
	bench_row "root filesystem" "$ISO_ROOT_FSTYPE"
	bench_row "mounted fstypes" "$ISO_MOUNT_FSTYPES"
	bench_row "firmware" "smbios=${ISO_HAS_SMBIOS} acpi=${ISO_HAS_ACPI} hvc0=${ISO_HAS_HVC0} vsock=${ISO_HAS_VSOCK} kvm=${ISO_HAS_KVM} fuse=${ISO_HAS_FUSE} xen=${ISO_HAS_XEN_NODE} vmbus=${ISO_HAS_VMBUS}"
	bench_row "cmdline markers" "$ISO_CMDLINE_MARKERS"
	bench_row "kernel build" "$ISO_KERNEL_BUILD"
	bench_row "containment" "markers=${ISO_CONTAINER_MARKERS:-none} cgroup=${ISO_CGROUP_ENGINE:-none} overlay=${ISO_OVERLAY_ENGINE:-none} userns=${ISO_USERNS_MAPPED} cap_sys_admin=${ISO_CAP_SYS_ADMIN} masked_proc=${ISO_MASKED_PROC} lsm=${ISO_LSM_PROFILE:-none}"
	bench_row "pid 1" "$ISO_PID1"
	# Report-only, by the rule in this file's header: these identify a single sandbox or can carry a
	# control-plane token, so they are useful when debugging a run and must never reach the record.
	bench_row "raw cmdline" "$ISO_RAW_CMDLINE"
	bench_row "raw cgroup" "$ISO_RAW_CGROUP"
	bench_row "raw overlay upperdir" "$ISO_RAW_OVERLAY_UPPER"
	echo
	echo "=== Docker-in-Docker ==="
	bench_row "readiness" "$DIND_READINESS (mode=$DIND_MODE)"
	bench_row "docker" "cli=${DIND_DOCKER_CLI} dockerd=${DIND_DOCKERD} podman=${DIND_PODMAN} socket=${DIND_SOCKET} reachable=${DIND_REACHABLE}${DIND_STORAGE_DRIVER:+ storage=${DIND_STORAGE_DRIVER}}"
	bench_row "prerequisites" "root=${DIND_IS_ROOT} cap_sys_admin=${ISO_CAP_SYS_ADMIN} cgroup_rw=${ISO_CGROUP_RW} overlayfs=${DIND_OVERLAYFS} fuse=${ISO_HAS_FUSE}"
	bench_rows "reasons" "$DIND_REASONS"
	return 0
}
