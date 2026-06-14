"""Pure-Python lexical baseline for Codex search."""

from __future__ import annotations

import math
import re
from collections import Counter
from collections.abc import Iterable

from flameclyffe_ml.privacy import PrivacyClass

from .chunking import chunk_documents, normalise_text
from .contracts import (
    CanonDocument,
    ChunkConfig,
    SearchQuery,
    SearchResult,
    TextChunk,
)

_TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9'_-]*")
_STOP_WORDS = frozenset(
    {
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "but",
        "by",
        "for",
        "from",
        "in",
        "into",
        "is",
        "it",
        "of",
        "on",
        "or",
        "the",
        "to",
        "with",
    }
)


def tokenise(value: str) -> list[str]:
    """Return lower-case lexical tokens with small stop words removed."""

    tokens = [match.group(0).lower() for match in _TOKEN_RE.finditer(value)]
    return [token for token in tokens if token not in _STOP_WORDS]


def _allowed_for_query(chunk: TextChunk, query: SearchQuery) -> bool:
    if query.public_only:
        return chunk.public and chunk.privacy_class is PrivacyClass.PUBLIC
    return chunk.privacy_class <= PrivacyClass.INTERNAL


def _snippet(text: str, terms: Iterable[str], *, window: int = 180) -> str:
    normalised = normalise_text(text)
    lowered = normalised.lower()

    first_index = -1
    for term in terms:
        index = lowered.find(term.lower())
        if index >= 0 and (first_index < 0 or index < first_index):
            first_index = index

    if first_index < 0:
        return normalised[:window].strip()

    start = max(0, first_index - (window // 3))
    end = min(len(normalised), start + window)
    snippet = normalised[start:end].strip()

    if start > 0:
        snippet = f"…{snippet}"
    if end < len(normalised):
        snippet = f"{snippet}…"

    return snippet


class LexicalCodexIndex:
    """A deterministic lexical search baseline for review and tests."""

    def __init__(self, chunks: list[TextChunk]) -> None:
        self.chunks = chunks
        self._chunk_tokens = [tokenise(chunk.text) for chunk in chunks]
        self._title_tokens = [tokenise(chunk.title) for chunk in chunks]
        self._document_frequency = self._build_document_frequency()

    @classmethod
    def from_documents(
        cls,
        documents: list[CanonDocument],
        *,
        chunk_config: ChunkConfig | None = None,
    ) -> LexicalCodexIndex:
        return cls(chunk_documents(documents, config=chunk_config))

    def _build_document_frequency(self) -> Counter[str]:
        frequency: Counter[str] = Counter()
        for tokens in self._chunk_tokens:
            frequency.update(set(tokens))
        return frequency

    def _idf(self, token: str) -> float:
        document_count = max(1, len(self.chunks))
        frequency = self._document_frequency.get(token, 0)
        return math.log((1 + document_count) / (1 + frequency)) + 1.0

    def search(self, query: SearchQuery | str) -> list[SearchResult]:
        request = query if isinstance(query, SearchQuery) else SearchQuery(text=query)
        query_tokens = tokenise(request.text)
        if not query_tokens:
            return []

        results: list[SearchResult] = []
        query_counts = Counter(query_tokens)

        for index, chunk in enumerate(self.chunks):
            if not _allowed_for_query(chunk, request):
                continue

            tokens = self._chunk_tokens[index]
            if not tokens:
                continue

            token_counts = Counter(tokens)
            title_tokens = set(self._title_tokens[index])
            searchable_terms = set(tokens) | title_tokens
            matched_terms = sorted(set(query_tokens) & searchable_terms)
            if not matched_terms:
                continue

            score = 0.0
            for token, query_count in query_counts.items():
                frequency = token_counts.get(token, 0)
                title_match = token in title_tokens
                if frequency <= 0 and not title_match:
                    continue

                term_score = 0.0
                if frequency > 0:
                    term_score += (frequency / len(tokens)) * self._idf(token)
                if title_match:
                    term_score += 0.35 * self._idf(token)

                score += term_score * (1.0 + math.log(query_count))

            if score <= 0:
                continue

            results.append(
                SearchResult(
                    document_id=chunk.document_id,
                    chunk_id=chunk.chunk_id,
                    title=chunk.title,
                    route=chunk.route,
                    entity_type=chunk.entity_type,
                    canon_status=chunk.canon_status,
                    score=round(score, 8),
                    snippet=_snippet(chunk.text, matched_terms),
                    matched_terms=matched_terms,
                    metadata=chunk.metadata,
                )
            )

        results.sort(
            key=lambda result: (-result.score, result.title, result.chunk_id)
        )
        return results[: request.top_k]
