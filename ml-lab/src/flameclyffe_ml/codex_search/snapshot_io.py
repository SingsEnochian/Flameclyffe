"""JSON input/output helpers for reviewed Codex snapshots.

These helpers operate on local strings or paths only. They do not fetch remote sources,
call Notion, call Supabase, or write indexes.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import TypeAdapter

from .snapshot import SnapshotBatch, SnapshotRecord

_RECORD_LIST_ADAPTER = TypeAdapter(list[SnapshotRecord])


def snapshot_batch_from_json(value: str) -> SnapshotBatch:
    """Parse a SnapshotBatch from a JSON string.

    Accepted shapes:
    - a batch object with a `records` array;
    - a bare list of record objects, wrapped into the default SnapshotBatch.

    Exported `snapshot_hash` values are ignored on import and recomputed from
    canonical batch content.
    """

    payload = json.loads(value)

    if isinstance(payload, list):
        return SnapshotBatch(records=_RECORD_LIST_ADAPTER.validate_python(payload))

    if isinstance(payload, dict):
        batch_payload = dict(payload)
        batch_payload.pop("snapshot_hash", None)
        return SnapshotBatch.model_validate(batch_payload)

    raise TypeError("Snapshot JSON must be an object or an array of records.")


def snapshot_batch_from_path(path: Path | str) -> SnapshotBatch:
    """Load a SnapshotBatch from a local JSON file path."""

    return snapshot_batch_from_json(Path(path).read_text(encoding="utf-8"))


def snapshot_batch_to_json(batch: SnapshotBatch, *, indent: int = 2) -> str:
    """Serialise a SnapshotBatch into stable JSON."""

    payload: dict[str, Any] = batch.model_dump(mode="json")
    payload["snapshot_hash"] = batch.snapshot_hash
    return json.dumps(
        payload,
        ensure_ascii=False,
        indent=indent,
        sort_keys=True,
    )
