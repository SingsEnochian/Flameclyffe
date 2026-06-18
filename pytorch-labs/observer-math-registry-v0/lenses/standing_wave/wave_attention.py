"""
standing_wave/wave_attention.py

Wave-inspired neural architecture — complex interference instead of dot-product attention.

Layers (bottom → top):
    NarrativeWaveEmbedding  — token IDs → (real, imag) complex wave embeddings
                              Amplitude = semantic weight; phase = narrative position.
    PhaseLockNorm           — complex LayerNorm: normalises amplitude envelope, keeps
                              phases bounded in [-π, π]. Prevents decoherence.
    WaveResonanceMemory     — interference = Re(Q * conj(K)) = qr·kr + qi·ki = |Q||K|cos(Δφ)
    MultiHeadWaveAttention  — multi-head wrapper over WaveResonanceMemory
    WavePositionalEncoding  — Runa-frequency sinusoidal PE (legacy; NarrativeWaveEmbedding
                              encodes position into phase and makes this optional)
    WaveTransformerBlock    — norm → MultiHeadWaveAttn → PhaseLockNorm → residual → FF
    WaveCoherenceLoss       — auxiliary training loss: magnitude MSE + phase cosine distance
    WaveSequenceModel       — full sequence model; optionally wires StandingWaveMemoryRegister
"""

from __future__ import annotations

import math
from typing import List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from .oscillators import AXIS_TONES, AXIS_ORDER, N_OSC
from .memory import StandingWaveMemoryRegister


# ── Narrative wave embedding ──────────────────────────────────────────────────

class NarrativeWaveEmbedding(nn.Module):
    """
    Token IDs → complex (real, imag) wave coordinates.

    Amplitude embedding (static semantic weight) is bounded in [0, 1] via sigmoid.
    Phase encoding (narrative pacing / position) uses rotary-style inv_freq scaling
    so each dimension rotates at a different rate through the sequence.

    real = amp * cos(phase)
    imag = amp * sin(phase)

    Replaces the Embedding + WavePositionalEncoding pair. When this layer is used,
    WavePositionalEncoding is redundant — position is baked into the phase angle.

    Compatible with any tokenizer (tiktoken, HuggingFace AutoTokenizer, etc.) —
    the layer only sees integer token IDs, not the vocabulary itself.

    embed_dim here is HALF the total model hidden dim. The caller concatenates
    (real, imag) to form the full-width tensor: x = cat([real, imag], dim=-1).
    """

    def __init__(self, vocab_size: int, embed_dim: int, max_seq_len: int = 4096):
        super().__init__()
        self.embed_dim = embed_dim
        self.amplitude_embedding = nn.Embedding(vocab_size, embed_dim)
        inv_freq = 1.0 / (10000 ** (torch.arange(0, embed_dim, 2).float() / embed_dim))
        self.register_buffer("inv_freq", inv_freq)   # (embed_dim // 2,)
        # Viscosity controls narrative pacing: high (→1.0) = rapid phase rotation,
        # low (→0) = slow, lingering rotation. Learnable — the model finds the pace.
        self.viscosity = nn.Parameter(torch.tensor([0.5]))

    def forward(self, token_ids: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        token_ids: (batch, seq_len) integer token IDs
        Returns: real (B, T, embed_dim), imag (B, T, embed_dim)
        """
        B, T = token_ids.shape
        amp  = torch.sigmoid(self.amplitude_embedding(token_ids))  # (B, T, embed_dim)

        position        = torch.arange(T, device=token_ids.device, dtype=torch.float32)
        viscous_pos     = position * torch.clamp(self.viscosity, 0.001, 2.0)
        phase_angles    = torch.einsum("i,j->ij", viscous_pos, self.inv_freq)  # (T, D//2)
        phase           = torch.cat([phase_angles, phase_angles], dim=-1)      # (T, D)
        phase           = phase.unsqueeze(0).expand(B, -1, -1)                 # (B, T, D)

        return amp * torch.cos(phase), amp * torch.sin(phase)


# ── Phase-lock normalisation ──────────────────────────────────────────────────

class PhaseLockNorm(nn.Module):
    """
    Complex-valued layer normalisation: normalise amplitude, preserve phase.

    Standard LayerNorm has no concept of phase — it treats the flat feature vector
    as a bag of scalars. Applied to wave tensors, it can inadvertently distort the
    amplitude/phase relationship that encodes interference geometry.

    PhaseLockNorm:
      1. Compute amplitude |z| = sqrt(r² + i²) and phase θ = atan2(i, r).
      2. Normalise amplitude layer-wise (zero mean, unit variance), then rescale
         with learned γ/β. This removes runaway constructive interference without
         touching phase.
      3. Project back: r' = amp_scaled * cos(θ),  i' = amp_scaled * sin(θ).

    Phase is naturally bounded in [-π, π] by atan2 — no clipping needed.
    Insert after WaveResonanceMemory blocks and after the StandingWaveMemoryRegister
    retrieval step to stabilise gradients without losing wave structure.
    """

    def __init__(self, embed_dim: int, eps: float = 1e-5):
        super().__init__()
        self.eps   = eps
        self.gamma = nn.Parameter(torch.ones(embed_dim))
        self.beta  = nn.Parameter(torch.zeros(embed_dim))

    def forward(
        self, real: torch.Tensor, imag: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """real, imag: (batch, ..., embed_dim) → normalised (real, imag)"""
        amplitude = torch.sqrt(real ** 2 + imag ** 2 + self.eps)
        phase     = torch.atan2(imag, real)

        mean      = amplitude.mean(dim=-1, keepdim=True)
        var       = amplitude.var(dim=-1, keepdim=True, unbiased=False)
        amp_norm  = (amplitude - mean) / torch.sqrt(var + self.eps)
        amp_scaled = self.gamma * amp_norm + self.beta

        return amp_scaled * torch.cos(phase), amp_scaled * torch.sin(phase)


# ── Wave coherence loss ───────────────────────────────────────────────────────

class WaveCoherenceLoss(nn.Module):
    """
    Auxiliary training loss combining amplitude MSE and phase alignment.

    Components:
      1. Magnitude loss — MSE on real and imaginary parts independently.
         Ensures wave amplitudes match between prediction and target.
      2. Phase alignment — 1 - cos(θ_pred - θ_target).
         = 0 when phases are identical; = 2 when directly opposed.
         Distance on the unit circle, gradient is well-behaved.

    total = magnitude_loss + phase_penalty_weight * phase_loss

    Primary use: StandingWaveMemoryRegister retrieved vs. query.
      coherence_criterion(r_real, r_imag, q_real, q_imag)
      Encourages the register to store memories that align with what the encoder
      queries for — in both amplitude AND phase.

    Secondary use: attention output vs. input (encourage layers to be coherent
    rather than just accurate).

    phase_penalty_weight ~ 0.05–0.15 is a sensible starting range.
    """

    def __init__(self, phase_penalty_weight: float = 0.1):
        super().__init__()
        self.phase_penalty_weight = phase_penalty_weight
        self.mse = nn.MSELoss()

    def forward(
        self,
        pred_real:   torch.Tensor,
        pred_imag:   torch.Tensor,
        target_real: torch.Tensor,
        target_imag: torch.Tensor,
    ) -> torch.Tensor:
        magnitude_loss = self.mse(pred_real, target_real) + self.mse(pred_imag, target_imag)

        pred_phase   = torch.atan2(pred_imag,   pred_real)
        target_phase = torch.atan2(target_imag, target_real)
        phase_loss   = torch.mean(1.0 - torch.cos(pred_phase - target_phase))

        return magnitude_loss + self.phase_penalty_weight * phase_loss


# ── Foundational attention layer ──────────────────────────────────────────────

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
    """

    def __init__(self, embed_dim: int):
        super().__init__()
        self.embed_dim = embed_dim
        self.q_real   = nn.Linear(embed_dim, embed_dim)
        self.q_imag   = nn.Linear(embed_dim, embed_dim)
        self.k_real   = nn.Linear(embed_dim, embed_dim)
        self.k_imag   = nn.Linear(embed_dim, embed_dim)
        self.v_linear = nn.Linear(embed_dim, embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        qr, qi = self.q_real(x), self.q_imag(x)
        kr, ki = self.k_real(x), self.k_imag(x)
        v = self.v_linear(x)
        interference = (
            torch.matmul(qr, kr.transpose(-2, -1))
            + torch.matmul(qi, ki.transpose(-2, -1))
        ) / (self.embed_dim ** 0.5)
        return torch.matmul(torch.softmax(interference, dim=-1), v)

    def phase_angles(self, x: torch.Tensor) -> torch.Tensor:
        """Per-token phase: atan2(q_imag, q_real) averaged across embed_dim. (batch, seq_len)"""
        return torch.atan2(self.q_imag(x), self.q_real(x)).mean(dim=-1)

    def phase_coherence(self, x: torch.Tensor) -> torch.Tensor:
        """Kuramoto order parameter of Q phase angles across the sequence. (batch,)"""
        phasors = torch.exp(1j * self.phase_angles(x).to(torch.complex64))
        return torch.abs(phasors.mean(dim=-1)).real


# ── Multi-head wrapper ────────────────────────────────────────────────────────

class MultiHeadWaveAttention(nn.Module):
    """Split embed_dim into n_heads, run WaveResonanceMemory per head, concatenate."""

    def __init__(self, embed_dim: int, n_heads: int = 4):
        super().__init__()
        assert embed_dim % n_heads == 0, "embed_dim must be divisible by n_heads"
        self.n_heads  = n_heads
        self.head_dim = embed_dim // n_heads
        self.heads    = nn.ModuleList(
            [WaveResonanceMemory(self.head_dim) for _ in range(n_heads)]
        )
        self.out_proj = nn.Linear(embed_dim, embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, D = x.shape
        splits   = x.view(B, T, self.n_heads, self.head_dim).unbind(dim=2)
        out      = torch.cat([self.heads[h](s) for h, s in enumerate(splits)], dim=-1)
        return self.out_proj(out)

    def phase_angles(self, x: torch.Tensor) -> torch.Tensor:
        """Mean phase angles averaged across all heads. (batch, seq_len)"""
        B, T, D = x.shape
        splits  = x.view(B, T, self.n_heads, self.head_dim).unbind(dim=2)
        return torch.stack(
            [self.heads[h].phase_angles(s) for h, s in enumerate(splits)], dim=-1
        ).mean(dim=-1)


# ── Runa-frequency positional encoding (legacy) ───────────────────────────────

class WavePositionalEncoding(nn.Module):
    """
    Sinusoidal PE whose frequencies cycle through the 6 Runa axis tones.
    Legacy: NarrativeWaveEmbedding encodes position in the phase angle directly
    and makes this layer redundant. Kept for backward compatibility.
    """

    def __init__(self, embed_dim: int, max_len: int = 256):
        super().__init__()
        pe       = torch.zeros(max_len, embed_dim)
        position = torch.arange(max_len, dtype=torch.float).unsqueeze(1)
        base_hz  = AXIS_TONES["presence"]
        runa_freqs = torch.tensor(
            [AXIS_TONES[ax] / base_hz for ax in AXIS_ORDER], dtype=torch.float32
        )
        n_pairs = embed_dim // 2
        freqs   = runa_freqs[torch.arange(n_pairs) % N_OSC].unsqueeze(0) / max_len
        pe[:, 0::2] = torch.sin(position * freqs)
        pe[:, 1::2] = torch.cos(position * freqs)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.pe[:, : x.size(1)]


# ── Transformer block ─────────────────────────────────────────────────────────

class WaveTransformerBlock(nn.Module):
    """
    LayerNorm → MultiHeadWaveAttention → PhaseLockNorm → residual add → FF.

    PhaseLockNorm is applied to the attention output by treating the first half
    of the feature dimension as real and the second half as imaginary. This
    stabilises gradient flow without destroying phase geometry.
    """

    def __init__(
        self,
        embed_dim:           int,
        n_heads:             int   = 4,
        ff_mult:             int   = 4,
        dropout:             float = 0.1,
        use_phase_lock_norm: bool  = True,
    ):
        super().__init__()
        self.half_dim = embed_dim // 2
        self.attn     = MultiHeadWaveAttention(embed_dim, n_heads)
        self.pln      = PhaseLockNorm(self.half_dim) if use_phase_lock_norm else None
        self.ff       = nn.Sequential(
            nn.Linear(embed_dim, embed_dim * ff_mult),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(embed_dim * ff_mult, embed_dim),
            nn.Dropout(dropout),
        )
        self.norm1 = nn.LayerNorm(embed_dim)
        self.norm2 = nn.LayerNorm(embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.attn(self.norm1(x))
        if self.pln is not None:
            # Treat first / second halves as real / imag streams
            r, i = h[..., :self.half_dim], h[..., self.half_dim:]
            r, i = self.pln(r, i)
            h    = torch.cat([r, i], dim=-1)
        x = x + h
        x = x + self.ff(self.norm2(x))
        return x


# ── Full sequence model ───────────────────────────────────────────────────────

class WaveSequenceModel(nn.Module):
    """
    Multi-layer wave sequence model with optional persistent memory register.

    Architecture (use_narrative_embedding=True):
        token_ids → NarrativeWaveEmbedding → cat([real, imag])
                  → Dropout
                  → N × WaveTransformerBlock  (each with PhaseLockNorm)
                  → LayerNorm
                  → [optional] StandingWaveMemoryRegister + PhaseLockNorm
                  → Linear → logits

    Architecture (use_narrative_embedding=False, legacy):
        token_ids → Embedding → WavePositionalEncoding → Dropout → blocks …

    Phase transparency: phase_report(x) extracts per-layer coherence scores.
    Register transparency: _last_scores holds per-memory resonance weights after forward.
    """

    def __init__(
        self,
        vocab_size:              int,
        embed_dim:               int   = 64,
        n_layers:                int   = 3,
        n_heads:                 int   = 4,
        max_len:                 int   = 256,
        dropout:                 float = 0.1,
        use_register:            bool  = False,
        num_memories:            int   = 0,
        use_phase_lock_norm:     bool  = True,
        use_narrative_embedding: bool  = True,
        use_locality_anchor:     bool  = False,
    ):
        super().__init__()
        self._half       = embed_dim // 2
        self._embed_dim  = embed_dim
        self._use_narr   = use_narrative_embedding

        if use_narrative_embedding:
            self.embed   = NarrativeWaveEmbedding(vocab_size, embed_dim // 2, max_len)
            self.pos_enc = None
        else:
            self.embed   = nn.Embedding(vocab_size, embed_dim)
            self.pos_enc = WavePositionalEncoding(embed_dim, max_len)

        self.drop   = nn.Dropout(dropout)
        self.layers = nn.ModuleList(
            [WaveTransformerBlock(embed_dim, n_heads, dropout=dropout,
                                  use_phase_lock_norm=use_phase_lock_norm)
             for _ in range(n_layers)]
        )
        self.norm = nn.LayerNorm(embed_dim)
        self.head = nn.Linear(embed_dim, vocab_size, bias=False)

        # Optional persistent wave memory register
        self.register      = None
        self.pln_register  = None
        self.register_gate = None
        if use_register and num_memories > 0:
            self.register      = StandingWaveMemoryRegister(num_memories, self._half)
            self.pln_register  = PhaseLockNorm(self._half)
            self.register_gate = nn.Parameter(torch.tensor(0.15))

        # Optional spatio-temporal phase anchor
        self.locality_anchor = (
            UserLocalityPhaseAnchor(self._half) if use_locality_anchor else None
        )
        self._user_phases: Optional[torch.Tensor] = None

        # Transparent state exposed after each forward pass
        self._last_scores: Optional[torch.Tensor] = None
        self._last_q_real: Optional[torch.Tensor] = None
        self._last_q_imag: Optional[torch.Tensor] = None
        self._last_r_real: Optional[torch.Tensor] = None
        self._last_r_imag: Optional[torch.Tensor] = None

        self.max_len = max_len   # stored so generate_narrative() can use it directly
        self._init_weights()

    def _init_weights(self) -> None:
        for m in self.modules():
            if isinstance(m, (nn.Linear, nn.Embedding)):
                nn.init.normal_(m.weight, std=0.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.zeros_(m.bias)

    def set_user_anchor(
        self, latitude: float, longitude: float, local_hour: float
    ) -> None:
        """
        Set the spatio-temporal phase anchor for this user/session.
        Affects all subsequent forward() calls until clear_user_anchor() is called.

        latitude   [-90, 90]    — real GPS or Terra Aeterna in-world Y coordinate
        longitude  [-180, 180]  — real GPS or Terra Aeterna in-world X coordinate
        local_hour [0, 24)      — local solar or in-world hour
        """
        if self.locality_anchor is None:
            raise RuntimeError(
                "Model was initialised without use_locality_anchor=True. "
                "Rebuild with WaveSequenceModel(..., use_locality_anchor=True)."
            )
        self._user_phases = self.locality_anchor.compute_user_anchor(
            latitude, longitude, local_hour
        )

    def clear_user_anchor(self) -> None:
        """Remove the spatio-temporal anchor — forward() returns to the unanchored field."""
        self._user_phases = None

    def forward(self, token_ids: torch.Tensor) -> torch.Tensor:
        """token_ids: (batch, seq_len) → logits: (batch, seq_len, vocab_size)"""
        if self._use_narr:
            real, imag = self.embed(token_ids)
            if self.locality_anchor is not None and self._user_phases is not None:
                real, imag = self.locality_anchor.apply_anchor_to_wave(
                    real, imag, self._user_phases
                )
            x = self.drop(torch.cat([real, imag], dim=-1))
        else:
            x = self.drop(self.pos_enc(self.embed(token_ids)))

        for layer in self.layers:
            x = layer(x)
        x = self.norm(x)

        if self.register is not None:
            x_mean = x.mean(dim=1)                          # (batch, embed_dim)
            q_real = x_mean[..., :self._half]
            q_imag = x_mean[..., self._half:]

            r_real, r_imag, scores = self.register(q_real, q_imag)
            r_real, r_imag         = self.pln_register(r_real, r_imag)

            # Expose for coherence loss computation in training loop
            self._last_q_real  = q_real
            self._last_q_imag  = q_imag
            self._last_r_real  = r_real
            self._last_r_imag  = r_imag
            self._last_scores  = scores

            retrieved = torch.cat([r_real, r_imag], dim=-1).unsqueeze(1)  # (B, 1, D)
            x = x + retrieved * self.register_gate
        else:
            self._last_q_real = self._last_q_imag = None
            self._last_r_real = self._last_r_imag = None
            self._last_scores = None

        return self.head(x)

    def phase_report(self, token_ids: torch.Tensor) -> List[dict]:
        """
        Extract phase angles and Kuramoto order parameter at each layer.
        Returns list of dicts {angles: (B, T), coherence: (B,)} — one per layer.
        Coherence rises across layers as context aligns token phases.
        """
        if self._use_narr:
            real, imag = self.embed(token_ids)
            x = self.drop(torch.cat([real, imag], dim=-1))
        else:
            x = self.drop(self.pos_enc(self.embed(token_ids)))

        report: List[dict] = []
        for layer in self.layers:
            normed   = layer.norm1(x)
            angles   = layer.attn.phase_angles(normed)
            phasors  = torch.exp(1j * angles.to(torch.complex64))
            coherence = torch.abs(phasors.mean(dim=-1)).real
            report.append({"angles": angles.detach(), "coherence": coherence.detach()})
            x = layer(x)
        return report

    def n_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters())

    @torch.no_grad()
    def generate_narrative(
        self,
        seed_token_ids: torch.Tensor,
        max_new_tokens: int = 20,
        temperature: float = 1.0,
    ) -> List[int]:
        """
        Autoregressive generation from a seed prompt.
        seed_token_ids: (1, seq_len) integer token IDs
        Returns: list of generated token IDs (length max_new_tokens).

        Uses the current wave field state — if a StandingWaveMemoryRegister is
        active, it continues to modulate retrieval as the sequence grows.
        """
        self.eval()
        current = seed_token_ids.clone()
        generated: List[int] = []
        max_ctx = self.max_len

        for _ in range(max_new_tokens):
            # Truncate context to model max_len if needed
            ctx = current[:, -max_ctx:] if current.size(1) > max_ctx else current
            logits = self.forward(ctx)
            probs  = torch.softmax(logits[:, -1, :] / max(temperature, 1e-6), dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            generated.append(int(next_token.item()))
            current = torch.cat([current, next_token], dim=1)

        return generated


# ── User locality phase anchor ────────────────────────────────────────────────

class UserLocalityPhaseAnchor(nn.Module):
    """
    Spatio-temporal phase anchor — transforms real-world (or in-world) telemetry
    into a personal wave phase signature, then applies it as a complex rotation.

    The complex rotation Ψ_new = Ψ · e^(iθ_user) shifts every dimension of the
    wave field by the user's personal phase offset WITHOUT changing amplitudes.
    Two users reading the same story from different locations or at different times
    receive phase-shifted (rotated) wave representations — the interference pattern
    is unique to each person's spatio-temporal context.

    Inputs:
      latitude   [-90, 90]   → normalised to [-1, 1]
      longitude  [-180, 180] → normalised to [-1, 1]
      local_hour [0, 24)     → cyclical via sin(2π·h/24) to avoid 23:59 ≠ 00:01 jump

    Coordinates can be physical GPS, in-world Terra Aeterna locations, or any
    abstract 2D + time signal — the model only sees normalised floats.

    Call set_user_anchor(lat, lon, hour) on the parent model to activate.
    The anchor persists across forward passes until updated or cleared.
    """

    def __init__(self, embed_dim: int):
        super().__init__()
        self.embed_dim        = embed_dim
        # 4 inputs: lat_norm, lon_norm, sin(hour), cos(hour) — full 24-h cycle
        self.locality_projector = nn.Linear(4, embed_dim)

    def compute_user_anchor(
        self,
        latitude:   float,
        longitude:  float,
        local_hour: float,
    ) -> torch.Tensor:
        """
        Returns user_phases: (embed_dim,) — phase angles in [-π, π].
        Device-matched to the locality_projector's parameters.
        """
        lat_norm   = latitude  / 90.0
        lon_norm   = longitude / 180.0
        # Full 24-hour cycle as (sin, cos) pair — disambiguates AM from PM
        t          = 2 * math.pi * local_hour / 24.0
        time_sin   = math.sin(t)
        time_cos   = math.cos(t)

        device = next(self.locality_projector.parameters()).device
        telemetry = torch.tensor(
            [lat_norm, lon_norm, time_sin, time_cos], dtype=torch.float32, device=device
        )
        raw_angles  = self.locality_projector(telemetry)
        user_phases = torch.tanh(raw_angles) * torch.pi   # bounded in [-π, π]
        return user_phases

    def apply_anchor_to_wave(
        self,
        real:        torch.Tensor,
        imag:        torch.Tensor,
        user_phases: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Applies complex rotation Ψ_new = Ψ · e^(iθ_user).
        real, imag: (batch, seq_len, embed_dim)
        user_phases: (embed_dim,)
        """
        u = user_phases.unsqueeze(0).unsqueeze(0)   # (1, 1, embed_dim)
        cos_u = torch.cos(u)
        sin_u = torch.sin(u)
        # (R + iI)(cosθ + isinθ) = (R·cosθ − I·sinθ) + i(R·sinθ + I·cosθ)
        anchored_real = real * cos_u - imag * sin_u
        anchored_imag = real * sin_u + imag * cos_u
        return anchored_real, anchored_imag


# ── Alternative single-block model (structural pipeline reference) ────────────

class QuantumInspiredWaveModel(nn.Module):
    """
    Simpler single-block wave model matching the structural pipeline design.
    Exposes (stable_real, stable_imag, resonance_scores) from every forward pass
    for coherence loss computation and register inspection.

    For the multi-layer version with multi-head attention and phase_report(),
    use WaveSequenceModel. This class is a cleaner, more self-contained reference
    for the core short-term + long-term memory + PhaseLockNorm pipeline.

    Architecture:
        NarrativeWaveEmbedding (with viscosity)
        → cat([real, imag])  → WaveResonanceMemory (short-term)
        → split → StandingWaveMemoryRegister (long-term)
        → combine → PhaseLockNorm
        → amplitude projection → logits
    """

    def __init__(
        self,
        vocab_size:          int,
        embed_dim:           int,
        num_memories:        int  = 64,
        use_locality_anchor: bool = False,
    ):
        super().__init__()
        self.half = embed_dim // 2
        self.embedding    = NarrativeWaveEmbedding(vocab_size, self.half)
        self.short_term   = WaveResonanceMemory(embed_dim)
        self.long_term    = StandingWaveMemoryRegister(num_memories, self.half)
        self.pl_norm      = PhaseLockNorm(self.half)
        self.r_proj       = nn.Linear(embed_dim, self.half)
        self.i_proj       = nn.Linear(embed_dim, self.half)
        self.out_proj     = nn.Linear(self.half, vocab_size)
        self.locality_anchor = (
            UserLocalityPhaseAnchor(self.half) if use_locality_anchor else None
        )
        self._user_phases:  Optional[torch.Tensor] = None
        self._last_scores:  Optional[torch.Tensor] = None

    def set_user_anchor(self, latitude: float, longitude: float, local_hour: float) -> None:
        if self.locality_anchor is None:
            raise RuntimeError("Initialise with use_locality_anchor=True first.")
        self._user_phases = self.locality_anchor.compute_user_anchor(
            latitude, longitude, local_hour
        )

    def clear_user_anchor(self) -> None:
        self._user_phases = None

    def forward(
        self, token_ids: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Returns: logits (B, T, vocab), stable_real (B, T, half),
                 stable_imag (B, T, half), resonance_scores (B, num_memories)
        """
        real, imag = self.embedding(token_ids)
        if self.locality_anchor is not None and self._user_phases is not None:
            real, imag = self.locality_anchor.apply_anchor_to_wave(
                real, imag, self._user_phases
            )
        x = torch.cat([real, imag], dim=-1)          # (B, T, embed_dim)

        attn_out = self.short_term(x)                # (B, T, embed_dim)
        r_attn   = self.r_proj(attn_out)             # (B, T, half)
        i_attn   = self.i_proj(attn_out)

        r_mem, i_mem, scores = self.long_term(r_attn.mean(1), i_attn.mean(1))
        self._last_scores = scores

        stable_r, stable_i = self.pl_norm(
            r_attn + r_mem.unsqueeze(1),
            i_attn + i_mem.unsqueeze(1),
        )

        amplitude = torch.sqrt(stable_r ** 2 + stable_i ** 2)
        logits    = self.out_proj(amplitude)
        return logits, stable_r, stable_i, scores

    @torch.no_grad()
    def generate_narrative(
        self,
        seed_token_ids: torch.Tensor,
        max_new_tokens: int = 20,
        temperature: float = 1.0,
        max_ctx: int = 256,
    ) -> List[int]:
        """Autoregressive generation loop. seed_token_ids: (1, seq_len)"""
        self.eval()
        current   = seed_token_ids.clone()
        generated: List[int] = []
        for _ in range(max_new_tokens):
            ctx    = current[:, -max_ctx:] if current.size(1) > max_ctx else current
            logits, _, _, _ = self.forward(ctx)
            probs      = torch.softmax(logits[:, -1, :] / max(temperature, 1e-6), dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            generated.append(int(next_token.item()))
            current    = torch.cat([current, next_token], dim=1)
        return generated

    def n_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters())
