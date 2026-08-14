/** Structured stderr/stdout logging for the synthetic PTS warmer. */
export type WarmLogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<WarmLogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

function envMinLevel(): WarmLogLevel {
	const raw = (process.env.WARM_LOG_LEVEL ?? "").toLowerCase();
	if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
	if (process.env.WARM_DEBUG === "1" || process.env.WARM_DEBUG === "true") return "debug";
	return "info";
}

const minLevel = envMinLevel();

function emit(level: WarmLogLevel, message: string): void {
	if (LEVEL_RANK[level] < LEVEL_RANK[minLevel]) return;
	const line = `[warm:${level}] ${message}`;
	if (level === "error" || level === "warn") {
		console.error(line);
	} else {
		console.log(line);
	}
}

export const log = {
	debug: (message: string) => emit("debug", message),
	info: (message: string) => emit("info", message),
	warn: (message: string) => emit("warn", message),
	error: (message: string) => emit("error", message),
};
