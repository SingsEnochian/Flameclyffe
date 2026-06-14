"""Deterministic text chunking for Codex search records."""

from __future__ import annotations

import re

from flameclyffe_ml.provenance import content_hash

from .contracts import CanonDocument, ChunkConfig, TextChunk

_WHITESPACE_RE = re.compile(r"\s+")


def normalise_text(value: str) -> str:
    """Collapse whitespace while preserving readable prose order."""

    return _WHITESPACE_RE.sub(" ", value).strip()


def _preferred_boundary(text: str, start: int, end: int, minimum: int) -> int:
    search_start = min(len(text), start + minimum)
    candidates = [
        text.rfind(". ", search_start, end),
        text.rfind("! ", search_start, end),
        text.rfind("? ", search_start, end),
        text.rfind("; ", search_start, end),
        text.rfind(", ", search_start, end),
    ]
    boundary = max(candidates)
    if boundary <= start:
        return end
    return min(len(text), boundary + 1)


def chunk_document(
    document: CanonDocument,
    config: ChunkConfig | None = None,
) -> list[TextChunk]:
    """Split one document into stable TextChunk records."""

    chunk_config = config or ChunkConfig()
    text = normalise_text(document.body)
    chunks: list[TextChunk] = []

    if len(text) <= chunk_config.max_chars:
        chunk_texts = [text]
    else:
        chunk_texts = []
        start = 0
        previous_start = -1

        while start < len(text):
            hard_end = min(len(text), start + chunk_config.max_chars)
            if hard_end < len(text):
                end = _preferred_boundary(
                    text,
                    start,
                    hard_end,
                    chunk_config.min_chars,
                )
            else:
                end = hard_end

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunk_texts.append(chunk_text)

            if end >= len(text):
                break

            next_start = max(0, end - chunk_config.overlap_chars)
            if next_start <= previous_start:
                next_start = end
            previous_start = start
            start = next_start

    for index, chunk_text in enumerate(chunk_texts):
        chunk_id = content_hash(
            {
                "source_id": document.source_id,
                "chunk_index": index,
                "text": chunk_text,
            }
        )
        chunks.append(
            TextChunk(
                chunk_id=chunk_id,
                document_id=document.source_id,
                chunk_index=index,
                title=document.title,
                text=chunk_text,
                route=document.route,
                entity_type=document.entity_type,
                canon_status=document.canon_status,
                privacy_class=document.privacy_class,
                public=document.public,
                metadata=document.metadata,
            )
        )

    return chunks


def chunk_documents(
    documents: list[CanonDocument],
    config: ChunkConfig | None = None,
) -> list[TextChunk]:
    """Chunk several documents in input order."""

    chunks: list[TextChunk] = []
    for document in documents:
        chunks.extend(chunk_document(document, config=config))
    return chunks
