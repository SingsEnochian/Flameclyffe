"""Review-only web archivist for Hearthgate and Arcsweep.

The archivist fetches approved public sources and produces immutable ingest proposals. It
has no canon authority and does not mutate Hearthgate, Arcsweep or Supabase state.
"""

from .contracts import (
    ARCHIVIST_VERSION,
    ArchivistHealth,
    CanonIngestProposal,
    IngestProposalRequest,
    SourceDocument,
)
from .fetch import FetchPolicy, fetch_source_document, ingest_dependencies_available
from .service import build_ingest_proposal

__all__ = [
    "ARCHIVIST_VERSION",
    "ArchivistHealth",
    "CanonIngestProposal",
    "FetchPolicy",
    "IngestProposalRequest",
    "SourceDocument",
    "build_ingest_proposal",
    "fetch_source_document",
    "ingest_dependencies_available",
]
