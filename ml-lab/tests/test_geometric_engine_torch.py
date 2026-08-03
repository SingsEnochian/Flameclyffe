from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")

from flameclyffe_ml.geometric_engine.torch_engine import (
    AnchorManifoldProjection,
    GeometricLanguageLoss,
    GeometricLanguageModel,
    HyperbolicPoincareBallAttention,
    ProjectiveQuinticProxy,
    RotatingPenteractProjection,
    direct_preference_optimisation_loss,
    generate_5d_rotation_matrix,
)


@pytest.mark.heavy
def test_anchor_projection_returns_live_geometry_and_gradient() -> None:
    layer = AnchorManifoldProjection(d_model=32, geometry_id="dodecahedron")
    layer.geometry_gate.data.fill_(0.25)

    hidden = torch.randn(2, 5, 32, requires_grad=True)
    delta, diagnostics = layer(hidden, return_diagnostics=True)

    assert delta.shape == hidden.shape
    assert diagnostics["live_gram"].shape == (2, 5, 20, 20)
    assert torch.isfinite(delta).all()

    delta.square().mean().backward()
    assert hidden.grad is not None
    assert torch.isfinite(hidden.grad).all()


@pytest.mark.heavy
def test_poincare_attention_is_causal() -> None:
    torch.manual_seed(7)
    attention = HyperbolicPoincareBallAttention(
        d_model=24,
        n_heads=4,
        dropout=0.0,
    ).eval()

    original = torch.randn(1, 6, 24)
    changed = original.clone()
    changed[:, 4:, :] = torch.randn_like(changed[:, 4:, :]) * 5.0

    with torch.no_grad():
        left = attention(original, is_causal=True)
        right = attention(changed, is_causal=True)

    assert torch.allclose(left[:, :4], right[:, :4], atol=1e-5, rtol=1e-5)


@pytest.mark.heavy
def test_5d_rotation_is_orthogonal_and_differentiable() -> None:
    angles = torch.randn(10, requires_grad=True)
    rotation = generate_5d_rotation_matrix(angles)

    identity = torch.eye(5)
    assert torch.allclose(rotation.T @ rotation, identity, atol=1e-5)
    assert torch.allclose(torch.linalg.det(rotation), torch.tensor(1.0), atol=1e-5)

    probe = torch.arange(25, dtype=rotation.dtype).view(5, 5)
    loss = (rotation * probe).sum()
    loss.backward()

    assert angles.grad is not None
    assert torch.linalg.vector_norm(angles.grad) > 0


@pytest.mark.heavy
def test_rotating_penteract_exposes_rotation_and_live_gram() -> None:
    layer = RotatingPenteractProjection(d_model=40)
    layer.geometry_gate.data.fill_(0.2)
    hidden = torch.randn(2, 4, 40)

    delta, diagnostics = layer(hidden, return_diagnostics=True)

    assert delta.shape == hidden.shape
    assert diagnostics["rotation"].shape == (5, 5)
    assert diagnostics["live_gram"].shape == (2, 4, 32, 32)


@pytest.mark.heavy
def test_projective_quintic_proxy_has_real_constraint_residual() -> None:
    proxy = ProjectiveQuinticProxy(d_model=32, sample_points=6)
    proxy.proxy_gate.data.fill_(0.1)
    hidden = torch.randn(2, 3, 32, requires_grad=True)

    delta, diagnostics = proxy(hidden, return_diagnostics=True)

    assert delta.shape == hidden.shape
    assert diagnostics["quintic_residual"].shape == (2, 3, 6)
    assert torch.isfinite(diagnostics["quintic_residual"]).all()

    diagnostics["quintic_residual"].mean().backward()
    assert hidden.grad is not None


@pytest.mark.heavy
def test_language_loss_uses_live_activations() -> None:
    torch.manual_seed(11)
    model = GeometricLanguageModel(
        vocab_size=31,
        d_model=32,
        n_heads=4,
        n_layers=1,
        max_sequence_length=16,
        geometry_id="penteract",
        enable_quintic_proxy=True,
    )
    for layer in model.layers:
        layer.geometry.geometry_gate.data.fill_(0.1)
        assert layer.quintic is not None
        layer.quintic.proxy_gate.data.fill_(0.1)

    tokens = torch.randint(0, 31, (2, 8))
    result = model(tokens, return_diagnostics=True)
    criterion = GeometricLanguageLoss("penteract")
    losses = criterion(result["logits"], tokens, result["layers"])

    assert losses["geometry"] > 0
    assert losses["quintic"] > 0
    losses["total"].backward()

    assert model.token_embedding.weight.grad is not None


@pytest.mark.heavy
def test_dpo_loss_is_finite_and_prefers_larger_policy_margin() -> None:
    baseline = direct_preference_optimisation_loss(
        policy_chosen_logp=torch.tensor([1.0]),
        policy_rejected_logp=torch.tensor([0.0]),
        reference_chosen_logp=torch.tensor([0.5]),
        reference_rejected_logp=torch.tensor([0.0]),
    )
    improved = direct_preference_optimisation_loss(
        policy_chosen_logp=torch.tensor([2.0]),
        policy_rejected_logp=torch.tensor([0.0]),
        reference_chosen_logp=torch.tensor([0.5]),
        reference_rejected_logp=torch.tensor([0.0]),
    )

    assert torch.isfinite(baseline)
    assert improved < baseline
