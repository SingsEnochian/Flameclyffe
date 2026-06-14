from __future__ import annotations

import pytest
from pydantic import ValidationError

from flameclyffe_ml.codex_search import (
    CanonRecordType,
    SnapshotBatch,
    SnapshotRecord,
    SnapshotSource,
    records_to_documents,
)
from flameclyffe_ml.privacy import PrivacyClass


def _record(
    source_id: str,
    title: str,
    body: str,
    *,
    public: bool = True,
    reviewed: bool = True,
    privacy_class: PrivacyClass = PrivacyClass.PUBLIC,
) -> SnapshotRecord:
    return SnapshotRecord(
        source_id=source_id,
        title=title,
        body=body,
        entity_type=CanonRecordType.LORE,
        canon_status="working",
        route=f"/codex/{source_id}",
        privacy_class=privacy_class,
        public=public,
        reviewed=reviewed,
        source=SnapshotSource.MANUAL_FIXTURE,
    )


def test_public_snapshot_record_must_be_reviewed() -> None:
    with pytest.raises(ValidationError, match="must be reviewed"):
        _record(
            "unreviewed-public",
            "Unreviewed Public",
            "This record asks to be public before review.",
            reviewed=False,
        )


def test_public_snapshot_record_must_use_public_privacy_class() -> None:
    with pytest.raises(ValidationError, match="PrivacyClass.PUBLIC"):
        _record(
            "misclassified-public",
            "Misclassified Public",
            "This record asks to be public while remaining internal.",
            privacy_class=PrivacyClass.INTERNAL,
        )


def test_snapshot_batch_hash_is_deterministic() -> None:
    records = [
        _record("templehouse", "Templehouse", "A living house of roots and light."),
        _record("falka", "Falka", "A priestess and linguist of the waking city."),
    ]

    first = SnapshotBatch(records=records, snapshot_name="terra-test")
    second = SnapshotBatch(records=records, snapshot_name="terra-test")

    assert len(first.snapshot_hash) == 64
    assert first.snapshot_hash == second.snapshot_hash


def test_public_documents_include_only_reviewed_public_records() -> None:
    public_record = _record(
        "public-city",
        "Public City",
        "The city may enter the public search surface.",
    )
    internal_record = _record(
        "internal-city",
        "Internal City",
        "The city is reviewed but not public.",
        public=False,
        privacy_class=PrivacyClass.INTERNAL,
    )
    batch = SnapshotBatch(records=[public_record, internal_record])

    documents = batch.public_documents()

    assert [document.source_id for document in documents] == ["public-city"]
    assert documents[0].may_enter_public_index is True
    assert documents[0].metadata["snapshot_source"] == "manual_fixture"
    assert documents[0].metadata["reviewed"] is True


def test_internal_documents_exclude_private_and_restricted_records() -> None:
    public_record = _record("public", "Public", "Public search material.")
    internal_record = _record(
        "internal",
        "Internal",
        "Internal review material.",
        public=False,
        privacy_class=PrivacyClass.INTERNAL,
    )
    private_record = _record(
        "private",
        "Private",
        "Private material must not enter shared internal search.",
        public=False,
        privacy_class=PrivacyClass.PRIVATE,
    )
    restricted_record = _record(
        "restricted",
        "Restricted",
        "Restricted material must stay outside the adapter output.",
        public=False,
        privacy_class=PrivacyClass.RESTRICTED,
    )
    batch = SnapshotBatch(
        records=[public_record, internal_record, private_record, restricted_record]
    )

    documents = batch.internal_documents()

    assert [document.source_id for document in documents] == ["public", "internal"]


def test_records_to_documents_defaults_to_public_surface() -> None:
    public_record = _record("public", "Public", "Public search material.")
    internal_record = _record(
        "internal",
        "Internal",
        "Internal review material.",
        public=False,
        privacy_class=PrivacyClass.INTERNAL,
    )

    public_documents = records_to_documents([public_record, internal_record])
    internal_documents = records_to_documents(
        [public_record, internal_record],
        public_only=False,
    )

    assert [document.source_id for document in public_documents] == ["public"]
    assert [document.source_id for document in internal_documents] == [
        "public",
        "internal",
    ]
