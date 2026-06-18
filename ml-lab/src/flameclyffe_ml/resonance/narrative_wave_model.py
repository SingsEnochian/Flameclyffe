"""Complex-valued resonance attention for symbolic continuity retrieval.

This file is an experimental PyTorch prototype for the Flameclyffe ML laboratory.
It uses wave/complex-valued language as modelling vocabulary only. It does not
claim literal quantum memory, and it does not persist or publish canon data.
"""

from __future__ import annotations

import math

import torch
from torch import nn
from torch.nn import functional as F


class NarrativeWaveEmbedding(nn.Module):
    """Embed token ids as paired real/imaginary narrative wave channels.

    The learned amplitude envelope carries token-local semantic weight. A learned
    ``time_scale`` stretches or compresses positional phase, giving the prototype a
    single trainable pacing knob without changing sequence length.
    """

    def __init__(self, vocab_size: int, embed_dim: int, max_seq_len: int = 4096) -> None:
        super().__init__()
        if embed_dim <= 0:
            raise ValueError("embed_dim must be positive")
        if embed_dim % 2 != 0:
            raise ValueError("embed_dim must be even for paired real/imaginary channels")
        if vocab_size <= 0:
            raise ValueError("vocab_size must be positive")
        if max_seq_len <= 0:
            raise ValueError("max_seq_len must be positive")

        self.embed_dim = embed_dim
        self.max_seq_len = max_seq_len
        self.amplitude_embedding = nn.Embedding(vocab_size, embed_dim)

        # Trainable narrative pacing. Higher values rotate phase faster.
        self.time_scale = nn.Parameter(torch.tensor(0.5))

        inv_freq = 1.0 / (10000 ** (torch.arange(0, embed_dim, 2).float() / embed_dim))
        self.register_buffer("inv_freq", inv_freq)

    def forward(self, token_ids: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        if token_ids.ndim != 2:
            raise ValueError("token_ids must have shape [batch, seq_len]")

        batch_size, seq_len = token_ids.shape
        if seq_len > self.max_seq_len:
            raise ValueError(f"sequence length {seq_len} exceeds max_seq_len {self.max_seq_len}")

        amplitude = torch.sigmoid(self.amplitude_embedding(token_ids))
        position = torch.arange(seq_len, device=token_ids.device, dtype=torch.float32)
        paced_position = position * torch.clamp(self.time_scale, 0.001, 2.0)

        phase_angles = torch.einsum("i,j->ij", paced_position, self.inv_freq)
        phase = torch.cat([phase_angles, phase_angles], dim=-1)
        phase = phase.unsqueeze(0).expand(batch_size, -1, -1)

        real = amplitude * torch.cos(phase)
        imag = amplitude * torch.sin(phase)
        return real, imag


class PhaseLockNorm(nn.Module):
    """Normalise wave amplitude while preserving phase direction."""

    def __init__(self, embed_dim: int, eps: float = 1e-5) -> None:
        super().__init__()
        if embed_dim <= 0:
            raise ValueError("embed_dim must be positive")
        self.eps = eps
        self.gamma = nn.Parameter(torch.ones(embed_dim))
        self.beta = nn.Parameter(torch.zeros(embed_dim))

    def forward(self, real: torch.Tensor, imag: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        amplitude = torch.sqrt(real.square() + imag.square() + self.eps)
        phase = torch.atan2(imag, real)

        mean = amplitude.mean(dim=-1, keepdim=True)
        var = amplitude.var(dim=-1, keepdim=True, unbiased=False)
        amplitude_norm = (amplitude - mean) / torch.sqrt(var + self.eps)

        # Keep amplitude positive. A signed amplitude would silently flip phase by pi.
        amplitude_scaled = F.softplus(self.gamma * amplitude_norm + self.beta) + self.eps

        stable_real = amplitude_scaled * torch.cos(phase)
        stable_imag = amplitude_scaled * torch.sin(phase)
        return stable_real, stable_imag


class WaveResonanceMemory(nn.Module):
    """Attention-like resonance over complex-inspired query/key channels."""

    def __init__(self, embed_dim: int, *, dropout: float = 0.0) -> None:
        super().__init__()
        if embed_dim <= 0:
            raise ValueError("embed_dim must be positive")
        self.embed_dim = embed_dim

        self.q_real = nn.Linear(embed_dim, embed_dim)
        self.q_imag = nn.Linear(embed_dim, embed_dim)
        self.k_real = nn.Linear(embed_dim, embed_dim)
        self.k_imag = nn.Linear(embed_dim, embed_dim)
        self.v_linear = nn.Linear(embed_dim, embed_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        real: torch.Tensor,
        imag: torch.Tensor,
        classical_value: torch.Tensor,
        *,
        causal: bool = False,
        attention_mask: torch.Tensor | None = None,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        qr = self.q_real(real)
        qi = self.q_imag(imag)
        kr = self.k_real(real)
        ki = self.k_imag(imag)
        value = self.v_linear(classical_value)

        # Real part of complex-style query/key alignment:
        # Re((qr + i qi) * conj(kr + i ki)) = qr*kr + qi*ki.
        interference = torch.matmul(qr, kr.transpose(-2, -1)) + torch.matmul(
            qi,
            ki.transpose(-2, -1),
        )
        interference = interference / math.sqrt(self.embed_dim)

        if causal:
            seq_len = interference.shape[-1]
            causal_mask = torch.ones(seq_len, seq_len, device=interference.device, dtype=torch.bool).triu(1)
            interference = interference.masked_fill(causal_mask, torch.finfo(interference.dtype).min)

        if attention_mask is not None:
            interference = interference.masked_fill(~attention_mask.bool(), torch.finfo(interference.dtype).min)

        resonance_weights = torch.softmax(interference, dim=-1)
        resonance_weights = self.dropout(resonance_weights)
        output = torch.matmul(resonance_weights, value)
        return output, resonance_weights


class StandingWaveMemoryRegister(nn.Module):
    """Persistent learned resonant slots for long-range symbolic continuity.

    The slots are trainable parameters, not mutable inference-time memory. Later
    versions may add explicit update/write rules, provenance, and consent gates.
    """

    def __init__(self, num_memories: int, embed_dim: int) -> None:
        super().__init__()
        if num_memories <= 0:
            raise ValueError("num_memories must be positive")
        if embed_dim <= 0:
            raise ValueError("embed_dim must be positive")

        self.embed_dim = embed_dim
        self.num_memories = num_memories
        scale = 1.0 / math.sqrt(embed_dim)
        self.register_real = nn.Parameter(torch.randn(num_memories, embed_dim) * scale)
        self.register_imag = nn.Parameter(torch.randn(num_memories, embed_dim) * scale)

    def forward(self, query_real: torch.Tensor, query_imag: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        resonance_real = torch.matmul(query_real, self.register_real.t())
        resonance_imag = torch.matmul(query_imag, self.register_imag.t())
        interference = (resonance_real + resonance_imag) / math.sqrt(self.embed_dim)
        resonance_scores = torch.softmax(interference, dim=-1)

        retrieved_real = torch.matmul(resonance_scores, self.register_real)
        retrieved_imag = torch.matmul(resonance_scores, self.register_imag)
        return retrieved_real, retrieved_imag, resonance_scores


class WaveCoherenceLoss(nn.Module):
    """Magnitude plus phase-distance loss for complex-valued hidden states."""

    def __init__(self, phase_penalty_weight: float = 0.1) -> None:
        super().__init__()
        if phase_penalty_weight < 0:
            raise ValueError("phase_penalty_weight must be non-negative")
        self.phase_penalty_weight = phase_penalty_weight
        self.mse = nn.MSELoss()

    def forward(
        self,
        pred_real: torch.Tensor,
        pred_imag: torch.Tensor,
        target_real: torch.Tensor,
        target_imag: torch.Tensor,
    ) -> torch.Tensor:
        magnitude_loss = self.mse(pred_real, target_real) + self.mse(pred_imag, target_imag)

        pred_phase = torch.atan2(pred_imag, pred_real)
        target_phase = torch.atan2(target_imag, target_real)
        phase_distance = 1.0 - torch.cos(pred_phase - target_phase)
        phase_loss = torch.mean(phase_distance)

        return magnitude_loss + (self.phase_penalty_weight * phase_loss)


class NarrativeResonanceModel(nn.Module):
    """Tiny autoregressive prototype built from resonance-memory components."""

    def __init__(
        self,
        vocab_size: int,
        embed_dim: int,
        *,
        num_memories: int = 128,
        max_seq_len: int = 4096,
        dropout: float = 0.0,
    ) -> None:
        super().__init__()
        self.embedding = NarrativeWaveEmbedding(vocab_size, embed_dim, max_seq_len=max_seq_len)
        self.short_term_memory = WaveResonanceMemory(embed_dim, dropout=dropout)
        self.long_term_memory = StandingWaveMemoryRegister(num_memories, embed_dim)
        self.phase_norm = PhaseLockNorm(embed_dim)

        self.value_to_real = nn.Linear(embed_dim, embed_dim)
        self.value_to_imag = nn.Linear(embed_dim, embed_dim)
        self.output_projection = nn.Linear(embed_dim * 2, vocab_size)

    def forward(
        self,
        token_ids: torch.Tensor,
        *,
        causal: bool = True,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        real, imag = self.embedding(token_ids)
        attention_out, _resonance_weights = self.short_term_memory(
            real,
            imag,
            real,
            causal=causal,
        )

        attention_real = self.value_to_real(attention_out)
        attention_imag = self.value_to_imag(attention_out)

        memory_real, memory_imag, memory_scores = self.long_term_memory(
            attention_real,
            attention_imag,
        )

        combined_real = attention_real + memory_real
        combined_imag = attention_imag + memory_imag
        stable_real, stable_imag = self.phase_norm(combined_real, combined_imag)

        final_state = torch.cat([stable_real, stable_imag], dim=-1)
        logits = self.output_projection(final_state)
        return logits, stable_real, stable_imag, memory_scores

    @torch.no_grad()
    def generate_narrative(
        self,
        seed_token_ids: torch.Tensor,
        *,
        max_new_tokens: int = 20,
        temperature: float = 1.0,
    ) -> list[int]:
        """Generate token ids from the current prototype distribution."""

        if max_new_tokens < 0:
            raise ValueError("max_new_tokens must be non-negative")
        if temperature <= 0:
            raise ValueError("temperature must be positive")

        self.eval()
        current_sequence = seed_token_ids.clone()
        generated_tokens: list[int] = []

        for _ in range(max_new_tokens):
            logits, _, _, _ = self.forward(current_sequence, causal=True)
            next_token_logits = logits[:, -1, :] / temperature
            probabilities = torch.softmax(next_token_logits, dim=-1)
            next_token_id = torch.multinomial(probabilities, num_samples=1)
            generated_tokens.append(int(next_token_id.item()))
            current_sequence = torch.cat([current_sequence, next_token_id], dim=1)

        return generated_tokens


# Backward-compatible alias for early lab notes. Prefer NarrativeResonanceModel.
QuantumInspiredWaveModel = NarrativeResonanceModel
