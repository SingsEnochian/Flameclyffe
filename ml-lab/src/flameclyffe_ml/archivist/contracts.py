"""Typed contracts for public-source retrieval and review-only canon proposals."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

ARCHIVIST_VERSION: Literal["1.0.0"] = "1.0.0"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class IngestProposalRequest(StrictModel):
    target_url: HttpUrl
    world_id: str = Field(min_length=1, max_length=120)
    source_authority: Literal[
        "official",
        "licensed-reference",
        "community-wiki",
        "secondary",
        "unknown",
    ] = "unknown"
    requested_by: str = Field(min_length=1, max_length=120)
    consent_receipt_id: str = Field(min_length=1, max_length=200)
    max_bytes: int = Field(default=1_500_000, ge=1_024, le=5_000_000)
    max_paragraphs: int = Field(default=500, ge=1, le=2_000)
    chunk_chars: int = Field(default=4_000, ge=256, le=16_000)


class SourceDocument(StrictModel):
    schema_version: Literal["1.0.0"] = ARCHIVIST_VERSION
    requested_url: str
    final_url: str
    retrieved_at: datetime
    status_code: int = Field(ge=100, le=599)
    content_type: str = Field(min_length=1, max_length=200)
    title: str | None = Field(default=None, max_length=500)
    text: str
    source_sha256: str = Field(min_length=64, max_length=64)
    text_sha256: str = Field(min_length=64, max_length=64)
    byte_count: int = Field(ge=0)
    paragraph_count: int = Field(ge=0)


class IngestChunk(StrictModel):
    chunk_index: int = Field(ge=0)
    text: str = Field(min_length=1)
    text_sha256: str = Field(min_length=64, max_length=64)
    char_count: int = Field(ge=1)


class ArchivistReceipt(StrictModel):
    schema_version: Literal["1.0.0"] = ARCHIVIST_VERSION
    receipt_id: str = Field(min_length=64, max_length=64)
    operation: Literal["public-source-ingest-proposal"] = "public-source-ingest-proposal"
    input_hash: str = Field(min_length=64, max_length=64)
    source_hash: str = Field(min_length=64, max_length=64)
    output_hash: str = Field(min_length=64, max_length=64)
    status: Literal["PENDING_REVIEW", "REJECTED"]
    claims: dict[str, Literal["VERIFIED", "FAILED", "NOT_YET_TESTED"]]


class CanonIngestProposal(StrictModel):
    schema: Literal["arcsweep.canon-ingest-proposal/v1"] = (
        "arcsweep.canon-ingest-proposal/v1"
    )
    proposal_id: str = Field(min_length=64, max_length=64)
    world_id: str
    requested_by: str
    consent_receipt_id: str
    source_authority: str
    review_state: Literal["pending"] = "pending"
    canon_authority: Literal[False] = False
    persistence_authority: Literal[False] = False
    source: SourceDocument
    chunks: tuple[IngestChunk, ...]
    measured_shore: dict[str, float | int | str | bool]
    experiential_shore: dict[str, str | bool]
    receipt: ArchivistReceipt


class ArchivistHealth(StrictModel):
    status: Literal["ok"] = "ok"
    service: Literal["hearthgate-archivist"] = "hearthgate-archivist"
    version: Literal["1.0.0"] = ARCHIVIST_VERSION
    persistent: Literal[False] = False
    canon_authority: Literal[False] = False
    network_enabled: bool
    authentication_required: Literal[True] = True
    review_required: Literal[True] = True
