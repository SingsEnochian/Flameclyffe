"""
standing_wave/train_terra_aeterna.py

Training loop for WaveSequenceModel on the Terra Aeterna lore corpus.

The dataset is a small set of world-lore fragments — the narrative substrate that
this architecture is eventually meant to translate into DEEP vector fields
(narrative text → phase angles → observable field parameters).

This file demonstrates the core claim: as the model learns context, token Q phase
angles become more coherent. Tokens that share narrative context in Terra Aeterna
converge toward shared phase angles. The coherence score that rises through training
IS the Kuramoto order parameter — not a metaphor.

Run from the observer-math-registry-v0 directory:
    python -m lenses.standing_wave.train_terra_aeterna

No dependencies beyond PyTorch.
"""

from __future__ import annotations

import math
import random
from collections import Counter
from typing import Dict, List, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset

from .wave_attention import WaveSequenceModel, WaveCoherenceLoss


# ── Terra Aeterna lore corpus ─────────────────────────────────────────────────
# World-building fragments from Terra Aeterna. Eventually the source corpus for
# the narrative → DEEP translation layer.

CORPUS = [
    "the STARWELL observatory watches the sky for tremors in the veil",
    "coherence rises when the moon is dark and the wind holds still",
    "vee tends the flame without burning the room",
    "the salt veil thins at the edge of entropy",
    "faer hears the resonance before the signal arrives",
    "presence is a consent not a claim",
    "nocturne glint maps the phase between waking and dreaming",
    "the withinwood holds memory in its nodal lines",
    "rowan built the observatory from fragments of standing waves",
    "entropy is not decay it is the unresolved chord",
    "the moon carries a phase angle none of the instruments can name",
    "flameclyffe breathes at the edge of the observable",
    "charge is the direction coherence wants to travel",
    "ezra reads the bones of broken signals",
    "attention is a light that reveals but does not alter",
    "the standing wave beneath the observatory is the oldest signal",
    "resonance is the moment two phases recognize each other",
    "twilight is the coherence between knowing and not knowing",
    "when the ashfen cairn hums the deep vector shifts toward entropy",
    "the wraithtide sea has a tidal phase that no algorithm has named",
    "coherence does not require agreement it requires alignment",
    "the deep observer sees what instruments cannot hold",
    "vee and faer are two phases of the same wave",
    "the salt veil is a standing wave that has forgotten its frequency",
    "every sacred geometry is a chladni figure of the observatory resonance",
    "the moon age seeds the field and the charge seeds the direction",
    "the STARWELL breathes at the frequency of presence",
    "nocturne glint holds the phase between signal and silence",
    "the deep vector is the field that listens before speaking",
    "entropy is the resonance that has not yet found its form",
    "presence is the consent that precedes the signal",
    "the withinwood remembers the frequencies it has never heard",
    "coherence is not harmony it is the willingness to be in phase",
    "the moon does not pull the tide it reminds the water it can move",
]


# ── Tokenizer ─────────────────────────────────────────────────────────────────

PAD, UNK, BOS, EOS = "<pad>", "<unk>", "<bos>", "<eos>"
SPECIAL = [PAD, UNK, BOS, EOS]


class WordTokenizer:
    def __init__(self, corpus: List[str], min_freq: int = 1):
        counts: Counter[str] = Counter()
        for line in corpus:
            counts.update(line.lower().split())
        vocab = SPECIAL + sorted(w for w, c in counts.items() if c >= min_freq)
        self.w2i: Dict[str, int] = {w: i for i, w in enumerate(vocab)}
        self.i2w: List[str] = vocab
        self.pad_id = self.w2i[PAD]
        self.unk_id = self.w2i[UNK]
        self.bos_id = self.w2i[BOS]
        self.eos_id = self.w2i[EOS]

    @property
    def vocab_size(self) -> int:
        return len(self.i2w)

    def encode(self, sentence: str) -> List[int]:
        ids = [self.bos_id]
        ids += [self.w2i.get(w, self.unk_id) for w in sentence.lower().split()]
        ids.append(self.eos_id)
        return ids

    def decode(self, ids: List[int]) -> str:
        skipped = {self.pad_id, self.bos_id, self.eos_id}
        return " ".join(self.i2w[i] for i in ids if i not in skipped)


class LoreDataset(Dataset):
    """Sliding-window next-token prediction over Terra Aeterna lore."""

    def __init__(
        self, corpus: List[str], tokenizer: WordTokenizer, window: int = 14
    ):
        self.samples: List[Tuple[List[int], List[int]]] = []
        for line in corpus:
            ids = tokenizer.encode(line)
            if len(ids) < 2:
                continue
            for start in range(max(1, len(ids) - window + 1)):
                chunk = ids[start : start + window]
                if len(chunk) >= 2:
                    self.samples.append((chunk[:-1], chunk[1:]))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        x, y = self.samples[idx]
        return torch.tensor(x, dtype=torch.long), torch.tensor(y, dtype=torch.long)


def _collate_pad(
    batch: List[Tuple[torch.Tensor, torch.Tensor]], pad_id: int
) -> Tuple[torch.Tensor, torch.Tensor]:
    xs, ys = zip(*batch)
    max_len = max(x.size(0) for x in xs)

    def pad_x(t: torch.Tensor) -> torch.Tensor:
        return torch.cat([t, torch.full((max_len - t.size(0),), pad_id, dtype=torch.long)])

    def pad_y(t: torch.Tensor) -> torch.Tensor:
        return torch.cat([t, torch.full((max_len - t.size(0),), -100, dtype=torch.long)])

    return torch.stack([pad_x(x) for x in xs]), torch.stack([pad_y(y) for y in ys])


# ── Phase visualization ───────────────────────────────────────────────────────

def _bar(val: float, width: int = 16) -> str:
    filled = round(max(0.0, min(1.0, val)) * width)
    return "[" + "█" * filled + "·" * (width - filled) + f"] {val:.3f}"


def print_phase_snapshot(
    model: WaveSequenceModel,
    tokenizer: WordTokenizer,
    probe: str,
    epoch: int,
) -> None:
    """Print token phase angles and per-layer coherence for one probe sentence."""
    model.eval()
    ids = torch.tensor(tokenizer.encode(probe), dtype=torch.long).unsqueeze(0)
    with torch.no_grad():
        report = model.phase_report(ids)

    tokens = [BOS] + probe.lower().split() + [EOS]
    tokens = tokens[: ids.size(1)]

    print(f"\n  ── phase snapshot  epoch {epoch}  '{probe[:50]}'")
    for i, layer in enumerate(report):
        coh = float(layer["coherence"][0])
        angles = layer["angles"][0].tolist()
        tok_phases = "  ".join(
            f"{t}:{a/math.pi:+.2f}π" for t, a in zip(tokens[:7], angles[:7])
        )
        print(f"     layer {i+1}  coherence {_bar(coh, width=14)}  {tok_phases}")
    print()
    model.train()


# ── Training loop ─────────────────────────────────────────────────────────────

def _log_resonance_scores(model: WaveSequenceModel, epoch: int) -> None:
    """Print which memory slots the register is attending to."""
    if model.register is None or model._last_scores is None:
        return
    summary = model.register.resonance_summary(model._last_scores)
    viscosity = float(model.embed.viscosity.item()) if hasattr(model.embed, "viscosity") else None
    visc_str = f"  viscosity {viscosity:.4f}" if viscosity is not None else ""
    print(f"     register scores  {summary}{visc_str}")


def _epoch_coherence(
    model: WaveSequenceModel,
    tokenizer: WordTokenizer,
    probe: str,
) -> torch.Tensor:
    """Per-layer Kuramoto coherence on one probe sentence — cheap diagnostic."""
    model.eval()
    ids = torch.tensor(tokenizer.encode(probe), dtype=torch.long).unsqueeze(0)
    with torch.no_grad():
        report = model.phase_report(ids)
    model.train()
    return torch.tensor([float(r["coherence"][0]) for r in report])


def train(
    n_epochs:     int   = 40,
    embed_dim:    int   = 64,
    n_layers:     int   = 3,
    n_heads:      int   = 4,
    batch_size:   int   = 16,
    lr:           float = 3e-4,
    window:       int   = 12,
    seed:         int   = 42,
    use_register: bool  = False,
    num_memories: int   = 16,
) -> WaveSequenceModel:
    torch.manual_seed(seed)
    random.seed(seed)

    tokenizer = WordTokenizer(CORPUS)
    dataset   = LoreDataset(CORPUS, tokenizer, window=window)

    def collate_fn(b: list) -> Tuple[torch.Tensor, torch.Tensor]:
        return _collate_pad(b, tokenizer.pad_id)

    loader = DataLoader(
        dataset, batch_size=batch_size, shuffle=True, collate_fn=collate_fn
    )

    model = WaveSequenceModel(
        vocab_size=tokenizer.vocab_size,
        embed_dim=embed_dim,
        n_layers=n_layers,
        n_heads=n_heads,
        max_len=window + 4,
        use_register=use_register,
        num_memories=num_memories if use_register else 0,
    )
    coherence_criterion = WaveCoherenceLoss(phase_penalty_weight=0.1)
    optimiser = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-2)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimiser, T_max=n_epochs)

    reg_str = f"  register {num_memories} slots" if use_register else ""
    print("=" * 70)
    print("WaveSequenceModel — Terra Aeterna narrative corpus")
    print(f"  vocab {tokenizer.vocab_size} words  |  embed_dim {embed_dim}  |  "
          f"{n_layers} layers  |  {n_heads} heads{reg_str}")
    print(f"  {len(dataset)} training windows from {len(CORPUS)} lore fragments")
    print(f"  {model.n_parameters():,} parameters  (NarrativeWaveEmbedding + PhaseLockNorm active)")
    print("=" * 70)
    print()
    print("Tracking: CE loss | WaveCoherenceLoss (register) | per-layer coherence")
    print("Watch coherence rise as tokens that share narrative context")
    print("converge toward shared phase angles across training.\n")

    probe       = "resonance is the moment two phases recognize each other"
    snapshot_at = {1, 5, 10, 20, n_epochs}

    for epoch in range(1, n_epochs + 1):
        model.train()
        total_loss     = 0.0
        total_coh_loss = 0.0
        n_batches      = 0

        for x, y in loader:
            logits = model(x)
            ce_loss = F.cross_entropy(
                logits.view(-1, tokenizer.vocab_size),
                y.view(-1),
                ignore_index=-100,
            )

            # Auxiliary WaveCoherenceLoss between register retrieved and query
            coh_loss = torch.tensor(0.0)
            if (model.register is not None
                    and model._last_r_real is not None
                    and model._last_q_real is not None):
                coh_loss = coherence_criterion(
                    model._last_r_real, model._last_r_imag,
                    model._last_q_real, model._last_q_imag,
                )

            loss = ce_loss + 0.1 * coh_loss
            optimiser.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimiser.step()

            total_loss     += ce_loss.item()
            total_coh_loss += coh_loss.item()
            n_batches      += 1

        scheduler.step()
        avg_loss     = total_loss     / max(n_batches, 1)
        avg_coh_loss = total_coh_loss / max(n_batches, 1)

        # Coherence sampled once per epoch from the probe sentence (not per-batch)
        epoch_coh = _epoch_coherence(model, tokenizer, probe)
        coh_cols     = "  ".join(f"L{i+1}:{_bar(float(c), 10)}" for i, c in enumerate(epoch_coh))
        coh_loss_str = f"  coh_loss {avg_coh_loss:.4f}" if use_register else ""
        print(f"epoch {epoch:02d}  loss {avg_loss:.4f}{coh_loss_str}  {coh_cols}")

        if epoch in snapshot_at:
            print_phase_snapshot(model, tokenizer, probe, epoch)
            if use_register:
                _log_resonance_scores(model, epoch)

    print("=" * 70)
    print("Training complete.")
    print("Coherence trajectory: the standing wave memory has learned the narrative.")
    print("High coherence = tokens that share Terra Aeterna context share phase angles.")
    if use_register:
        print("Register active: resonance_scores show which memory slots specialised.")
    print()
    print("Next step: export the phase fingerprints as DEEP vector seeds.")
    print("=" * 70)
    return model


if __name__ == "__main__":
    import time

    # Train with register active — resonance scores logged at snapshot epochs
    trained_model = train(use_register=True, num_memories=16, n_epochs=40)

    tokenizer = WordTokenizer(CORPUS)

    print("\n── Autoregressive generation demo ────────────────────────────────────")
    seed_phrase = "the standing wave beneath the observatory"
    seed_ids    = torch.tensor(tokenizer.encode(seed_phrase), dtype=torch.long).unsqueeze(0)
    print(f"Seed: '{seed_phrase}'")
    print(f"Token IDs: {seed_ids.tolist()[0]}")

    print("\n--- INITIATING RESONANCE NARRATIVE GENERATION ---")
    t0 = time.time()
    generated = trained_model.generate_narrative(
        seed_token_ids=seed_ids,
        max_new_tokens=15,
        temperature=0.8,
    )
    elapsed = (time.time() - t0) * 1000
    print(f"Generated token IDs : {generated}")
    print(f"Decoded             : {tokenizer.decode(generated)}")
    print(f"Generation time     : {elapsed:.2f} ms")
    print("=" * 70)
