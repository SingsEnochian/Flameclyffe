"""Deterministic metrics for Codex search baseline evaluation."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .contracts import SearchQuery
from .lexical import LexicalCodexIndex


class StrictModel(BaseModel):
    """Reject unknown fields so metric fixtures fail loudly."""

    model_config = ConfigDict(extra="forbid")


class QueryJudgement(StrictModel):
    """Expected relevant documents for one search query."""

    query: str = Field(min_length=1)
    relevant_document_ids: list[str] = Field(min_length=1)
    public_only: bool = True
    top_k: int = Field(default=5, ge=1, le=50)

    @field_validator("query")
    @classmethod
    def strip_query(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("query cannot be blank")
        return stripped


class QueryMetricResult(StrictModel):
    """Metric result for one judged query."""

    query: str
    retrieved_document_ids: list[str]
    relevant_document_ids: list[str]
    precision_at_k: float = Field(ge=0.0, le=1.0)
    recall_at_k: float = Field(ge=0.0, le=1.0)
    reciprocal_rank: float = Field(ge=0.0, le=1.0)


class SearchMetricSummary(StrictModel):
    """Aggregate search-baseline evaluation summary."""

    query_count: int = Field(ge=0)
    mean_precision_at_k: float = Field(ge=0.0, le=1.0)
    mean_recall_at_k: float = Field(ge=0.0, le=1.0)
    mean_reciprocal_rank: float = Field(ge=0.0, le=1.0)
    results: list[QueryMetricResult]


def _precision_at_k(retrieved: list[str], relevant: set[str], top_k: int) -> float:
    if top_k <= 0:
        return 0.0
    hits = sum(1 for document_id in retrieved[:top_k] if document_id in relevant)
    return hits / top_k


def _recall_at_k(retrieved: list[str], relevant: set[str], top_k: int) -> float:
    if not relevant:
        return 0.0
    hits = sum(1 for document_id in retrieved[:top_k] if document_id in relevant)
    return hits / len(relevant)


def _reciprocal_rank(retrieved: list[str], relevant: set[str]) -> float:
    for index, document_id in enumerate(retrieved, start=1):
        if document_id in relevant:
            return 1.0 / index
    return 0.0


def evaluate_search(
    index: LexicalCodexIndex,
    judgements: list[QueryJudgement],
) -> SearchMetricSummary:
    """Evaluate a search index against explicit query judgements."""

    query_results: list[QueryMetricResult] = []

    for judgement in judgements:
        search_results = index.search(
            SearchQuery(
                text=judgement.query,
                top_k=judgement.top_k,
                public_only=judgement.public_only,
            )
        )
        retrieved = [result.document_id for result in search_results]
        relevant = set(judgement.relevant_document_ids)

        query_results.append(
            QueryMetricResult(
                query=judgement.query,
                retrieved_document_ids=retrieved,
                relevant_document_ids=judgement.relevant_document_ids,
                precision_at_k=round(
                    _precision_at_k(retrieved, relevant, judgement.top_k),
                    6,
                ),
                recall_at_k=round(
                    _recall_at_k(retrieved, relevant, judgement.top_k),
                    6,
                ),
                reciprocal_rank=round(_reciprocal_rank(retrieved, relevant), 6),
            )
        )

    query_count = len(query_results)
    if query_count == 0:
        return SearchMetricSummary(
            query_count=0,
            mean_precision_at_k=0.0,
            mean_recall_at_k=0.0,
            mean_reciprocal_rank=0.0,
            results=[],
        )

    return SearchMetricSummary(
        query_count=query_count,
        mean_precision_at_k=round(
            sum(result.precision_at_k for result in query_results) / query_count,
            6,
        ),
        mean_recall_at_k=round(
            sum(result.recall_at_k for result in query_results) / query_count,
            6,
        ),
        mean_reciprocal_rank=round(
            sum(result.reciprocal_rank for result in query_results) / query_count,
            6,
        ),
        results=query_results,
    )
