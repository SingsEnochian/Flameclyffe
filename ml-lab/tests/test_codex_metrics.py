from __future__ import annotations

import json
from pathlib import Path

from pydantic import TypeAdapter

from flameclyffe_ml.codex_search import (
    LexicalCodexIndex,
    QueryJudgement,
    evaluate_search,
    snapshot_batch_from_path,
)

_FIXTURE_DIR = Path(__file__).parents[1] / "fixtures" / "codex"
_JUDGEMENT_ADAPTER = TypeAdapter(list[QueryJudgement])


def test_golden_fixture_baseline_retrieves_expected_records() -> None:
    batch = snapshot_batch_from_path(_FIXTURE_DIR / "public_golden_snapshot.json")
    judgements = _JUDGEMENT_ADAPTER.validate_python(
        json.loads((_FIXTURE_DIR / "public_golden_judgements.json").read_text())
    )
    index = LexicalCodexIndex.from_documents(batch.public_documents())

    summary = evaluate_search(index, judgements)

    assert summary.query_count == 7
    assert summary.mean_reciprocal_rank == 1.0
    assert summary.mean_recall_at_k == 1.0
    assert summary.mean_precision_at_k >= 0.333333
    assert all(
        result.retrieved_document_ids[0] in result.relevant_document_ids
        for result in summary.results
    )


def test_empty_judgement_list_returns_zero_summary() -> None:
    batch = snapshot_batch_from_path(_FIXTURE_DIR / "public_golden_snapshot.json")
    index = LexicalCodexIndex.from_documents(batch.public_documents())

    summary = evaluate_search(index, [])

    assert summary.query_count == 0
    assert summary.mean_precision_at_k == 0.0
    assert summary.mean_recall_at_k == 0.0
    assert summary.mean_reciprocal_rank == 0.0
    assert summary.results == []


def test_missed_result_has_zero_reciprocal_rank() -> None:
    batch = snapshot_batch_from_path(_FIXTURE_DIR / "public_golden_snapshot.json")
    index = LexicalCodexIndex.from_documents(batch.public_documents())
    judgements = [
        QueryJudgement(
            query="unfindable quarry lantern",
            relevant_document_ids=["templehouse"],
            top_k=3,
        )
    ]

    summary = evaluate_search(index, judgements)

    assert summary.query_count == 1
    assert summary.results[0].retrieved_document_ids == []
    assert summary.results[0].precision_at_k == 0.0
    assert summary.results[0].recall_at_k == 0.0
    assert summary.results[0].reciprocal_rank == 0.0
