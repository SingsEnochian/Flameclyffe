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
from .snapshot import (
    SnapshotBatch,
    SnapshotRecord,
    SnapshotSource,
    records_to_documents,
)
from .snapshot_io import (
    snapshot_batch_from_json,
    snapshot_batch_from_path,
    snapshot_batch_to_json,
)

__all__ = [
    "CanonDocument",
    "CanonRecordType",
    "ChunkConfig",
    "LexicalCodexIndex",
    "SearchQuery",
    "SearchResult",
    "SnapshotBatch",
    "SnapshotRecord",
    "SnapshotSource",
    "TextChunk",
    "chunk_document",
    "chunk_documents",
    "normalise_text",
    "records_to_documents",
    "snapshot_batch_from_json",
    "snapshot_batch_from_path",
    "snapshot_batch_to_json",
    "tokenise",
]
