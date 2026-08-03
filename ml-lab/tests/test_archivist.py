from __future__ import annotations

import asyncio
import hashlib
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from flameclyffe_ml.archivist import IngestProposalRequest, SourceDocument, build_ingest_proposal
from flameclyffe_ml.archivist.fetch import validate_public_https_url
from flameclyffe_ml.living_engine.api import app


FIXED_TIME = datetime(2026, 8, 3, 17, 0, tzinfo=timezone.utc)


def source_document() -> SourceDocument:
    raw = b"<p>First recorded paragraph.</p><p>Second recorded paragraph.</p>"
    text = "First recorded paragraph.\n\nSecond recorded paragraph."
    return SourceDocument(
        requested_url="https://example.org/canon",
        final_url="https://example.org/canon",
        retrieved_at=FIXED_TIME,
        status_code=200,
        content_type="text/html",
        title="Synthetic source",
        text=text,
        source_sha256=hashlib.sha256(raw).hexdigest(),
        text_sha256=hashlib.sha256(text.encode("utf-8")).hexdigest(),
        byte_count=len(raw),
        paragraph_count=2,
    )


def proposal_request() -> IngestProposalRequest:
    return IngestProposalRequest(
        target_url="https://example.org/canon",
        world_id="starsong",
        source_authority="community-wiki",
        requested_by="rowan",
        consent_receipt_id="consent-fixture-001",
        chunk_chars=256,
    )


def test_archivist_creates_deterministic_pending_proposal() -> None:
    first = build_ingest_proposal(proposal_request(), source_document())
    second = build_ingest_proposal(proposal_request(), source_document())

    assert first == second
    assert first.review_state == "pending"
    assert first.canon_authority is False
    assert first.persistence_authority is False
    assert first.receipt.status == "PENDING_REVIEW"
    assert first.receipt.claims["canon_write_absent"] == "VERIFIED"
    assert first.experiential_shore["status"] == "requires-human-annotation"
    assert first.chunks[0].text_sha256 == hashlib.sha256(
        first.chunks[0].text.encode("utf-8")
    ).hexdigest()


def test_archivist_rejects_private_literal_address() -> None:
    with pytest.raises(ValueError, match="not public"):
        asyncio.run(
            validate_public_https_url(
                "https://127.0.0.1/private",
                allowed_domains=frozenset({"127.0.0.1"}),
            )
        )


def test_archivist_rejects_non_https_source() -> None:
    with pytest.raises(ValueError, match="HTTPS"):
        asyncio.run(
            validate_public_https_url(
                "http://example.org/source",
                allowed_domains=frozenset({"example.org"}),
            )
        )


def test_archivist_endpoint_is_disabled_without_server_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HEARTHGATE_INGEST_TOKEN", raising=False)
    monkeypatch.setenv("HEARTHGATE_INGEST_ALLOWLIST", "example.org")
    client = TestClient(app)

    response = client.post(
        "/v1/archivist/propose",
        json=proposal_request().model_dump(mode="json"),
    )

    assert response.status_code == 503
    assert "disabled" in response.json()["detail"].lower()


def test_archivist_health_declares_no_authority(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HEARTHGATE_INGEST_TOKEN", raising=False)
    client = TestClient(app)

    response = client.get("/v1/archivist/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["canon_authority"] is False
    assert payload["persistent"] is False
    assert payload["review_required"] is True
