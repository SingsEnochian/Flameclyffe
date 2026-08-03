"""Authenticated review-only Archivist routes.

The endpoint never writes canon or mutates a shared runtime state. It returns a proposal
that Arcsweep's Canon Gate can accept, edit, reject or quarantine.
"""

from __future__ import annotations

import os
import secrets
from typing import Any

from fastapi import APIRouter, Header, HTTPException, status

from flameclyffe_ml.archivist import (
    ArchivistHealth,
    CanonIngestProposal,
    FetchPolicy,
    IngestProposalRequest,
    build_ingest_proposal,
    fetch_source_document,
    ingest_dependencies_available,
)

router = APIRouter(prefix="/v1/archivist", tags=["hearthgate-archivist"])


def _allowed_domains() -> frozenset[str]:
    raw = os.environ.get("HEARTHGATE_INGEST_ALLOWLIST", "")
    return frozenset(
        item.strip().lower().rstrip(".")
        for item in raw.split(",")
        if item.strip()
    )


def _require_ingest_token(provided: str | None) -> None:
    configured = os.environ.get("HEARTHGATE_INGEST_TOKEN")
    if configured is None or configured == "":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Archivist network ingestion is disabled until a server token is configured.",
        )
    if provided is None or not secrets.compare_digest(provided, configured):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Archivist ingest token.",
        )


@router.get("/health", response_model=ArchivistHealth)
async def archivist_health() -> ArchivistHealth:
    return ArchivistHealth(
        network_enabled=(
            ingest_dependencies_available()
            and bool(_allowed_domains())
            and bool(os.environ.get("HEARTHGATE_INGEST_TOKEN"))
        )
    )


@router.get("/contracts")
async def archivist_contracts() -> dict[str, Any]:
    return {
        "proposal_request": IngestProposalRequest.model_json_schema(),
        "proposal": CanonIngestProposal.model_json_schema(),
    }


@router.post(
    "/propose",
    response_model=CanonIngestProposal,
    status_code=status.HTTP_202_ACCEPTED,
)
async def propose_public_source_ingest(
    request: IngestProposalRequest,
    x_hearthgate_ingest_token: str | None = Header(default=None),
) -> CanonIngestProposal:
    _require_ingest_token(x_hearthgate_ingest_token)
    domains = _allowed_domains()
    if not domains:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Archivist domain allowlist is empty.",
        )

    policy = FetchPolicy(
        allowed_domains=domains,
        max_bytes=request.max_bytes,
        max_paragraphs=request.max_paragraphs,
    )
    try:
        document = await fetch_source_document(str(request.target_url), policy=policy)
        return build_ingest_proposal(request, document)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
