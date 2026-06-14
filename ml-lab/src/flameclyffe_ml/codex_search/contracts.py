"""Typed contracts for Codex search ingestion and review-safe retrieval."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from flameclyffe_ml.privacy import PrivacyClass
from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    """Reject unknown fields so search contracts fail loudly when they drift."""

    model_config = ConfigDict(extra="forbid")


class CanonRecordType(StrEnum):
    BOOK = "book"
    CHARACTER = "character"
    LOCATION = "location"
    ASSET = "asset"
    LORE = "lore"
    LANGUAGE = "language"
    SYSTEM = "system"
    TIMELINE = "timeline"


class CanonDocument(StrictModel):
    """A single reviewable source record prepared for search indexing."""

    source_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)
    entity_type: CanonRecordType = CanonRecordType.LORE
    canon_status: str = Field(default="working", min_length=1)
    route: str | None = None
    privacy_class: PrivacyClass = PrivacyClass.INTERNAL
    public: bool = False
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)

    @field_validator("title", "body", "canon_status")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("required text fields cannot be blank")
        return stripped

    @property
    def may_enter_public_index(self) -> bool:
        """Return whether this document may appear in a public search index."""

        return self.public and self.privacy_class is PrivacyClass.PUBLIC


class ChunkConfig(StrictModel):
    """Chunking parameters for document text."""

    max_chars: int = Field(default=850, ge=200, le=4_000)
    overlap_chars: int = Field(default=120, ge=0, le=1_000)
    min_chars: int = Field(default=80, ge=1, le=1_000)

    @field_validator("overlap_chars")
    @classmethod
    def overlap_must_be_smaller_than_max(
        cls,
        value: int,
        info: Any,
    ) -> int:
        max_chars = info.data.get("max_chars", 850)
        if value >= max_chars:
            raise ValueError("overlap_chars must be smaller than max_chars")
        return value


class TextChunk(StrictModel):
    """A stable searchable slice of a CanonDocument."""

    chunk_id: str = Field(min_length=64, max_length=64)
    document_id: str = Field(min_length=1)
    chunk_index: int = Field(ge=0)
    title: str = Field(min_length=1)
    text: str = Field(min_length=1)
    route: str | None = None
    entity_type: CanonRecordType
    canon_status: str
    privacy_class: PrivacyClass
    public: bool
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class SearchQuery(StrictModel):
    """A search request against the baseline Codex index."""

    text: str = Field(min_length=1)
    top_k: int = Field(default=8, ge=1, le=50)
    public_only: bool = True

    @field_validator("text")
    @classmethod
    def strip_query_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("query text cannot be blank")
        return stripped


class SearchResult(StrictModel):
    """A ranked search hit with enough source data for review."""

    document_id: str
    chunk_id: str
    title: str
    route: str | None
    entity_type: CanonRecordType
    canon_status: str
    score: float = Field(ge=0.0)
    snippet: str
    matched_terms: list[str]
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)
