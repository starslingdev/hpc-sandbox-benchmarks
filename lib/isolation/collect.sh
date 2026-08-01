#!/usr/bin/env bash
# shellcheck disable=SC2034
# The globals this file assigns are part of lib/isolation.sh's OUTPUT CONTRACT — read by the
# task that sources the facade, never by this file itself.
# isolation_collect — read the machine into the ISO_* signal globals.
#
# The ONLY half that touches /proc, /sys, /dev and dmesg. Keeping every read in one function is what
# lets isolation_classify be a pure function of the result, which in turn is what makes a verdict
# reproducible from a committed record and testable against recorded signal sets.
# =============================================================================
# isolation_collect — read the machine
# =============================================================================
isolation_collect() {
	# Only these two are used across sections; every other local is declared where it is set.
	local dmesg_head="" root_line=""

	# The boot log, read ONCE and bounded. Everything wanted from it — the ACPI RSDP line,
	# "Hypervisor detected: …", gVisor's banner, the memory-encryption line — is printed during early
	# boot, and slurping an unbounded ring buffer into a shell variable is not free. Captured into a
	# variable rather than grepped through a pipe in a condition, because `set -o pipefail` turns the
	# SIGPIPE that `head` delivers to `dmesg` into a non-zero pipeline status: an
	# `if dmesg | head | grep -q …` test reports FALSE on a successful match, exactly backwards.
	have dmesg && dmesg_head="$(dmesg 2>/dev/null | head -400)"

	# --- Kernel command line: matched tokens only ---
	# A VMM's default boot arguments are the strongest fingerprint available on a guest with no
	# SMBIOS: Firecracker boots `reboot=k panic=1 pci=off`, libkrun `console=hvc0
	# rootfstype=virtiofs … no-kvmapf`, Kata carries its `agent.*` options, EC2 its NVMe timeout.
	ISO_RAW_CMDLINE="$(_iso_line /proc/cmdline)"
	local token
	for token in reboot=k panic=1 panic=-1 pci=off nomodule no-kvmapf virtio_mmio.device \
		console=ttyS0 console=hvc0 console=ttyAMA0 root=/dev/vda root=/dev/pmem0 root=/dev/xvda \
		rootfstype=virtiofs init=/init.krun agent. systemd.unit=kata-containers.target \
		nvme_core.io_timeout; do
		# Anchored at a word boundary (the leading space) so `panic=1` cannot match inside `panic=100`.
		case " ${ISO_RAW_CMDLINE} " in
		*" ${token}"*) _iso_add ISO_CMDLINE_MARKERS "$token" ;;
		esac
	done

	# --- ACPI table identity ---
	# Layout (ACPI 6.x §21.2.1, the fixed 36-byte description header): signature[4] length[4]
	# revision[1] checksum[1] oem_id[6] oem_table_id[8] oem_revision[4] creator_id[4]
	# creator_revision[4] — so the OEM id is at byte 10, the OEM table id at 16, the creator id at 28.
	local table
	for table in /sys/firmware/acpi/tables/{DSDT,FACP,APIC,XSDT}; do
		[ -r "$table" ] || continue
		ISO_ACPI_OEM="$(_iso_acpi_field "$table" 10 6)"
		[ -n "$ISO_ACPI_OEM" ] || continue
		ISO_ACPI_OEM_TABLE="$(_iso_acpi_field "$table" 16 8)"
		ISO_ACPI_CREATOR="$(_iso_acpi_field "$table" 28 4)"
		break
	done
	if [ -z "$ISO_ACPI_OEM" ] && [ -n "$dmesg_head" ]; then
		# The tables are mode 0400; a non-root sandbox falls back to the boot log, which prints the
		# same id: "ACPI: RSDP 0x…E0000 000024 (v02 FIRECK)".
		ISO_ACPI_OEM="$(_iso_rstrip "$(printf '%s\n' "$dmesg_head" |
			sed -n 's/^.*ACPI: RSDP .*(v[0-9]* \([^)]*\)).*$/\1/p' | head -1)")"
	fi

	# --- SMBIOS/DMI ---
	# /sys is readable without dmidecode or root; fall back to dmidecode (sandboxes run as root).
	local field key value have_dmidecode="false"
	have dmidecode && have_dmidecode="true"
	for field in sys_vendor:system-manufacturer product_name:system-product-name \
		product_version:system-product-version product_family:system-product-family \
		board_vendor:baseboard-manufacturer board_name:baseboard-product-name \
		bios_vendor:bios-vendor bios_version:bios-version chassis_vendor:chassis-manufacturer; do
		key="${field%%:*}"
		value=""
		if [ -r "/sys/class/dmi/id/${key}" ]; then
			value="$(_iso_line "/sys/class/dmi/id/${key}")"
		elif [ "$have_dmidecode" = "true" ]; then
			# Only when sysfs cannot answer at all. Gating on an EMPTY value instead would spawn
			# dmidecode for every field a firmware legitimately leaves blank (product_family and
			# chassis_vendor usually are), re-parsing the whole DMI table each time.
			value="$(dmidecode -s "${field#*:}" 2>/dev/null | grep -v '^#' | head -1 | tr -d '\n')"
		fi
		ISO_DMI="${ISO_DMI}${value} "
		case "$key" in
		sys_vendor) ISO_MANUFACTURER="$value" ;;
		product_name) ISO_PRODUCT_NAME="$value" ;;
		bios_vendor) ISO_BIOS_VENDOR="$value" ;;
		esac
	done
	ISO_DMI="${ISO_DMI,,}"
	# Every field blank leaves a run of spaces, which is not an observation: collapse it so the
	# signal is empty rather than whitespace, in the report and in the record alike.
	while [[ "$ISO_DMI" == *"  "* ]]; do ISO_DMI="${ISO_DMI//  / }"; done
	ISO_DMI="${ISO_DMI# }"
	ISO_DMI="${ISO_DMI% }"
	[ -d /sys/class/dmi/id ] && ISO_HAS_SMBIOS="true"
	[ -d /sys/firmware/acpi ] && ISO_HAS_ACPI="true"

	# --- The established detectors ---
	# NOT via get(): systemd-detect-virt prints "none" AND exits 1 on bare metal, and get()'s
	# discard-on-nonzero would turn confirmed bare metal into an empty field. The two narrowed forms
	# matter because a sandbox that is BOTH a VM and a container reports both, instead of only
	# whichever the unqualified call happens to rank first.
	if have systemd-detect-virt; then
		ISO_VIRT_VM="$(systemd-detect-virt --vm 2>/dev/null || true)"
		ISO_VIRT_CONTAINER="$(systemd-detect-virt --container 2>/dev/null || true)"
	fi
	# The unqualified verdict, which is what the two narrowed ones already imply: it reports the
	# container when there is one and the VM otherwise. Derived rather than spawned a third time.
	if [ -n "$ISO_VIRT_CONTAINER" ] && [ "$ISO_VIRT_CONTAINER" != "none" ]; then
		ISO_VIRT="$ISO_VIRT_CONTAINER"
	else
		ISO_VIRT="$ISO_VIRT_VM"
	fi
	# virt-what reads CPUID leaves and DMI directly rather than consulting marker files first, so it
	# does not inherit systemd's image-residue failure mode. Rarely installed; a bonus, not a
	# requirement.
	have virt-what && ISO_VIRT_WHAT="$(virt-what 2>/dev/null | _iso_joinset)"

	# --- Is there a hypervisor under this kernel at all? ---
	# The CPUID hypervisor bit is set by every VMM and by nothing else, so it separates "guest" from
	# "bare metal" without naming anyone. It is x86-only: on aarch64 /proc/cpuinfo has a `Features`
	# line and no such bit, so its ABSENCE there says nothing. Recorded separately from the flag,
	# because "no hypervisor bit on x86" is proof of bare metal and "no hypervisor bit on ARM" is no
	# information whatsoever, and one boolean cannot mean both.
	# One pass for both CPU-level facts, so /proc/cpuinfo — which the kernel synthesizes per read and
	# which scales with thread count — is read once instead of once here and once for the UML check.
	local cpuinfo_head flags_line
	cpuinfo_head="$(grep -m2 -E '^(flags|vendor_id)[[:space:]]*:' /proc/cpuinfo 2>/dev/null)"
	flags_line="$(printf '%s\n' "$cpuinfo_head" | grep -m1 '^flags' || true)"
	case "$cpuinfo_head" in *"User Mode Linux"*) ISO_CPU_IS_UML="true" ;; esac
	[ -n "$flags_line" ] && ISO_CPUINFO_FLAGS="true"
	# Whole-word match in the shell rather than a `grep` alternation: BRE `\|` is a GNU extension a
	# busybox image does not honour, and silently never matching would read as bare metal.
	case " ${flags_line} " in *" hypervisor "*) ISO_HYPERVISOR_FLAG="true" ;; esac
	have lscpu &&
		ISO_CPU_HYPERVISOR="$(LC_ALL=C lscpu 2>/dev/null | sed -n 's/^Hypervisor vendor:[[:space:]]*//p' | head -1)"
	[ -z "$ISO_CPU_HYPERVISOR" ] && [ -n "$dmesg_head" ] &&
		ISO_CPU_HYPERVISOR="$(printf '%s\n' "$dmesg_head" | sed -n 's/^.*Hypervisor detected: //p' | head -1)"

	# --- virtio topology ---
	# WHICH devices the VMM chose to expose, and over WHICH transport, is what separates two KVM
	# guests that otherwise look identical. Firecracker gives virtio-blk + virtio-net (classically
	# over MMIO, with `pci=off`); libkrun gives virtio-fs as the ROOT plus virtio-console and, in TSI
	# mode, no network device at all; Cloud Hypervisor and stock QEMU put everything on PCI.
	local dev id path saw_pci=0 saw_mmio=0
	local -a names=()
	for dev in /sys/bus/virtio/devices/*; do
		[ -d "$dev" ] || continue
		id="$(_iso_line "$dev/device")"
		case "$id" in
		0x[0-9a-fA-F]* | [0-9]*)
			id=$((id))
			names+=("${_ISO_VIRTIO_IDS[$id]:-id$id}")
			;;
		esac
		path="$(readlink -f "$dev" 2>/dev/null)"
		# A virtio device's parent is either a PCI function (`…/pci0000:00/0000:00:01.0/virtio0`) or a
		# platform device standing for an MMIO window (`…/platform/d0000000.virtio_mmio/virtio0`).
		case "$path" in
		*/pci[0-9]*) saw_pci=1 ;;
		*/platform/*) saw_mmio=1 ;;
		esac
	done
	[ ${#names[@]} -gt 0 ] && ISO_VIRTIO_DEVICES="$(printf '%s\n' "${names[@]}" | _iso_joinset)"
	case "${saw_mmio}${saw_pci}" in
	11) ISO_VIRTIO_TRANSPORT="mixed" ;;
	10) ISO_VIRTIO_TRANSPORT="mmio" ;;
	01) ISO_VIRTIO_TRANSPORT="pci" ;;
	esac

	# --- PCI vendors, block devices, network drivers ---
	# The unique PCI VENDOR ids, not an lspci dump: four hex digits per vendor is compact, stable
	# across runs of the same shape, and is exactly the discriminating part. A full device list would
	# add a kilobyte of per-sandbox noise for no extra identification.
	[ -d /sys/bus/pci/devices ] &&
		ISO_PCI_VENDORS="$(cat /sys/bus/pci/devices/*/vendor 2>/dev/null | sed 's/^0x//' | _iso_joinset)"
	# `vda` is virtio-blk, `xvda` Xen, `nvme0n1` a real or Nitro NVMe, `pmem0` a Kata/NVDIMM root.
	local blk
	for blk in /sys/block/*; do
		[ -e "$blk" ] || continue
		_iso_add ISO_BLOCK_DEVICES "${blk##*/}"
	done
	# Network drivers name the platform outright. A veth is identified structurally instead — its
	# `iflink` names an ifindex in ANOTHER namespace — because a veth end has no driver symlink.
	local iface name driver ifindex iflink
	local -a drivers=()
	for iface in /sys/class/net/*; do
		[ -e "$iface" ] || continue
		name="${iface##*/}"
		[ "$name" = "lo" ] && continue
		_iso_add ISO_NET_IFACES "$name"
		driver="$(readlink -f "$iface/device/driver" 2>/dev/null)"
		if [ -n "$driver" ]; then
			drivers+=("${driver##*/}")
		else
			ifindex="$(_iso_line "$iface/ifindex")"
			iflink="$(_iso_line "$iface/iflink")"
			[ -n "$iflink" ] && [ "$iflink" != "$ifindex" ] && drivers+=(veth)
		fi
	done
	[ ${#drivers[@]} -gt 0 ] && ISO_NET_DRIVERS="$(printf '%s\n' "${drivers[@]}" | _iso_joinset)"

	# --- Root filesystem, mount vocabulary, consoles ---
	# `virtiofs` as the root is a libkrun/Kata shape; a block device with ext4 is the
	# microVM-with-a-disk shape; `overlay` is a container; gVisor names its own overlay `overlayfs`
	# and its gofer mounts `9p`/`goferfs`, which no Linux kernel does.
	#
	# /proc/self/mountinfo, not `findmnt`: no tool dependency, and its post-"-" fields give the fstype
	# unambiguously. The LAST entry for `/` is the effective one after any pivot/overlay.
	# ONE pass over /proc/self/mountinfo for the three things wanted from it: the effective root
	# mount (the LAST entry for `/`, after any pivot or overlay), the SET of mounted filesystem types,
	# and whether a runc-family engine has masked the kernel-introspection paths under /proc by
	# bind-mounting /dev/null over them. The file is regenerated by the kernel on every open and runs
	# to hundreds of lines on a container host, so reading it three times was three times the cost.
	#
	# `findmnt` is deliberately not used: no tool dependency, and mountinfo's post-"-" fields give the
	# fstype unambiguously.
	local mount_scan=""
	mount_scan="$(awk '
		{ fs = ""
		  for (i = 6; i <= NF; i++) if ($i == "-") { fs = $(i + 1); break }
		  if (fs != "") types[fs] = 1
		  if ($5 == "/") root = $0
		  if ($5 ~ /^\/proc\/(kcore|keys|timer_list|sched_debug|latency_stats)$/) masked = "true" }
		END { print (masked ? "true" : "false")
		      for (t in types) print "T" t
		      print "R" root }' /proc/self/mountinfo 2>/dev/null)"
	if [ -n "$mount_scan" ]; then
		ISO_MASKED_PROC="${mount_scan%%$'\n'*}"
		root_line="${mount_scan##*$'\n'R}"
		ISO_MOUNT_FSTYPES="$(printf '%s\n' "$mount_scan" | sed -n 's/^T//p' | _iso_joinset)"
	fi
	if [ -n "$root_line" ]; then
		ISO_ROOT_FSTYPE="$(printf '%s' "$root_line" |
			awk '{for (i = 6; i <= NF; i++) if ($i == "-") { print $(i + 1); exit }}')"
		case "$root_line" in
		*upperdir=*)
			ISO_RAW_OVERLAY_UPPER="${root_line##*upperdir=}"
			ISO_RAW_OVERLAY_UPPER="${ISO_RAW_OVERLAY_UPPER%%,*}"
			ISO_RAW_OVERLAY_UPPER="${ISO_RAW_OVERLAY_UPPER%% *}"
			;;
		esac
	fi
	# gVisor and some minimal images expose /proc/mounts but not /proc/self/mountinfo.
	if [ -z "$ISO_ROOT_FSTYPE" ]; then
		ISO_ROOT_FSTYPE="$(awk '$2 == "/" { fs = $3 } END { print fs }' /proc/mounts 2>/dev/null)"
		ISO_MOUNT_FSTYPES="$(awk '{print $3}' /proc/mounts 2>/dev/null | _iso_joinset)"
	fi
	grep -qm1 sysboxfs /proc/mounts 2>/dev/null && _iso_add ISO_CONTAINER_MARKERS sysboxfs

	# /dev/hvc0 is virtio-console (libkrun, Cloud Hypervisor, Kata, Xen). /dev/kvm inside the sandbox
	# means nested virtualization is available to the workload, itself worth recording.
	[ -c /dev/hvc0 ] && ISO_HAS_HVC0="true"
	{ [ -c /dev/vsock ] || [ -c /dev/vhost-vsock ]; } && ISO_HAS_VSOCK="true"
	[ -c /dev/kvm ] && ISO_HAS_KVM="true"
	[ -c /dev/fuse ] && ISO_HAS_FUSE="true"
	# Paravirt buses only one hypervisor family ever creates. Collected as signals rather than probed
	# during classification, so the verdict stays a pure function of the record — and so a Xen or
	# Hyper-V verdict can be re-derived from a committed record.
	{ [ -d /proc/xen ] || [ "$(_iso_line /sys/hypervisor/type)" = "xen" ]; } && ISO_HAS_XEN_NODE="true"
	[ -d /sys/bus/vmbus ] && ISO_HAS_VMBUS="true"

	# --- Container-layer markers, split into two tiers ---
	# Conflating these is the single most common way to get this wrong, and it is exactly what
	# systemd-detect-virt does:
	#   WEAK       a file or environment variable a container engine writes that ALSO survives being
	#              baked into an image — `/.dockerenv`, `/run/systemd/container`, `container=`.
	#   STRUCTURAL live kernel state no image copy reproduces — a fuse mount, a userns id map, a
	#              dropped capability, a masked /proc entry, a veth pipe, an engine-owned cgroup path
	#              or overlay upperdir, an engine-applied LSM profile.
	local marker
	for marker in "/.dockerenv:dockerenv" "/run/.containerenv:containerenv" \
		"/.singularity.d:singularity-dir" "/var/run/secrets/kubernetes.io:kubernetes-serviceaccount" \
		"/run/host-services:docker-desktop" "/run/firejail:firejail" "/proc/vz:openvz" \
		"/dev/.lxc:lxc-dir" "/run/kata-containers:kata-dir" "/dev/lxd/sock:lxd-socket" \
		"/run/sysbox/sysbox-fs.sock:sysbox-socket"; do
		[ -e "${marker%%:*}" ] && _iso_add ISO_CONTAINER_MARKERS "${marker#*:}"
	done
	local container_env=""
	[ -r /proc/1/environ ] &&
		container_env="$(tr '\0' '\n' </proc/1/environ 2>/dev/null | sed -n 's/^container=//p' | head -1)"
	[ -n "$container_env" ] && _iso_add ISO_CONTAINER_MARKERS "container-env=${container_env}"
	local systemd_container
	systemd_container="$(_iso_line /run/systemd/container)"
	[ -n "$systemd_container" ] && _iso_add ISO_CONTAINER_MARKERS "systemd-container=${systemd_container}"
	[ -n "${SINGULARITY_CONTAINER:-}${APPTAINER_CONTAINER:-}" ] && _iso_add ISO_CONTAINER_MARKERS apptainer-env

	# The ENGINE that owns our cgroup and our overlay, from the path only — never the path itself,
	# which embeds a per-sandbox container id.
	ISO_RAW_CGROUP="$(cat /proc/self/cgroup 2>/dev/null | tr '\n' ' ')"
	case "$ISO_RAW_CGROUP" in
	*sysbox*) ISO_CGROUP_ENGINE="sysbox" ;;
	*kubepods*) ISO_CGROUP_ENGINE="kubernetes" ;;
	*libpod*) ISO_CGROUP_ENGINE="podman" ;;
	*lxc*) ISO_CGROUP_ENGINE="lxc" ;;
	*crio*) ISO_CGROUP_ENGINE="cri-o" ;;
	*containerd*) ISO_CGROUP_ENGINE="containerd" ;;
	*/docker*) ISO_CGROUP_ENGINE="docker" ;;
	*machine.slice*) ISO_CGROUP_ENGINE="nspawn" ;;
	esac
	case "$ISO_RAW_OVERLAY_UPPER" in
	/var/lib/docker/*) ISO_OVERLAY_ENGINE="docker" ;;
	/var/lib/containerd/* | /run/containerd/*) ISO_OVERLAY_ENGINE="containerd" ;;
	# Podman and CRI-O share the containers/storage layout byte for byte, so the upperdir alone
	# cannot separate them; the cgroup path and the LSM profile can, and override this.
	/var/lib/containers/* | /home/*/.local/share/containers/* | /var/run/containers/*) ISO_OVERLAY_ENGINE="podman" ;;
	/var/lib/sysbox/*) ISO_OVERLAY_ENGINE="sysbox" ;;
	/var/lib/lxd/* | /var/lib/incus/*) ISO_OVERLAY_ENGINE="lxd" ;;
	esac

	# "0 0 4294967295" is the initial namespace's identity map; anything else means someone put us
	# inside a userns (Sysbox always does, as do rootless Podman and unprivileged LXD).
	uidmap="$(awk 'NR == 1 { print $1, $2, $3 }' /proc/self/uid_map 2>/dev/null)"
	[ -n "$uidmap" ] && [ "$uidmap" != "0 0 4294967295" ] && ISO_USERNS_MAPPED="true"
	# CAP_SYS_ADMIN (bit 21) is in a VM guest's root capability set and out of a default OCI
	# container's. From the CapEff bitmask, NOT from `capsh --print | grep cap_sys_admin`: capsh also
	# prints the BOUNDING set, which lists cap_sys_admin on a container that does not hold it — a
	# false positive on the one bit this test exists to read, and one that would also misreport
	# Docker-in-Docker readiness below.
	cap_eff="$(awk '/^CapEff:/ { print $2 }' /proc/self/status 2>/dev/null)"
	if [[ "$cap_eff" =~ ^[0-9a-fA-F]{1,16}$ ]]; then
		if ((0x$cap_eff & 0x200000)); then ISO_CAP_SYS_ADMIN="true"; else ISO_CAP_SYS_ADMIN="false"; fi
	fi
	# An LSM profile named by the engine that applied it — `docker-default`, `crio-default` — is an
	# engine self-declaration no image can fake, since the profile attaches at container start.
	ISO_LSM_PROFILE="$(_iso_line /proc/self/attr/current)"
	[ -w /sys/fs/cgroup ] && ISO_CGROUP_RW="true"
	ISO_PID1="$(_iso_line /proc/1/comm)"
	ISO_KERNEL_BUILD="$(_iso_line /proc/version)"

	# --- Confidential computing ---
	# A memory-encrypted guest is a materially different boundary (the host cannot read guest memory),
	# so it is an attribute of whatever VMM is running rather than a competing candidate.
	[ -r /sys/kernel/coco/securityfs ] && ISO_CC_TECH="coco"
	[ -e /dev/sev-guest ] && ISO_CC_TECH="amd-sev-snp"
	[ -e /dev/tdx_guest ] && ISO_CC_TECH="intel-tdx"
	if [ -z "$ISO_CC_TECH" ]; then
		case "$dmesg_head" in
		*"Memory Encryption Features active"*)
			case "$dmesg_head" in
			*SEV-SNP*) ISO_CC_TECH="amd-sev-snp" ;;
			*SEV-ES*) ISO_CC_TECH="amd-sev-es" ;;
			*TDX*) ISO_CC_TECH="intel-tdx" ;;
			*SEV*) ISO_CC_TECH="amd-sev" ;;
			esac
			;;
		esac
	fi

	# --- gVisor and Kata: observations only ---
	# The inferences built from these live in isolation_classify, so every input to a gVisor or Kata
	# verdict is a published signal.
	[[ "${ISO_KERNEL_BUILD,,}" == *gvisor* ]] || [[ "$(uname -r 2>/dev/null)" == *gvisor* ]] &&
		ISO_KERNEL_NAMES_GVISOR="true"
	{ [[ "${dmesg_head,,}" == *gvisor* ]] || [[ "${dmesg_head,,}" == *runsc* ]]; } &&
		ISO_BOOTLOG_NAMES_GVISOR="true"
	# Derived once, at the end, from the sets collected above rather than inside the loops that build
	# them — so the boolean and the set it summarizes cannot disagree. Both are published because a
	# consumer should not have to parse a set to answer a yes/no question.
	iso_fstype_has virtiofs && ISO_HAS_VIRTIOFS="true"
	_iso_in "$ISO_NET_DRIVERS" veth && ISO_HAS_VETH="true"
	return 0
}
