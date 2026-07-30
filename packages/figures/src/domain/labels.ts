/**
 * Presentation names for the dataset's own ids.
 *
 * These are labels, not prose: a one-to-one rename of a machine id into the words the
 * report prints for it. They live in the package because a figure that spelled a
 * dimension or a phase differently from the table above it would be captioning the same
 * data with a different vocabulary — and because both maps are keyed by ids the ORDER of
 * which always comes from the data, never from here.
 */

/** Presentation names for the dataset's dimension ids (order comes from data). */
export const dimensionLabels: Record<string, string> = {
	lifecycle: "Lifecycle",
	"control-plane": "Control plane",
	cpu: "CPU",
	disk: "Disk I/O",
	memory: "Memory bandwidth",
	network: "Network",
	system: "System",
	realworld: "Real-world pipelines",
	economics: "Economics",
};

/** Presentation names for the mechanical pipeline phases (order comes from data). */
export const phaseLabels: Record<string, string> = {
	clone: "git clone",
	install: "cold install",
	lint: "lint",
	typecheck: "typecheck",
	build: "build",
	test: "test",
	check: "check",
};
