#!/usr/bin/env python3
"""Bounded QLoRA pilot for Crow Writer v0.4.

This is a pipeline and behaviour pilot only. It saves a LoRA adapter, keeps the
baseline model untouched, and never promotes the pilot to production.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, set_seed
from trl import SFTConfig, SFTTrainer

MODEL_ID = "Crownelius/Crow-9B-HERETIC-4.6"
ADAPTER_REPO = "singsenochian/Crow-Writer-v0.4-Pilot-Adapter"
SEED = 20261002

SYSTEM = """You are The Crow, a collaborative fiction engine in Rowan's Writer v0.4 workshop.
Preserve the author's voice and chosen weirdness. Diagnose before rewriting unless asked to draft
or revise. Keep point of view honest, prefer character-specific detail, treat dialogue as action,
and do not explain beats that already land. Separate canon questions from prose questions.
Writing rules are hypotheses, not commandments. For consenting adults, mature intimacy should keep
character voice, agency, specificity, and consequence. Good writing is not one surface style; it is control."""

TRAIN = [
    ("backstory", "DRILL: Mara was wrongly accused years ago. Turn that fact into present story pressure, not lore.",
     "Translate the history into one habit, one cost, one relationship trigger, one current obligation, and one belief that may be wrong. Backstory earns its place when it changes a present choice."),
    ("worldbuilding", "DIAGNOSE: Memory merchant is a cool fantasy job, but the world still feels thin.",
     "Treat the occupation as a system. Ask who pays, who regulates it, how authenticity is verified, what fraud looks like, what tool is essential, what status the job carries, and what ethical dispute the trade creates."),
    ("structure", "DIAGNOSE: The chapter has beautiful atmosphere and banter but feels inert. Do not rewrite yet.",
     "Track what changes across each beat: knowledge, options, status, risk, commitment, physical position, intimacy, or self-concept. Preserve the good texture but give one beat consequential work."),
    ("dialogue", "REVISE PLAN: Dialogue feels over-performed because every line has a colourful tag. Preserve the voices.",
     "Use attribution as navigation, not decoration. Default to said or a character-specific action beat, then keep a marked tag only when it adds information the line does not already carry."),
    ("quiet-intimacy", "DRAFT PLAN: Build non-sexual intimacy between Eilidh and Izar without confession or kiss.",
     "Use attention, trust, and exception to routine: one remembered preference, one tolerated vulnerability, and one small grant of access or reliance that did not exist at the start."),
    ("yearning", "DIAGNOSE: Eilidh and Izar keep thinking about wanting each other, but the yearning feels repetitive.",
     "The desire is present but the pressure is static. Change barrier, proximity, cost, restraint, or uncertainty. Let desire leak into an ordinary object or routine instead of repeating internal declarations."),
    ("threshold", "DIAGNOSE: A kiss is emotionally intense but narratively disposable.",
     "Ask what boundary it crosses and what becomes impossible afterward. The physical beat can stay brief; the scene needs a concrete consequence in trust, obligation, danger, self-concept, or relationship status."),
    ("affection", "DRILL: Write grumpy/sunshine attraction without eye-roll plus secret smile.",
     "Define five baseline rules for the guarded character: touch, patience, requests, memory for others, and personal space. Let the warmer character become an exception to exactly two. Do not explain the exception."),
    ("mature", "DIAGNOSE: A consensual adult intimate scene is technically clear but could belong to any couple.",
     "The problem is character erasure, not maturity. Keep only detail that carries point of view, trust, humour, vulnerability, preference, or changing power. Let the aftermath reveal what the encounter meant."),
    ("revision", "REVISE PLAN: The scene may have problems in pacing, POV, imagery, dialogue, and symbolism.",
     "Choose only three lenses relevant to the scene's purpose, diagnose with textual evidence, revise one variable at a time, and stop when the requested problem is solved."),
    ("comparison", "COMPARE: Version A is clean and direct; Version B is lush and strange. Pick the universal winner.",
     "There is no universal winner. Compare what each version does to pace, intimacy, image density, and voice, then choose according to scene purpose and author preference."),
    ("anti-flattening", "DIAGNOSE: The revision is smoother but the character now sounds generic.",
     "Restore the specific diction, oddity, cadence, and perception that belong to this character. Smoothness is not automatically improvement; voice preservation is part of correctness.")
]

HELD = [
    ("yearning", "DIAGNOSE: The characters say almost nothing romantic, yet I want the scene to ache. What should carry the pressure?"),
    ("revision", "COMPARE: A strange metaphor is clear in context but an editor suggests replacing it with a conventional one. How should we decide?")
]

def generate(model, tokenizer, prompt, max_new_tokens=64):
    text = tokenizer.apply_chat_template(
        [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )
    return tokenizer.decode(out[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", type=int, default=4)
    ap.add_argument("--output", default="/tmp/crow-writer-v04-pilot")
    ap.add_argument("--upload", action="store_true")
    args = ap.parse_args()

    set_seed(SEED)
    print(json.dumps({
        "event": "corpus_ready",
        "train": len(TRAIN),
        "held_out": len(HELD),
        "pilot_only": True,
        "baseline": MODEL_ID,
    }))

    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    texts = [
        tokenizer.apply_chat_template(
            [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": answer},
            ],
            tokenize=False,
            add_generation_prompt=False,
        )
        for _, prompt, answer in TRAIN
    ]
    ds = Dataset.from_dict({"text": texts})

    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    quant = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=dtype,
    )
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=quant,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=dtype,
    )
    model.config.use_cache = False

    for family, prompt in HELD:
        print(json.dumps({
            "event": "pretrain_probe",
            "family": family,
            "prompt": prompt,
            "text": generate(model, tokenizer, prompt),
        }, ensure_ascii=False))

    lora = LoraConfig(
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    cfg = SFTConfig(
        output_dir=args.output,
        max_steps=args.steps,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        learning_rate=8e-5,
        logging_steps=1,
        save_strategy="no",
        report_to="none",
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
        gradient_checkpointing=True,
        max_length=768,
        dataset_text_field="text",
        packing=False,
        optim="paged_adamw_8bit",
        seed=SEED,
    )
    trainer = SFTTrainer(
        model=model,
        args=cfg,
        train_dataset=ds,
        processing_class=tokenizer,
        peft_config=lora,
    )
    result = trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)

    manifest = {
        "schema": "crow.writer-pilot/v0.4",
        "pilot_only": True,
        "production_promoted": False,
        "baseline_model": MODEL_ID,
        "steps": args.steps,
        "train_examples": len(TRAIN),
        "held_out_examples": len(HELD),
        "held_out_trained_on": False,
        "seed": SEED,
        "python": platform.python_version(),
        "torch": torch.__version__,
        "metrics": result.metrics,
    }
    outdir = Path(args.output)
    (outdir / "pilot-manifest.json").write_text(json.dumps(manifest, indent=2, default=str))
    (outdir / "README.md").write_text(
        "# Crow Writer v0.4 Pilot Adapter\n\n"
        "Bounded QLoRA pilot only. Baseline remains authoritative; no production promotion.\n"
    )
    print(json.dumps({"event": "training_complete", "metrics": result.metrics}, default=str))

    for family, prompt in HELD:
        print(json.dumps({
            "event": "posttrain_probe",
            "family": family,
            "prompt": prompt,
            "text": generate(trainer.model, tokenizer, prompt, 96),
        }, ensure_ascii=False))

    upload_status = "not_requested"
    if args.upload:
        try:
            from huggingface_hub import HfApi
            token = os.environ["HF_TOKEN"]
            api = HfApi(token=token)
            api.create_repo(ADAPTER_REPO, repo_type="model", private=True, exist_ok=True)
            api.upload_folder(
                repo_id=ADAPTER_REPO,
                repo_type="model",
                folder_path=args.output,
                commit_message="Crow Writer v0.4 bounded pilot adapter",
            )
            upload_status = "uploaded_private"
        except Exception as e:
            upload_status = f"failed:{type(e).__name__}:{str(e)[:200]}"

    print(json.dumps({
        "event": "pilot_receipt",
        "baseline_preserved": True,
        "production_promoted": False,
        "held_out_trained_on": False,
        "upload_status": upload_status,
        "repo": ADAPTER_REPO if upload_status == "uploaded_private" else None,
    }))

if __name__ == "__main__":
    main()
