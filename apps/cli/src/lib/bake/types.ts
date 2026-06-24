// Shared types for the provider bake. A `Log` sink keeps the per-provider bake modules free of
// console wiring (the bin passes an indenting logger).
import type { SmokeResult } from "@sandbox-benchmarks/templates/smoke";

export type Log = (message: string) => void;

export type BakeStatus = "ok" | "skipped" | "failed";

/** The per-provider outcome the bake emits — bake + immediate boot/smoke validation. */
export interface BakeReport {
	provider: string;
	status: BakeStatus;
	/** Why it skipped or failed (absent when it baked + validated clean). */
	reason?: string;
	/** Bake + validate wall time, when it ran. */
	durationMs?: number;
	/** Smoke results from booting the just-baked candidate artifact. */
	checks?: SmokeResult[];
}
