"""Small lexical Codex search benchmark helpers.

The ML lab keeps this module deterministic and dependency-light. It is not a
semantic model. It is a baseline switchboard for comparing later embedding and
neural search experiments against a transparent lexical floor.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Iterable

from pydantic import BaseModel, Field

_TOKEN_RE = re.compile(r"[a-z0-9]+")


class CodexDocument(BaseModel):
    """A reviewable public document snapshot used by Codex search tests."""

    document_id: str
    title: str
    body: str
    privacy: str = "public"

    @property
    def searchable_text(self) -> str:
        return f"{self.title} {self.body}"


class CodexSnapshotBatch(BaseModel):
    """A deterministic batch of Codex documents."""

    documents: list[CodexDocument] = Field(default_factory=list)

    def public_documents(self) -> list[CodexDocument]:
        return [document for document in self.documents if document.privacy == "public"]


class QueryJudgement(BaseModel):
    """Expected relevant documents for a benchmark query."""

    query: str
    relevant_document_ids: list[str]
    top_k: int = 3


class SearchResult(BaseModel):
    query: str
    relevant_document_ids: list[str]
    retrieved_document_ids: list[str]
    precision_at_k: float
    recall_at_k: float
    reciprocal_rank: float


class SearchEvaluationSummary(BaseModel):
    query_count: int
    mean_precision_at_k: float
    mean_recall_at_k: float
    mean_reciprocal_rank: float
    results: list[SearchResult]


class LexicalCodexIndex:
    """Tiny TF-IDF-like lexical index for public, deterministic baselines."""

    def __init__(self, documents: Iterable[CodexDocument]) -> None:
        self.documents = list(documents)
        self._term_counts = {
            document.document_id: Counter(_tokenize(document.searchable_text))
            for document in self.documents
        }
        self._idf = _inverse_document_frequency(self._term_counts.values())

    @classmethod
    def from_documents(cls, documents: Iterable[CodexDocument]) -> "LexicalCodexIndex":
        return cls(documents)

    def search(self, query: str, top_k: int = 3) -> list[str]:
        query_terms = Counter(_tokenize(query))
        if not query_terms or top_k <= 0:
            return []

        scored: list[tuple[float, str]] = []
        for document in self.documents:
            document_terms = self._term_counts[document.document_id]
            score = _score_terms(query_terms, document_terms, self._idf)
            if score > 0:
                scored.append((score, document.document_id))

        scored.sort(key=lambda item: (-item[0], item[1]))
        return [document_id for _, document_id in scored[:top_k]]


def snapshot_batch_from_path(path: Path | str) -> CodexSnapshotBatch:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    return CodexSnapshotBatch.model_validate(payload)


def evaluate_search(index: LexicalCodexIndex, judgements: Iterable[QueryJudgement]) -> SearchEvaluationSummary:
    results: list[SearchResult] = []

    for judgement in judgements:
        retrieved = index.search(judgement.query, top_k=judgement.top_k)
        relevant = set(judgement.relevant_document_ids)
        hits = [document_id for document_id in retrieved if document_id in relevant]
        reciprocal_rank = 0.0

        for rank, document_id in enumerate(retrieved, start=1):
            if document_id in relevant:
                reciprocal_rank = 1.0 / rank
                break

        precision_denominator = max(judgement.top_k, 1)
        recall_denominator = max(len(relevant), 1)
        results.append(
            SearchResult(
                query=judgement.query,
                relevant_document_ids=judgement.relevant_document_ids,
                retrieved_document_ids=retrieved,
                precision_at_k=len(hits) / precision_denominator,
                recall_at_k=len(hits) / recall_denominator,
                reciprocal_rank=reciprocal_rank,
            )
        )

    if not results:
        return SearchEvaluationSummary(
            query_count=0,
            mean_precision_at_k=0.0,
            mean_recall_at_k=0.0,
            mean_reciprocal_rank=0.0,
            results=[],
        )

    query_count = len(results)
    return SearchEvaluationSummary(
        query_count=query_count,
        mean_precision_at_k=sum(result.precision_at_k for result in results) / query_count,
        mean_recall_at_k=sum(result.recall_at_k for result in results) / query_count,
        mean_reciprocal_rank=sum(result.reciprocal_rank for result in results) / query_count,
        results=results,
    )


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _inverse_document_frequency(term_counts: Iterable[Counter[str]]) -> dict[str, float]:
    documents = list(term_counts)
    document_count = max(len(documents), 1)
    document_frequency: Counter[str] = Counter()

    for counts in documents:
        document_frequency.update(counts.keys())

    return {
        term: math.log((1 + document_count) / (1 + frequency)) + 1
        for term, frequency in document_frequency.items()
    }


def _score_terms(
    query_terms: Counter[str], document_terms: Counter[str], inverse_document_frequency: dict[str, float]
) -> float:
    return sum(
        query_count * document_terms.get(term, 0) * inverse_document_frequency.get(term, 1.0)
        for term, query_count in query_terms.items()
    )
