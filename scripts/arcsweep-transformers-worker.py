#!/usr/bin/env python3
"""Resident JSON-lines text-generation worker for ArcSweep substrate experiments.

This is intentionally a thin substrate adapter. Identity, continuity, symbolic state,
routing and authority remain in ArcSweep; this process only turns an assembled prompt
into text with the requested Hugging Face causal LM.
"""

from __future__ import annotations

import gc
import json
import os
import sys
import traceback
from typing import Any

os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_TORCH", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

CURRENT_REF: str | None = None
TOKENIZER: Any = None
MODEL: Any = None
DEVICE = os.environ.get("ARCSWEEP_TRANSFORMERS_DEVICE", "cpu")


def emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def unload() -> None:
    global CURRENT_REF, TOKENIZER, MODEL
    MODEL = None
    TOKENIZER = None
    CURRENT_REF = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def load(model_ref: str) -> tuple[Any, Any]:
    global CURRENT_REF, TOKENIZER, MODEL
    if CURRENT_REF == model_ref and TOKENIZER is not None and MODEL is not None:
        return TOKENIZER, MODEL

    unload()
    tokenizer = AutoTokenizer.from_pretrained(model_ref)
    kwargs: dict[str, Any] = {"low_cpu_mem_usage": True}
    if DEVICE.startswith("cuda") and torch.cuda.is_available():
        kwargs["torch_dtype"] = torch.float16
    model = AutoModelForCausalLM.from_pretrained(model_ref, **kwargs)
    model.to(DEVICE)
    model.eval()

    CURRENT_REF = model_ref
    TOKENIZER = tokenizer
    MODEL = model
    return tokenizer, model


def render_prompt(tokenizer: Any, prompt: str) -> str:
    if getattr(tokenizer, "chat_template", None):
        try:
            return tokenizer.apply_chat_template(
                [{"role": "user", "content": prompt}],
                tokenize=False,
                add_generation_prompt=True,
            )
        except Exception:
            pass
    return prompt


def generate(payload: dict[str, Any]) -> dict[str, Any]:
    request_id = payload.get("id")
    model_ref = payload.get("model")
    prompt = payload.get("prompt")
    if not isinstance(model_ref, str) or not model_ref:
        raise ValueError("model must be a non-empty Hugging Face model ref")
    if not isinstance(prompt, str) or not prompt:
        raise ValueError("prompt must be a non-empty string")

    tokenizer, model = load(model_ref)
    rendered = render_prompt(tokenizer, prompt)
    encoded = tokenizer(rendered, return_tensors="pt")
    encoded = {key: value.to(DEVICE) for key, value in encoded.items()}
    input_len = int(encoded["input_ids"].shape[-1])
    max_new_tokens = int(payload.get("max_new_tokens") or 96)

    with torch.inference_mode():
        output = model.generate(
            **encoded,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )

    new_tokens = output[0][input_len:]
    text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    return {
        "id": request_id,
        "model": model_ref,
        "device": DEVICE,
        "text": text,
        "input_tokens": input_len,
        "output_tokens": int(new_tokens.shape[-1]),
    }


def main() -> None:
    emit({"event": "ready", "device": DEVICE})
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            payload = json.loads(raw)
            if payload.get("method") == "shutdown":
                emit({"id": payload.get("id"), "ok": True, "event": "shutdown"})
                break
            emit(generate(payload))
        except Exception as exc:
            emit({
                "id": (payload.get("id") if isinstance(locals().get("payload"), dict) else None),
                "error": f"{type(exc).__name__}: {exc}",
                "trace": traceback.format_exc(limit=4),
            })
    unload()


if __name__ == "__main__":
    main()
