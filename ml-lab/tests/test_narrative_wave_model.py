from __future__ import annotations

import pytest

pytest.importorskip("torch")

import torch

from flameclyffe_ml.resonance import (
    NarrativeResonanceModel,
    NarrativeWaveEmbedding,
    PhaseLockNorm,
    StandingWaveMemoryRegister,
    WaveCoherenceLoss,
    WaveResonanceMemory,
)


def test_wave_embedding_returns_real_and_imag_channels() -> None:
    embedding = NarrativeWaveEmbedding(vocab_size=32, embed_dim=16, max_seq_len=64)
    token_ids = torch.tensor([[1, 2, 3, 4], [4, 3, 2, 1]])

    real, imag = embedding(token_ids)

    assert real.shape == (2, 4, 16)
    assert imag.shape == (2, 4, 16)
    assert torch.isfinite(real).all()
    assert torch.isfinite(imag).all()


def test_wave_embedding_requires_even_embed_dim() -> None:
    with pytest.raises(ValueError, match="even"):
        NarrativeWaveEmbedding(vocab_size=32, embed_dim=15)


def test_phase_lock_norm_preserves_shapes_and_finiteness() -> None:
    norm = PhaseLockNorm(embed_dim=16)
    real = torch.randn(2, 5, 16)
    imag = torch.randn(2, 5, 16)

    stable_real, stable_imag = norm(real, imag)

    assert stable_real.shape == real.shape
    assert stable_imag.shape == imag.shape
    assert torch.isfinite(stable_real).all()
    assert torch.isfinite(stable_imag).all()


def test_wave_resonance_memory_returns_attention_weights() -> None:
    memory = WaveResonanceMemory(embed_dim=16, dropout=0.0)
    real = torch.randn(2, 5, 16)
    imag = torch.randn(2, 5, 16)

    output, weights = memory(real, imag, real, causal=True)

    assert output.shape == (2, 5, 16)
    assert weights.shape == (2, 5, 5)
    assert torch.isfinite(output).all()
    assert torch.isfinite(weights).all()
    assert torch.allclose(weights.sum(dim=-1), torch.ones(2, 5), atol=1e-5)
    assert torch.all(weights[:, 0, 1:] == 0)


def test_standing_wave_register_retrieves_slots() -> None:
    register = StandingWaveMemoryRegister(num_memories=8, embed_dim=16)
    query_real = torch.randn(2, 4, 16)
    query_imag = torch.randn(2, 4, 16)

    retrieved_real, retrieved_imag, scores = register(query_real, query_imag)

    assert retrieved_real.shape == (2, 4, 16)
    assert retrieved_imag.shape == (2, 4, 16)
    assert scores.shape == (2, 4, 8)
    assert torch.allclose(scores.sum(dim=-1), torch.ones(2, 4), atol=1e-5)


def test_narrative_resonance_model_forward_and_generation() -> None:
    torch.manual_seed(7)
    model = NarrativeResonanceModel(
        vocab_size=50,
        embed_dim=16,
        num_memories=12,
        max_seq_len=64,
        dropout=0.0,
    )
    seed = torch.tensor([[5, 12, 44, 2]])

    logits, stable_real, stable_imag, scores = model(seed)
    generated = model.generate_narrative(seed, max_new_tokens=6, temperature=0.8)

    assert logits.shape == (1, 4, 50)
    assert stable_real.shape == (1, 4, 16)
    assert stable_imag.shape == (1, 4, 16)
    assert scores.shape == (1, 4, 12)
    assert len(generated) == 6
    assert all(0 <= token < 50 for token in generated)
    assert torch.isfinite(logits).all()


def test_wave_coherence_loss_is_finite_and_non_negative() -> None:
    loss_fn = WaveCoherenceLoss(phase_penalty_weight=0.1)
    pred_real = torch.randn(2, 3, 16)
    pred_imag = torch.randn(2, 3, 16)
    target_real = torch.randn(2, 3, 16)
    target_imag = torch.randn(2, 3, 16)

    loss = loss_fn(pred_real, pred_imag, target_real, target_imag)

    assert torch.isfinite(loss)
    assert loss.item() >= 0
