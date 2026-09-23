import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { findRepoRoot } from "./lib/workspace.ts";

const probe = join(findRepoRoot(), "lib/probe/isolation/main.sh");
const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

function classify(signals: Record<string, string>) {
	const assignments = Object.entries(signals)
		.map(([name, value]) => `${name}=${shellQuote(value)}`)
		.join("\n");
	const script = `source ${shellQuote(probe)}\n${assignments}\nisolation_classify\nprintf '%s\\t%s\\t%s\\t%s\\t%s\\n' "$ISOLATION_RUNTIME" "$ISOLATION_CLASS" "$ISOLATION_CONFIDENCE" "$MACHINE_VMM" "$CONTAINER_RUNTIME"`;
	const run = Bun.spawnSync(["bash", "-c", script]);
	expect(run.exitCode, run.stderr.toString()).toBe(0);
	const [runtime, isolationClass, confidence, machine, container] = run.stdout
		.toString()
		.trim()
		.split("\t");
	return { runtime, isolationClass, confidence, machine, container };
}

describe("in-sandbox isolation classification", () => {
	it("identifies Boat's QEMU/SeaBIOS guest without turning its dropped capability into a container", () => {
		expect(
			classify({
				ISO_DMI: "qemu,standard pc (q35 + ich9, 2009),seabios",
				ISO_ROOT_FSTYPE: "ext4",
				ISO_CAP_SYS_ADMIN: "false",
				ISO_VIRT_CONTAINER: "none",
			}),
		).toMatchObject({ runtime: "qemu-kvm", isolationClass: "vm", container: "none" });
	});

	it("keeps a restricted Cloud Hypervisor guest a VM when its only container evidence is a marker and a dropped capability", () => {
		expect(
			classify({
				ISO_ACPI_OEM: "CLOUDH",
				ISO_VIRT_CONTAINER: "container-other",
				ISO_CAP_SYS_ADMIN: "false",
			}),
		).toMatchObject({ runtime: "cloud-hypervisor", isolationClass: "microvm", container: "none" });
	});

	it("keeps a hardened Firecracker guest a VM when a marker and masked proc are its only container evidence", () => {
		expect(
			classify({
				ISO_ACPI_OEM: "FIRECK",
				ISO_VIRT_CONTAINER: "container-other",
				ISO_MASKED_PROC: "true",
				ISO_CAP_SYS_ADMIN: "true",
			}),
		).toMatchObject({ runtime: "firecracker", isolationClass: "microvm", container: "none" });
	});

	it("names an OCI container when independent live containment signals agree", () => {
		expect(
			classify({
				ISO_ACPI_OEM: "FIRECK",
				ISO_VIRT_CONTAINER: "container-other",
				ISO_MASKED_PROC: "true",
				ISO_ROOT_FSTYPE: "overlay",
				ISO_HAS_VETH: "true",
			}),
		).toMatchObject({
			runtime: "oci-container",
			isolationClass: "container",
			machine: "firecracker",
		});
	});

	it("reports a visible hypervisor without inventing a microVM implementation", () => {
		expect(
			classify({
				ISO_HYPERVISOR_FLAG: "true",
				ISO_VIRTIO_TRANSPORT: "pci",
			}),
		).toMatchObject({ runtime: "vm-unidentified", isolationClass: "vm" });
	});

	it("keeps a specific VMM unnamed when only a shared console argument points to it", () => {
		expect(classify({ ISO_CMDLINE_MARKERS: "console=hvc0" })).toMatchObject({
			runtime: "unknown",
			isolationClass: "unknown",
		});
		expect(classify({ ISO_CMDLINE_MARKERS: "console=ttyS0" })).toMatchObject({
			runtime: "unknown",
			isolationClass: "unknown",
		});
	});

	it("does not upgrade a generic virtio-MMIO guest to a microVM claim", () => {
		expect(
			classify({
				ISO_HYPERVISOR_FLAG: "true",
				ISO_HAS_SMBIOS: "false",
				ISO_VIRTIO_TRANSPORT: "mmio",
				ISO_VIRTIO_DEVICES: "net,blk",
			}),
		).toMatchObject({ runtime: "vm-unidentified", isolationClass: "vm" });
	});

	it("uses SMBIOS as counter-evidence to a Firecracker boot-argument guess", () => {
		expect(
			classify({
				ISO_CMDLINE_MARKERS: "reboot=k,panic=1",
				ISO_HAS_SMBIOS: "true",
				ISO_HYPERVISOR_FLAG: "true",
			}),
		).toMatchObject({ runtime: "vm-unidentified", isolationClass: "vm" });
	});

	it("uses virtio transport and firmware visibility to constrain the gVisor fallback", () => {
		const base = { ISO_MOUNT_FSTYPES: "overlayfs" };
		expect(classify(base)).toMatchObject({ runtime: "gvisor", isolationClass: "user-kernel" });
		expect(classify({ ...base, ISO_VIRTIO_TRANSPORT: "pci" })).toMatchObject({
			runtime: "unknown",
			isolationClass: "unknown",
		});
	});

	it("does not call a guest bare metal merely because its hypervisor bit is absent", () => {
		expect(classify({ ISO_CPUINFO_FLAGS: "true" })).toMatchObject({
			runtime: "unknown",
			isolationClass: "unknown",
		});
	});
});
