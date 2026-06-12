"""Deterministic serialisation and provenance hashes for ML runs."""

from __future__ import annotations

import base64
import hashlib
import json
from collections.abc import Mapping, Sequence, Set
from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from enum import Enum
from pathlib import Path
from typing import Any


def _normalise(value: Any) -> Any:
    if is_dataclass(value) and not isinstance(value, type):
        return _normalise(asdict(value))

    if isinstance(value, Enum):
        return _normalise(value.value)

    if isinstance(value, Path):
        return str(value)

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, bytes):
        return {"__bytes_b64__": base64.b64encode(value).decode("ascii")}

    if isinstance(value, Mapping):
        return {str(key): _normalise(item) for key, item in sorted(value.items(), key=lambda pair: str(pair[0]))}

    if isinstance(value, Set) and not isinstance(value, (str, bytes, bytearray)):
        items = [_normalise(item) for item in value]
        return sorted(items, key=lambda item: json.dumps(item, sort_keys=True, ensure_ascii=False))

    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [_normalise(item) for item in value]

    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    raise TypeError(f"Unsupported value for canonical JSON: {type(value).__name__}")


def canonical_json(value: Any) -> str:
    """Return a stable UTF-8 JSON representation suitable for hashing."""

    return json.dumps(
        _normalise(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def content_hash(value: Any) -> str:
    """Return the SHA-256 hash of canonical JSON content."""

    payload = canonical_json(value).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def run_fingerprint(
    *,
    model_name: str,
    model_version: str,
    code_revision: str,
    input_snapshot_hash: str,
    parameters: Mapping[str, Any],
    seed: int | None,
) -> str:
    """Fingerprint the inputs that define a reproducible experimental run."""

    return content_hash(
        {
            "model_name": model_name,
            "model_version": model_version,
            "code_revision": code_revision,
            "input_snapshot_hash": input_snapshot_hash,
            "parameters": parameters,
            "seed": seed,
        }
    )
