#!/usr/bin/env bash
# shellcheck disable=SC2034
# The globals this file assigns are its OUTPUT CONTRACT — read by the task that sources it,
# never by the file itself. Scoped to the whole file because that is what the contract is.
# Which sandboxing technique is confining this workload? Sourced after lib/bench.sh:
#
#   source "${REPO_ROOT}/lib/isolation.sh"
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
# in rather than read from net-identity.sh's PUBLIC_IP so the two libraries stay independent — the
# libkrun TSI rule needs "egress works AND there is no interface", and the egress half is not this
# file's to observe.
ISO_EGRESS_OK="false"
# Derived by isolation_classify from the signals above; not observations, so they are re-derived
# rather than collected, and every input to them is published.
ISO_GVISOR="false" ISO_GVISOR_WHY="" ISO_KATA_DECLARED="false" ISO_KATA_INFERRED="false"
# Report-only signals: per-sandbox strings (container ids, control-plane arguments) that must never
# enter the committed record, where they would both leak and defeat the host-record fold.
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

# =============================================================================
# Scoring
# =============================================================================
# One score table for both layers, keyed "<layer>:<candidate>" — the alternative is two parallel
# sets of three associative arrays plus two copies of every helper that touches them.
declare -A ISO_SCORE=() ISO_WHY=() ISO_DECL=()
_iso_score() {
	local key="$1:$2"
	ISO_SCORE["$key"]=$((${ISO_SCORE["$key"]:-0} + $3))
	ISO_WHY["$key"]="${ISO_WHY[$key]:-}${ISO_WHY[$key]:+|}$4 (${3})"
	# A weight of 100 is reserved for self-declarations, and only those can reach `confirmed`.
	[ "$3" -ge 100 ] && ISO_DECL["$key"]=1
	return 0
}
# Prefixed like everything else in this file: sourcing shares one namespace with bench.sh, the task
# and any sibling library, and `m`/`c` are the most collision-prone names available.
_iso_m() { _iso_score machine "$@"; }
_iso_c() { _iso_score container "$@"; }

# Rule tables are "<glob>|<candidate>|<weight>|<reason>", applied first-match-wins so a specific
# platform can precede the generic string it also contains (Proxmox before QEMU). Writing them as
# data rather than as a `case` arm apiece is what keeps the ~60 patterns below readable — and what
# stopped the SMBIOS block from being seventeen separate `case` statements, which is what shellcheck's
# overlapping-pattern rule forces when they share one.
# `prefix` is prepended to the matched reason, so one table can serve two sources that differ only
# in how the reader should be told where the evidence came from (a cgroup path vs an overlay
# upperdir naming the same engine). Pass "" when the table's reason already reads as a whole.
_iso_rule_first() {
	local layer="$1" haystack="$2" prefix="$3" rule pat cand weight reason
	shift 3
	for rule in "$@"; do
		IFS='|' read -r pat cand weight reason <<<"$rule"
		# shellcheck disable=SC2254  # $pat is a glob BY DESIGN; quoting it would match literally.
		case "$haystack" in
		$pat)
			"$layer" "$cand" "$weight" "${prefix}${reason}"
			return 0
			;;
		esac
	done
	return 1
}
# Same tables, applied to every member of a comma-joined set (PCI vendors, drivers, markers).
_iso_rule_each() {
	local layer="$1" set="$2" prefix="$3" token
	shift 3
	for token in ${set//,/ }; do _iso_rule_first "$layer" "$token" "$prefix" "$@"; done
	return 0
}

# ACPI table ids are compiled into each VMM's table builder, so a match is the VMM naming itself.
# This is the highest-value probe in the file: the minimal VMMs deliberately ship no SMBIOS — which
# is why `manufacturer` is empty for almost every provider in this matrix — but most of them do
# expose ACPI, and its header carries the same kind of self-declaration.
_ISO_ACPI_RULES=(
	'FIRECK|firecracker|100|ACPI OEM id FIRECK'
	'CLOUDH|cloud-hypervisor|100|ACPI OEM id CLOUDH'
	'CROSVM|crosvm|100|ACPI OEM id CROSVM'
	'BOCHS|qemu-kvm|100|ACPI OEM id BOCHS (SeaBIOS-built QEMU tables)'
	'KRUN|libkrun|100|ACPI OEM id KRUN'
	'LIBKRUN|libkrun|100|ACPI OEM id LIBKRUN'
	'AMAZON|amazon-nitro|100|ACPI OEM id AMAZON'
	'VRTUAL|hyper-v|100|ACPI OEM id VRTUAL'
	'MSFTVM|hyper-v|100|ACPI OEM id MSFTVM'
	'[Xx][Ee][Nn]*|xen|100|ACPI OEM id Xen'
	'VBOX|virtualbox|100|ACPI OEM id VBOX'
	'[Aa]pple|apple-virtualization|100|ACPI OEM id Apple'
	'[Gg]oogle|gce|100|ACPI OEM id Google'
)
# SMBIOS, lowercased and joined across all ten DMI fields — a VMM that fills none of
# sys_vendor/product_name still often fills board_name or bios_version (Proxmox writes its version
# into the BIOS string; Apple's Virtualization.framework identifies itself only in product_name).
# This describes the machine OUR KERNEL sees, so inside a container it correctly names the host's
# hypervisor and the container layer is what confines the workload.
_ISO_DMI_RULES=(
	'*firecracker*|firecracker|100|SMBIOS names Firecracker'
	'*cloud?hypervisor*|cloud-hypervisor|100|SMBIOS names Cloud Hypervisor'
	'*libkrun*|libkrun|100|SMBIOS names libkrun'
	'*krunvm*|libkrun|100|SMBIOS names krunvm'
	'*amazon ec2*|amazon-nitro|100|SMBIOS names Amazon EC2'
	'*google*|gce|100|SMBIOS names Google Compute Engine'
	'*microsoft corporation*|hyper-v|100|SMBIOS names Microsoft/Hyper-V'
	'*vmware*|vmware|100|SMBIOS names VMware'
	'*virtualbox*|virtualbox|100|SMBIOS names VirtualBox'
	'*innotek*|virtualbox|100|SMBIOS names VirtualBox'
	'*parallels*|parallels|100|SMBIOS names Parallels'
	'*apple virtualization*|apple-virtualization|100|SMBIOS names Apple Virtualization'
	'*digitalocean*|digitalocean|100|SMBIOS names DigitalOcean'
	'*openstack*|openstack|100|SMBIOS names OpenStack'
	'*nutanix*|nutanix|100|SMBIOS names Nutanix'
	'*alibaba*|alibaba|100|SMBIOS names Alibaba Cloud'
	'*oracle?cloud*|oracle-cloud|100|SMBIOS names Oracle Cloud'
	'*bhyve*|bhyve|100|SMBIOS names bhyve'
	'*pve*|proxmox|100|SMBIOS/BIOS version names Proxmox'
	'*proxmox*|proxmox|100|SMBIOS names Proxmox'
	'*xen*|xen|100|SMBIOS names Xen'
	# QEMU last, and scored below the platforms: every QEMU-derived cloud above also carries a QEMU
	# string, and the platform is the better answer to "what am I running on".
	'*qemu*|qemu-kvm|60|SMBIOS names QEMU'
	'*seabios*|qemu-kvm|60|SMBIOS names SeaBIOS'
	'*bochs*|qemu-kvm|60|SMBIOS names Bochs'
)
# A device driver that only one platform ships. Stronger than a PCI id because a driver binds only
# when the paravirt device is genuinely present.
_ISO_NETDRV_RULES=(
	'ena|amazon-nitro|60|network driver ena is AWS-only'
	'efa|amazon-nitro|60|network driver efa is AWS-only'
	'hv_netvsc|hyper-v|60|network driver hv_netvsc is Hyper-V-only'
	'vmxnet3|vmware|60|network driver vmxnet3 is VMware-only'
	'gve|gce|60|network driver gve is Google-Compute-Engine-only'
	'xen-netfront|xen|60|network driver xen-netfront is Xen-only'
)
_ISO_PCI_RULES=(
	'15ad|vmware|60|PCI vendor 15ad (VMware)'
	'80ee|virtualbox|60|PCI vendor 80ee (VirtualBox)'
	'1414|hyper-v|60|PCI vendor 1414 (Microsoft)'
	'5853|xen|60|PCI vendor 5853 (XenSource)'
	'1d0f|amazon-nitro|60|PCI vendor 1d0f (Amazon)'
	'1ab8|parallels|60|PCI vendor 1ab8 (Parallels)'
)
# The two established detectors, scored rather than trusted. `systemd-detect-virt --vm` and
# `virt-what` both name a VM technology; neither can see past the KVM interface to the VMM, so they
# corroborate a platform at supporting weight and are the only evidence on a guest whose firmware
# says nothing.
_ISO_DETECTOR_RULES=(
	'qemu|qemu-kvm|30|a VM detector reports QEMU'
	'vmware|vmware|30|a VM detector reports VMware'
	'microsoft|hyper-v|30|a VM detector reports Microsoft'
	'hyperv|hyper-v|30|a VM detector reports Hyper-V'
	'xen*|xen|30|a VM detector reports Xen'
	'amazon|amazon-nitro|30|a VM detector reports Amazon'
	'google|gce|30|a VM detector reports Google'
	'oracle|virtualbox|30|a VM detector reports Oracle VirtualBox'
	'parallels|parallels|30|a VM detector reports Parallels'
	'bhyve|bhyve|30|a VM detector reports bhyve'
	'uml|uml|30|a VM detector reports User Mode Linux'
	'wsl|wsl2|30|a VM detector reports WSL'
)
# `systemd-detect-virt --container` is the marker-file-driven detector, so it is scored at the weak
# tier — the same tier as the marker files themselves, and far below the containment floor.
_ISO_CONTAINER_DETECTOR_RULES=(
	'docker|docker-runc|15|a container detector reports Docker (weak: marker-file driven)'
	'podman|podman|15|a container detector reports Podman (weak: marker-file driven)'
	'lxc*|lxc|15|a container detector reports LXC (weak: marker-file driven)'
	'systemd-nspawn|systemd-nspawn|15|a container detector reports systemd-nspawn (weak: marker-file driven)'
	'openvz|openvz|15|a container detector reports OpenVZ (weak: marker-file driven)'
	'*|oci-container|15|a container detector reports a container (weak: marker-file driven)'
)

# Container-layer markers, matched against the comma-joined ISO_CONTAINER_MARKERS set. The weight
# column is what lets the weak tier live in the same table as the self-declaring one: a marker that
# survives being copied into an image scores 15, far below _ISO_CONTAINER_FLOOR, so it can only ever
# corroborate. The `container-env=*` and `systemd-container=*` globs are the fallbacks for an
# engine name this table does not know, and sit last so an exact match wins.
_ISO_MARKER_RULES=(
	'sysboxfs|sysbox|100|a sysboxfs mount virtualizes procfs'
	'sysbox-socket|sysbox|100|a Sysbox runtime socket is present'
	'lxd-socket|lxd|100|the LXD/Incus guest socket is present'
	'lxc-dir|lxc|100|the LXC guest directory is present'
	'kata-dir|kata-containers|100|the Kata agent runtime directory is present'
	'openvz|openvz|100|OpenVZ guest interfaces are present'
	'singularity-dir|apptainer|100|Apptainer/Singularity container directory is present'
	'apptainer-env|apptainer|100|Apptainer/Singularity names itself in the environment'
	'firejail|firejail|100|Firejail runtime directory is present'
	'container-env=lxc|lxc|100|pid 1 was started by LXC'
	'container-env=podman|podman|100|pid 1 was started by Podman'
	'container-env=systemd-nspawn|systemd-nspawn|100|pid 1 was started by systemd-nspawn'
	'dockerenv|docker-runc|15|/.dockerenv is present (weak: survives an image copy)'
	'docker-desktop|docker-runc|15|Docker Desktop host services are mounted (weak)'
	'containerenv|podman|15|/run/.containerenv is present (weak: survives an image copy)'
	'kubernetes-serviceaccount|containerd-runc|15|a Kubernetes service account is mounted'
	'container-env=*|oci-container|15|pid 1 carries an unrecognized container= marker (weak: survives an image copy)'
	'systemd-container=*|oci-container|15|/run/systemd/container names a container (weak: survives an image copy)'
)
# The engine that owns a live cgroup path or overlay upperdir. One table, two sources, distinguished
# by the reason prefix each is applied with.
_ISO_ENGINE_RULES=(
	'sysbox|sysbox|100|owned by Sysbox'
	'lxc|lxc|100|owned by LXC'
	'lxd|lxd|100|owned by LXD/Incus'
	'podman|podman|100|owned by Podman'
	'cri-o|cri-o|100|owned by CRI-O'
	'docker|docker-runc|100|owned by Docker'
	'containerd|containerd-runc|100|owned by containerd'
	'kubernetes|containerd-runc|100|owned by a kubepods scope'
	'nspawn|systemd-nspawn|100|owned by a machine.slice scope'
)
# An LSM profile is attached by the engine at container start, so its name is a self-declaration no
# image can fake.
_ISO_LSM_RULES=(
	'*docker-default*|docker-runc|100|AppArmor profile docker-default is applied'
	'*crio-default*|cri-o|100|AppArmor profile crio-default is applied'
)
_ISO_BLOCK_RULES=('xvda|xen|30|a Xen blkfront root device')
_ISO_KERNEL_RULES=(
	'*microsoft*wsl*|wsl2|100|kernel version string names WSL'
	'*wsl2*|wsl2|100|kernel version string names WSL'
)
_ISO_ACPI_TABLE_RULES=('*bxpc*|qemu-kvm|60|ACPI creator id BXPC (SeaBIOS)')
# virtio device ids, from the virtio spec's §5 numbering. Read from the device-id register rather
# than the bound driver's name: the id is the hardware fact and is stable across kernel versions,
# while driver names are not (vsock binds as `vmw_vsock_virtio_transport`, virtio-fs as `virtiofs`).
declare -A _ISO_VIRTIO_IDS=(
	[1]=net [2]=blk [3]=console [4]=rng [5]=balloon [9]=9p
	[16]=gpu [18]=input [19]=vsock [26]=fs [27]=pmem
)

# The candidate REGISTRY for each layer: `<candidate>|<isolation class>`, authored most-specific-
# first. The order is the tie-break, so a generic bucket can never win a tie against a named runtime,
# and carrying the class here keeps "what candidates exist" and "what kind of boundary each is" in
# one place — adding a runtime is one edit, not one here and another in a class lookup that a reader
# has to remember exists.
_ISO_MACHINE_ORDER=(
	'firecracker|microvm' 'libkrun|microvm' 'cloud-hypervisor|microvm' 'crosvm|microvm'
	'qemu-kvm|vm' 'amazon-nitro|vm' 'gce|vm' 'hyper-v|vm' 'xen|vm' 'vmware|vm'
	'virtualbox|vm' 'parallels|vm' 'apple-virtualization|vm' 'digitalocean|vm' 'openstack|vm'
	'nutanix|vm' 'proxmox|vm' 'alibaba|vm' 'oracle-cloud|vm' 'bhyve|vm' 'uml|vm' 'wsl2|vm'
	'microvm-unidentified|microvm' 'vm-unidentified|vm' 'bare-metal|bare-metal'
)
_ISO_CONTAINER_ORDER=(
	'gvisor|user-kernel' 'kata-containers|microvm' 'sysbox|container' 'lxd|container'
	'lxc|container' 'systemd-nspawn|container' 'openvz|container' 'apptainer|container'
	'firejail|container' 'podman|container' 'cri-o|container' 'containerd-runc|container'
	'docker-runc|container' 'oci-container|container'
)
# The generic buckets. They are ranked and reported like anything else, but they do not compete for
# CONFIDENCE: "some unidentified microVM" scoring behind a confirmed Firecracker is the same finding
# stated less precisely, not a rival hypothesis, and letting it narrow the margin would downgrade a
# firmware self-declaration on exactly the sandboxes this file reads best.
_ISO_GENERIC="microvm-unidentified,vm-unidentified,oci-container"
# A container runtime is claimed only above this floor. Every weak marker is worth 15, so no
# combination of image residue reaches it without at least one live structural signal.
_ISO_CONTAINER_FLOOR=40

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
