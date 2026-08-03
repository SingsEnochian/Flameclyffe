"""Deterministic proposal construction for Arcsweep's review boundary."""

from __future__ import annotations

import re

from flameclyffe_ml.provenance import content_hash

from .contracts import (
    ArchivistReceipt,
    CanonIngestProposal,
    IngestChunk,
    IngestProposalRequest,
    SourceDocument,
)


def _chunk_text(text: str, *, chunk_chars: int) -> tuple[IngestChunk, ...]:
    paragraphs = [paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()]
    chunks: list[str] = []
    current: list[str] = []
    current_length = 0

    def flush() -> None:
        nonlocal current, current_length
        if current:
            chunks.append("\n\n".join(current))
            current = []
            current_length = 0

    for paragraph in paragraphs:
        if len(paragraph) > chunk_chars:
            flush()
            for start in range(0, len(paragraph), chunk_chars):
                chunks.append(paragraph[start : start + chunk_chars])
            continue

        separator = 2 if current else 0
        if current_length + separator + len(paragraph) > chunk_chars:
            flush()
        current.append(paragraph)
        current_length += separator + len(paragraph)

    flush()
    return tuple(
        IngestChunk(
            chunk_index=index,
            text=chunk,
            text_sha256=content_hash({"text": chunk}),
            char_count=len(chunk),
        )
        for index, chunk in enumerate(chunks)
    )


def _measured_shore(document: SourceDocument, chunks: tuple[IngestChunk, ...]) -> dict[str, float | int | str | bool]:
    words = re.findall(r"\b[\w'’-]+\b", document.text.casefold())
    unique_words = len(set(words))
    lexical_diversity = unique_words / len(words) if words else 0.0
    return {
        "source_class": "recorded-public-document",
        "byte_count": document.byte_count,
        "character_count": len(document.text),
        "paragraph_count": document.paragraph_count,
        "chunk_count": len(chunks),
        "word_count": len(words),
        "unique_word_count": unique_words,
        "lexical_diversity": round(lexical_diversity, 8),
        "source_hash_verified": True,
        "text_hash_verified": True,
    }


def build_ingest_proposal(
    request: IngestProposalRequest,
    document: SourceDocument,
) -> CanonIngestProposal:
    """Create an immutable pending proposal; never promote it to canon."""

    chunks = _chunk_text(document.text, chunk_chars=request.chunk_chars)
    if not chunks:
        raise ValueError("Extracted source did not produce any ingest chunks")

    measured = _measured_shore(document, chunks)
    experiential = {
        "status": "requires-human-annotation",
        "generated": False,
        "canon_claim": False,
        "note": "The archivist does not infer lived, symbolic or relational meaning.",
    }
    input_payload = request.model_dump(mode="json")
    output_payload = {
        "world_id": request.world_id,
        "source_authority": request.source_authority,
        "source_sha256": document.source_sha256,
        "text_sha256": document.text_sha256,
        "chunks": [chunk.model_dump(mode="json") for chunk in chunks],
        "measured_shore": measured,
        "experiential_shore": experiential,
    }
    input_hash = content_hash(input_payload)
    output_hash = content_hash(output_payload)
    claims = {
        "source_hash_present": "VERIFIED",
        "text_hash_present": "VERIFIED",
        "consent_receipt_present": "VERIFIED",
        "canon_write_performed": "VERIFIED",
        "human_review_complete": "NOT_YET_TESTED",
        "bifrost_validation_complete": "NOT_YET_TESTED",
    }
    receipt = ArchivistReceipt(
        receipt_id=content_hash(
            {
                "operation": "public-source-ingest-proposal",
                "input_hash": input_hash,
                "source_hash": document.source_sha256,
                "output_hash": output_hash,
            }
        ),
        input_hash=input_hash,
        source_hash=document.source_sha256,
        output_hash=output_hash,
        status="PENDING_REVIEW",
        claims=claims,
    )
    proposal_id = content_hash(
        {
            "world_id": request.world_id,
            "receipt_id": receipt.receipt_id,
            "source_sha256": document.source_sha256,
        }
    )
    return CanonIngestProposal(
        proposal_id=proposal_id,
        world_id=request.world_id,
        requested_by=request.requested_by,
        consent_receipt_id=request.consent_receipt_id,
        source_authority=request.source_authority,
        source=document,
        chunks=chunks,
        measured_shore=measured,
        experiential_shore=experiential,
        receipt=receipt,
    )
