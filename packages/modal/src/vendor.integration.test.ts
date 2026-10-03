// Modal tested at the vendor seam: the adapter's translation over a fake control plane, Modal's
// own deadline and process-result quirks, the port contract, and sessions through each variant's
// module. Kit behaviour (convergence, deadlines, the inventory partition, recovery mechanics) is
// tested once in the driver package.

import { describe, expect, it } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isFailedCreateCleanupError } from "@sandbox-benchmarks/driver";
import type { CreateAttempt } from "@sandbox-benchmarks/driver/vendor";
import { DISK_PROBE } from "@sandbox-benchmarks/driver/vendor";
import { vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { ClientError, Status } from "nice-grpc";
import { defineModalDriver } from "./driver.ts";
import type { ModalBackend, ModalControlPlane, ModalControlSandbox } from "./vendor.ts";
import { MODAL_APP_NAME, modalVendor } from "./vendor.ts";

const modalVm = defineModalDriver("modal-vm");
const modalGvisor = defineModalDriver("modal-gvisor");

const IMAGE = "registry.example/toolchain:version";
const context: DriverContext<"modal-vm"> = {
	env: { MODAL_TOKEN_ID: "test-token", MODAL_TOKEN_SECRET: "test-secret" },
	artifact: { kind: "image" },
	resolvedArtifact: { kind: "image", ref: IMAGE },
};
const request = (overrides: Partial<CreateRequest> = {}): CreateRequest => ({
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: { kind: "image", ref: IMAGE },
	deadlineMs: 300_000,
	env: { BENCHMARK_MODE: "true" },
	...overrides,
});
const notFound = (rpc: string) =>
	new ClientError(`/modal.client.ModalClient/${rpc}`, Status.NOT_FOUND, "not found");

interface Row {
	readonly id: string;
	readonly appId: string;
	readonly name: string;
	readonly createdAt: number;
	readonly v2: boolean;
	exitCode: number | null;
}

/**
 * A whole Modal environment: Apps holding V1 and V2 sandboxes, named lookups of running sandboxes,
 * a waited terminate that leaves an exit code, raw listings two rows a page newest first, and a
 * guest that answers exit codes and the kit's disk probe.
 */
function modalAccount(
	options: {
		readonly appExists?: boolean;
		readonly lostCreate?: boolean;
		readonly diskGb?: number;
	} = {},
) {
	const apps = new Map<string, string>([["other-app", "ap-foreign"]]);
	if (options.appExists ?? true) apps.set(MODAL_APP_NAME, "ap-bench");
	const rows = new Map<string, Row>();
	const calls: string[] = [];
	let lateName = "";
	let clock = 0;
	const add = (row: Omit<Row, "createdAt" | "exitCode">) => {
		rows.set(row.id, { ...row, createdAt: ++clock, exitCode: null });
		return row.id;
	};
	const allocate = (v2: boolean, name: string, appId = "ap-bench") =>
		add({
			id: v2
				? `sb-0${String(clock + 1).padStart(25, "0")}`
				: `sb-${String(clock + 1).padStart(22, "A")}`,
			appId,
			name,
			v2,
		});
	const handle = (id: string, rpc: "Wait" | "Terminate" = "Wait"): ModalControlSandbox => ({
		sandboxId: id,
		poll: async () => {
			calls.push(`poll ${id}`);
			const row = rows.get(id);
			if (!row) throw notFound(`Sandbox${rpc}`);
			return row.exitCode;
		},
		terminate: async () => {
			calls.push(`terminate ${id}`);
			const row = rows.get(id);
			if (!row) throw notFound("SandboxTerminate");
			row.exitCode = 0;
			return 0;
		},
		exec: async (command) => {
			calls.push(`exec ${command[2]}`);
			const script = command[2] ?? "";
			const exit = /^sh -c 'exit (\d+)'$/.exec(script);
			const stdout =
				script === DISK_PROBE ? `${Math.round((options.diskGb ?? 64) * 1024 * 1024)}\n` : "";
			return {
				stdout: { readText: async () => stdout },
				stderr: { readText: async () => "" },
				wait: async () => (exit ? Number(exit[1]) : 0),
			};
		},
		detach: () => {},
	});
	const running =
		(v2: boolean, filter: (row: Row) => boolean) =>
		async ({ beforeTimestamp }: { readonly beforeTimestamp?: number }) =>
			[...rows.values()]
				.filter((row) => row.v2 === v2 && row.exitCode === null && filter(row))
				.filter((row) => beforeTimestamp === undefined || row.createdAt < beforeTimestamp)
				.sort((a, b) => b.createdAt - a.createdAt)
				.slice(0, 2);
	const byName = (v2: boolean) => async (appName: string, name: string) => {
		calls.push(`${v2 ? "v2" : "v1"} name ${name}`);
		const row = [...rows.values()].find(
			(candidate) =>
				candidate.v2 === v2 &&
				candidate.name === name &&
				candidate.appId === apps.get(appName) &&
				candidate.exitCode === null,
		);
		if (!row) throw notFound(v2 ? "SandboxGetFromNameV2" : "SandboxGetFromName");
		return handle(row.id);
	};
	const control: ModalControlPlane = {
		apps: {
			fromName: async (name) => {
				const appId = apps.get(name);
				return appId === undefined ? undefined : { appId };
			},
			list: async () => [...apps.values()].map((appId) => ({ appId })),
		},
		sandboxes: {
			fromId: async (id) => handle(id),
			fromName: byName(false),
			experimentalFromName: byName(true),
			list: (params) =>
				running(false, (row) => !params.appId || row.appId === params.appId)(params),
			experimentalList: (params) => running(true, (row) => row.appId === params.appId)(params),
		},
	};
	const vendor = (backend: ModalBackend) =>
		modalVendor({
			backend,
			appName: MODAL_APP_NAME,
			control: () => control,
			allocate: async ({ marker }: CreateAttempt) => {
				calls.push(`create ${marker}`);
				if (options.lostCreate) {
					lateName = marker;
					throw new ClientError(
						"/modal.client.ModalClient/SandboxCreate",
						Status.DEADLINE_EXCEEDED,
						"response lost",
					);
				}
				return { sandboxId: allocate(backend === "v2", marker) };
			},
		});
	return {
		rows,
		calls,
		control,
		allocate,
		vendor,
		reveal: (v2: boolean) => allocate(v2, lateName),
	};
}

/** Each variant's own module, lowered over a fake environment instead of the real SDK. */
function driverOver(account: ReturnType<typeof modalAccount>, module = modalVm) {
	return vendorDriver(module as typeof modalVm, context, {
		vendor: account.vendor(module === modalVm ? "v1" : "v2") as never,
		timing: { pollMs: 0, deleteTimeoutMs: 1_000 },
	});
}

vendorContract("modal-vm adapter", modalVm, () => modalAccount().vendor("v1"));
vendorContract("modal-gvisor adapter", modalGvisor, () => modalAccount().vendor("v2"));

describe("Modal end to end through each variant's module", () => {
	it("a lost create stays owned until its late sandbox is visible and terminated", async () => {
		for (const module of [modalVm, modalGvisor]) {
			const account = modalAccount({ lostCreate: true });
			const driver = driverOver(account, module as typeof modalVm);
			const failure = await driver.create(request()).catch((error: unknown) => error);
			if (!isFailedCreateCleanupError(failure)) throw new Error("create lost its cleanup owner");
			await expect(failure.cleanup()).rejects.toThrow();
			const id = account.reveal(module === modalGvisor);
			await failure.cleanup();
			expect(account.rows.get(id)?.exitCode).toBe(0);
			expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 0 });
		}
	});

	it("a session boots, proves its disk, runs, launches, inventories and is terminated once", async () => {
		for (const module of [modalVm, modalGvisor]) {
			const account = modalAccount();
			account.allocate(false, "dev-box", "ap-foreign");
			const driver = driverOver(account, module as typeof modalVm);
			const session = await driver.create(request());
			expect(account.calls).toContain(`exec ${DISK_PROBE}`);
			expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
			// No native launch: the kit's shell detach runs through the same exec.
			await session.launch?.("sleep 600");
			expect(account.calls.at(-1)).toStartWith("exec nohup /bin/sh -lc 'sleep 600'");
			expect(await driver.inventory?.list()).toEqual({
				owned: [session.sandboxRef],
				foreignCount: 1,
			});
			account.calls.length = 0;
			await session.destroy();
			expect(account.calls).toEqual([`terminate ${session.sandboxRef.id}`]);
			expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		}
	});

	it("an allocation short of the requested disk is refused and terminated", async () => {
		const account = modalAccount({ diskGb: 30 });
		await expect(driverOver(account).create(request())).rejects.toMatchObject({
			code: "invalid-create-request",
			provider: "modal-vm",
		});
		expect([...account.rows.values()].map((row) => row.exitCode)).toEqual([0]);
	});
});
