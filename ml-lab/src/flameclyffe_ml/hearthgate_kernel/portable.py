"""Cross-runtime canonical JSON and SHA-256 for Hearthgate packet transport."""

from __future__ import annotations

import hashlib
import json
import math
from collections.abc import Mapping, Sequence
from enum import Enum
from typing import Any

PORTABLE_HASH_ALGORITHM = "hearthgate-tagged-json-sha256-v1"


def _portable_number(value: int | float) -> str:
    if isinstance(value, bool):
        raise TypeError("Boolean values must not enter portable number normalisation.")
    if isinstance(value, int):
        return str(value)
    if not math.isfinite(value):
        raise ValueError("Portable Hearthgate JSON does not permit NaN or infinity.")
    if value == 0:
        return "0"
    fixed = format(value, ".12f").rstrip("0").rstrip(".")
    return fixed or "0"


def _portable_tree(value: Any) -> list[Any]:
    """Encode JSON-compatible data as an unambiguous tagged tree.

    Numbers become decimal strings inside a `number` tag. This removes the Python
    `1.0` versus JavaScript `1` serialisation difference while preserving number/string
    distinction. Object keys are sorted before encoding.
    """

    if isinstance(value, Enum):
        return _portable_tree(value.value)
    if value is None:
        return ["null"]
    if isinstance(value, bool):
        return ["boolean", value]
    if isinstance(value, (int, float)):
        return ["number", _portable_number(value)]
    if isinstance(value, str):
        return ["string", value]
    if isinstance(value, Mapping):
        return [
            "object",
            [
                [str(key), _portable_tree(item)]
                for key, item in sorted(value.items(), key=lambda pair: str(pair[0]))
            ],
        ]
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return ["array", [_portable_tree(item) for item in value]]
    raise TypeError(f"Unsupported portable Hearthgate value: {type(value).__name__}")


def portable_json(value: Any) -> str:
    """Return tagged canonical JSON reproducible in Python and JavaScript."""

    return json.dumps(
        _portable_tree(value),
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    )


def portable_hash(value: Any) -> str:
    """Return SHA-256 over the tagged cross-runtime canonical JSON."""

    return hashlib.sha256(portable_json(value).encode("utf-8")).hexdigest()


def portable_packet_hash(packet: Any) -> str:
    """Hash a Pydantic packet or JSON mapping without its receipt envelope."""

    if hasattr(packet, "model_dump"):
        body = packet.model_dump(mode="json", exclude={"receipts"})
    elif isinstance(packet, Mapping):
        body = {key: value for key, value in packet.items() if key != "receipts"}
    else:
        raise TypeError("portable_packet_hash requires a packet model or mapping")
    return portable_hash(body)
