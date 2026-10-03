/** The stand-in E2B-protocol SDK's own typed errors, for a test that passes no SDK classes. */
class StubSandboxNotFound extends Error {}
class StubAuthenticationError extends Error {}
class StubInvalidArgumentError extends Error {}
class StubRateLimitError extends Error {}

/** The protocol's nonzero-exit envelope, which the shared adapter reads by shape. */
class StubCommandExit extends Error {
	override readonly name = "CommandExitError";
	constructor(
		readonly exitCode: number,
		readonly stdout = "",
		readonly stderr = "",
	) {
		super(`exit ${exitCode}`);
	}
}

export interface E2bProtocolStubOptions {
	readonly pageSize?: number;
	/** The root filesystem capacity `df` reports (default 80 GiB). */
	readonly diskGb?: number;
	/** The first create allocates and then loses its response. */
	readonly ambiguousFirstCreate?: boolean;
	/** A listing reports more pages but withholds its continuation token. */
	readonly omitsToken?: boolean;
	/** The metadata query is ignored: a lookup returns every live row (a loose filter). */
	readonly looseLookup?: boolean;
	/** The process id a background command returns (default 42). */
	readonly launchPid?: number;
	/** The error a nonzero foreground exit throws (default: a `CommandExitError`-shaped error). */
	readonly exitError?: (exitCode: number) => unknown;
	/** `false`: killing an unknown sandbox resolves `false` (E2B). Default: it throws not-found. */
	readonly killMissing?: "false" | "throws";
	/** The SDK's own error classes, where the test exercises them (default: local stand-ins). */
	readonly errors?: {
		readonly SandboxNotFoundError: new (message: string) => Error;
		readonly AuthenticationError: abstract new (...args: never[]) => unknown;
		readonly InvalidArgumentError: abstract new (...args: never[]) => unknown;
		readonly RateLimitError: abstract new (...args: never[]) => unknown;
	};
	/** Further fields every `getInfo` answer carries (a template id, a CPU count). */
	readonly info?: Readonly<Record<string, unknown>>;
}

export interface E2bProtocolStubRow {
	readonly sandboxId: string;
	/** `running` or `paused`; anything else stands in for a state the adapter does not know. */
	state: string;
	readonly metadata: Record<string, string>;
	readonly files: Map<string, string>;
}

/**
 * A whole-account stand-in for an E2B-protocol SDK's statics (`Sandbox.create/getInfo/kill/list`,
 * the typed errors, and `Template` for `e2bProtocolArtifactBuilder`), shared by every package whose
 * adapter is `e2bProtocolVendor`. A template records its steps (`["fromImage", image]`,
 * `["runCmd", command, options]`); `Template.build` records them with its name and options as a
 * `Template.build` call, and streams one build log line. Sandboxes
 * are running once created, answer `df` with `diskGb`, `sh -c 'exit N'` with exit N and any other
 * foreground command with `out`/`err`; a background `echo X > path` writes the file. Every call
 * records its options, so a test can see the channel a credential rode. `Sdk` is the package's own
 * SDK type, which the stand-in satisfies structurally.
 */
export function e2bProtocolStub<Sdk>(options: E2bProtocolStubOptions = {}) {
	const errors = options.errors ?? {
		SandboxNotFoundError: StubSandboxNotFound,
		AuthenticationError: StubAuthenticationError,
		InvalidArgumentError: StubInvalidArgumentError,
		RateLimitError: StubRateLimitError,
	};
	const exitError = options.exitError ?? ((exitCode: number) => new StubCommandExit(exitCode));
	const rows = new Map<string, E2bProtocolStubRow>();
	const calls: Array<{ readonly name: string; readonly options: unknown }> = [];
	let next = 0;
	let ambiguous = options.ambiguousFirstCreate ?? false;
	const allocate = (metadata: Record<string, string>, state = "running") => {
		const sandboxId = `i${++next}`;
		rows.set(sandboxId, { sandboxId, state, metadata, files: new Map() });
		return sandboxId;
	};
	const reachable = (id: string) => {
		const found = rows.get(id);
		if (found?.state !== "running") throw new Error(`sandbox ${id} is not running`);
		return found;
	};
	const native = (sandboxId: string) => ({
		sandboxId,
		commands: {
			run: async (command: string, runOptions: { readonly background?: boolean }) => {
				calls.push({ name: "commands.run", options: runOptions });
				const guest = reachable(sandboxId);
				if (runOptions.background) {
					const echo = /echo (\S+) > ([^\s']+)/.exec(command);
					if (echo) guest.files.set(echo[2] ?? "", `${echo[1]}\n`);
					return { pid: options.launchPid ?? 42 };
				}
				if (command.startsWith("df -Pk"))
					return { exitCode: 0, stdout: `${(options.diskGb ?? 80) * 1024 * 1024}\n`, stderr: "" };
				const exit = /^sh -c 'exit (\d+)'$/.exec(command);
				if (exit) throw exitError(Number(exit[1]));
				return { exitCode: 0, stdout: "out\n", stderr: "err\n" };
			},
		},
		files: {
			read: async (path: string, fileOptions: unknown) => {
				calls.push({ name: "files.read", options: fileOptions });
				const text = reachable(sandboxId).files.get(path);
				if (text === undefined) throw new Error(`${path}: no such file`);
				return text;
			},
			write: async (path: string, text: string, fileOptions: unknown) => {
				calls.push({ name: "files.write", options: fileOptions });
				reachable(sandboxId).files.set(path, text);
				return { path };
			},
			exists: async (path: string, fileOptions: unknown) => {
				calls.push({ name: "files.exists", options: fileOptions });
				return reachable(sandboxId).files.has(path);
			},
		},
	});
	const Sandbox = {
		create: async (template: string, createOptions: { metadata: Record<string, string> }) => {
			calls.push({ name: "create", options: { template, ...createOptions } });
			const sandboxId = allocate(createOptions.metadata);
			if (ambiguous) {
				ambiguous = false;
				throw new TypeError("connection reset after the vendor accepted the create");
			}
			return native(sandboxId);
		},
		getInfo: async (id: string, getOptions: unknown) => {
			calls.push({ name: "getInfo", options: getOptions });
			const found = rows.get(id);
			if (!found) throw new errors.SandboxNotFoundError(id);
			return {
				sandboxId: id,
				...options.info,
				state: found.state,
				metadata: found.metadata,
			};
		},
		kill: async (id: string, killOptions: unknown) => {
			calls.push({ name: "kill", options: killOptions });
			if (rows.delete(id)) return true;
			if (options.killMissing === "false") return false;
			throw new errors.SandboxNotFoundError(id);
		},
		list: (listOptions: {
			readonly query: { readonly state?: string[]; readonly metadata?: Record<string, string> };
			readonly nextToken?: string;
		}) => {
			calls.push({ name: "list", options: listOptions });
			const { state, metadata } = listOptions.query;
			const items = [...rows.values()]
				.filter((row) => !state || state.includes(row.state))
				.filter(
					(row) =>
						options.looseLookup ||
						!metadata ||
						Object.entries(metadata).every(([key, wanted]) => row.metadata[key] === wanted),
				)
				.map(({ sandboxId, state: live, metadata: labels }) => ({
					sandboxId,
					state: live,
					metadata: labels,
				}));
			// Stateless like the SDK's paginator: a token resumes a fresh listing at its offset, and
			// `hasNext` is true exactly while a token is held.
			const size = options.pageSize ?? 100;
			let token = listOptions.nextToken;
			let fetched = false;
			return {
				get hasNext() {
					return !fetched || token !== undefined;
				},
				get nextToken() {
					return options.omitsToken ? undefined : token;
				},
				nextItems: async (pageOptions?: unknown) => {
					calls.push({ name: "nextItems", options: pageOptions });
					const from = Number(token?.replace("token-", "") ?? 0);
					fetched = true;
					token = from + size < items.length ? `token-${from + size}` : undefined;
					return items.slice(from, from + size);
				},
			};
		},
	};
	interface StubTemplate {
		readonly steps: readonly unknown[][];
		fromImage(image: string): StubTemplate;
		runCmd(command: string, runOptions?: unknown): StubTemplate;
	}
	const template = (steps: readonly unknown[][]): StubTemplate => ({
		steps,
		fromImage: (image) => template([...steps, ["fromImage", image]]),
		runCmd: (command, runOptions) => template([...steps, ["runCmd", command, runOptions]]),
	});
	let builds = 0;
	const Template = Object.assign(() => template([]), {
		build: async (
			built: StubTemplate,
			name: string,
			buildOptions: { readonly onBuildLogs?: (entry: unknown) => void },
		) => {
			calls.push({
				name: "Template.build",
				options: { name, steps: built.steps, ...buildOptions },
			});
			buildOptions.onBuildLogs?.({
				timestamp: new Date(),
				level: "info",
				message: `building ${name}`,
				toString() {
					return `building ${name}`;
				},
			});
			builds += 1;
			return { templateId: `tpl-${name}`, buildId: `build-${builds}` };
		},
	});
	return {
		/** The stand-in, typed as the package's SDK it satisfies structurally. */
		sdk: { Sandbox, Template, ...errors } as unknown as Sdk,
		rows,
		calls,
		/** Place a sandbox directly in the account (another tenant's, or one in a given state). */
		allocate,
		count: (name: string) => calls.filter((call) => call.name === name).length,
	};
}
