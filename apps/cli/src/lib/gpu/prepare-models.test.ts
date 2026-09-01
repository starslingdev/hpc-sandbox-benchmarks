import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { modelAssetConfig } from "./prepare-models.ts";

const PREPARE_MODELS = fileURLToPath(new URL("prepare-models.py", import.meta.url));
const fixtureRoots: string[] = [];

afterEach(() => {
	for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const sha256 = (content: string | Buffer): string =>
	createHash("sha256").update(content).digest("hex");

function createPreparationFixture() {
	const root = mkdtempSync(join(tmpdir(), "gpu-model-assets-"));
	fixtureRoots.push(root);
	const pythonPath = join(root, "python");
	const modelMount = join(root, "models");
	const modelSnapshot = join(modelMount, "hub", "snapshots", modelAssetConfig().model.revision);
	const datasetDirectory = join(modelMount, "speed-bench");
	const datasetPath = join(datasetDirectory, "qualitative.jsonl");
	const manifestPath = join(modelMount, "benchmark-assets.json");
	mkdirSync(modelSnapshot, { recursive: true });
	mkdirSync(pythonPath, { recursive: true });
	writeFileSync(join(modelSnapshot, "config.json"), "{}\n");
	writeFileSync(join(modelSnapshot, "tokenizer.json"), "{}\n");
	writeFileSync(
		join(modelSnapshot, "model.safetensors.index.json"),
		`${JSON.stringify({ weight_map: { model: "model-00001-of-00001.safetensors" } })}\n`,
	);
	writeFileSync(join(modelSnapshot, "model-00001-of-00001.safetensors"), "fixture\n");

	writeFileSync(
		join(pythonPath, "huggingface_hub.py"),
		`import os

def snapshot_download(*, repo_id, revision, **_options):
    if repo_id != os.environ["MODEL_REPO_ID"]:
        raise RuntimeError(f"unexpected repository: {repo_id}")
    if revision != os.environ["MODEL_REVISION"]:
        raise RuntimeError(f"unexpected revision: {revision}")
    return os.environ["MODEL_SNAPSHOT"]
`,
	);
	const distribution = join(pythonPath, "hf_xet-1.5.2.dist-info");
	mkdirSync(distribution);
	writeFileSync(join(distribution, "METADATA"), "Name: hf-xet\nVersion: 1.5.2\n");

	const upstreamPath = join(root, "prepare-speed-bench.py");
	const upstream = `import argparse
import json
from pathlib import Path

class Dataset:
    def filter(self, predicate):
        if not predicate({"category": "coding"}):
            raise RuntimeError("the coding filter rejected a coding row")
        return self

def load_dataset(repo_id, config, split, revision=None):
    if repo_id != "nvidia/SPEED-Bench" or config != "qualitative" or split != "test":
        raise RuntimeError("unexpected dataset identity")
    if revision != "${modelAssetConfig().speedBench.dataset.revision}":
        raise RuntimeError(f"dataset was not pinned: {revision}")
    return Dataset()

def _resolve_external_data(dataset, _config):
    return dataset

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--output_dir", required=True)
    args = parser.parse_args()
    for config in [args.config]:
        dataset = load_dataset("nvidia/SPEED-Bench", config, split="test")
        dataset = _resolve_external_data(dataset, config)
        output = Path(args.output_dir)
        output.mkdir(parents=True, exist_ok=True)
        rows = [json.dumps({"category": "coding", "id": index}) for index in range(80)]
        (output / "qualitative.jsonl").write_text("\\n".join(rows) + "\\n", encoding="utf-8")

if __name__ == "__main__":
    main()
`;
	writeFileSync(upstreamPath, upstream);

	const assets = modelAssetConfig();
	const config = {
		...assets,
		model: { ...assets.model },
		speedBench: {
			...assets.speedBench,
			dataset: { ...assets.speedBench.dataset },
			prepare: {
				...assets.speedBench.prepare,
				url: pathToFileURL(upstreamPath).href,
				sha256: sha256(upstream),
			},
		},
		paths: {
			modelMount,
			modelCache: join(modelMount, "hub"),
			speedBench: datasetDirectory,
		},
	};
	const configPath = join(root, "assets.json");
	const writeConfig = () => writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
	writeConfig();

	const run = (mode: "download" | "check") => {
		const result = Bun.spawnSync(["python3", PREPARE_MODELS, mode, configPath], {
			env: {
				...process.env,
				PYTHONPATH: pythonPath,
				MODEL_REPO_ID: config.model.repoId,
				MODEL_REVISION: config.model.revision,
				MODEL_SNAPSHOT: modelSnapshot,
			},
			stdout: "pipe",
			stderr: "pipe",
		});
		return {
			exitCode: result.exitCode,
			stdout: result.stdout.toString(),
			stderr: result.stderr.toString(),
		};
	};

	return { config, datasetPath, manifestPath, run, writeConfig };
}

describe("GPU model asset preparation", () => {
	test("rejects mutable model revisions before resolving a snapshot", () => {
		const fixture = createPreparationFixture();
		fixture.config.model.revision = "main";
		fixture.writeConfig();

		const result = fixture.run("check");
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("must pin a 40-character Hugging Face commit SHA");
	});

	test("rejects tampered cached bytes and re-derives them in download mode", () => {
		const fixture = createPreparationFixture();
		const initial = fixture.run("download");
		expect(initial).toMatchObject({ exitCode: 0 });
		expect(initial.stdout).toContain('"disposition": "prepared"');
		const pristine = readFileSync(fixture.datasetPath, "utf8");
		const rows = pristine
			.trimEnd()
			.split("\n")
			.map((line) => JSON.parse(line));
		rows[0].prompt = "tampered but structurally valid";
		writeFileSync(fixture.datasetPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);

		const check = fixture.run("check");
		expect(check.exitCode).not.toBe(0);
		expect(check.stderr).toContain("does not match its recorded checksum");
		const repaired = fixture.run("download");
		expect(repaired).toMatchObject({ exitCode: 0 });
		expect(repaired.stdout).toContain('"disposition": "prepared"');
		expect(readFileSync(fixture.datasetPath, "utf8")).toBe(pristine);
		const manifest = JSON.parse(readFileSync(fixture.manifestPath, "utf8"));
		expect(manifest.speedBench.contentSha256).toBe(sha256(pristine));
	});

	test("rejects an unreadable manifest in check mode and replaces it in download mode", () => {
		const fixture = createPreparationFixture();
		expect(fixture.run("download")).toMatchObject({ exitCode: 0 });
		writeFileSync(fixture.manifestPath, Uint8Array.from([0xff, 0xfe, 0xfd]));

		const check = fixture.run("check");
		expect(check.exitCode).not.toBe(0);
		expect(check.stderr).toContain("does not come from the pinned inputs");
		const repaired = fixture.run("download");
		expect(repaired).toMatchObject({ exitCode: 0 });
		expect(repaired.stdout).toContain('"disposition": "prepared"');
		expect(() => JSON.parse(readFileSync(fixture.manifestPath, "utf8"))).not.toThrow();
	});
});
