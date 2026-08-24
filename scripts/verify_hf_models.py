#!/usr/bin/env python3
"""Verify that registered Hugging Face model snapshots include their modules.

This performs manifest and offline configuration/tokenizer checks. It does not
download models and does not execute unreviewed remote code.
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
from pathlib import Path
from typing import Any


def load_registry(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        data = json.loads(text)
    else:
        try:
            import yaml  # type: ignore
        except ImportError as exc:
            raise SystemExit("PyYAML is required for YAML registries.") from exc
        data = yaml.safe_load(text)
    return data["models"] if isinstance(data, dict) else data


def verify_entry(entry: dict[str, Any], cache_root: Path) -> list[str]:
    errors: list[str] = []
    model_id = entry["id"]
    revision = entry.get("revision")
    if not revision or revision in {"main", "master"}:
        errors.append(f"{model_id}: revision must be an immutable commit SHA")

    for module in entry.get("required_modules", []):
        try:
            importlib.import_module(module)
        except Exception as exc:
            errors.append(f"{model_id}: cannot import {module}: {exc}")

    snapshot = Path(entry.get("local_path", ""))
    if not snapshot:
        slug = model_id.replace("/", "--")
        snapshot = cache_root / f"models--{slug}" / "snapshots" / str(revision)

    if not snapshot.exists():
        errors.append(f"{model_id}: snapshot missing: {snapshot}")
        return errors

    for rel in entry.get("required_files", []):
        target = snapshot / rel
        if not target.is_file() or target.stat().st_size == 0:
            errors.append(f"{model_id}: missing or empty file: {rel}")

    trust = bool(entry.get("trust_remote_code", False))
    try:
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        from transformers import AutoConfig, AutoTokenizer

        AutoConfig.from_pretrained(
            snapshot, local_files_only=True, trust_remote_code=trust
        )
        AutoTokenizer.from_pretrained(
            snapshot, local_files_only=True, trust_remote_code=trust
        )
    except Exception as exc:
        errors.append(f"{model_id}: offline config/tokenizer load failed: {exc}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("registry", type=Path)
    parser.add_argument(
        "--cache-root",
        type=Path,
        default=Path.home() / ".cache" / "huggingface" / "hub",
    )
    args = parser.parse_args()

    failures: list[str] = []
    for entry in load_registry(args.registry):
        failures.extend(verify_entry(entry, args.cache_root))

    if failures:
        print("MODEL BUILD GATE FAILED")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print("MODEL BUILD GATE PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
