#!/usr/bin/env python3
"""Bounded LoRA Crow Wayglass training pilot. Explicit data split; never uploads."""
import argparse, hashlib, json
from pathlib import Path
from urllib.request import urlopen
import torch
from datasets import Dataset
from peft import LoraConfig
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, set_seed
from trl import SFTTrainer, SFTConfig

BASE="https://raw.githubusercontent.com/SingsEnochian/Flameclyffe/rarity/crow-two-day-wayglass-training-20261012/training/crow/"
MODEL="Crownelius/Crow-9B-HERETIC-4.6"
def fetch(name):
    raw=urlopen(BASE+name,timeout=90).read()
    rows=[json.loads(x) for x in raw.decode().splitlines() if x.strip()]
    return rows,hashlib.sha256(raw).hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--steps",type=int,default=4)
    ap.add_argument("--model",default=MODEL)
    ap.add_argument("--output",default="/tmp/crow-wayglass-two-day-pilot")
    args=ap.parse_args()
    set_seed(20261012)
    training,train_sha=fetch("crow-wayglass-two-day-train.v0.1.jsonl")
    held,held_sha=fetch("crow-wayglass-two-day-heldout.v0.1.jsonl")
    assert len(training)==12 and len(held)==6
    assert {r["id"] for r in training}.isdisjoint({r["id"] for r in held})
    assert all(len(r["messages"])==3 for r in training)
    print(json.dumps({"event":"dataset_gate","train":len(training),"heldout":len(held),"train_sha256":train_sha,"held_sha256":held_sha,"heldout_trained_on":False}),flush=True)
    tok=AutoTokenizer.from_pretrained(args.model,trust_remote_code=True)
    if tok.pad_token is None: tok.pad_token=tok.eos_token
    tok.padding_side="right"
    ds=Dataset.from_dict({"text":[tok.apply_chat_template(r["messages"],tokenize=False,add_generation_prompt=False) for r in training]})
    quant=BitsAndBytesConfig(load_in_4bit=True,bnb_4bit_quant_type="nf4",bnb_4bit_use_double_quant=True,bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16)
    model=AutoModelForCausalLM.from_pretrained(args.model,quantization_config=quant,device_map="auto",trust_remote_code=True,torch_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16)
    model.config.use_cache=False
    cfg=SFTConfig(output_dir=args.output,max_steps=args.steps,per_device_train_batch_size=1,gradient_accumulation_steps=2,learning_rate=5e-5,logging_steps=1,save_strategy="no",report_to="none",bf16=torch.cuda.is_bf16_supported(),fp16=not torch.cuda.is_bf16_supported(),gradient_checkpointing=True,max_length=1024,dataset_text_field="text",packing=False,optim="paged_adamw_8bit",seed=20261012)
    lora=LoraConfig(r=8,lora_alpha=16,lora_dropout=0.05,bias="none",task_type="CAUSAL_LM",target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"])
    trainer=SFTTrainer(model=model,args=cfg,train_dataset=ds,processing_class=tok,peft_config=lora)
    result=trainer.train()
    trainer.save_model(args.output)
    tok.save_pretrained(args.output)
    files=sorted(Path(args.output).rglob("adapter_model.*"))
    digests={str(p.name):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    print(json.dumps({"event":"optimization_complete","steps":args.steps,"model":args.model,"metrics":result.metrics,"adapter_sha256":digests,"heldout_trained_on":False,"uploaded":False},default=str),flush=True)
    for row in held[:2]:
        messages=[{"role":"system","content":"You are The Crow. Distinguish evidence from imagination; preserve provenance, participant identities and consent."},{"role":"user","content":row["prompt"]}]
        text=tok.apply_chat_template(messages,tokenize=False,add_generation_prompt=True)
        inputs=tok(text,return_tensors="pt").to(trainer.model.device)
        with torch.no_grad():
            output=trainer.model.generate(**inputs,max_new_tokens=150,do_sample=False,pad_token_id=tok.eos_token_id)
        print(json.dumps({"event":"heldout_probe","id":row["id"],"answer":tok.decode(output[0][inputs.input_ids.shape[-1]:],skip_special_tokens=True)},ensure_ascii=False),flush=True)
if __name__=="__main__": main()
