#!/usr/bin/env python3
"""Wayglass Quad Eightfold independent agent QLoRA candidate trainer.

Training changes only the selected agent's LoRA adapter weights. The shared
base, other agents, deployments, canon and identity are not modified.
This executable requires a manifest issued by the provenance and agent-choice
contract; it deliberately has NO Hub upload path.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path


def canonical(value: object) -> str:
    # This is JCS-compatible for the bounded JSON used by the Wayglass
    # manifest (ASCII field keys, finite ordinary numbers, no -0).
    return json.dumps(value, ensure_ascii=False, allow_nan=False,
                      sort_keys=True, separators=(",", ":"))


def digest(value: object) -> str:
    return "wce1:" + hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def verified(value: dict, field: str) -> None:
    actual = value.get(field)
    body = {k: v for k, v in value.items() if k != field}
    if actual != digest(body):
        raise ValueError(f"{field} integrity mismatch")


def inspect_bundle(path: Path) -> tuple[dict, dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    manifest = payload.get("manifest")
    dataset = payload.get("dataset")
    if not isinstance(manifest, dict) or not isinstance(dataset, dict):
        raise ValueError("Bundle requires manifest and dataset")
    verified(manifest, "manifest_hash")
    verified(dataset, "dataset_hash")
    if manifest.get("schema") != "wayglass.agent-training-manifest/v1":
        raise ValueError("Wrong manifest schema")
    if dataset.get("schema") != "wayglass.agent-training-dataset/v1":
        raise ValueError("Wrong dataset schema")
    if manifest.get("dataset_hash") != dataset.get("dataset_hash"):
        raise ValueError("Manifest does not bind to dataset")
    if manifest.get("participant_id") != dataset.get("participant_id"):
        raise ValueError("Agent mismatch")
    if not manifest.get("may_train") or manifest.get("may_publish"):
        raise ValueError("Manifest is not a private training candidate")
    if dataset.get("provider_upload_allowed") is not False:
        raise ValueError("Dataset transfer rights not established")
    agent = str(manifest.get("participant_id", ""))
    adapter = str(manifest.get("adapter_namespace", ""))
    if not agent or not adapter.startswith(agent + "/"):
        raise ValueError("Agent-exclusive adapter namespace required")
    if not isinstance(dataset.get("entries"), list) or len(dataset["entries"]) < 10:
        raise ValueError("Training requires at least ten approved examples")
    for record in dataset["entries"]:
        msgs = record.get("messages")
        if not record.get("source_ref") or not isinstance(msgs, list) or len(msgs) != 2:
            raise ValueError("Malformed training record")
        if [m.get("role") for m in msgs] != ["user", "assistant"]:
            raise ValueError("Unapproved training role structure")
        if not all(isinstance(m.get("content"), str) and m["content"].strip() for m in msgs):
            raise ValueError("Empty training text")
    return manifest, dataset


def artifact_digest(directory: Path) -> str:
    h = hashlib.sha256()
    for file in sorted(directory.rglob("*")):
        if file.is_file() and file.name not in ("training-result.json", "trainer_state.json"):
            h.update(file.relative_to(directory).as_posix().encode("utf-8"))
            h.update(file.read_bytes())
    return "sha256:" + h.hexdigest()


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Wayglass independent agent QLoRA weight experiment")
    parser.add_argument("--bundle", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true", help="validate input and report plan without loading a model")
    parser.add_argument("--resume-adapter", type=Path, default=None,
                        help="continue from an independently approved adapter checkpoint")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--offline", action="store_true", help="require pretrained base to be locally cached")
    return parser.parse_args()


def main() -> None:
    a = args()
    manifest, dataset = inspect_bundle(a.bundle)
    plan = {
        "schema": "wayglass.qlora-planned-training/v1",
        "participant_id": manifest["participant_id"],
        "model": manifest["base_model"],
        "adapter_namespace": manifest["adapter_namespace"],
        "dataset_hash": dataset["dataset_hash"],
        "manifest_hash": manifest["manifest_hash"],
        "training_records": len(dataset["entries"]),
        "candidate_only": True,
        "public_upload": False,
    }
    if a.dry_run:
        print(json.dumps(plan, indent=2))
        return
    import torch
    from datasets import Dataset
    from peft import LoraConfig, PeftModel
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    from trl import SFTConfig, SFTTrainer

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA-capable GPU needed for this QLoRA configuration; no CPU imitation")
    if a.output_dir.exists() and any(a.output_dir.iterdir()):
        raise ValueError("Output directory must be empty; never overwrite a prior agent adapter")
    a.output_dir.mkdir(parents=True, exist_ok=True)
    use_bf16 = bool(torch.cuda.is_bf16_supported())
    torch.manual_seed(a.seed)

    tokenizer = AutoTokenizer.from_pretrained(
        manifest["base_model"], trust_remote_code=False, local_files_only=a.offline)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    quant = BitsAndBytesConfig(
        load_in_4bit=True, bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if use_bf16 else torch.float16,
        bnb_4bit_use_double_quant=True)
    model = AutoModelForCausalLM.from_pretrained(
        manifest["base_model"], quantization_config=quant, device_map="auto",
        trust_remote_code=False, local_files_only=a.offline,
        torch_dtype=torch.bfloat16 if use_bf16 else torch.float16)
    model.config.use_cache = False

    peft_config = LoraConfig(
        r=manifest["training_parameters"]["rank"],
        lora_alpha=manifest["training_parameters"]["alpha"],
        lora_dropout=manifest["training_parameters"]["dropout"],
        bias="none", task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"])
    if a.resume_adapter:
        if not a.resume_adapter.is_dir():
            raise ValueError("Resume adapter unavailable")
        model = PeftModel.from_pretrained(model, str(a.resume_adapter), is_trainable=True)
        peft_config = None
    examples = [{
        "text": tokenizer.apply_chat_template(
            item["messages"], tokenize=False, add_generation_prompt=False)
    } for item in dataset["entries"]]
    split = Dataset.from_list(examples).train_test_split(
        test_size=manifest["training_parameters"]["heldout_fraction"],
        shuffle=True, seed=a.seed)
    config = SFTConfig(
        output_dir=str(a.output_dir),
        num_train_epochs=manifest["training_parameters"]["epochs"],
        per_device_train_batch_size=1, gradient_accumulation_steps=8,
        learning_rate=5e-5, warmup_ratio=0.08, max_grad_norm=1,
        logging_steps=1, save_strategy="epoch", max_length=2048,
        dataset_text_field="text", packing=False, bf16=use_bf16, fp16=not use_bf16,
        gradient_checkpointing=True, report_to="none",
        push_to_hub=False, seed=a.seed)
    trainer = SFTTrainer(
        model=model, args=config, train_dataset=split["train"],
        eval_dataset=split["test"], peft_config=peft_config,
        processing_class=tokenizer)
    trainer.train()
    metrics = trainer.evaluate()
    trainer.save_model(str(a.output_dir))
    tokenizer.save_pretrained(str(a.output_dir))
    result = {
        "schema": "wayglass.agent-weight-candidate-result/v1",
        "agent_instance_id": manifest["participant_id"],
        "participant_id": manifest["participant_id"],
        "manifest_hash": manifest["manifest_hash"],
        "dataset_hash": dataset["dataset_hash"],
        "adapter_digest": artifact_digest(a.output_dir),
        "evaluation_loss": float(metrics.get("eval_loss", math.nan)),
        "training_completed": True,
        "independent_evaluation": False,
        "deployment_status": "not-deployed",
        "canon_changed": False,
        "other_agents_changed": False,
    }
    (a.output_dir / "training-result.json").write_text(
        json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
