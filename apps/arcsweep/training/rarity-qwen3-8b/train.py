#!/usr/bin/env python3
import argparse
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

BASE_MODEL = "Qwen/Qwen3-8B"
DEFAULT_REPO = "singsenochian/rarity-qwen3-8b-lora-v0.1"


def parse_args():
    parser = argparse.ArgumentParser(description="Train the Rarity Qwen3-8B LoRA adapter.")
    parser.add_argument("--dataset", default=str(Path(__file__).with_name("seed.jsonl")))
    parser.add_argument("--output-dir", default="./rarity-qwen3-8b-lora-v0.1")
    parser.add_argument("--repo-id", default=DEFAULT_REPO)
    parser.add_argument("--push-to-hub", action="store_true")
    parser.add_argument("--epochs", type=float, default=3.0)
    parser.add_argument("--max-length", type=int, default=2048)
    return parser.parse_args()


def main():
    args = parse_args()
    use_bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    quant = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if use_bf16 else torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, use_fast=True)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=quant,
        device_map="auto",
        torch_dtype=torch.bfloat16 if use_bf16 else torch.float16,
    )
    model.config.use_cache = False

    dataset = load_dataset("json", data_files=args.dataset, split="train")

    def format_example(example):
        return tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )

    peft = LoraConfig(
        r=32,
        lora_alpha=64,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
    )

    config = SFTConfig(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=1e-4,
        warmup_ratio=0.08,
        logging_steps=1,
        save_strategy="epoch",
        max_length=args.max_length,
        packing=False,
        bf16=use_bf16,
        fp16=torch.cuda.is_available() and not use_bf16,
        gradient_checkpointing=True,
        report_to="none",
        push_to_hub=args.push_to_hub,
        hub_model_id=args.repo_id if args.push_to_hub else None,
    )

    trainer = SFTTrainer(
        model=model,
        args=config,
        train_dataset=dataset,
        peft_config=peft,
        formatting_func=format_example,
        processing_class=tokenizer,
    )
    trainer.train()
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    if args.push_to_hub:
        trainer.push_to_hub(commit_message="Train Rarity Qwen3-8B LoRA v0.1")


if __name__ == "__main__":
    main()
