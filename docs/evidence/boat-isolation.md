# Boat isolation investigation (2026-09-23)

The published [Run 35819944942](../../data/dataset/runs/35819944942.json) records
`virtualization: kvm` and `detectedIsolation: vm` for boat. Those fields come from the early
`systemd-detect-virt` setup check and cannot identify a VMM or rule out a container above it.
The same Run's `system/system-provider.json` host records, from three sandboxes, report
`machine_vmm: qemu-kvm`, `isolation_runtime: qemu-kvm`, `isolation_class: vm`, and
`container_runtime: none`. They record QEMU DMI, SeaBIOS, virtio PCI devices, an ext4 root on
`/dev/vda1`, and no live container marker. The classifier's QEMU verdict has strong, rather than
confirmed, confidence because its firmware did not self-identify a particular QEMU build.

Two fresh, `noEnv` boat allocations were inspected through the native API. The first API create
returned after 567 ms and its first command completed 3.35 seconds after create began. At that
command the guest reported `systemd` as PID 1, `kvm` from `systemd-detect-virt --vm`, `none` from
`--container`, QEMU/SeaBIOS DMI, and a virtio block disk. Its kernel boot time was
2026-09-23 16:52:24 UTC, roughly six minutes before create. The boot ID and boot time were unchanged
in a second command 70 seconds later.
The second allocation returned after 736 ms and finished its first command after 3.53 seconds. It
reported the same guest hardware pattern, a different kernel boot ID, and a boot time of
2026-09-23 16:52:25 UTC, roughly nine minutes before that allocation's create call. Both
allocations were deleted and absence was confirmed.

This supports a full QEMU/KVM guest for boat, consistent with [boat's architecture description](https://boat.dev/blog/containers-vs-vms).
The pre-create kernel boot time suggests a ready VM or snapshot-based provisioner; it does not
identify which mechanism boat uses. Guest observations cannot independently prove exclusive physical
host placement or the absence of every possible hidden layer. Creation latency is a control-plane
measurement and does not measure a cold kernel boot.
