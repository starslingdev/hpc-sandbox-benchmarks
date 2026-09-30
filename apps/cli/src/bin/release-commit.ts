#!/usr/bin/env bun
// Credential-free publication barrier. Provider artifacts were staged in separate protected jobs.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "@sandbox-benchmarks/providers/config";
import { type } from "arktype";
import {
	imageExistsInRegistry,
	promoteImage,
	releaseBaseTag,
	resolveImageDigestRef,
} from "../lib/bake/image.ts";
import { verifyPromotionEvidence } from "../lib/bake/release-evidence.ts";

const matrixSchema = type({
	include: type({ provider: "string", required: "boolean", account: "string" }).array(),
});
if (import.meta.main) {
	const directory = process.argv[2];
	if (!directory) throw new Error("Promotion evidence directory is required");
	const matrix = matrixSchema.assert(JSON.parse(process.env.RELEASE_MATRIX ?? ""));
	for (const key of ["RELEASE_PARTIAL", "RELEASE_FORCE"])
		if (!["true", "false"].includes(process.env[key] ?? "")) throw new Error(`Missing ${key}`);
	const partial = process.env.RELEASE_PARTIAL === "true";
	const force = process.env.RELEASE_FORCE === "true";
	if (partial && force) throw new Error("Cannot force a backfill");
	const baseImage = await resolveImageDigestRef(process.env.RELEASE_BASE_IMAGE ?? "");
	const values = readdirSync(directory)
		.filter((file) => file.endsWith(".json"))
		.map((file) => JSON.parse(readFileSync(join(directory, file), "utf8")));
	const reports = verifyPromotionEvidence(values, {
		providers: matrix.include.map((cell) => cell.provider),
		required: matrix.include.filter((cell) => cell.required).map((cell) => cell.provider),
		sourceRef: process.env.RELEASE_SOURCE_REF ?? "",
		baseImage,
		version: config.toolchainImageVersion,
		partial,
		force,
	});
	// Refuse drift and uncertain registry responses at the commit point as well as in every stage.
	if (baseImage !== (await resolveImageDigestRef(releaseBaseTag(partial))))
		throw new Error("Release base changed before commit");
	const published = await imageExistsInRegistry(config.toolchainImageVersion);
	if (partial ? !published : published && !force)
		throw new Error("Public version state does not match release mode");
	if (!partial) await promoteImage(console.log, baseImage);
	writeFileSync(
		"promote-payload.json",
		`${JSON.stringify({ partial, baseImage, version: config.toolchainImageVersion, reports }, null, 2)}\n`,
	);
	console.log(partial ? "Provider backfill complete" : "Toolchain release committed");
}
