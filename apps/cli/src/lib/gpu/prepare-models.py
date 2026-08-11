#!/opt/vllm/bin/python
"""Populate or validate the immutable inputs mounted by GPU benchmark sandboxes."""

import argparse
import hashlib
import importlib.metadata
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

from huggingface_hub import snapshot_download


parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=("download", "check"))
parser.add_argument("config", type=Path)
args = parser.parse_args()
config = json.loads(args.config.read_text())

model = config["model"]
speed_bench = config["speedBench"]
cache_dir = config["paths"]["modelCache"]
dataset_dir = Path(config["paths"]["speedBench"])
dataset_file = dataset_dir / "qualitative.jsonl"
manifest_file = Path(config["paths"]["modelMount"]) / "benchmark-assets.json"
category_filter = '        dataset = dataset.filter(lambda example: example["category"] == "coding")\n'

try:
    xet_version = importlib.metadata.version("hf-xet")
except importlib.metadata.PackageNotFoundError as error:
    raise RuntimeError("hf-xet is required for high-performance model downloads") from error


def resolve_model():
    options = {
        "repo_id": model["repoId"],
        "revision": model["revision"],
        "cache_dir": cache_dir,
    }
    try:
        path = snapshot_download(**options, local_files_only=True)
        validate_model_snapshot(path)
        disposition = "cached"
    except Exception as cache_error:
        if args.mode == "check":
            raise RuntimeError(
                f"model snapshot is absent or incomplete: {model['repoId']}@{model['revision']}"
            ) from cache_error
        print(f"Downloading {model['repoId']}@{model['revision']}", flush=True)
        snapshot_download(**options, max_workers=4)
        path = snapshot_download(**options, local_files_only=True)
        validate_model_snapshot(path)
        disposition = "downloaded"
    resolved = {**model, "path": path, "disposition": disposition}
    print(json.dumps(resolved, sort_keys=True), flush=True)
    return resolved


def validate_model_snapshot(snapshot):
    root = Path(snapshot)
    for relative in ("config.json", "tokenizer.json", "model.safetensors.index.json"):
        file = root / relative
        if not file.is_file() or file.stat().st_size == 0:
            raise RuntimeError(f"model snapshot is missing {relative}: {file}")
    try:
        index = json.loads((root / "model.safetensors.index.json").read_text())
    except json.JSONDecodeError as error:
        raise RuntimeError("model safetensors index is invalid JSON") from error
    weight_map = index.get("weight_map")
    if not isinstance(weight_map, dict) or not weight_map:
        raise RuntimeError("model safetensors index has no weight_map")
    shards = set(weight_map.values())
    if not all(isinstance(shard, str) and shard for shard in shards):
        raise RuntimeError("model safetensors index contains an invalid shard path")
    for shard in shards:
        relative = Path(shard)
        if relative.is_absolute() or ".." in relative.parts:
            raise RuntimeError(f"model safetensors index contains an unsafe shard path: {shard}")
        file = root / relative
        if not file.is_file() or file.stat().st_size == 0:
            raise RuntimeError(f"model snapshot is missing weight shard: {file}")


def validate_dataset():
    if not dataset_file.is_file() or dataset_file.stat().st_size == 0:
        raise RuntimeError(f"prepared SPEED-Bench dataset is absent: {dataset_file}")
    rows = []
    with dataset_file.open() as stream:
        for line_number, line in enumerate(stream, start=1):
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as error:
                raise RuntimeError(f"invalid SPEED-Bench JSONL at line {line_number}") from error
    coding_samples = sum(row.get("category") == "coding" for row in rows)
    expected = speed_bench["codingSamples"]
    if coding_samples != expected or len(rows) != expected:
        raise RuntimeError(
            f"prepared SPEED-Bench dataset has {coding_samples} coding / {len(rows)} total "
            f"samples; expected {expected} / {expected}"
        )
    return coding_samples


def prepare_dataset():
    try:
        return validate_dataset(), "cached"
    except RuntimeError:
        if args.mode == "check":
            raise

    dataset_dir.mkdir(parents=True, exist_ok=True)
    dataset_file.unlink(missing_ok=True)
    prepare = speed_bench["prepare"]
    script = Path("/tmp/prepare-speed-bench.py")
    print("Preparing revision-pinned SPEED-Bench coding data", flush=True)
    with urllib.request.urlopen(prepare["url"], timeout=60) as response:
        payload = response.read()
    actual_sha256 = hashlib.sha256(payload).hexdigest()
    if actual_sha256 != prepare["sha256"]:
        raise RuntimeError(f"SPEED-Bench prepare.py checksum mismatch: {actual_sha256}")
    source = payload.decode()
    anchor = "        dataset = _resolve_external_data(dataset, config)\n"
    if source.count(anchor) != 1:
        raise RuntimeError("SPEED-Bench prepare.py filter insertion anchor changed")
    script.write_text(source.replace(anchor, category_filter + anchor))
    subprocess.run(
        [
            sys.executable,
            str(script),
            "--config",
            "qualitative",
            "--output_dir",
            str(dataset_dir),
        ],
        check=True,
    )
    return validate_dataset(), "prepared"


resolved_model = resolve_model()
coding_samples, dataset_disposition = prepare_dataset()
dataset_sha256 = hashlib.sha256(dataset_file.read_bytes()).hexdigest()
manifest = {
    "schemaVersion": "1.0",
    "models": [model],
    "speedBench": {
        "category": "coding",
        "config": "qualitative",
        "contentSha256": dataset_sha256,
        "datasetPath": str(dataset_file),
        "prepare": speed_bench["prepare"],
        "prepareTransform": category_filter.strip(),
    },
}
if args.mode == "download":
    encoded = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    if not manifest_file.exists() or manifest_file.read_text() != encoded:
        temporary = manifest_file.with_suffix(".tmp")
        temporary.write_text(encoded)
        temporary.replace(manifest_file)
elif not manifest_file.exists() or json.loads(manifest_file.read_text()) != manifest:
    raise RuntimeError("benchmark asset manifest is absent or does not match the pinned inputs")

print(
    "MODEL_CACHE_SUMMARY="
    + json.dumps(
        {
            "mode": args.mode,
            "cacheDir": cache_dir,
            "hfXetVersion": xet_version,
            "models": [resolved_model],
            "speedBench": {
                "codingSamples": coding_samples,
                "contentSha256": dataset_sha256,
                "disposition": dataset_disposition,
                "path": str(dataset_file),
            },
        },
        sort_keys=True,
    ),
    flush=True,
)
