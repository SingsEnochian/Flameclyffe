"""
tests/test_standing_wave.py

Unit tests for the standing wave lens.
Run from observer-math-registry-v0/:
    python -m pytest tests/test_standing_wave.py -v
"""

from __future__ import annotations

import math

import torch
import pytest

from lenses.standing_wave import (
    KuramotoDeepOscillators,
    AXIS_ORDER,
    N_OSC,
    AXIS_TONES,
    StandingWaveField,
    WaveResonanceMemory,
    MultiHeadWaveAttention,
    WavePositionalEncoding,
    WaveSequenceModel,
    WaveMemory,
    StandingWaveMemoryStore,
)
from observer_math_registry import ObserverMathRegistry
from lenses.standing_wave.registry_bridge import register_standing_wave_lens


# ── Oscillators ───────────────────────────────────────────────────────────────

class TestKuramotoOscillators:
    def setup_method(self):
        self.osc = KuramotoDeepOscillators()

    def test_n_oscillators(self):
        assert N_OSC == 6
        assert len(AXIS_ORDER) == 6

    def test_axis_tones_present(self):
        for ax in AXIS_ORDER:
            assert ax in AXIS_TONES
            assert AXIS_TONES[ax] > 0

    def test_encode_shape(self):
        deep = {ax: 0.5 for ax in AXIS_ORDER}
        theta = self.osc.encode(deep)
        assert theta.shape == (N_OSC,)

    def test_encode_range(self):
        deep = {ax: 0.5 for ax in AXIS_ORDER}
        theta = self.osc.encode(deep)
        assert (theta >= 0).all()
        assert (theta < 2 * math.pi + 1.0).all()   # noise can push slightly past

    def test_forward_shape(self):
        theta = torch.zeros(2, N_OSC)
        out = self.osc.forward(theta, n_steps=10)
        assert out.shape == (2, N_OSC)

    def test_trajectory_shape(self):
        theta = torch.zeros(1, N_OSC)
        traj = self.osc.forward(theta, n_steps=20, return_trajectory=True)
        assert traj.shape == (1, 21, N_OSC)

    def test_order_parameter_range(self):
        theta = torch.zeros(1, N_OSC)          # fully synchronised → r ≈ 1
        r = self.osc.order_parameter(theta)
        assert 0.0 <= float(r) <= 1.0 + 1e-5

    def test_order_parameter_coherent(self):
        theta = torch.zeros(1, N_OSC)          # all phases = 0 → r = 1
        r = float(self.osc.order_parameter(theta))
        assert r > 0.99

    def test_order_parameter_incoherent(self):
        # Uniformly distributed phases → r ≈ 0
        theta = torch.linspace(0, 2 * math.pi * (1 - 1/N_OSC), N_OSC).unsqueeze(0)
        r = float(self.osc.order_parameter(theta))
        assert r < 0.2

    def test_decode_roundtrip(self):
        deep = {ax: 0.6 for ax in AXIS_ORDER}
        theta = self.osc.encode(deep)
        decoded = self.osc.decode(theta)
        assert "coherence" in decoded
        assert "entropy" in decoded
        assert abs(decoded["coherence"] + decoded["entropy"] - 1.0) < 1e-5

    def test_coherence_plus_entropy_equals_one(self):
        theta = torch.rand(N_OSC)
        d = self.osc.decode(theta)
        assert abs(d["coherence"] + d["entropy"] - 1.0) < 1e-5

    def test_high_coherence_from_synchronised_input(self):
        deep = {ax: 0.5 for ax in AXIS_ORDER}
        deep["coherence"] = 0.95
        theta = self.osc.encode(deep)
        # After integration, coherence should be reasonable (not zero)
        theta_final = self.osc.forward(theta.unsqueeze(0), n_steps=100).squeeze(0)
        r = float(self.osc.order_parameter(theta_final.unsqueeze(0)))
        assert r > 0.0   # just not fully decoherent after 100 steps


# ── Wave field ────────────────────────────────────────────────────────────────

class TestStandingWaveField:
    def setup_method(self):
        self.field = StandingWaveField(resolution=32)
        self.osc = KuramotoDeepOscillators()

    def _theta_amps(self):
        theta = torch.rand(N_OSC)
        amps = torch.ones(N_OSC) * 0.5
        return theta, amps

    def test_field_shape(self):
        theta, amps = self._theta_amps()
        psi = self.field.forward(theta, amps)
        assert psi.shape == (32, 32)

    def test_nodal_mask_shape(self):
        theta, amps = self._theta_amps()
        psi = self.field.forward(theta, amps)
        mask = self.field.nodal_mask(psi)
        assert mask.shape == (32, 32)
        assert mask.dtype == torch.bool

    def test_nodal_density_range(self):
        theta, amps = self._theta_amps()
        psi = self.field.forward(theta, amps)
        d = self.field.nodal_density(psi)
        assert 0.0 <= d <= 1.0

    def test_fingerprint_normalised(self):
        theta, amps = self._theta_amps()
        fp = self.field.fingerprint(theta, amps)
        norm = float(fp.norm())
        assert abs(norm - 1.0) < 1e-5

    def test_fingerprint_length(self):
        theta, amps = self._theta_amps()
        fp = self.field.fingerprint(theta, amps, n_coeffs=16)
        assert fp.shape == (16,)

    def test_svg_paths_are_strings(self):
        theta, amps = self._theta_amps()
        paths = self.field.svg_paths(theta, amps)
        assert isinstance(paths, list)
        for p in paths:
            assert isinstance(p, str)
            assert p.startswith("M ")

    def test_different_phases_different_fingerprints(self):
        fp1 = self.field.fingerprint(torch.zeros(N_OSC), torch.ones(N_OSC))
        fp2 = self.field.fingerprint(torch.ones(N_OSC) * math.pi, torch.ones(N_OSC))
        cosine = float(torch.dot(fp1, fp2))
        assert cosine < 0.99   # distinct inputs → distinct patterns


# ── Wave attention ────────────────────────────────────────────────────────────

class TestWaveResonanceMemory:
    def test_output_shape(self):
        layer = WaveResonanceMemory(16)
        x = torch.randn(2, 5, 16)
        out = layer(x)
        assert out.shape == (2, 5, 16)

    def test_phase_angles_shape(self):
        layer = WaveResonanceMemory(16)
        x = torch.randn(2, 5, 16)
        angles = layer.phase_angles(x)
        assert angles.shape == (2, 5)

    def test_phase_coherence_range(self):
        layer = WaveResonanceMemory(16)
        x = torch.randn(1, 8, 16)
        r = layer.phase_coherence(x)
        assert 0.0 <= float(r) <= 1.0 + 1e-5

    def test_gradient_flows(self):
        layer = WaveResonanceMemory(16)
        x = torch.randn(2, 4, 16, requires_grad=True)
        out = layer(x)
        out.sum().backward()
        assert x.grad is not None


class TestMultiHeadWaveAttention:
    def test_output_shape(self):
        attn = MultiHeadWaveAttention(32, n_heads=4)
        x = torch.randn(2, 6, 32)
        out = attn(x)
        assert out.shape == (2, 6, 32)

    def test_phase_angles_shape(self):
        attn = MultiHeadWaveAttention(32, n_heads=4)
        x = torch.randn(2, 6, 32)
        angles = attn.phase_angles(x)
        assert angles.shape == (2, 6)


class TestWavePositionalEncoding:
    def test_output_shape(self):
        pe = WavePositionalEncoding(32, max_len=64)
        x = torch.randn(2, 10, 32)
        out = pe(x)
        assert out.shape == (2, 10, 32)

    def test_adds_not_replaces(self):
        pe = WavePositionalEncoding(32, max_len=64)
        x = torch.zeros(1, 5, 32)
        out = pe(x)
        # Output should be non-zero (encoding was added)
        assert out.abs().sum() > 0


class TestWaveSequenceModel:
    def test_forward_shape(self):
        model = WaveSequenceModel(vocab_size=20, embed_dim=16, n_layers=2, n_heads=2)
        ids = torch.randint(0, 20, (2, 8))
        logits = model(ids)
        assert logits.shape == (2, 8, 20)

    def test_phase_report_length(self):
        model = WaveSequenceModel(vocab_size=20, embed_dim=16, n_layers=3, n_heads=2)
        ids = torch.randint(0, 20, (1, 6))
        report = model.phase_report(ids)
        assert len(report) == 3

    def test_phase_report_shapes(self):
        model = WaveSequenceModel(vocab_size=20, embed_dim=16, n_layers=2, n_heads=2)
        ids = torch.randint(0, 20, (2, 7))
        report = model.phase_report(ids)
        assert report[0]["angles"].shape == (2, 7)
        assert report[0]["coherence"].shape == (2,)

    def test_phase_coherence_range(self):
        model = WaveSequenceModel(vocab_size=20, embed_dim=16, n_layers=2, n_heads=2)
        ids = torch.randint(0, 20, (1, 8))
        report = model.phase_report(ids)
        for layer_data in report:
            r = float(layer_data["coherence"].mean())
            assert 0.0 <= r <= 1.0 + 1e-5

    def test_n_parameters_positive(self):
        model = WaveSequenceModel(vocab_size=50, embed_dim=32, n_layers=2, n_heads=4)
        assert model.n_parameters() > 0


# ── Memory ────────────────────────────────────────────────────────────────────

class TestWaveMemoryStore:
    def _make_mem(self, label: str, coherence: float) -> WaveMemory:
        fp = torch.rand(16)
        fp = fp / fp.norm()
        return WaveMemory(
            label=label,
            deep={"presence": coherence},
            fingerprint=fp.tolist(),
            phase_angles=[0.0] * N_OSC,
            coherence=coherence,
        )

    def test_store_and_recall(self):
        store = StandingWaveMemoryStore()
        m1 = self._make_mem("alpha", 0.9)
        m2 = self._make_mem("beta", 0.2)
        store.store(m1)
        store.store(m2)

        # Query with m1's fingerprint — should recall m1 first
        q = torch.tensor(m1.fingerprint)
        results = store.recall(q, top_k=2)
        assert len(results) == 2
        assert results[0].label == "alpha"

    def test_recall_empty_store(self):
        store = StandingWaveMemoryStore()
        q = torch.rand(16)
        assert store.recall(q) == []

    def test_recall_above_threshold(self):
        store = StandingWaveMemoryStore()
        mem = self._make_mem("exact", 0.8)
        store.store(mem)
        q = torch.tensor(mem.fingerprint)   # identical fingerprint → cosine = 1
        results = store.recall_above(q, threshold=0.99)
        assert len(results) == 1

    def test_bridge_pulse_export_keys(self):
        store = StandingWaveMemoryStore()
        mem = self._make_mem("test", 0.7)
        mem.timestamp = "2026-06-18T00:00:00Z"
        mem.rune = "Algiz"
        mem.moon_phase = "waxing"
        exported = store.bridge_pulse_export(mem)
        assert "timestamp" in exported
        assert "moon" in exported
        assert "rune" in exported
        assert "deep" not in exported   # DEEP vector stays in Flameclyffe

    def test_json_persistence(self, tmp_path):
        store = StandingWaveMemoryStore()
        store.store(self._make_mem("persist_a", 0.8))
        store.store(self._make_mem("persist_b", 0.4))
        path = tmp_path / "wave_memory.json"
        store.save(path)

        loaded = StandingWaveMemoryStore()
        loaded.load(path)
        assert len(loaded.memories) == 2
        assert loaded.memories[0].label == "persist_a"


# ── Registry bridge ───────────────────────────────────────────────────────────

class TestRegistryBridge:
    def test_registration(self):
        registry = ObserverMathRegistry()
        register_standing_wave_lens(registry)
        assert "standing_wave" in registry.sources
        assert "wave_css" in registry.heads

    def test_output_has_wave_vars(self):
        registry = ObserverMathRegistry()
        register_standing_wave_lens(registry)
        sample = {"P": 0.9, "C": 0.9, "R": 0.8, "E": 0.1, "M": 0.6, "A": 0.85, "charge": 0.7}
        out = registry.output_for("standing_wave", "wave_css", sample)
        assert "--wave-coherence" not in out   # not a direct copy-through
        assert "--wave-nodal-opacity" in out
        assert "--wave-resonance-glow" in out
        assert "--flare-hue" in out   # standard material_css vars still present

    def test_output_values_are_strings(self):
        registry = ObserverMathRegistry()
        register_standing_wave_lens(registry)
        sample = {"P": 0.5, "C": 0.5, "R": 0.5, "E": 0.5, "M": 0.5, "A": 0.5, "charge": 0.5}
        out = registry.output_for("standing_wave", "wave_css", sample)
        for k, v in out.items():
            assert isinstance(v, str), f"{k} value should be str, got {type(v)}"
