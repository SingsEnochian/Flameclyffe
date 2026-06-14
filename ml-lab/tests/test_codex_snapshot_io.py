from __future__ import annotations

import json

import pytest

from flameclyffe_ml.codex_search import (
    SnapshotBatch,
    SnapshotRecord,
    snapshot_batch_from_json,
    snapshot_batch_from_path,
    snapshot_batch_to_json,
)
from flameclyffe_ml.privacy import PrivacyClass


def _record_payload(source_id: str = "public-templehouse") -> dict[str, object]:
    return {
        "source_id": source_id,
        "title": "Templehouse",
        "body": "A living house of roots, glass, and gold-lit instruments.",
        "entity_type": "location",
        "canon_status": "working",
        "route": f"/locations/{source_id}",
        "privacy_class": PrivacyClass.PUBLIC,
        "public": True,
        "reviewed": True,
        "source": "manual_fixture",
    }


def test_snapshot_batch_from_json_accepts_batch_object() -> None:
    payload = {
        "snapshot_name": "terra-public-test",
        "records": [_record_payload()],
    }

    batch = snapshot_batch_from_json(json.dumps(payload))

    assert batch.snapshot_name == "terra-public-test"
    assert [record.source_id for record in batch.records] == ["public-templehouse"]
    assert batch.public_documents()[0].route == "/locations/public-templehouse"


def test_snapshot_batch_from_json_accepts_bare_record_list() -> None:
    batch = snapshot_batch_from_json(json.dumps([_record_payload("falka")]))

    assert batch.snapshot_name == "codex-search-snapshot"
    assert [record.source_id for record in batch.records] == ["falka"]


def test_snapshot_batch_from_json_rejects_invalid_root_shape() -> None:
    with pytest.raises(TypeError, match="object or an array"):
        snapshot_batch_from_json('"not a snapshot"')


def test_snapshot_batch_path_round_trip(tmp_path) -> None:  # type: ignore[no-untyped-def]
    batch = SnapshotBatch(
        snapshot_name="round-trip",
        records=[SnapshotRecord.model_validate(_record_payload())],
    )
    json_text = snapshot_batch_to_json(batch)
    path = tmp_path / "snapshot.json"
    path.write_text(json_text, encoding="utf-8")

    loaded = snapshot_batch_from_path(path)

    assert loaded.snapshot_name == "round-trip"
    assert loaded.snapshot_hash == batch.snapshot_hash
    assert loaded.public_documents()[0].source_id == "public-templehouse"


def test_snapshot_batch_to_json_includes_hash() -> None:
    batch = SnapshotBatch(records=[SnapshotRecord.model_validate(_record_payload())])

    payload = json.loads(snapshot_batch_to_json(batch))

    assert payload["snapshot_hash"] == batch.snapshot_hash
    assert payload["records"][0]["source_id"] == "public-templehouse"
