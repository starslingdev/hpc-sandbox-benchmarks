// Upload the pinned base before freeing a name. Replacements are destructive and must be reported.

import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import type { RegistryPushAccessDto } from "@daytona/api-client";
import { Configuration, DockerRegistryApi, SnapshotsApi } from "@daytona/api-client";
import type { DaytonaConfig, SandboxClass } from "@daytona/sdk";

import type { EnvOf } from "@sandbox-benchmarks/driver";
import type { BuildCommandRunner, OciArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";
import { defineArtifactBuilder, runBuildCommand } from "@sandbox-benchmarks/driver/artifact";
import type { DaytonaId } from "./shared.ts";

type Log = (line: string) => void;
type SnapshotClient = {
	readonly snapshot: {
		list(
			page?: number,
			limit?: number,
		): Promise<{ items: import("@daytona/api-client").SnapshotDto[] }>;
		delete(snapshot: import("@daytona/api-client").SnapshotDto): Promise<void>;
		create(
			params: {
				name: string;
				image: string;
				resources?: { cpu: number; memory: number; disk?: number };
				regionId: string;
				sandboxClass: SandboxClass;
			},
			options?: { onLogs?: Log },
		): Promise<void>;
	};
};
type SnapshotRecord = Awaited<ReturnType<SnapshotClient["snapshot"]["list"]>>["items"][number];

export interface DaytonaBuildTransport {
	readonly client: (
		config: Pick<DaytonaConfig, "apiKey" | "target">,
		signal: AbortSignal,
	) => SnapshotClient;
	readonly pushAccess: (
		apiKey: string,
		region: string,
		signal: AbortSignal,
	) => Promise<RegistryPushAccessDto>;
	readonly run: BuildCommandRunner;
	readonly sleep: (ms: number, signal: AbortSignal) => Promise<void>;
}

export const daytonaBuildTransport = (
	basePath = "https://app.daytona.io/api",
): DaytonaBuildTransport => ({
	client: (config, signal) => {
		const configuration = new Configuration({
			accessToken: config.apiKey,
			basePath,
			baseOptions: {
				signal,
				timeout: 60_000,
				headers: { "X-Daytona-Source": "sandbox-benchmarks" },
			},
		});
		const api = new SnapshotsApi(configuration);
		return {
			snapshot: {
				list: async (page = 1, limit = 100) =>
					(await api.getAllSnapshots(undefined, page, limit)).data,
				delete: async (snapshot) => {
					await api.removeSnapshot(snapshot.id);
				},
				create: async (params) => {
					const { resources, image, ...identity } = params;
					let row: SnapshotRecord | undefined;
					try {
						row = (
							await api.createSnapshot({
								...identity,
								imageName: image,
								...(resources
									? { cpu: resources.cpu, memory: resources.memory, disk: resources.disk }
									: {}),
							})
						).data;
						for (;;) {
							if (!row) throw new Error("Daytona returned no snapshot after accepting the build");
							if (row.state === "active") break;
							if (row.state === "error" || row.state === "build_failed")
								throw Error(row.errorReason ?? "Daytona snapshot build failed");
							await setTimeout(1000, undefined, { signal });
							row = (await api.getSnapshot(row.id)).data;
						}
					} catch (error) {
						if (signal.aborted) {
							const cleanup = { signal: AbortSignal.timeout(10_000) };
							try {
								if (row) await api.removeSnapshot(row.id, undefined, cleanup);
								else
									for (;;) {
										let found = false;
										for (let page = 1; ; page++) {
											const { items } = (
												await api.getAllSnapshots(
													undefined,
													page,
													100,
													params.name,
													undefined,
													undefined,
													undefined,
													cleanup,
												)
											).data;
											for (const accepted of items) {
												if (accepted.name !== params.name || accepted.imageName !== image) continue;
												await api.removeSnapshot(accepted.id, undefined, cleanup);
												found = true;
											}
											if (items.length < 100) break;
										}
										if (found) break;
										await setTimeout(100, undefined, { signal: cleanup.signal });
									}
							} catch (failure) {
								throw new SuppressedError(
									failure,
									error,
									"Daytona canceled snapshot cleanup unconfirmed",
								);
							}
						}
						throw error;
					}
				},
			},
		};
	},
	pushAccess: async (apiKey, region, signal) => {
		const registryApi = new DockerRegistryApi(
			new Configuration({
				accessToken: apiKey,
				basePath,
				baseOptions: {
					signal,
					timeout: 60_000,
					headers: { "X-Daytona-Source": "sandbox-benchmarks" },
				},
			}),
		);
		return (await registryApi.getTransientPushAccess(undefined, region)).data;
	},
	run: runBuildCommand,
	sleep: (ms, signal) => setTimeout(ms, undefined, { signal }),
});
const realTransport = daytonaBuildTransport();

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function isNotFound(err: unknown): boolean {
	if (typeof err !== "object" || err === null) return false;
	const e = err as {
		statusCode?: number;
		status?: number;
		response?: { status?: number };
		message?: string;
	};
	const status = e.statusCode ?? e.status ?? e.response?.status;
	if (status !== undefined) return status === 404;
	return typeof e.message === "string" && /not found|does not exist|404/i.test(e.message);
}

async function listSnapshotsByName(
	daytona: SnapshotClient,
	name: string,
): Promise<SnapshotRecord[]> {
	const LIMIT = 100;
	const matches: SnapshotRecord[] = [];
	for (let page = 1; ; page++) {
		const { items } = await daytona.snapshot.list(page, LIMIT);
		matches.push(...items.filter((s) => s.name === name));
		if (items.length < LIMIT) return matches;
	}
}

async function deleteExistingSnapshots(
	daytona: SnapshotClient,
	name: string,
	replace: "allowed" | "forbidden",
	sleep: (ms: number) => Promise<void>,
	log: Log,
): Promise<number> {
	const matches = await listSnapshotsByName(daytona, name);
	if (matches.length > 0 && replace === "forbidden")
		throw new Error(
			`daytona snapshot ${name} already exists and may not be replaced; Daytona can only delete it, then recreate it`,
		);
	let removing = false;
	try {
		for (const snap of matches) {
			if (snap.state === "removing") {
				log(`snapshot ${name} is already being deleted (state ${snap.state})`);
				continue;
			}
			log(`deleting existing snapshot ${name} (state ${snap.state})`);
			try {
				removing = true;
				await daytona.snapshot.delete(snap);
			} catch (err) {
				if (!isNotFound(err)) throw err;
			}
		}
		if (matches.length === 0) return 0;

		const DEADLINE_MS = 180_000;
		const POLL_MS = 3_000;
		const start = performance.now();
		for (;;) {
			let remaining: SnapshotRecord[];
			try {
				remaining = await listSnapshotsByName(daytona, name);
			} catch (err) {
				if (performance.now() - start > DEADLINE_MS) {
					throw new Error(
						`daytona snapshot ${name}: deletion poll failed after ${DEADLINE_MS}ms — ${message(err)}`,
					);
				}
				log(
					`transient error listing snapshots while waiting for ${name} deletion — ${message(err)}`,
				);
				await sleep(POLL_MS);
				continue;
			}

			if (remaining.length === 0) return matches.length;
			if (performance.now() - start > DEADLINE_MS) {
				throw new Error(
					`daytona snapshot ${name} still present after ${DEADLINE_MS}ms (states: ${remaining
						.map((s) => s.state)
						.join(", ")}) — deletion did not complete`,
				);
			}
			log(
				`waiting for snapshot ${name} deletion (states: ${remaining.map((s) => s.state).join(", ")})…`,
			);
			await sleep(POLL_MS);
		}
	} catch (error) {
		if (removing)
			throw new Error(
				`daytona snapshot ${name}: deletion was requested; the name may already be unavailable: ${message(error)}`,
				{ cause: error },
			);
		throw error;
	}
}

export function describeDaytonaError(err: unknown): string {
	if (typeof err !== "object" || err === null) return `non-object error: ${String(err)}`;
	const e = err as {
		name?: unknown;
		message?: unknown;
		statusCode?: number;
		status?: number;
		code?: string | number;
		response?: { status?: number; data?: unknown };
		cause?: unknown;
	};
	const parts: string[] = [];
	if (typeof e.name === "string") parts.push(`name=${e.name}`);
	if (typeof e.message === "string" && e.message.length > 0) parts.push(`message=${e.message}`);
	const status = e.statusCode ?? e.status ?? e.response?.status;
	if (status !== undefined) parts.push(`status=${status}`);
	if (e.code !== undefined) parts.push(`code=${String(e.code)}`);
	if (e.response?.data !== undefined) {
		let body: string;
		try {
			body =
				typeof e.response.data === "string"
					? e.response.data
					: (JSON.stringify(e.response.data) ?? String(e.response.data));
		} catch {
			body = String(e.response.data);
		}
		parts.push(`response=${body.slice(0, 500)}`);
	}
	if (e.cause !== undefined && e.cause !== null) {
		const cause = e.cause as { message?: unknown };
		const causeText =
			typeof cause.message === "string" ? cause.message : String(e.cause).slice(0, 300);
		parts.push(`cause=${causeText}`);
	}
	return parts.length > 0 ? parts.join(" ") : "no structured detail";
}

export function snapshotDestroyedMessage(name: string, deleted: number, reason: string): string {
	return (
		`daytona snapshot ${name}: create failed after deleting ${deleted} pre-existing snapshot(s) of ` +
		`that name — the previous snapshot was deleted; the replacement may be absent or unusable; inspect the account before retrying: ${reason}`
	);
}

export function daytonaTransientRef(
	access: Pick<RegistryPushAccessDto, "registryUrl" | "project">,
	image: string,
	tag: string,
): string {
	const registry = access.registryUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
	const project = access.project.replace(/^\/+|\/+$/g, "");
	const digest = image.indexOf("@");
	const imageWithoutDigest = digest === -1 ? image : image.slice(0, digest);
	const lastSlash = imageWithoutDigest.lastIndexOf("/");
	const lastColon = imageWithoutDigest.lastIndexOf(":");
	const repository =
		lastColon > lastSlash ? imageWithoutDigest.slice(0, lastColon) : imageWithoutDigest;
	if (!(registry && project && repository && tag)) {
		throw new Error("Daytona transient registry returned an incomplete upload destination");
	}
	return `${registry}/${project}/${repository}:${tag}`;
}

export function daytonaTransientPushCommands(
	image: string,
	transientRef: string,
): [string, ...string[]][] {
	return [
		["docker", "pull", image],
		["docker", "tag", image, transientRef],
		["docker", "push", transientRef],
	];
}

const CREATE_ATTEMPTS = 5;

async function logCreateFailure(
	daytona: SnapshotClient,
	name: string,
	err: unknown,
	log: Log,
): Promise<void> {
	log(`    message: ${message(err)}`);
	log(`    detail:  ${describeDaytonaError(err)}`);
	try {
		const landed = await listSnapshotsByName(daytona, name);
		if (landed.length === 0) {
			log(`    post-failure: no snapshot named ${name} exists (create never landed one)`);
		}
		for (const snap of landed) {
			const errorReason = (snap as { errorReason?: unknown }).errorReason;
			log(
				`    post-failure snapshot: state=${snap.state}${errorReason ? ` errorReason=${String(errorReason)}` : ""}`,
			);
		}
	} catch (listErr) {
		log(`    post-failure: could not list ${name} — ${message(listErr)}`);
	}
}

export function daytonaArtifactBuilder<P extends DaytonaId>(
	provider: P,
	variant: {
		readonly sandboxClass: SandboxClass;
		readonly target: (env: EnvOf<P>) => string;
	},
	transport: DaytonaBuildTransport = realTransport,
): OciArtifactBuilder<P> {
	const { run } = transport;
	const docker = async (
		argv: [string, ...string[]],
		log: Log,
		signal: AbortSignal,
	): Promise<void> => {
		log(`$ ${argv.join(" ")}`);
		const exit = await run(argv, { signal });
		if (exit !== 0) throw new Error(`${argv.slice(0, 2).join(" ")} exited ${exit}`);
	};
	return defineArtifactBuilder<P, EnvOf<P>>(provider, async (request) => {
		const { name, base, spec, env, log } = request;
		const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15 * 60_000)]);
		const sleep = (ms: number) => transport.sleep(ms, signal);
		const image = base.digestRef;
		const target = variant.target(env);
		const apiKey = (env as EnvOf<DaytonaId>).DAYTONA_API_KEY;
		const daytona = transport.client({ apiKey, target }, signal);
		const access = await transport.pushAccess(apiKey, target, signal);
		const registry = access.registryUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
		log(`authenticating Docker to Daytona transient registry ${registry}`);
		const login = await run(
			["docker", "login", registry, "--username", access.username, "--password-stdin"],
			{ stdin: access.secret, signal },
		);
		if (login !== 0) throw new Error(`docker login ${registry} exited ${login}`);
		const logout = async () => {
			log(`removing Docker credentials for Daytona transient registry ${registry}`);
			const exit = await run(["docker", "logout", registry], {
				signal: AbortSignal.timeout(10_000),
			});
			if (exit !== 0) throw new Error(`docker logout ${registry} exited ${exit}`);
		};
		let transientRef: string;
		try {
			const tag = randomUUID();
			transientRef = daytonaTransientRef(access, image, tag);
			for (const command of daytonaTransientPushCommands(image, transientRef))
				await docker(command, log, signal);
		} catch (error) {
			await logout().catch((cleanupError: unknown) =>
				log(
					`warning: could not remove Daytona transient registry credentials after upload failure — ${message(cleanupError)}`,
				),
			);
			throw error;
		}
		await logout();
		request.signal.throwIfAborted();

		const deleted = await deleteExistingSnapshots(daytona, name, request.replace, sleep, log);
		try {
			const params = {
				name,
				image: transientRef,
				resources: { cpu: spec.vcpus, memory: spec.memoryGb, disk: spec.diskGb },
				regionId: target,
				sandboxClass: variant.sandboxClass,
			};
			let lastErr: unknown;
			let cleanupErr: unknown;
			for (let attempt = 1; attempt <= CREATE_ATTEMPTS; attempt++) {
				signal.throwIfAborted();
				if (attempt > 1) {
					try {
						await deleteExistingSnapshots(daytona, name, "allowed", sleep, log);
					} catch (err) {
						log(`!!! attempt ${attempt}: could not free ${name} — ${message(err)}`);
						log(
							"    the name is still held, so further create attempts cannot succeed; giving up.",
						);
						cleanupErr = err;
						break;
					}
				}
				log(
					`>>> daytona snapshot create attempt ${attempt}/${CREATE_ATTEMPTS}: ${name} from ${transientRef} (target ${target}, class ${variant.sandboxClass})`,
				);
				const startMs = performance.now();
				try {
					await daytona.snapshot.create(params, { onLogs: log });
					log(
						`<<< daytona snapshot create succeeded on attempt ${attempt}/${CREATE_ATTEMPTS} (${(performance.now() - startMs).toFixed(0)}ms)`,
					);
					return { ref: name, replaced: deleted > 0 ? "destructive" : "none" };
				} catch (err) {
					lastErr = err;
					log(
						`!!! daytona create attempt ${attempt}/${CREATE_ATTEMPTS} failed after ${(performance.now() - startMs).toFixed(0)}ms`,
					);
					await logCreateFailure(daytona, name, err, log);
					if (attempt < CREATE_ATTEMPTS) {
						const backoffMs = Math.min(attempt * 5000, 20000);
						log(`    backing off ${backoffMs}ms before retry…`);
						await sleep(backoffMs);
					}
				}
			}
			const createReason = message(lastErr);
			const reason =
				cleanupErr === undefined
					? createReason
					: `${createReason}; retries stopped because ${name} could not be freed for another attempt: ${message(cleanupErr)}`;
			if (deleted === 0) {
				if (cleanupErr === undefined) throw lastErr;
				throw new Error(`daytona snapshot ${name} create failed — ${reason}`, { cause: lastErr });
			}
			throw new Error(`daytona snapshot ${name} create failed — ${reason}`, { cause: lastErr });
		} catch (error) {
			if (deleted > 0)
				throw new Error(snapshotDestroyedMessage(name, deleted, message(error)), { cause: error });
			throw error;
		}
	});
}
