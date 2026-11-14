// Baseten tested at the vendor seam: the adapter's translation over a stub of @basetenlabs/sandbox's
// `SandboxClient`, the port contract, and sessions through the package's own module. Kit behaviour
// (convergence, deadlines, the inventory partition, recovery mechanics) is tested once in the driver
// package.

import { describe, expect, test } from "bun:test";
import type { Sandbox, SandboxInfo, VolumeInfo } from "@basetenlabs/sandbox";
import { SandboxApiError } from "@basetenlabs/sandbox";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import {
	ociBuildRequest,
	testContext,
	vendorContract,
	vendorDriver,
} from "@sandbox-benchmarks/driver/vendor/testing";
import { basetenArtifactBuilder, pinBasetenBaseImage } from "./artifact.ts";
import baseten from "./index.ts";
import type { BasetenSdk } from "./vendor.ts";
import {
	BASETEN_KEEPALIVE_PROCESS,
	BASETEN_OWNER_LABEL,
	BASETEN_PTS_DATA_DIR,
	BASETEN_VOLUME_HEADROOM_MB,
	BASETEN_VOLUME_MOUNT_DIR,
	basetenVendor,
} from "./vendor.ts";

const context = testContext("baseten");
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};
const REGION = "us-pdx-1";

interface ProcessCall {
	readonly command: string;
	readonly name?: string;
	readonly keepAlive?: boolean;
	readonly waitForCompletion?: boolean;
	readonly timeoutMs?: number;
}
interface SandboxRow {
	status: string;
	readonly labels: Record<string, string>;
	readonly memory: number;
	readonly volume?: string;
	readonly files: Map<string, string>;
	reads: number;
}
interface VolumeRow {
	status: string;
	readonly labels: Record<string, string>;
	reads: number;
}

const notFound = () => new SandboxApiError(404, { code: "NOT_FOUND" });

/**
 * A whole Baseten team behind a stub of `SandboxClient`: a create deploys after one read, a delete
 * leaves a sandbox DELETING and then TERMINATED before its record disappears, a mounted volume
 * refuses deletion until its sandbox terminates, and each sandbox has a process API and file store.
 */
function basetenTeam(
	options: {
		readonly volumeCapacityGb?: number;
		readonly reportedMemoryMb?: number;
		readonly keepaliveStatus?: string;
	} = {},
) {
	const sandboxes = new Map<string, SandboxRow>();
	const volumes = new Map<string, VolumeRow>();
	const created: Array<Record<string, unknown>> = [];
	const volumeSizes: Array<string | number> = [];
	const processCalls: ProcessCall[] = [];
	const deletes: string[] = [];
	const volumeDeletes: string[] = [];
	const allocate = (
		name: string,
		labels: Record<string, string> = {},
		status = "DEPLOYED",
		volume?: string,
	) => {
		sandboxes.set(name, {
			status,
			labels,
			memory: 8192,
			...(volume !== undefined && { volume }),
			files: new Map(),
			reads: 0,
		});
		return name;
	};
	const info = (name: string, row: SandboxRow): SandboxInfo => ({
		name,
		status: row.status,
		memory: options.reportedMemoryMb ?? row.memory,
		region: REGION,
		envs: {},
		labels: row.labels,
		ports: [],
		volumes:
			row.volume === undefined ? [] : [{ name: row.volume, mountPath: BASETEN_VOLUME_MOUNT_DIR }],
		createdAt: new Date(0),
		...(row.status === "DEPLOYED" && { url: `https://${name}.sandbox.test` }),
	});
	const volumeInfo = (name: string, row: VolumeRow): VolumeInfo => ({
		name,
		size: "40Gi",
		region: REGION,
		status: row.status,
		labels: row.labels,
	});
	const live = (name: string) => {
		const row = sandboxes.get(name);
		if (row?.status !== "DEPLOYED") throw new Error(`sandbox ${name} is not deployed`);
		return row;
	};
	const handle = (name: string) =>
		({
			name,
			process: {
				exec: async (call: ProcessCall) => {
					processCalls.push(call);
					const row = live(name);
					const base = {
						pid: "1234",
						name: call.name ?? "cmd",
						command: call.command,
						logs: "",
						stderr: "",
						workingDir: "/",
						startedAt: new Date(0),
					};
					if (call.waitForCompletion === false) {
						const echo = /^echo (\S+) > (\S+)$/.exec(call.command);
						if (echo) row.files.set(echo[2] ?? "", `${echo[1]}\n`);
						const status =
							call.name === BASETEN_KEEPALIVE_PROCESS
								? (options.keepaliveStatus ?? "running")
								: "running";
						return { ...base, status, exitCode: 0, stdout: "" };
					}
					if (call.command === `df -Pk '${BASETEN_PTS_DATA_DIR}' | awk 'NR==2 {print $2}'`)
						return {
							...base,
							status: "completed",
							exitCode: 0,
							stdout: `${Math.round((options.volumeCapacityGb ?? 40.1) * 1024 * 1024)}\n`,
						};
					const exit = /^sh -c 'exit (\d+)'$/.exec(call.command);
					if (exit) return { ...base, status: "failed", exitCode: Number(exit[1]), stdout: "" };
					if (call.command === "killed")
						return { ...base, status: "killed", exitCode: 0, stdout: "partial" };
					return { ...base, status: "completed", exitCode: 0, stdout: "ok" };
				},
			},
			fs: {
				read: async ({ path }: { path: string }) => {
					const body = live(name).files.get(path);
					if (body === undefined) throw notFound();
					return body;
				},
				write: async ({ path, content }: { path: string; content: string }) => {
					live(name).files.set(path, content);
				},
			},
		}) as unknown as Sandbox;
	const sdk: BasetenSdk = {
		create: async (params) => {
			created.push(params as Record<string, unknown>);
			const name = String(params?.name);
			const volume = params?.volumes?.[0]?.name;
			if (volume !== undefined && volumes.get(volume)?.status !== "DEPLOYED")
				throw new SandboxApiError(400, { code: "VOLUME_NOT_READY" });
			allocate(name, params?.labels, "DEPLOYING", volume);
			const row = sandboxes.get(name);
			if (!row) throw new Error("unreachable");
			return Object.assign(handle(name), { info: info(name, row) }) as never;
		},
		getInfo: async ({ name }) => {
			const row = sandboxes.get(name);
			if (!row) throw notFound();
			row.reads++;
			if (row.status === "DEPLOYING") row.status = "DEPLOYED";
			else if (row.status === "DELETING" && row.reads >= 2) row.status = "TERMINATED";
			else if (row.status === "TERMINATED") sandboxes.delete(name);
			return info(name, row);
		},
		get: async (request) => {
			const name = "name" in request ? request.name : request.info.name;
			if (!sandboxes.has(name)) throw notFound();
			return handle(name);
		},
		list: async function* () {
			for (const [name, row] of sandboxes) yield info(name, row);
		},
		delete: async ({ name }) => {
			deletes.push(name);
			const row = sandboxes.get(name);
			if (!row) throw notFound();
			row.status = "DELETING";
			row.reads = 0;
			return info(name, row);
		},
		volumes: {
			create: async ({ name, size, labels }) => {
				const volume = String(name);
				volumeSizes.push(size);
				volumes.set(volume, { status: "DEPLOYING", labels: labels ?? {}, reads: 0 });
				const row = volumes.get(volume);
				if (!row) throw new Error("unreachable");
				return volumeInfo(volume, row);
			},
			getInfo: async ({ name }) => {
				const row = volumes.get(name);
				if (!row) throw notFound();
				row.reads++;
				if (row.status === "DEPLOYING") row.status = "DEPLOYED";
				else if (row.status === "DELETING") volumes.delete(name);
				return volumeInfo(name, row);
			},
			list: async function* () {
				for (const [name, row] of volumes) yield volumeInfo(name, row);
			},
			delete: async ({ name }) => {
				volumeDeletes.push(name);
				const row = volumes.get(name);
				if (!row) throw notFound();
				const mounted = [...sandboxes.values()].some(
					(sandbox) => sandbox.volume === name && sandbox.status !== "TERMINATED",
				);
				if (mounted) throw new SandboxApiError(400, { code: "VOLUME_IN_USE" });
				row.status = "DELETING";
				return volumeInfo(name, row);
			},
		},
	};
	return {
		sdk,
		sandboxes,
		volumes,
		created,
		volumeSizes,
		processCalls,
		deletes,
		volumeDeletes,
		allocate,
	};
}

const noDelay = async () => {};

/** The package's own module, lowered over a stub SDK instead of the real one. */
function driverOver(team: ReturnType<typeof basetenTeam>) {
	return vendorDriver(baseten, context, {
		vendor: basetenVendor(team.sdk, context, noDelay),
		timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 2_000, removeRetryMs: 0 },
	});
}

vendorContract("baseten adapter", baseten, () =>
	basetenVendor(basetenTeam().sdk, context, noDelay),
);

describe("Baseten end to end through its module", () => {
	test("a session mounts its volume, keeps alive, proves the disk, runs, launches, files, inventories, and is deleted with its volume", async () => {
		const team = basetenTeam();
		team.allocate("someones-dev-box");
		const driver = driverOver(team);
		const session = await driver.create(request);
		const name = session.sandboxRef.id;

		expect(team.volumeSizes).toEqual([40 * 1024 + BASETEN_VOLUME_HEADROOM_MB]);
		expect(team.created[0]).toMatchObject({
			name,
			image: `${context.resolvedArtifact.ref}:latest`,
			memory: 8192,
			region: REGION,
			labels: { [BASETEN_OWNER_LABEL]: "baseten" },
			volumes: [{ name, mountPath: BASETEN_VOLUME_MOUNT_DIR }],
		});
		expect(team.processCalls[0]).toMatchObject({
			name: BASETEN_KEEPALIVE_PROCESS,
			command: "sleep infinity",
			keepAlive: true,
			timeoutMs: 0,
			waitForCompletion: false,
		});
		expect(team.processCalls[1]?.command).toContain(`df -Pk '${BASETEN_PTS_DATA_DIR}'`);

		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
		await session.launch?.("echo done > /tmp/done");
		expect(team.processCalls.at(-1)).toMatchObject({ keepAlive: true, timeoutMs: 0 });
		expect(await session.files?.readFile("/tmp/done")).toBe("done\n");
		expect(await session.files?.exists("/tmp/missing")).toBe(false);

		// A volume a failed create stranded is owned and torn down; another tenant's sandbox is not.
		const stranded = "benchmark-44444444-4444-4444-8444-444444444444";
		team.volumes.set(stranded, { status: "DEPLOYED", labels: {}, reads: 0 });
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef, { provider: "baseten", id: stranded }],
			foreignCount: 1,
		});
		await driver.destroyById?.({ provider: "baseten", id: stranded });
		expect(team.volumes.has(stranded)).toBe(false);

		await session.destroy();
		expect(team.deletes).toEqual([name]);
		// The first volume delete was refused while the sandbox terminated, then accepted.
		expect(team.volumeDeletes.filter((volume) => volume === name).length).toBeGreaterThan(1);
		expect(team.sandboxes.has(name)).toBe(false);
		expect(team.volumes.has(name)).toBe(false);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});

	test("a short volume or a memory off the request is refused; a dead keepalive fails; each is deleted with its volume", async () => {
		for (const [options, code] of [
			[{ volumeCapacityGb: 5 }, "invalid-create-request"],
			[{ reportedMemoryMb: 4096 }, "invalid-create-request"],
			[{ keepaliveStatus: "failed" }, "create-failed"],
		] as const) {
			const team = basetenTeam(options);
			await expect(driverOver(team).create(request)).rejects.toMatchObject({
				code,
				provider: "baseten",
			});
			expect(team.deletes).toHaveLength(1);
			expect(team.sandboxes.size).toBe(0);
			expect(team.volumes.size).toBe(0);
		}
	});

	test("a request off Baseten's memory-to-vCPU table, or without disk, is refused before any call", async () => {
		for (const spec of [
			{ vcpus: 8, memoryGb: 8, diskGb: 40 },
			{ vcpus: 4, memoryGb: 8 },
		]) {
			const team = basetenTeam();
			await expect(driverOver(team).create({ ...request, spec })).rejects.toMatchObject({
				code: "invalid-create-request",
			});
			expect(team.volumeSizes).toHaveLength(0);
			expect(team.created).toHaveLength(0);
		}
	});

	test("a refused sandbox create removes the volume it already allocated", async () => {
		const team = basetenTeam();
		team.sdk.create = async () => {
			throw new SandboxApiError(429, { code: "QUOTA" });
		};
		await expect(driverOver(team).create(request)).rejects.toBeDefined();
		expect(team.volumeDeletes).toHaveLength(1);
		expect([...team.volumes.values()].map((volume) => volume.status)).toEqual(["DELETING"]);
	});
});

describe("Baseten image builder", () => {
	test("pins the base and pushes the variant's build context", async () => {
		const pushes: Array<Record<string, unknown>> = [];
		const builder = basetenArtifactBuilder(() => ({
			push: async (push) => {
				pushes.push(push as unknown as Record<string, unknown>);
				return { status: "BUILT" };
			},
		}));
		const imagesDir = new URL("../../templates/images", import.meta.url).pathname;
		const result = await builder.build(ociBuildRequest("baseten", { imagesDir }));
		expect(result).toEqual({ ref: "baseten-toolchain-test", replaced: "atomic" });
		const files = pushes[0]?.files as Record<string, string>;
		expect(Object.keys(files).sort()).toEqual([
			"Dockerfile",
			"_shared/validate-base.sh",
			"baseten/entrypoint.sh",
		]);
		expect(files.Dockerfile).toContain(
			`FROM ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:`,
		);
		expect(files.Dockerfile).toContain("/sandbox-api");
	});

	test("refuses a template without its base anchors", () => {
		expect(() => pinBasetenBaseImage("FROM debian", "x@sha256:0")).toThrow("anchors");
	});
});
