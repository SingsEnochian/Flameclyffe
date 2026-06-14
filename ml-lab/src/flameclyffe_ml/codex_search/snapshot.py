"""Review-safe snapshot adapter for Codex search ingestion.

This module converts explicit, reviewed snapshot records into CanonDocument objects.
It does not fetch Notion, call Supabase, or write any persistent index.
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from flameclyffe_ml.privacy import PrivacyClass
from flameclyffe_ml.provenance import content_hash

from .contracts import CanonDocument, CanonRecordType


class SnapshotSource(StrEnum):
    """Declared origin of a reviewed snapshot record."""

    NOTION_EXPORT = "notion_export"
    MANUAL_FIXTURE = "manual_fixture"
    SUPABASE_EXPORT = "supabase_export"
    STATIC_CANON = "static_canon"


class SnapshotRecord(BaseModel):
    """A single reviewed search-source record from an offline snapshot."""

    model_config = ConfigDict(extra="forbid")

    source_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)
    entity_type: CanonRecordType = CanonRecordType.LORE
    canon_status: str = Field(default="working", min_length=1)
    route: str | None = None
    privacy_class: PrivacyClass = PrivacyClass.INTERNAL
    public: bool = False
    reviewed: bool = False
    source: SnapshotSource = SnapshotSource.MANUAL_FIXTURE
    source_updated_at: datetime | date | None = None
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)

    @field_validator("source_id", "title", "body", "canon_status")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("snapshot text fields cannot be blank")
        return stripped

    @model_validator(mode="after")
    def public_records_must_be_reviewed_and_public(self) -> "SnapshotRecord":
        if self.public and self.privacy_class is not PrivacyClass.PUBLIC:
            raise ValueError(
                "public snapshot records must use PrivacyClass.PUBLIC"
            )
        if self.public and not self.reviewed:
            raise ValueError("public snapshot records must be reviewed")
        return self

    def to_document(self) -> CanonDocument:
        """Convert a reviewed snapshot record into a CanonDocument."""

        return CanonDocument(
            source_id=self.source_id,
            title=self.title,
            body=self.body,
            entity_type=self.entity_type,
            canon_status=self.canon_status,
            route=self.route,
            privacy_class=self.privacy_class,
            public=self.public,
            metadata={
                **self.metadata,
                "snapshot_source": self.source.value,
                "reviewed": self.reviewed,
            },
        )


class SnapshotBatch(BaseModel):
    """A deterministic batch of reviewed snapshot records."""

    model_config = ConfigDict(extra="forbid")

    records: list[SnapshotRecord]
    snapshot_name: str = Field(default="codex-search-snapshot", min_length=1)
    created_at: datetime | date | None = None

    @field_validator("snapshot_name")
    @classmethod
    def strip_snapshot_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("snapshot_name cannot be blank")
        return stripped

    @property
    def snapshot_hash(self) -> str:
        """Hash the ordered snapshot payload for provenance."""

        return content_hash(
            {
                "snapshot_name": self.snapshot_name,
                "created_at": self.created_at,
                "records": [
                    record.model_dump(mode="json") for record in self.records
                ],
            }
        )

    def public_documents(self) -> list[CanonDocument]:
        """Return documents permitted for the public search surface."""

        return [
            record.to_document()
            for record in self.records
            if record.public and record.privacy_class is PrivacyClass.PUBLIC
        ]

    def internal_documents(self) -> list[CanonDocument]:
        """Return public and internal documents, excluding private/restricted records."""

        return [
            record.to_document()
            for record in self.records
            if record.privacy_class <= PrivacyClass.INTERNAL
        ]


def records_to_documents(
    records: Iterable[SnapshotRecord],
    *,
    public_only: bool = True,
) -> list[CanonDocument]:
    """Convert snapshot records into search documents with privacy filtering."""

    batch = SnapshotBatch(records=list(records))
    return batch.public_documents() if public_only else batch.internal_documents()
