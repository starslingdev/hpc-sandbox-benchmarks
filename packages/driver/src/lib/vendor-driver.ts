// Lower the vendor lifecycle into the structural session bridge.
import { randomUUID } from "node:crypto";
import type {
	DriverContext,
	DriverOperationOptions,
	ExecOptions,
	ProviderId,
	SandboxObservation,
} from "@sandbox-benchmarks/driver";
import { detachedShellCommand, shellQuote } from "@sandbox-benchmarks/driver";
import type { CreateAttempt, Vendor, VendorHandle, VendorRecord, VendorTraits } from "../vendor.ts";
import { MARKER_PREFIX } from "../vendor.ts";
import type { ComputeSdkDriverSpec } from "./computesdk.ts";
import { verifyDisk } from "./vendor-helpers.ts";
import { vendorLifecycle } from "./vendor-lifecycle.ts";

/** A created allocation, whose native handle attach binds on the bridge's post-create path. */
class Allocation<Raw, Native> implements VendorHandle<Raw, Native> {
	#native?: { readonly value: Native };
	constructor(
		readonly record: VendorRecord<Raw>,
		readonly marker: string,
	) {}
	get native(): Native {
		if (this.#native === undefined) throw new Error(`sandbox ${this.record.id} is not attached`);
		return this.#native.value;
	}
	attach(native: Native): void {
		this.#native = { value: native };
	}
}

export function vendorSpec<P extends ProviderId, Raw, Native>(
	provider: P,
	context: DriverContext<P>,
	traits: VendorTraits,
	vendor: Vendor<Raw, Native>,
) {
	const {
		timing,
		control,
		data,
		snapshots,
		files,
		launch,
		refused,
		transient,
		spelling,
		provesAbsence,
		unresolved,
		op,
		isGone,
		owned,
		call,
		liveRecords,
		awaitReady,
		recoveryIds,
		destroy,
		release,
	} = vendorLifecycle(provider, traits, vendor);

	const compute = {
		sandbox: {
			async create(attempt: CreateAttempt, operation: DriverOperationOptions = {}) {
				operation.signal?.throwIfAborted();
				unresolved.add(attempt.marker);
				const handle = new Allocation<Raw, Native>(
					await control.create(attempt, op(operation.signal)).catch((error: unknown) => {
						if (provesAbsence || refused?.(error) !== undefined) unresolved.delete(attempt.marker);
						throw error;
					}),
					attempt.marker,
				);
				return {
					sandboxId: handle.record.id,
					getInstance: () => handle,
					destroy: () => release(handle.record.id),
					// The plain exec is synchronous; a background request runs through the kit's shell
					// launcher, and `data.launch` (bound below as the bridge's commands) owns native ones.
					runCommand: (
						command: string,
						options?: ExecOptions & { readonly background?: boolean },
					) =>
						data.exec(
							handle.native,
							options?.background ? detachedShellCommand(command) : command,
							options?.signal ? { signal: options.signal } : undefined,
						),
					...(files && {
						filesystem: {
							readFile: (path: string) => files.read(handle.native, path),
							exists: async (path: string) =>
								files.exists
									? files.exists(handle.native, path)
									: (await data.exec(handle.native, `test -e ${shellQuote(path)}`)).exitCode === 0,
							writeFile: (path: string, text: string) => files.write(handle.native, path, text),
						},
					}),
				};
			},
		},
	};

	const spec: ComputeSdkDriverSpec<typeof compute> = {
		compute,
		sandboxId: traits.sandboxId,
		createOptions: {
			coverage: traits.coverage,
			map: (request, unsupported) => {
				// The artifact guard: a request may only boot the artifact this context resolved.
				const resolved = context.resolvedArtifact;
				const same =
					request.artifact.kind === resolved.kind &&
					(resolved.kind === "none" ||
						(request.artifact.kind !== "none" && request.artifact.ref === resolved.ref));
				if (!same) unsupported(`request artifact differs from the resolved ${provider} artifact`);
				const refusal = traits.unsupported?.(request);
				if (refusal !== undefined) unsupported(refusal);
				return { request, marker: `${MARKER_PREFIX}${randomUUID()}` };
			},
		},
		...(launch && {
			commands: {
				exec: (sandbox, command, options) =>
					data.exec(sandbox.getInstance().native, command, options),
				launch: (sandbox, command, options) =>
					launch(sandbox.getInstance().native, command, options),
			},
		}),
		lifecycle: {
			destroy: async (sandbox, ref, operation) => {
				await release(ref?.id ?? sandbox.getInstance().record.id, operation.signal);
			},
		},
		createRecovery: {
			absenceConfirmationMs: traits.recovery?.absenceConfirmationMs ?? 2_000,
			maxAttempts: traits.recovery?.maxAttempts ?? 4,
			locator: (attempt) => ({
				kind: "marker",
				key: traits.markerKey ?? `${provider}-marker`,
				value: spelling.toVendor(attempt.marker),
			}),
			...((refused || transient) && {
				isDefinitive: (error: unknown) => refused?.(error) !== undefined,
				isRetryableCreate: (error: unknown) =>
					refused?.(error)?.retryable === true || transient?.(error) === true,
			}),
			cleanup: async (_compute, locator, operation) => {
				const marker = spelling.fromVendor(locator.value);
				if (marker === undefined)
					throw new Error(`${provider} recovery locator spells no ownership marker`);
				const ids = await recoveryIds(marker, operation.signal);
				if (ids.length === 0) {
					if (unresolved.has(marker))
						throw new Error(
							`${provider} create has no allocation verdict; an empty lookup cannot prove it absent`,
						);
					return { status: "absent" };
				}
				// Each teardown is independently bounded; run them together, then surface every failure.
				const outcomes = await Promise.allSettled(ids.map((id) => destroy(id, operation.signal)));
				const failures = outcomes.flatMap((outcome) =>
					outcome.status === "rejected" ? [outcome.reason] : [],
				);
				if (failures.length > 0)
					throw new AggregateError(
						failures,
						`${provider} recovery could not tear down ${failures.length} of ${ids.length} sandboxes`,
					);
				unresolved.delete(marker);
				// Listed but already gone by the time teardown observed them: the account was not empty
				// a moment ago, so the bridge restarts its absence-confirmation clock.
				return outcomes.some((outcome) => outcome.status === "fulfilled" && outcome.value)
					? { status: "destroyed" }
					: { status: "absent", contradictedPriorAbsence: true };
			},
		},
		prepareAndVerifyCreatedRequest: async (_sandbox, handle, request, operation) => {
			// The bridge has parsed the allocation id; any later rollback retains cleanup by id.
			unresolved.delete(handle.marker);
			handle.attach(await data.attach(handle.record, op(operation.signal)));
			const ready = await awaitReady(handle.record, operation.signal);
			const reason = control.admit?.(ready);
			if (reason) throw new Error(`${provider} rejected the allocation: ${reason}`);
			const prepared = await data.prepare?.(
				{ record: ready, native: handle.native },
				request,
				op(operation.signal),
			);
			if (prepared?.status === "unsupported") return prepared;
			const honored = prepared ?? { status: "honored" };
			const { diskProof } = traits;
			if (diskProof === "reported" || request.spec.diskGb === undefined) return honored;
			if (traits.coverage.spec.diskGb !== "runtime-verified" && !diskProof) return honored;
			const disk = await verifyDisk(
				provider,
				request.spec.diskGb,
				(command) => data.exec(handle.native, command, operation),
				diskProof,
			);
			return disk.status === "honored" ? honored : disk;
		},
		hasWorkingFilesystem: files !== undefined,
		probes: {
			observe: async (_compute, ref): Promise<SandboxObservation> => {
				const record = await call("observe", undefined, (o) => control.get(ref.id, o));
				return {
					state:
						record?.terminal || record?.phase === "failed"
							? "terminal"
							: isGone(record)
								? "absent"
								: "running",
				};
			},
			describe: async (_compute, ref) =>
				(await call("describe", undefined, (o) => control.get(ref.id, o)))?.raw,
			// One page, as a control-plane latency probe rather than a full enumeration.
			list: async () =>
				(await call("list probe", undefined, (o) => control.page(undefined, o))).records.map(
					(record) => record.raw,
				),
		},
		inventory: {
			list: async (_compute, operation) => {
				const ownedIds: string[] = [];
				let foreignCount = 0;
				for (const record of await liveRecords(operation.signal)) {
					if (owned(record)) ownedIds.push(record.id);
					else if (!record.stopped) foreignCount += 1;
				}
				return { owned: ownedIds, foreignCount };
			},
		},
		destroyById: async (_compute, ref, operation) => {
			await destroy(ref.id, operation.signal);
		},
		...(snapshots && {
			snapshots: {
				retention: "explicit",
				create: (_compute, session, options) =>
					call(
						"snapshot capture",
						undefined,
						(o) => snapshots.create(session.native, o, options?.retention ?? "ephemeral"),
						timing.snapshotTimeoutMs,
					),
				delete: (_compute, snapshotId) =>
					call(
						"snapshot delete",
						undefined,
						(o) => snapshots.delete(snapshotId, o),
						timing.snapshotTimeoutMs,
					),
			},
		}),
	};
	return spec;
}
