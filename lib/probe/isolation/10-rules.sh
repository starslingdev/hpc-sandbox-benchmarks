#!/usr/bin/env bash
# shellcheck disable=SC2034
# The globals this file assigns are part of this probe's OUTPUT CONTRACT (see main.sh) — read by the
# task that sources the facade, never by this file itself.
# Scoring primitives and the rule tables — the DATA half of the engine, and the reason the other
# halves stay readable. Every detection that is "match this string, credit that candidate" lives here
# as a `<glob>|<candidate>|<weight>|<reason>` row rather than as a `case` arm somewhere in the
# collector or the classifier; see main.sh for what the weights mean.
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
