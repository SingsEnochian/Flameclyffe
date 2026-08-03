"""PyTorch modules for the review-gated Geometric Manifold Engine.

The module contains computational representations. Geometry names identify mathematical
parameterisations; they do not assert physical ontology, diagnosis, or external cause.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any, Literal

import torch
import torch.nn as nn
import torch.nn.functional as F

from .contracts import ENGINE_VERSION, GeometricActivationControls, GeometryId
from .reference import reference_vertices

PENTERACT_PLANES: tuple[tuple[int, int], ...] = (
    (0, 1),
    (0, 2),
    (0, 3),
    (0, 4),
    (1, 2),
    (1, 3),
    (1, 4),
    (2, 3),
    (2, 4),
    (3, 4),
)


def geometry_tensor(
    geometry_id: GeometryId,
    *,
    dtype: torch.dtype = torch.float32,
    device: torch.device | str | None = None,
) -> torch.Tensor:
    """Return one normalised reference geometry without making it trainable."""

    return torch.as_tensor(
        reference_vertices(geometry_id).copy(),
        dtype=dtype,
        device=device,
    )


def generate_rotation_matrix(
    angles: torch.Tensor,
    *,
    dimension: int,
    planes: Sequence[tuple[int, int]] | None = None,
) -> torch.Tensor:
    """Construct a differentiable rotation from ordered Givens-plane angles."""

    expected = dimension * (dimension - 1) // 2
    if angles.ndim != 1 or angles.numel() != expected:
        raise ValueError(
            f"Expected {expected} angles for SO({dimension}), got {tuple(angles.shape)}"
        )

    if planes is None:
        planes = tuple(
            (left, right)
            for left in range(dimension)
            for right in range(left + 1, dimension)
        )
    if len(planes) != expected:
        raise ValueError(f"Expected {expected} planes, received {len(planes)}")

    rotation = torch.eye(
        dimension,
        dtype=angles.dtype,
        device=angles.device,
    )
    for angle, (axis_i, axis_j) in zip(angles.unbind(0), planes, strict=True):
        cosine = torch.cos(angle)
        sine = torch.sin(angle)
        plane = torch.eye(
            dimension,
            dtype=angles.dtype,
            device=angles.device,
        )
        plane[axis_i, axis_i] = cosine
        plane[axis_i, axis_j] = -sine
        plane[axis_j, axis_i] = sine
        plane[axis_j, axis_j] = cosine
        rotation = rotation @ plane
    return rotation


def generate_5d_rotation_matrix(angles: torch.Tensor) -> torch.Tensor:
    return generate_rotation_matrix(
        angles,
        dimension=5,
        planes=PENTERACT_PLANES,
    )


class AnchorManifoldProjection(nn.Module):
    """Nonlinear token-conditioned projection through a fixed anchor geometry.

    The module returns a geometric residual delta. The owning block controls the residual
    connection, preventing the hidden state from being added twice.
    """

    engine_version = ENGINE_VERSION

    def __init__(
        self,
        d_model: int,
        geometry_id: GeometryId = "dodecahedron",
        *,
        hidden_multiplier: int = 2,
    ) -> None:
        super().__init__()
        if d_model <= 0:
            raise ValueError("d_model must be positive")

        geometry = geometry_tensor(geometry_id)
        self.register_buffer("geometry", geometry)
        self.geometry_id = geometry_id
        self.d_model = d_model
        self.vertex_count = geometry.shape[0]
        self.ambient_dimension = geometry.shape[1]

        self.to_coordinates = nn.Linear(
            d_model,
            self.vertex_count * self.ambient_dimension,
        )
        feature_dim = self.vertex_count * 3
        self.from_features = nn.Sequential(
            nn.Linear(feature_dim, d_model * hidden_multiplier),
            nn.SiLU(),
            nn.Linear(d_model * hidden_multiplier, d_model),
        )
        self.log_temperature = nn.Parameter(torch.tensor(0.0))
        self.geometry_gate = nn.Parameter(torch.tensor(0.0))

    def active_geometry(
        self,
        x: torch.Tensor,
        rotation_angles: torch.Tensor | None = None,
    ) -> tuple[torch.Tensor, torch.Tensor | None]:
        del rotation_angles
        return self.geometry.to(dtype=x.dtype, device=x.device), None

    def forward(
        self,
        x: torch.Tensor,
        *,
        rotation_angles: torch.Tensor | None = None,
        temperature_override: torch.Tensor | float | None = None,
        gate_override: torch.Tensor | float | None = None,
        return_diagnostics: bool = False,
    ) -> torch.Tensor | tuple[torch.Tensor, dict[str, torch.Tensor]]:
        if x.ndim != 3:
            raise ValueError(f"Expected [batch, sequence, d_model], got {tuple(x.shape)}")
        if x.shape[-1] != self.d_model:
            raise ValueError(f"Expected d_model={self.d_model}, got {x.shape[-1]}")

        batch_size, sequence_length, _ = x.shape
        spatial = self.to_coordinates(x).view(
            batch_size,
            sequence_length,
            self.vertex_count,
            self.ambient_dimension,
        )
        spatial = F.normalize(spatial, dim=-1, eps=1e-8)

        active_geometry, rotation = self.active_geometry(x, rotation_angles)
        live_gram = torch.einsum("bsic,bsjc->bsij", spatial, spatial)
        resonance = torch.einsum("bsic,jc->bsij", spatial, active_geometry)

        temperature = (
            self.log_temperature.exp()
            if temperature_override is None
            else torch.as_tensor(
                temperature_override,
                dtype=x.dtype,
                device=x.device,
            )
        ).clamp(0.05, 20.0)
        anchor_weights = torch.softmax(resonance / temperature, dim=-1)
        selected_geometry = torch.einsum(
            "bsij,jc->bsic",
            anchor_weights,
            active_geometry,
        )

        alignment = torch.sum(spatial * selected_geometry, dim=-1)
        energy = torch.mean(resonance.square(), dim=-1)
        entropy = -torch.sum(
            anchor_weights * torch.log(anchor_weights.clamp_min(1e-9)),
            dim=-1,
        ) / math.log(float(self.vertex_count))

        feature_vector = torch.cat((alignment, energy, entropy), dim=-1)
        raw_delta = self.from_features(feature_vector)
        gate = (
            torch.tanh(self.geometry_gate)
            if gate_override is None
            else torch.as_tensor(
                gate_override,
                dtype=x.dtype,
                device=x.device,
            ).clamp(-1.0, 1.0)
        )
        delta = gate * raw_delta

        if return_diagnostics:
            diagnostics = {
                "spatial": spatial,
                "active_geometry": active_geometry,
                "live_gram": live_gram,
                "resonance": resonance,
                "anchor_weights": anchor_weights,
                "alignment": alignment,
                "energy": energy,
                "entropy": entropy,
                "gate": gate,
            }
            if rotation is not None:
                diagnostics["rotation"] = rotation
            return delta, diagnostics
        return delta


class RotatingPenteractProjection(AnchorManifoldProjection):
    """Penteract projection with one differentiable SO(5) orientation."""

    def __init__(self, d_model: int, *, learnable_rotation: bool = True) -> None:
        super().__init__(d_model=d_model, geometry_id="penteract")
        if learnable_rotation:
            self.rotation_angles = nn.Parameter(torch.zeros(10))
        else:
            self.register_buffer("rotation_angles", torch.zeros(10))

    def active_geometry(
        self,
        x: torch.Tensor,
        rotation_angles: torch.Tensor | None = None,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        angles = self.rotation_angles if rotation_angles is None else rotation_angles
        angles = angles.to(dtype=x.dtype, device=x.device)
        rotation = generate_5d_rotation_matrix(angles)
        geometry = self.geometry.to(dtype=x.dtype, device=x.device) @ rotation.T
        return geometry, rotation


class HyperbolicPoincareBallAttention(nn.Module):
    """Causal multi-head attention scored by Poincaré-ball distance."""

    def __init__(
        self,
        d_model: int,
        n_heads: int,
        *,
        dropout: float = 0.0,
        learnable_curvature: bool = True,
    ) -> None:
        super().__init__()
        if d_model % n_heads != 0:
            raise ValueError("d_model must be divisible by n_heads")
        self.d_model = d_model
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        self.eps = 1e-6

        self.q_proj = nn.Linear(d_model, d_model)
        self.k_proj = nn.Linear(d_model, d_model)
        self.v_proj = nn.Linear(d_model, d_model)
        self.out_proj = nn.Linear(d_model, d_model)

        raw_one = math.log(math.expm1(1.0))
        initial = torch.full((n_heads,), raw_one)
        if learnable_curvature:
            self.raw_curvature = nn.Parameter(initial)
        else:
            self.register_buffer("raw_curvature", initial)
        self.log_temperature = nn.Parameter(torch.zeros(n_heads))
        self.dropout = nn.Dropout(dropout)

    def _curvature(self, x: torch.Tensor) -> torch.Tensor:
        return (
            F.softplus(self.raw_curvature.to(dtype=x.dtype, device=x.device)) + 1e-4
        ).view(1, self.n_heads, 1, 1)

    def _expmap_zero(
        self,
        tangent: torch.Tensor,
        curvature: torch.Tensor,
    ) -> torch.Tensor:
        norm = torch.linalg.vector_norm(tangent, dim=-1, keepdim=True).clamp_min(self.eps)
        sqrt_c = torch.sqrt(curvature)
        point = torch.tanh(sqrt_c * norm) * tangent / (sqrt_c * norm)
        maximum_norm = (1.0 - self.eps) / sqrt_c
        point_norm = torch.linalg.vector_norm(point, dim=-1, keepdim=True).clamp_min(self.eps)
        return point * torch.minimum(torch.ones_like(point_norm), maximum_norm / point_norm)

    def _pairwise_distance(
        self,
        query: torch.Tensor,
        key: torch.Tensor,
        curvature: torch.Tensor,
    ) -> torch.Tensor:
        difference_squared = (
            query.unsqueeze(-2) - key.unsqueeze(-3)
        ).square().sum(dim=-1)
        query_norm_squared = query.square().sum(dim=-1).unsqueeze(-1)
        key_norm_squared = key.square().sum(dim=-1).unsqueeze(-2)
        denominator = (
            1.0 - curvature * query_norm_squared
        ) * (
            1.0 - curvature * key_norm_squared
        )
        argument = 1.0 + (
            2.0 * curvature * difference_squared
        ) / denominator.clamp_min(self.eps)
        return torch.acosh(argument.clamp_min(1.0 + self.eps)) / torch.sqrt(curvature)

    def forward(
        self,
        x: torch.Tensor,
        *,
        attention_mask: torch.Tensor | None = None,
        key_padding_mask: torch.Tensor | None = None,
        is_causal: bool = True,
        curvature_override: torch.Tensor | float | None = None,
        temperature_override: torch.Tensor | float | None = None,
        return_diagnostics: bool = False,
    ) -> torch.Tensor | tuple[torch.Tensor, dict[str, torch.Tensor]]:
        if x.ndim != 3 or x.shape[-1] != self.d_model:
            raise ValueError(
                f"Expected [batch, sequence, {self.d_model}], got {tuple(x.shape)}"
            )
        batch_size, sequence_length, _ = x.shape

        def split_heads(value: torch.Tensor) -> torch.Tensor:
            return value.view(
                batch_size,
                sequence_length,
                self.n_heads,
                self.head_dim,
            ).transpose(1, 2)

        q_tangent = split_heads(self.q_proj(x))
        k_tangent = split_heads(self.k_proj(x))
        values = split_heads(self.v_proj(x))
        curvature = (
            self._curvature(x)
            if curvature_override is None
            else torch.as_tensor(
                curvature_override,
                dtype=x.dtype,
                device=x.device,
            ).clamp(1e-4, 20.0).view(1, 1, 1, 1)
        )
        query = self._expmap_zero(q_tangent, curvature)
        key = self._expmap_zero(k_tangent, curvature)
        distance = self._pairwise_distance(query, key, curvature)

        temperature = (
            self.log_temperature.exp().clamp(0.05, 20.0).view(
                1,
                self.n_heads,
                1,
                1,
            )
            if temperature_override is None
            else torch.as_tensor(
                temperature_override,
                dtype=x.dtype,
                device=x.device,
            ).clamp(0.05, 20.0).view(1, 1, 1, 1)
        )
        scores = -distance / temperature

        if is_causal:
            causal_mask = torch.triu(
                torch.ones(
                    sequence_length,
                    sequence_length,
                    device=x.device,
                    dtype=torch.bool,
                ),
                diagonal=1,
            )
            scores = scores.masked_fill(
                causal_mask[None, None, :, :],
                torch.finfo(scores.dtype).min,
            )
        if attention_mask is not None:
            if attention_mask.dtype == torch.bool:
                scores = scores.masked_fill(
                    attention_mask,
                    torch.finfo(scores.dtype).min,
                )
            else:
                scores = scores + attention_mask
        if key_padding_mask is not None:
            scores = scores.masked_fill(
                key_padding_mask[:, None, None, :],
                torch.finfo(scores.dtype).min,
            )

        attention = self.dropout(torch.softmax(scores, dim=-1))
        context = torch.matmul(attention, values)
        context = context.transpose(1, 2).contiguous().view(
            batch_size,
            sequence_length,
            self.d_model,
        )
        output = self.out_proj(context)
        if return_diagnostics:
            return output, {
                "attention": attention,
                "distance": distance,
                "curvature": curvature,
                "temperature": temperature,
            }
        return output


class ProjectiveQuinticProxy(nn.Module):
    """Research proxy for a Fermat-quintic projective constraint.

    Five complex homogeneous coordinates are produced per sample point. The module
    measures the residual of sum(z_i**5)=0 and a Hermitian relation map. It does not
    calculate a Ricci-flat Calabi-Yau metric or an Euler characteristic.
    """

    def __init__(self, d_model: int, *, sample_points: int = 16) -> None:
        super().__init__()
        if sample_points < 2:
            raise ValueError("sample_points must be at least two")
        self.d_model = d_model
        self.sample_points = sample_points
        self.to_homogeneous = nn.Linear(
            d_model,
            sample_points * 5 * 2,
        )
        feature_dim = sample_points * sample_points + sample_points * 2
        self.from_proxy = nn.Sequential(
            nn.Linear(feature_dim, d_model * 2),
            nn.SiLU(),
            nn.Linear(d_model * 2, d_model),
        )
        self.proxy_gate = nn.Parameter(torch.tensor(0.0))

    def forward(
        self,
        x: torch.Tensor,
        *,
        tension: torch.Tensor | float = 1.0,
        gate_override: torch.Tensor | float | None = None,
        return_diagnostics: bool = False,
    ) -> torch.Tensor | tuple[torch.Tensor, dict[str, torch.Tensor]]:
        if x.ndim != 3 or x.shape[-1] != self.d_model:
            raise ValueError(
                f"Expected [batch, sequence, {self.d_model}], got {tuple(x.shape)}"
            )
        batch_size, sequence_length, _ = x.shape
        raw_pairs = self.to_homogeneous(x).view(
            batch_size,
            sequence_length,
            self.sample_points,
            5,
            2,
        )
        raw_complex = torch.view_as_complex(raw_pairs.contiguous())
        raw_norm_squared = raw_complex.abs().square().sum(dim=-1)
        homogeneous = raw_complex / torch.sqrt(
            raw_norm_squared.clamp_min(1e-8)
        ).unsqueeze(-1)

        quintic_residual = homogeneous.pow(5).sum(dim=-1).abs().square()
        hermitian = homogeneous @ homogeneous.conj().transpose(-2, -1)
        tension_tensor = torch.as_tensor(
            tension,
            dtype=x.dtype,
            device=x.device,
        ).clamp_min(1e-4)
        interaction = torch.tanh(hermitian.real / tension_tensor)
        kahler_proxy = torch.log1p(raw_norm_squared)

        features = torch.cat(
            (
                interaction.flatten(-2),
                quintic_residual,
                kahler_proxy,
            ),
            dim=-1,
        )
        raw_delta = self.from_proxy(features)
        gate = (
            torch.tanh(self.proxy_gate)
            if gate_override is None
            else torch.as_tensor(
                gate_override,
                dtype=x.dtype,
                device=x.device,
            ).clamp(-1.0, 1.0)
        )
        delta = gate * raw_delta

        if return_diagnostics:
            return delta, {
                "homogeneous": homogeneous,
                "quintic_residual": quintic_residual,
                "hermitian": hermitian,
                "interaction": interaction,
                "kahler_proxy": kahler_proxy,
                "gate": gate,
            }
        return delta


class ComplexInterferenceDecoder(nn.Module):
    """Complex-interference-inspired vocabulary head returning ordinary logits."""

    def __init__(self, d_model: int, vocab_size: int) -> None:
        super().__init__()
        self.amplitude_head = nn.Linear(d_model, vocab_size)
        self.phase_head = nn.Linear(d_model, vocab_size)
        self.interference_scale = nn.Parameter(torch.tensor(0.0))

    def forward(
        self,
        hidden: torch.Tensor,
        *,
        coupling: torch.Tensor | float = 1.0,
        return_diagnostics: bool = False,
    ) -> torch.Tensor | tuple[torch.Tensor, dict[str, torch.Tensor]]:
        coupling_tensor = torch.as_tensor(
            coupling,
            dtype=hidden.dtype,
            device=hidden.device,
        ).clamp_min(1e-4)
        amplitude = F.softplus(self.amplitude_head(hidden)) + 1e-8
        phase = self.phase_head(hidden)
        scale = 2.0 * torch.tanh(self.interference_scale)
        logits = 2.0 * torch.log(amplitude) + scale * torch.cos(phase / coupling_tensor)
        if return_diagnostics:
            return logits, {
                "amplitude": amplitude,
                "phase": phase,
                "interference_scale": scale,
            }
        return logits


class GeometricManifoldBlock(nn.Module):
    """Pre-normalised causal block with separate hyperbolic and geometric jobs."""

    def __init__(
        self,
        d_model: int,
        n_heads: int,
        *,
        geometry_id: GeometryId = "penteract",
        dropout: float = 0.0,
        enable_quintic_proxy: bool = False,
    ) -> None:
        super().__init__()
        self.geometry_id = geometry_id
        self.enable_quintic_proxy = enable_quintic_proxy

        self.attention_norm = nn.LayerNorm(d_model)
        self.attention = HyperbolicPoincareBallAttention(
            d_model,
            n_heads,
            dropout=dropout,
        )
        self.geometry_norm = nn.LayerNorm(d_model)
        if geometry_id == "penteract":
            self.geometry = RotatingPenteractProjection(d_model)
        else:
            self.geometry = AnchorManifoldProjection(d_model, geometry_id)

        self.quintic_norm = nn.LayerNorm(d_model)
        self.quintic = (
            ProjectiveQuinticProxy(d_model)
            if enable_quintic_proxy
            else None
        )

        self.feedforward_norm = nn.LayerNorm(d_model)
        self.feedforward = nn.Sequential(
            nn.Linear(d_model, d_model * 8),
            nn.SiLU(),
            nn.Linear(d_model * 8, d_model),
        )
        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        x: torch.Tensor,
        *,
        rotation_angles: torch.Tensor | None = None,
        activation_controls: GeometricActivationControls | None = None,
        return_diagnostics: bool = False,
    ) -> torch.Tensor | tuple[torch.Tensor, dict[str, Any]]:
        if activation_controls is not None and activation_controls.geometry_id != self.geometry_id:
            raise ValueError(
                "Activation controls geometry does not match block geometry: "
                f"{activation_controls.geometry_id} != {self.geometry_id}"
            )
        curvature = activation_controls.curvature if activation_controls is not None else None
        distance_temperature = (
            activation_controls.distance_temperature
            if activation_controls is not None
            else None
        )
        geometry_gate = (
            activation_controls.geometry_gate
            if activation_controls is not None
            else None
        )
        quintic_tension = (
            activation_controls.quintic_tension
            if activation_controls is not None
            else 1.0
        )
        if activation_controls is not None and rotation_angles is None:
            rotation_angles = x.new_tensor(activation_controls.rotation_angles)

        attention_output, attention_diagnostics = self.attention(
            self.attention_norm(x),
            is_causal=True,
            curvature_override=curvature,
            temperature_override=distance_temperature,
            return_diagnostics=True,
        )
        x = x + self.dropout(attention_output)

        geometry_delta, geometry_diagnostics = self.geometry(
            self.geometry_norm(x),
            rotation_angles=rotation_angles,
            temperature_override=distance_temperature,
            gate_override=geometry_gate,
            return_diagnostics=True,
        )
        x = x + self.dropout(geometry_delta)

        quintic_diagnostics: dict[str, torch.Tensor] | None = None
        if self.quintic is not None:
            quintic_delta, quintic_diagnostics = self.quintic(
                self.quintic_norm(x),
                tension=quintic_tension,
                gate_override=geometry_gate,
                return_diagnostics=True,
            )
            x = x + self.dropout(quintic_delta)

        x = x + self.dropout(self.feedforward(self.feedforward_norm(x)))
        if return_diagnostics:
            return x, {
                "attention": attention_diagnostics,
                "geometry": geometry_diagnostics,
                "quintic": quintic_diagnostics,
            }
        return x


class GeometricLanguageModel(nn.Module):
    """Small research decoder that can run as a separate local model worker."""

    def __init__(
        self,
        vocab_size: int,
        d_model: int,
        n_heads: int,
        n_layers: int,
        max_sequence_length: int,
        *,
        geometry_id: GeometryId = "penteract",
        enable_quintic_proxy: bool = False,
        decoder_kind: Literal["linear", "interference"] = "linear",
    ) -> None:
        super().__init__()
        self.max_sequence_length = max_sequence_length
        self.geometry_id = geometry_id
        self.enable_quintic_proxy = enable_quintic_proxy
        self.token_embedding = nn.Embedding(vocab_size, d_model)
        self.position_embedding = nn.Embedding(max_sequence_length, d_model)
        self.layers = nn.ModuleList(
            [
                GeometricManifoldBlock(
                    d_model,
                    n_heads,
                    geometry_id=geometry_id,
                    enable_quintic_proxy=enable_quintic_proxy,
                )
                for _ in range(n_layers)
            ]
        )
        self.final_norm = nn.LayerNorm(d_model)
        if decoder_kind == "linear":
            self.decoder: nn.Module = nn.Linear(d_model, vocab_size, bias=False)
            self.decoder.weight = self.token_embedding.weight
        else:
            self.decoder = ComplexInterferenceDecoder(d_model, vocab_size)

    def forward(
        self,
        tokens: torch.Tensor,
        *,
        rotation_angles: torch.Tensor | None = None,
        activation_controls: GeometricActivationControls | None = None,
        return_diagnostics: bool = False,
    ) -> torch.Tensor | dict[str, Any]:
        if tokens.ndim != 2:
            raise ValueError(f"Expected token IDs [batch, sequence], got {tuple(tokens.shape)}")
        sequence_length = tokens.shape[1]
        if sequence_length > self.max_sequence_length:
            raise ValueError(
                f"Sequence length {sequence_length} exceeds maximum "
                f"{self.max_sequence_length}"
            )

        positions = torch.arange(sequence_length, device=tokens.device).unsqueeze(0)
        hidden = self.token_embedding(tokens) + self.position_embedding(positions)
        diagnostics = []
        for layer in self.layers:
            if return_diagnostics:
                hidden, layer_diagnostics = layer(
                    hidden,
                    rotation_angles=rotation_angles,
                    activation_controls=activation_controls,
                    return_diagnostics=True,
                )
                diagnostics.append(layer_diagnostics)
            else:
                hidden = layer(
                    hidden,
                    rotation_angles=rotation_angles,
                    activation_controls=activation_controls,
                )

        hidden = self.final_norm(hidden)
        logits = self.decoder(hidden)
        if return_diagnostics:
            return {
                "logits": logits,
                "hidden": hidden,
                "layers": diagnostics,
            }
        return logits


class GeometricLanguageLoss(nn.Module):
    """Language loss plus live-activation geometry constraints."""

    def __init__(
        self,
        geometry_id: GeometryId,
        *,
        geometry_weight: float = 0.01,
        quintic_weight: float = 0.001,
        diversity_weight: float = 0.001,
        minimum_variance: float = 0.01,
    ) -> None:
        super().__init__()
        target = geometry_tensor(geometry_id)
        self.register_buffer("target_gram", target @ target.T)
        self.register_buffer(
            "off_diagonal",
            ~torch.eye(target.shape[0], dtype=torch.bool),
        )
        self.geometry_weight = geometry_weight
        self.quintic_weight = quintic_weight
        self.diversity_weight = diversity_weight
        self.minimum_variance = minimum_variance

    def forward(
        self,
        logits: torch.Tensor,
        targets: torch.Tensor,
        layer_diagnostics: Iterable[dict[str, Any]],
    ) -> dict[str, torch.Tensor]:
        if logits.shape[:-1] != targets.shape:
            raise ValueError(
                f"Logits {tuple(logits.shape[:-1])} and targets "
                f"{tuple(targets.shape)} do not align"
            )
        language = F.cross_entropy(
            logits.reshape(-1, logits.shape[-1]),
            targets.reshape(-1),
        )

        geometry_losses = []
        quintic_losses = []
        spatial_states = []
        target = self.target_gram[self.off_diagonal]

        for diagnostics in layer_diagnostics:
            geometry = diagnostics["geometry"]
            live = geometry["live_gram"][..., self.off_diagonal]
            geometry_losses.append(F.mse_loss(live, target.expand_as(live)))
            spatial_states.append(geometry["spatial"])
            quintic = diagnostics.get("quintic")
            if quintic is not None:
                quintic_losses.append(quintic["quintic_residual"].mean())

        geometry_loss = (
            torch.stack(geometry_losses).mean()
            if geometry_losses
            else logits.new_zeros(())
        )
        quintic_loss = (
            torch.stack(quintic_losses).mean()
            if quintic_losses
            else logits.new_zeros(())
        )
        token_variance = (
            torch.stack(
                [
                    state.var(dim=(0, 1), unbiased=False).mean()
                    for state in spatial_states
                ]
            ).mean()
            if spatial_states
            else logits.new_zeros(())
        )
        diversity_loss = F.relu(
            logits.new_tensor(self.minimum_variance) - token_variance
        )
        total = (
            language
            + self.geometry_weight * geometry_loss
            + self.quintic_weight * quintic_loss
            + self.diversity_weight * diversity_loss
        )
        return {
            "total": total,
            "language": language,
            "geometry": geometry_loss,
            "quintic": quintic_loss,
            "diversity": diversity_loss,
            "token_variance": token_variance,
        }


class PreferenceRewardModel(nn.Module):
    """Reward model trained from human preference pairs, not geometry alone."""

    def __init__(self, d_model: int) -> None:
        super().__init__()
        self.reward_head = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, d_model),
            nn.SiLU(),
            nn.Linear(d_model, 1),
        )

    def forward(
        self,
        hidden_states: torch.Tensor,
        *,
        attention_mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        token_rewards = self.reward_head(hidden_states).squeeze(-1)
        if attention_mask is None:
            return token_rewards.mean(dim=-1)
        weights = attention_mask.to(token_rewards.dtype)
        return (token_rewards * weights).sum(dim=-1) / weights.sum(dim=-1).clamp_min(1.0)


def preference_reward_loss(
    chosen_reward: torch.Tensor,
    rejected_reward: torch.Tensor,
) -> torch.Tensor:
    """Bradley-Terry loss for a human-labelled chosen/rejected pair."""

    return -F.logsigmoid(chosen_reward - rejected_reward).mean()


def sequence_log_probability(
    logits: torch.Tensor,
    labels: torch.Tensor,
    *,
    mask: torch.Tensor | None = None,
) -> torch.Tensor:
    token_log_probs = F.log_softmax(logits, dim=-1).gather(
        dim=-1,
        index=labels.unsqueeze(-1),
    ).squeeze(-1)
    if mask is None:
        return token_log_probs.sum(dim=-1)
    return (token_log_probs * mask.to(token_log_probs.dtype)).sum(dim=-1)


def direct_preference_optimisation_loss(
    *,
    policy_chosen_logp: torch.Tensor,
    policy_rejected_logp: torch.Tensor,
    reference_chosen_logp: torch.Tensor,
    reference_rejected_logp: torch.Tensor,
    beta: float = 0.1,
) -> torch.Tensor:
    """DPO objective with a frozen reference policy and human preference pairs."""

    policy_margin = policy_chosen_logp - policy_rejected_logp
    reference_margin = reference_chosen_logp - reference_rejected_logp
    return -F.logsigmoid(beta * (policy_margin - reference_margin)).mean()


class ExportableGeometricWrapper(nn.Module):
    """Bind an actual trained model to a fixed rotation for export."""

    def __init__(
        self,
        model: GeometricLanguageModel,
        *,
        rotation_angles: torch.Tensor | None = None,
    ) -> None:
        super().__init__()
        if model.enable_quintic_proxy:
            raise ValueError(
                "Projective quintic proxy is research-only and is not in the ONNX profile"
            )
        self.model = model
        angles = torch.zeros(10) if rotation_angles is None else rotation_angles.detach()
        self.register_buffer("rotation_angles", angles)

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        output = self.model(tokens, rotation_angles=self.rotation_angles)
        if not isinstance(output, torch.Tensor):
            raise RuntimeError("Export wrapper received diagnostic output")
        return output


def export_onnx(
    wrapper: ExportableGeometricWrapper,
    example_tokens: torch.Tensor,
    path: str | Path,
    *,
    opset_version: int = 18,
) -> Path:
    """Export the actual fixed-profile model. Runtime compatibility remains unverified."""

    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    wrapper.eval()
    torch.onnx.export(
        wrapper,
        (example_tokens,),
        destination,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["input_tokens"],
        output_names=["logits"],
        dynamic_axes={
            "input_tokens": {0: "batch", 1: "sequence"},
            "logits": {0: "batch", 1: "sequence"},
        },
    )
    return destination
