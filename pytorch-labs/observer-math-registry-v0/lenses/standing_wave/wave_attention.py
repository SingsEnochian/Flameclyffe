"""
standing_wave/wave_attention.py

Wave-inspired neural architecture — complex interference instead of dot-product attention.

WaveResonanceMemory (Rowan's foundational layer):
    interference = Q_R·K_R + Q_I·K_I = |Q||K|cos(Δφ)
    Constructive when phases align (Δφ ≈ 0), destructive when opposed (Δφ ≈ π).
    This is the static measurement partner to Kuramoto dynamics (oscillators.py).
    Both are phase coherence — cos and sin differ by π/2.

WaveSequenceModel:
    Multi-layer sequence model using WaveResonanceMemory at every layer.
    Positional encoding uses Runa tone frequencies as base frequencies.
    Call phase_report(x) during training to watch token phases align.
"""

from __future__ import annotations

import math
from typing import List

import torch
import torch.nn as nn
import torch.nn.functional as F

from .oscillators import AXIS_TONES, AXIS_ORDER, N_OSC


# ── Foundational layer (Rowan's design) ──────────────────────────────────────

class WaveResonanceMemory(nn.Module):
    """
    Complex-valued resonance attention — symbolic continuity retrieval.

    Q = q_real + i*q_imag   (projections for amplitude and phase components)
    K = k_real + i*k_imag   (same)
    V = v_linear(x)          (classical: values remain real for output projection)

    Interference score = Re(Q * conj(K))
                       = Re((qr + i*qi)(kr - i*ki))
                       = qr*kr + qi*ki
                       = |Q||K|cos(delta_phi)

    Derivation (Ezra): Re((qr + i*qi) * conj(kr + i*ki)) = qr*kr + qi*ki.
    Constructive (delta_phi ~ 0) -> high resonance weight.
    Destructive  (delta_phi ~ pi) -> suppression.
    Standard dot-product attention is the special case where qi = ki = 0.

    Static measurement partner to Kuramoto dynamics (oscillators.py):
    Kuramoto coupling K*sin(delta_theta); this layer computes |Q||K|cos(delta_phi).
    Same phase-coherence family, pi/2 offset. Kuramoto evolves toward resonance;
    this layer measures whether it arrived.

    As symbolic continuity retrieval: a query (sigil, tone, character, place)
    retrieves what shares its phase-space, not what matches its literal content.
    High coherence in the DEEP field sharpens retrieval; high entropy widens it.
    """

    def __init__(self, embed_dim: int):
        super().__init__()
        self.embed_dim = embed_dim
        # Real/amplitude and imaginary/phase projections for query and key
        self.q_real = nn.Linear(embed_dim, embed_dim)
        self.q_imag = nn.Linear(embed_dim, embed_dim)
        self.k_real = nn.Linear(embed_dim, embed_dim)
        self.k_imag = nn.Linear(embed_dim, embed_dim)
        # Values remain classical for final output projection
        self.v_linear = nn.Linear(embed_dim, embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, embed_dim)
        qr, qi = self.q_real(x), self.q_imag(x)
        kr, ki = self.k_real(x), self.k_imag(x)
        v = self.v_linear(x)
        # Re((qr + i*qi) * conj(kr + i*ki)) = qr*kr + qi*ki
        interference = (
            torch.matmul(qr, kr.transpose(-2, -1))
            + torch.matmul(qi, ki.transpose(-2, -1))
        ) / (self.embed_dim ** 0.5)   # scale for gradient stability
        resonance_weights = torch.softmax(interference, dim=-1)
        return torch.matmul(resonance_weights, v)

    def phase_angles(self, x: torch.Tensor) -> torch.Tensor:
        """
        Per-token phase: atan2(q_imag, q_real) averaged across embed_dim.
        Shape: (batch, seq_len)
        As the model trains, tokens with shared context develop similar angles.
        """
        qr, qi = self.q_real(x), self.q_imag(x)
        return torch.atan2(qi, qr).mean(dim=-1)

    def phase_coherence(self, x: torch.Tensor) -> torch.Tensor:
        """
        Kuramoto order parameter of Q phase angles across the sequence.
        Shape: (batch,)  —  1.0 = full sync, 0.0 = complete decoherence.
        """
        angles = self.phase_angles(x)
        phasors = torch.exp(1j * angles.to(torch.complex64))
        return torch.abs(phasors.mean(dim=-1)).real


# ── Multi-head wrapper ────────────────────────────────────────────────────────

class MultiHeadWaveAttention(nn.Module):
    """
    Split embed_dim into n_heads, run WaveResonanceMemory per head, concatenate.
    Each head operates on all positions but a sub-slice of the feature space.
    """

    def __init__(self, embed_dim: int, n_heads: int = 4):
        super().__init__()
        assert embed_dim % n_heads == 0, "embed_dim must be divisible by n_heads"
        self.n_heads = n_heads
        self.head_dim = embed_dim // n_heads
        self.heads = nn.ModuleList(
            [WaveResonanceMemory(self.head_dim) for _ in range(n_heads)]
        )
        self.out_proj = nn.Linear(embed_dim, embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, D = x.shape
        splits = x.view(B, T, self.n_heads, self.head_dim).unbind(dim=2)
        out = torch.cat([self.heads[h](s) for h, s in enumerate(splits)], dim=-1)
        return self.out_proj(out)

    def phase_angles(self, x: torch.Tensor) -> torch.Tensor:
        """Mean phase angles averaged across all heads. (batch, seq_len)"""
        B, T, D = x.shape
        splits = x.view(B, T, self.n_heads, self.head_dim).unbind(dim=2)
        all_angles = torch.stack(
            [self.heads[h].phase_angles(s) for h, s in enumerate(splits)], dim=-1
        )
        return all_angles.mean(dim=-1)


# ── Runa-frequency positional encoding ───────────────────────────────────────

class WavePositionalEncoding(nn.Module):
    """
    Sinusoidal PE whose fundamental frequencies cycle through the 6 Runa axis tones
    rather than the standard 1/10000^(2i/d) decay.

    PE(pos, 2i)   = sin(pos · freqᵢ / max_len)
    PE(pos, 2i+1) = cos(pos · freqᵢ / max_len)
    where freqᵢ = RUNA_TONES[i % 6] / 432Hz — normalised relative to Presence.
    """

    def __init__(self, embed_dim: int, max_len: int = 256):
        super().__init__()
        pe = torch.zeros(max_len, embed_dim)
        position = torch.arange(max_len, dtype=torch.float).unsqueeze(1)

        base_hz = AXIS_TONES["presence"]
        runa_freqs = torch.tensor(
            [AXIS_TONES[ax] / base_hz for ax in AXIS_ORDER], dtype=torch.float32
        )
        n_pairs = embed_dim // 2
        freqs = runa_freqs[torch.arange(n_pairs) % N_OSC].unsqueeze(0) / max_len

        pe[:, 0::2] = torch.sin(position * freqs)
        pe[:, 1::2] = torch.cos(position * freqs)

        self.register_buffer("pe", pe.unsqueeze(0))   # (1, max_len, embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.pe[:, : x.size(1)]


# ── Transformer block ─────────────────────────────────────────────────────────

class WaveTransformerBlock(nn.Module):
    def __init__(
        self,
        embed_dim: int,
        n_heads: int = 4,
        ff_mult: int = 4,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.attn = MultiHeadWaveAttention(embed_dim, n_heads)
        self.ff = nn.Sequential(
            nn.Linear(embed_dim, embed_dim * ff_mult),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(embed_dim * ff_mult, embed_dim),
            nn.Dropout(dropout),
        )
        self.norm1 = nn.LayerNorm(embed_dim)
        self.norm2 = nn.LayerNorm(embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.norm1(x))
        x = x + self.ff(self.norm2(x))
        return x


# ── Full sequence model ───────────────────────────────────────────────────────

class WaveSequenceModel(nn.Module):
    """
    Multi-layer sequence model using WaveResonanceMemory at every layer.

    Architecture:
        token_ids → Embedding → WavePE → Dropout
                  → N × WaveTransformerBlock
                  → LayerNorm → Linear → logits

    Phase transparency: call phase_report(x) at any point during training
    to extract per-layer token phase angles and coherence scores.
    As the model learns context, coherence rises — tokens that tend to co-occur
    develop similar Q phase angles, which IS the Kuramoto order parameter.
    """

    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 64,
        n_layers: int = 3,
        n_heads: int = 4,
        max_len: int = 256,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim)
        self.pos_enc = WavePositionalEncoding(embed_dim, max_len)
        self.drop = nn.Dropout(dropout)
        self.layers = nn.ModuleList(
            [WaveTransformerBlock(embed_dim, n_heads, dropout=dropout) for _ in range(n_layers)]
        )
        self.norm = nn.LayerNorm(embed_dim)
        self.head = nn.Linear(embed_dim, vocab_size, bias=False)

        self._init_weights()

    def _init_weights(self) -> None:
        for m in self.modules():
            if isinstance(m, (nn.Linear, nn.Embedding)):
                nn.init.normal_(m.weight, std=0.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.zeros_(m.bias)

    def forward(self, token_ids: torch.Tensor) -> torch.Tensor:
        """token_ids: (batch, seq_len) → logits: (batch, seq_len, vocab_size)"""
        x = self.drop(self.pos_enc(self.embed(token_ids)))
        for layer in self.layers:
            x = layer(x)
        return self.head(self.norm(x))

    def phase_report(self, token_ids: torch.Tensor) -> List[dict]:
        """
        Extract phase angles and coherence at each layer.

        Returns list of dicts, one per layer:
            angles:    (batch, seq_len) — mean Q phase angle per token (radians)
            coherence: (batch,)         — Kuramoto order parameter across sequence

        Coherence should rise across layers as the model learns context,
        and rise across epochs as training progresses. This is the observable
        that confirms the architecture is learning wave-aligned representations.
        """
        x = self.drop(self.pos_enc(self.embed(token_ids)))
        report: List[dict] = []
        for layer in self.layers:
            normed = layer.norm1(x)
            angles = layer.attn.phase_angles(normed)
            phasors = torch.exp(1j * angles.to(torch.complex64))
            coherence = torch.abs(phasors.mean(dim=-1)).real
            report.append({"angles": angles.detach(), "coherence": coherence.detach()})
            x = layer(x)
        return report

    def n_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters())
