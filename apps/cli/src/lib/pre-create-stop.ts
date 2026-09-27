import { evidenceIdentifierSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

/**
 * Failures thrown before `SandboxDriver.create`. A later cell can record one of these as its
 * create-failure marker even though the vendor was never asked to allocate. The strings are the
 * recovery proof for a lost `not-allocated` release; vendor prose is not in this set.
 */
export const STARTUP_DEADLINE_BEFORE_CREATE = "startup deadline exceeded before create";

const ADMISSION_STOPPED =
	/^account (?<account>[a-zA-Z0-9][a-zA-Z0-9._-]*) admission stopped after (?<cell>[a-zA-Z0-9][a-zA-Z0-9._-]*): allocation ownership or journal release remains unresolved$/;

export function admissionStoppedDetail(account: string, cellId: string): string {
	const detail = `account ${account} admission stopped after ${cellId}: allocation ownership or journal release remains unresolved`;
	if (!isPreCreateStopDetail(detail)) throw new Error("invalid admission-stop identity");
	return detail;
}

/** True only for the executor's own pre-create stops, not for a create the vendor may have accepted. */
export function isPreCreateStopDetail(detail: string): boolean {
	if (detail === STARTUP_DEADLINE_BEFORE_CREATE) return true;
	const match = ADMISSION_STOPPED.exec(detail);
	const account = match?.groups?.account;
	const cell = match?.groups?.cell;
	if (!account || !cell) return false;
	return (
		!(evidenceIdentifierSchema(account) instanceof type.errors) &&
		!(evidenceIdentifierSchema(cell) instanceof type.errors)
	);
}
