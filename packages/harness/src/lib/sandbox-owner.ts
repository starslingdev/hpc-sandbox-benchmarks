/**
 * Process-level ownership for provider sandboxes.
 *
 * Every harness create goes through {@link createOwnedSandbox}. The returned handle keeps the
 * provider's surface, but its destroy is idempotent and removes it from the process registry only
 * after the provider confirms teardown. While anything is pending or live, SIGINT/SIGTERM drain the
 * registry before exiting. Ordinary CLI exits use the same bounded drain, `beforeExit` covers a
 * natural fallthrough, and a second signal preserves the usual "force quit now" escape hatch.
 */

interface DestroyableSandbox {
	readonly sandboxId?: string;
	destroy(): Promise<unknown>;
}

interface OwnedEntry<T extends DestroyableSandbox> {
	promise: Promise<T>;
	destroy?: () => Promise<unknown>;
	sandboxId?: string;
}

export interface SandboxCleanupOptions {
	/** Total cleanup attempts. Defaults to 3. */
	attempts?: number;
	/** Total wall-clock cleanup budget. Defaults to 15 seconds. */
	timeoutMs?: number;
	/** Delay between attempts. Defaults to 250ms. */
	retryDelayMs?: number;
}

const owned = new Set<OwnedEntry<DestroyableSandbox>>();
const signals = ["SIGINT", "SIGTERM"] as const;
const DEFAULT_CLEANUP_ATTEMPTS = 3;
const DEFAULT_CLEANUP_TIMEOUT_MS = 15_000;
const DEFAULT_CLEANUP_RETRY_MS = 250;

let handlersInstalled = false;
let stopping = false;
let signalCleanup: Promise<void> | undefined;
let beforeExitCleanup: Promise<void> | undefined;

function signalExitCode(signal: (typeof signals)[number]): number {
	return signal === "SIGINT" ? 130 : 143;
}

function uninstallProcessHandlers(): void {
	if (!handlersInstalled) return;
	for (const signal of signals) process.off(signal, onSignal);
	process.off("beforeExit", onBeforeExit);
	handlersInstalled = false;
}

function release(entry: OwnedEntry<DestroyableSandbox>): void {
	owned.delete(entry);
	if (owned.size === 0) uninstallProcessHandlers();
}

async function destroyEntry(entry: OwnedEntry<DestroyableSandbox>): Promise<void> {
	try {
		await entry.promise;
	} catch {
		// A rejected create allocated no handle and removes itself from the registry.
		return;
	}
	await entry.destroy?.();
}

function positiveInteger(value: number | undefined, fallback: number): number {
	return value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withinDeadline(
	entry: OwnedEntry<DestroyableSandbox>,
	deadline: number,
): Promise<void> {
	const remainingMs = deadline - Date.now();
	if (remainingMs <= 0) {
		throw new Error(`Sandbox cleanup timed out${entry.sandboxId ? ` (${entry.sandboxId})` : ""}`);
	}

	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			destroyEntry(entry),
			new Promise<never>((_resolve, reject) => {
				timer = setTimeout(
					() =>
						reject(
							new Error(
								`Sandbox cleanup timed out${entry.sandboxId ? ` (${entry.sandboxId})` : " during creation"}`,
							),
						),
					remainingMs,
				);
			}),
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}

/** Destroy every pending/live sandbox currently owned by this process, with bounded retries. */
export async function cleanupOwnedSandboxes(
	options: SandboxCleanupOptions = {},
): Promise<unknown[]> {
	const attempts = positiveInteger(options.attempts, DEFAULT_CLEANUP_ATTEMPTS);
	const timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_CLEANUP_TIMEOUT_MS);
	const retryDelayMs = positiveInteger(options.retryDelayMs, DEFAULT_CLEANUP_RETRY_MS);
	const deadline = Date.now() + timeoutMs;
	let failures: unknown[] = [];

	for (let attempt = 1; attempt <= attempts && owned.size > 0; attempt++) {
		failures = [];
		await Promise.all(
			[...owned].map(async (entry) => {
				try {
					await withinDeadline(entry, deadline);
				} catch (error) {
					failures.push(error);
				}
			}),
		);
		if (owned.size === 0) return [];

		const remainingMs = deadline - Date.now();
		if (attempt < attempts && remainingMs > 0) {
			await delay(Math.min(retryDelayMs, remainingMs));
		}
	}

	if (owned.size > 0 && failures.length === 0) {
		failures.push(new Error(`Could not clean up ${owned.size} owned sandbox(es)`));
	}
	return failures;
}

function logCleanupFailures(context: string, failures: readonly unknown[]): void {
	for (const failure of failures) {
		console.error(
			`[cleanup] destroy failed during ${context}: ${
				failure instanceof Error ? failure.message : String(failure)
			}`,
		);
	}
}

/** Stop new creates and drain all owned sandboxes before an ordinary CLI exit. */
export async function shutdownOwnedSandboxes(context = "process exit"): Promise<unknown[]> {
	stopping = true;
	const failures = await cleanupOwnedSandboxes();
	logCleanupFailures(context, failures);
	return failures;
}

/** Exit only after the process has made its bounded cleanup attempts. */
export async function exitAfterSandboxCleanup(exitCode: number): Promise<never> {
	const failures = await shutdownOwnedSandboxes();
	process.exit(exitCode === 0 && failures.length > 0 ? 1 : exitCode);
}

function onSignal(signal: (typeof signals)[number]): void {
	const exitCode = signalExitCode(signal);
	if (signalCleanup !== undefined) {
		process.exit(exitCode);
	}

	stopping = true;
	console.error(`[cleanup] ${signal} received; destroying ${owned.size} sandbox(es)...`);
	signalCleanup = shutdownOwnedSandboxes(signal).then(() => {
		uninstallProcessHandlers();
		process.exit(exitCode);
	});
}

function onBeforeExit(): void {
	if (owned.size === 0 || beforeExitCleanup !== undefined) return;
	console.error(`[cleanup] process exiting; destroying ${owned.size} sandbox(es)...`);
	beforeExitCleanup = shutdownOwnedSandboxes("process exit").then((failures) => {
		if (failures.length > 0) process.exitCode = 1;
		uninstallProcessHandlers();
	});
}

function installProcessHandlers(): void {
	if (handlersInstalled) return;
	for (const signal of signals) process.on(signal, onSignal);
	process.on("beforeExit", onBeforeExit);
	handlersInstalled = true;
}

/**
 * Create a sandbox owned by this process. Registration happens before `create` is invoked, so a
 * signal during provisioning waits for the handle and tears it down. Provider methods are bound to
 * the original SDK object (several SDKs use private fields); only `destroy` is replaced.
 */
export function createOwnedSandbox<T extends DestroyableSandbox>(
	create: () => Promise<T>,
): Promise<T> {
	if (stopping) return Promise.reject(new Error("Sandbox creation refused during shutdown"));

	installProcessHandlers();
	const entry = {} as OwnedEntry<T>;
	owned.add(entry as OwnedEntry<DestroyableSandbox>);

	entry.promise = Promise.resolve()
		.then(create)
		.then(
			(sandbox) => {
				entry.sandboxId = sandbox.sandboxId;
				const providerDestroy = sandbox.destroy.bind(sandbox);
				let destroying: Promise<unknown> | undefined;
				const destroy = (): Promise<unknown> => {
					if (destroying !== undefined) return destroying;
					destroying = providerDestroy().then(
						(value) => {
							release(entry as OwnedEntry<DestroyableSandbox>);
							return value;
						},
						(error) => {
							destroying = undefined;
							throw error;
						},
					);
					return destroying;
				};
				entry.destroy = destroy;

				// Keep object identity intact: callers may compare the returned SDK handle, and replacing one
				// method on the instance leaves every private-field-backed provider method on its real receiver.
				try {
					Object.defineProperty(sandbox, "destroy", {
						configurable: true,
						value: destroy,
					});
					return sandbox;
				} catch {
					// Defensive fallback for an SDK that freezes its handles. Bind methods back to the real
					// object so JavaScript private fields remain valid through the proxy.
					return new Proxy(sandbox, {
						get(target, property) {
							if (property === "destroy") return destroy;
							const value = Reflect.get(target, property, target);
							return typeof value === "function" ? value.bind(target) : value;
						},
					});
				}
			},
			(error) => {
				release(entry as OwnedEntry<DestroyableSandbox>);
				throw error;
			},
		);

	return entry.promise;
}
