"""Review-safe Codex search contracts and lexical baseline."""

from .chunking import chunk_document, chunk_documents, normalise_text
from .contracts import (
    CanonDocument,
    CanonRecordType,
    ChunkConfig,
    SearchQuery,
    SearchResult,
    TextChunk,
)
from .lexical import LexicalCodexIndex, tokenise

__all__ = [
    "CanonDocument",
    "CanonRecordType",
    "ChunkConfig",
    "LexicalCodexIndex",
    "SearchQuery",
    "SearchResult",
    "TextChunk",
    "chunk_document",
    "chunk_documents",
    "normalise_text",
    "tokenise",
]
