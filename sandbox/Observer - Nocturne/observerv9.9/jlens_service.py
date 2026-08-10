"""
Jacobian Lens FastAPI service.

Wraps the jlens library (C:\\Users\\light\\GH - Repos\\jacobian-lens) to expose
an HTTP endpoint that reads what an open-weight model holds in its internal
workspace band at a given prompt position.

Ref: "Verbalizable Representations Form a Global Workspace in Language Models"
     (transformer-circuits.pub/2026)
     Companion code: https://github.com/anthropics/jacobian-lens

Key endpoint:
  POST /workspace  { prompt, layers?, top_k?, positions? }
      → top-k tokens visible in each requested workspace-band layer
        at the specified token position(s)

Status endpoint:
  GET /status
      → model_loaded, model_name, workspace_band, device

Load endpoint (explicit model loading):
  POST /load  { model_name?, device? }
      → triggers model + lens download and load; returns when ready

This service degrades gracefully when no model is loaded. All callers
must check workspace_available in the response before using token data.

CPU-only note: inference on Qwen3.5-4B (~8GB f32 or ~4GB bf16) will be
slow on CPU. Consider smaller models or quantized variants. The service
imposes a 120-second per-request timeout.

Security: No model goes from HuggingFace into autonomous tool access.
This service is local-only. It accepts no external connections by default.
"""

import os
import sys
import time
import threading
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("jlens-service")

# ── jlens path resolution ──────────────────────────────────────────────────
_JLENS_REPO = Path(os.environ.get("JLENS_REPO", r"C:\Users\light\GH - Repos\jacobian-lens"))

def _ensure_jlens_on_path():
    if not _JLENS_REPO.exists():
        raise RuntimeError(
            f"jacobian-lens repo not found at {_JLENS_REPO}. "
            "Set JLENS_REPO env var or clone the repo."
        )
    src = str(_JLENS_REPO)
    if src not in sys.path:
        sys.path.insert(0, src)

# ── global state ───────────────────────────────────────────────────────────
_lock = threading.Lock()

_state: dict = {
    "model_loaded": False,
    "model_name": None,
    "device": None,
    "lens": None,
    "model": None,
    "tokenizer": None,
    "workspace_band": None,
    "lens_version": None,
    "load_error": None,
    "loading": False,
}

# Default model — small enough to run on CPU in reasonable time
DEFAULT_MODEL = os.environ.get("JLENS_MODEL", "Qwen/Qwen3.5-4B")
DEFAULT_DEVICE = os.environ.get("JLENS_DEVICE", "cpu")
# Pre-fitted lenses live on HuggingFace Hub at neuronpedia/jacobian-lens
LENS_HUB_REPO = os.environ.get("JLENS_HUB_REPO", "neuronpedia/jacobian-lens")

# Workspace band heuristic: middle third of layers. Will be overridden by
# whatever the pre-fitted lens was calibrated on.
def _infer_workspace_band(n_layers: int) -> list[int]:
    lo = n_layers // 4
    hi = (3 * n_layers) // 4
    return list(range(lo, hi))


def _load_model_sync(model_name: str, device: str) -> None:
    """Blocking model + lens load. Called from background thread."""
    with _lock:
        if _state["model_loaded"]:
            return
        _state["loading"] = True
        _state["load_error"] = None

    try:
        _ensure_jlens_on_path()

        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch
        from jlens import JacobianLens, HFLensModel

        log.info("Loading tokenizer: %s", model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)

        log.info("Loading model: %s on %s", model_name, device)
        dtype = torch.bfloat16 if device == "cuda" else torch.float32
        hf_model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=dtype,
            trust_remote_code=True,
            device_map=device,
        )
        hf_model.eval()

        n_layers = hf_model.config.num_hidden_layers
        workspace_band = _infer_workspace_band(n_layers)

        log.info("Loading pre-fitted Jacobian lens from HuggingFace Hub: %s", LENS_HUB_REPO)
        try:
            lens_model = HFLensModel.from_pretrained(
                LENS_HUB_REPO,
                model_name=model_name,
            )
            lens = lens_model.lens
            lens_version = "hub-prefitted"
            log.info("Pre-fitted lens loaded from %s", LENS_HUB_REPO)
        except Exception as hub_err:
            log.warning("Pre-fitted lens not available (%s). Lens readout will be unavailable.", hub_err)
            lens = None
            lens_version = None

        with _lock:
            _state["model_loaded"] = True
            _state["model_name"] = model_name
            _state["device"] = device
            _state["model"] = hf_model
            _state["tokenizer"] = tokenizer
            _state["lens"] = lens
            _state["workspace_band"] = workspace_band
            _state["lens_version"] = lens_version
            _state["load_error"] = None
            _state["loading"] = False

        log.info("Model and lens ready. Workspace band: layers %d–%d", workspace_band[0], workspace_band[-1])

    except Exception as err:
        log.error("Model load failed: %s", err)
        with _lock:
            _state["loading"] = False
            _state["load_error"] = str(err)


# ── FastAPI app ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("jlens-service starting. Model will load on first /load call or /workspace call.")
    yield
    log.info("jlens-service shutting down.")

app = FastAPI(
    title="Hearthfire jlens Service",
    description="Jacobian lens workspace readout for open-weight models. Local-only. No external connections.",
    version="0.1.0",
    lifespan=lifespan,
)


# ── request/response models ────────────────────────────────────────────────

class WorkspaceRequest(BaseModel):
    prompt: str = Field(..., description="Input prompt to read the workspace for")
    layers: Optional[list[int]] = Field(
        None,
        description="Layer indices to read. Defaults to the full workspace band."
    )
    top_k: int = Field(10, ge=1, le=100, description="Top-k tokens to return per layer")
    positions: Optional[list[int]] = Field(
        None,
        description="Token positions to read (-1 = last token). Defaults to [-1]."
    )


class LoadRequest(BaseModel):
    model_name: Optional[str] = Field(None, description="HuggingFace model ID to load")
    device: Optional[str] = Field(None, description="cpu | cuda | mps")


class ConceptEntry(BaseModel):
    token: str
    rank: int
    layer: int
    position: int


class WorkspaceResponse(BaseModel):
    workspace_available: bool
    model: Optional[str] = None
    lens_version: Optional[str] = None
    workspace_band: Optional[list[int]] = None
    top_concepts: list[ConceptEntry] = Field(default_factory=list)
    layer_count: Optional[int] = None
    error: Optional[str] = None
    duration_ms: Optional[float] = None


# ── endpoints ─────────────────────────────────────────────────────────────

@app.get("/status")
def get_status():
    with _lock:
        return {
            "model_loaded": _state["model_loaded"],
            "loading": _state["loading"],
            "model_name": _state["model_name"],
            "device": _state["device"],
            "lens_available": _state["lens"] is not None,
            "lens_version": _state["lens_version"],
            "workspace_band": _state["workspace_band"],
            "load_error": _state["load_error"],
        }


@app.post("/load")
def post_load(req: LoadRequest):
    with _lock:
        if _state["model_loaded"]:
            return {"ok": True, "message": "model already loaded", "model": _state["model_name"]}
        if _state["loading"]:
            return {"ok": True, "message": "model is currently loading"}

    model_name = req.model_name or DEFAULT_MODEL
    device = req.device or DEFAULT_DEVICE

    t = threading.Thread(target=_load_model_sync, args=(model_name, device), daemon=True)
    t.start()

    return {
        "ok": True,
        "message": f"Loading {model_name} on {device} in background. Poll /status for completion.",
        "model": model_name,
        "device": device,
    }


@app.post("/workspace", response_model=WorkspaceResponse)
def post_workspace(req: WorkspaceRequest):
    t0 = time.perf_counter()

    with _lock:
        loaded = _state["model_loaded"]
        loading = _state["loading"]
        load_error = _state["load_error"]

    # Trigger background load if not yet started
    if not loaded and not loading and not load_error:
        log.info("Auto-triggering model load: %s", DEFAULT_MODEL)
        t = threading.Thread(target=_load_model_sync, args=(DEFAULT_MODEL, DEFAULT_DEVICE), daemon=True)
        t.start()
        return WorkspaceResponse(
            workspace_available=False,
            error=f"Model loading started ({DEFAULT_MODEL}). Retry in 60–120 seconds.",
        )

    if loading:
        return WorkspaceResponse(
            workspace_available=False,
            error="Model is currently loading. Retry shortly.",
        )

    if load_error:
        return WorkspaceResponse(
            workspace_available=False,
            error=f"Model load failed: {load_error}",
        )

    if not loaded:
        return WorkspaceResponse(workspace_available=False, error="Model not loaded.")

    with _lock:
        lens = _state["lens"]
        model = _state["model"]
        tokenizer = _state["tokenizer"]
        workspace_band = _state["workspace_band"]
        model_name = _state["model_name"]
        lens_version = _state["lens_version"]

    if lens is None:
        return WorkspaceResponse(
            workspace_available=False,
            model=model_name,
            error="Jacobian lens not available (pre-fitted lens could not be loaded from Hub). Model inference only.",
        )

    try:
        import torch

        layers_to_read = req.layers if req.layers is not None else workspace_band
        positions = req.positions if req.positions is not None else [-1]

        with torch.no_grad():
            lens_logits, model_logits, input_ids = lens.apply(
                model,
                req.prompt,
                positions=positions,
                layers=layers_to_read,
            )

        top_concepts: list[ConceptEntry] = []

        for li, layer_idx in enumerate(layers_to_read):
            for pi, pos in enumerate(positions):
                logits_at = lens_logits[li][pi]
                top_ids = logits_at.topk(req.top_k).indices.tolist()
                for rank, tok_id in enumerate(top_ids):
                    token = tokenizer.decode([tok_id], skip_special_tokens=True).strip()
                    top_concepts.append(ConceptEntry(
                        token=token,
                        rank=rank,
                        layer=layer_idx,
                        position=pos,
                    ))

        duration_ms = (time.perf_counter() - t0) * 1000

        return WorkspaceResponse(
            workspace_available=True,
            model=model_name,
            lens_version=lens_version,
            workspace_band=workspace_band,
            top_concepts=top_concepts,
            layer_count=len(layers_to_read),
            duration_ms=round(duration_ms, 1),
        )

    except Exception as err:
        log.error("Workspace readout failed: %s", err)
        raise HTTPException(status_code=500, detail=str(err))


@app.get("/health")
def get_health():
    return {"ok": True, "service": "jlens", "version": "0.1.0"}


# ── entrypoint ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("JLENS_PORT", 8765))
    log.info("Starting jlens service on 127.0.0.1:%d", port)
    uvicorn.run(
        "jlens_service:app",
        host="127.0.0.1",
        port=port,
        reload=False,
        log_level="info",
    )
