from __future__ import annotations

from flameclyffe_ml.codex_search import (
    CanonDocument,
    CanonRecordType,
    ChunkConfig,
    LexicalCodexIndex,
    SearchQuery,
    chunk_document,
    normalise_text,
    tokenise,
)
from flameclyffe_ml.privacy import PrivacyClass


def _document(
    source_id: str,
    title: str,
    body: str,
    *,
    entity_type: CanonRecordType = CanonRecordType.LORE,
    public: bool = True,
    privacy_class: PrivacyClass = PrivacyClass.PUBLIC,
    route: str | None = None,
) -> CanonDocument:
    return CanonDocument(
        source_id=source_id,
        title=title,
        body=body,
        entity_type=entity_type,
        canon_status="working",
        route=route,
        public=public,
        privacy_class=privacy_class,
    )


def test_normalise_text_and_tokenise() -> None:
    assert normalise_text("  The   waking\ncity answers. ") == (
        "The waking city answers."
    )
    assert tokenise("The waking-city answers, and the city listens.") == [
        "waking-city",
        "answers",
        "city",
        "listens",
    ]


def test_chunk_document_is_deterministic_and_stable() -> None:
    body = " ".join(
        [
            "The Templehouse listens through roots and gold-lit glass.",
            "The waking city answers with lantern signals.",
            "Falka records the response for later review.",
        ]
        * 12
    )
    document = _document(
        "loc-third-city",
        "Third City",
        body,
        entity_type=CanonRecordType.LOCATION,
        route="/locations/third-city",
    )
    config = ChunkConfig(max_chars=260, overlap_chars=40, min_chars=80)

    first = chunk_document(document, config=config)
    second = chunk_document(document, config=config)

    assert len(first) > 1
    assert [chunk.chunk_id for chunk in first] == [
        chunk.chunk_id for chunk in second
    ]
    assert first[0].document_id == "loc-third-city"
    assert first[0].route == "/locations/third-city"
    assert all(len(chunk.text) <= config.max_chars for chunk in first)


def test_public_search_excludes_private_records_by_default() -> None:
    public_doc = _document(
        "public-city",
        "Waking City",
        "The city is awake and returns a coherent lantern signal.",
        route="/locations/waking-city",
    )
    private_doc = _document(
        "private-note",
        "Private Continuity Note",
        "The private note mentions an awake city but must not enter public search.",
        public=False,
        privacy_class=PrivacyClass.PRIVATE,
    )
    index = LexicalCodexIndex.from_documents([public_doc, private_doc])

    results = index.search("awake city")

    assert [result.document_id for result in results] == ["public-city"]
    assert results[0].route == "/locations/waking-city"


def test_internal_search_allows_internal_but_not_private_records() -> None:
    internal_doc = _document(
        "internal-codex",
        "Internal Concordance Draft",
        "The concordance draft describes resonance gates.",
        public=False,
        privacy_class=PrivacyClass.INTERNAL,
    )
    private_doc = _document(
        "private-codex",
        "Private Concordance Draft",
        "The private draft describes resonance gates.",
        public=False,
        privacy_class=PrivacyClass.PRIVATE,
    )
    index = LexicalCodexIndex.from_documents([internal_doc, private_doc])

    results = index.search(
        SearchQuery(text="resonance gates", public_only=False)
    )

    assert [result.document_id for result in results] == ["internal-codex"]


def test_title_match_boosts_relevant_record() -> None:
    city = _document(
        "city",
        "Waking City",
        "Lanterns answer from the walls and roots.",
    )
    generic = _document(
        "generic",
        "Lantern Notes",
        "The waking city answers through a lantern pattern.",
    )
    index = LexicalCodexIndex.from_documents([generic, city])

    results = index.search("waking city")

    assert results[0].document_id == "city"
    assert "waking" in results[0].matched_terms
    assert results[0].score > 0


def test_unknown_query_returns_no_results() -> None:
    document = _document(
        "falka",
        "Falka Hearthlight",
        "Falka studies language, stonesinging, and city signals.",
        entity_type=CanonRecordType.CHARACTER,
    )
    index = LexicalCodexIndex.from_documents([document])

    assert index.search("banana comet unrelated") == []
