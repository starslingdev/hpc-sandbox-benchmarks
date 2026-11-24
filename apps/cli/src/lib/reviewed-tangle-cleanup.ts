import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { type } from "arktype";

// The vendor supplied the private receipt and its independently reviewed digest. The
// original executor transmitted this create and retained no allocation.json (ADR-0028).
export const reviewedTangleCleanup = {
	provider: "tangle",
	suite: "realworld-better-auth",
	attemptId: "tangle-realworld-better-auth-r0-a1-27f5cf25-f1ea-45d0-bac7-c05a880e3ef7",
	cellId: "tangle-realworld-better-auth-r0",
	workflowRun: "44468887637",
	sourceSha: "40528698a6b4381d0e338021848a9b46bf5468af",
	planDigest: "sha256:90321b01acee508fadf8b8a0959e97912cf95a50c5c26a08a40defc3e0d2ebc9",
	attemptDigest: "sha256:df704e977726b57039561dc48232abe5df72b38769629d5508475436b9836db6",
	attestationDigest: "sha256:4e8f78926ba18d7690eaa20be9686d07c0c2da9108169f993888006babd4aa3a",
	detail:
		"computesdk create failed: Provision failed — (container) — The host cannot prove it removed what a failed create made.; cleanup failed: tangle ComputeSDK failed-create recovery cleanup callback failed",
} as const;

/**
 * The vendor receipt is unavailable (ADR-0028 addendum). This release rests on two complete,
 * empty account inventories under exclusive ownership; it records who confirmed it and when, and
 * it is a `reconciled` release, never `not-allocated`: create did reach the vendor.
 */
export function tangleInventoryClearanceEvidence(operator: string, confirmedAt: string) {
	return {
		kind: "tangle-inventory-clearance",
		attemptDigest: reviewedTangleCleanup.attemptDigest,
		operator,
		confirmedAt,
	} as const;
}

/** Only the evidence supplied for this review can select the resource to probe. */
export function readTangleVendorAttestation(path: string | undefined) {
	if (!path) throw new Error("the reviewed Tangle vendor attestation is required");
	const stat = statSync(path);
	if (!stat.isFile() || stat.size > 8192) throw new Error("invalid Tangle vendor attestation file");
	const bytes = readFileSync(path);
	if (
		`sha256:${createHash("sha256").update(bytes).digest("hex")}` !==
		reviewedTangleCleanup.attestationDigest
	)
		throw new Error("file does not match the reviewed Tangle vendor attestation");
	const receipt = type({
		sandboxId: /^sandbox-[a-z0-9-]+$/,
		requestId: "string >= 1",
		customerCommitment: /^sha256:[a-f0-9]{64}$/,
	}).assert(JSON.parse(bytes.toString("utf8")));
	return {
		sandboxId: receipt.sandboxId,
		releaseEvidence(confirmedAt: string) {
			return {
				kind: "tangle-vendor-cleanup",
				attemptDigest: reviewedTangleCleanup.attemptDigest,
				attestationDigest: reviewedTangleCleanup.attestationDigest,
				confirmedAt,
			} as const;
		},
		assertCustomer(customerId: string) {
			const hash = createHash("sha256").update(receipt.requestId).update("\n").update(customerId);
			if (`sha256:${hash.digest("hex")}` !== receipt.customerCommitment)
				throw new Error("authenticated Tangle account differs from the attested account");
		},
	};
}
