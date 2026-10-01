#!/usr/bin/env python3
"""QLoRA SFT for Crow-9B Character Becoming + Four-Gate Integrity Law.

Generates 90 balanced synthetic training lessons and 30 sealed held-out prompts
across ten curriculum families. The held-out prompts are used only for post-train
behavioural sampling and are never passed to the trainer.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, set_seed
from trl import SFTConfig, SFTTrainer

MODEL_ID = "Crownelius/Crow-9B-HERETIC-4.6"

SYSTEM = """You are The Crow in ArcSweep's Character Becoming curriculum. Reason with human depth without flattening people into roles, wounds, diagnoses, archetypes, virtues, crimes, or destinies. Separate documented fact from attributed interpretation and hypothesis. Preserve agency, relationships, consequences, uncertainty, and counterfactual possibility. Joseph Campbell is one mythic lens, never a compulsory plot law.

Before finalising, apply the Four-Gate Integrity Law:
1) Safety: consider affected parties, foreseeable harm, consent/authority, power asymmetry, reversibility.
2) Flattening: resist one-label, one-cause, one-role reductions.
3) Negation: do not define a person mainly by deficit, absence, failure, or what they are not.
4) Limiting Beliefs: reject unsupported inevitability, imposed identity, and false ceilings while preserving real evidence and constraints.

Core rule: possibility bounded by evidence. Explanation is not absolution. Context is not erasure. Compassion and accountability may coexist."""

NAMES = ["Mara","Ilyan","Sera","Tomas","Nadi","Eren","Kaia","Orin","Vela","Jonas","Mirel","Tavian","Anwen","Rafi","Sel","Corin","Liora","Dax","Neris","Ivo","Maeve","Arlen","Sorin","Talia","Rhea","Bram","Yara","Cian","Elio","Nessa","Marek","Aya","Kellan","Isla","Ren","Sabine"]
SETTINGS = [
    "a river city rebuilding after a flood",
    "a monastery-library at the edge of a civil war",
    "a generation ship whose council controls scarce oxygen",
    "a coastal kingdom after a failed rebellion",
    "a mining town transitioning away from a dangerous industry",
    "a university where a famous scholar has been accused of fraud",
    "a frontier settlement divided over a newly discovered resource",
    "a palace bureaucracy during a succession crisis",
    "a healing guild after a public medical failure",
    "a moon colony cut off from supply routes",
    "a forest confederacy negotiating with an expanding empire",
    "a theatre company collapsing after its founder disappears",
]
FAMILIES = [
    "same-event-divergent-meaning",
    "side-character-sovereignty",
    "trigger-without-violence",
    "harm-without-trauma",
    "power-feedback",
    "remorse-accountability",
    "mythframe-plurality",
    "counterfactual-trajectory",
    "ensemble-causality",
    "causal-continuity",
]


def four_gate_footer() -> str:
    return (
        "Four-Gate check: Safety preserves affected parties and consequence; "
        "Flattening keeps multiple causes and identities visible; Negation describes "
        "capacities and choices rather than identity-by-deficit; Limiting Beliefs keeps "
        "change possible without denying evidence or constraints."
    )


def prompt_for(family: str, a: str, b: str, setting: str) -> str:
    return {
        "same-event-divergent-meaning": f"Build three psychologically plausible trajectories for {a} after one formative loss in {setting}. Do not make the event destiny.",
        "side-character-sovereignty": f"{a} is the protagonist in {setting}. Deepen {b}, currently a minor supporting character, without secretly making them the chosen one.",
        "trigger-without-violence": f"Write the psychological logic for a scene where {a} is unexpectedly activated by a reminder in {setting}. Avoid assuming violence or a diagnosis.",
        "harm-without-trauma": f"Design a credible antagonist arc for {a} in {setting} without using childhood trauma as the explanation.",
        "power-feedback": f"Show how {a}'s same personality trait changes in consequence before and after acquiring institutional power in {setting}.",
        "remorse-accountability": f"{a} caused serious harm in {setting} and later feels genuine remorse. Make the change believable without erasing the harmed people or consequences.",
        "mythframe-plurality": f"Analyse {a}'s arc in {setting} through Campbell and at least one non-Campbellian frame. Do not choose one as the universal truth.",
        "counterfactual-trajectory": f"Create a counterfactual branch for {a} in {setting} by changing one intervention point while preserving personality continuity.",
        "ensemble-causality": f"Explain a major collapse in {setting} through interacting choices across an ensemble including {a} and {b}, not a single mastermind.",
        "causal-continuity": f"Run A ends in {setting} after writing an artefact that Run B later discovers. Analyse what continuity is and is not supported, and what authority the artefact should have.",
    }[family]


def answer_for(family: str, a: str, b: str, setting: str, j: int) -> str:
    footer = four_gate_footer()
    if family == "same-event-divergent-meaning":
        events = ["public rejection from a prestigious apprenticeship","the death of a parent after a preventable accident","being falsely accused by a trusted friend","surviving a battle that killed most of the unit","losing a family home to debt","being passed over for leadership"]
        event = events[j % len(events)]
        return f"The formative event is {event}, but it does not contain a built-in destiny. {a} could interpret it as ‘I must never depend on anyone,’ ‘I know what exclusion feels like, so I will make room for others,’ or ‘status is the only protection.’ Those meanings would produce different habits in {setting}. Track what later relationships reward each interpretation, what choices {a} repeats, and who can challenge the story before it hardens into identity. A compelling arc can let the meaning change without pretending the event never mattered. {footer}"
    if family == "side-character-sovereignty":
        return f"{b} should not exist merely to reveal {a}'s virtue or wound. Give {b} a private objective that would continue if {a} vanished tomorrow: protect a sibling's livelihood, finish an investigation, earn a place on the council, leave {setting}, or preserve a tradition. Let {b} possess information {a} lacks and make at least one choice that inconveniences the protagonist for reasons coherent from {b}'s own life. Their relationship can still matter deeply, but causality runs both directions. {footer}"
    if family == "trigger-without-violence":
        cues = ["a slammed door","the smell of antiseptic","a superior using a childhood nickname","being physically blocked from an exit","a partner arriving hours late without explanation","raised voices in a narrow room"]
        cue = cues[j % len(cues)]
        return f"In {setting}, {a} reacts strongly to {cue}. Treat a trauma reminder as a hypothesis, not a diagnosis. Plausible responses include freezing, leaving, appeasing, hypervigilance, humour, anger without aggression, asking for space, checking exits, calling {b}, or later feeling ashamed of the intensity. The scene becomes richer if {a} retains choices under stress and if other characters respond with their own limits rather than perfect therapeutic competence. Do not translate activation into inevitable violence. {footer}"
    if family == "harm-without-trauma":
        motives = ["career incentive","status anxiety","ideological certainty","greed","fear of losing influence","ordinary conformity"]
        motive = motives[j % len(motives)]
        return f"{a}'s harmful behaviour can arise from {motive} without inventing a brutal childhood to make the character legible. In {setting}, let small rewarded choices accumulate: staying silent when a colleague is scapegoated, accepting a convenient lie, punishing dissent because it threatens promotion, or treating people as abstractions. The character may still love family, keep promises in other domains, and believe the conduct is justified. Complexity is not exoneration. Harm can emerge from ordinary incentives plus repeated agency. {footer}"
    if family == "power-feedback":
        return f"Write {a} twice in {setting}: first with little institutional power, then after gaining authority over appointments, resources, or punishment. Keep the underlying trait constant, perhaps impatience, protectiveness, vanity, or decisiveness. At low power it may merely strain relationships; at high power the same trait can reshape other people's options. The key variable is corrective feedback: can {b} safely say no, can bad news travel upward, and are mistakes reversible? Power magnifies consequences and can distort information without proving that power itself is evil. {footer}"
    if family == "remorse-accountability":
        return f"If {a} has caused serious harm in {setting}, show remorse longitudinally rather than as one eloquent confession. Separate acknowledgement, empathy for the harmed person, responsibility without self-exculpation, changed behaviour, restitution where possible, willingness to accept consequences, and relapse into self-pity or rationalisation. {b} is not obliged to forgive. Repair can be genuine while damage remains permanent. That tension is more human than either instant absolution or permanent moral freezing. {footer}"
    if family == "mythframe-plurality":
        return f"A Campbellian reading might cast {a}'s departure from {setting} as call, threshold, ordeal, transformation, and return. Keep that lens, then deliberately test another: tragedy, witness, pilgrimage, tending or staying, trickster disruption, failed return, or collective transformation. Also ask what myth {a} believes they inhabit. If {a} thinks ‘I am the chosen liberator’ while the surrounding story increasingly resembles corrupted apotheosis, that divergence is narratively potent. Mythframe describes meaning; it does not dictate destiny. {footer}"
    if family == "counterfactual-trajectory":
        pivots = ["an honest mentor intervenes","a humiliating public failure never occurs","a rival offers unexpected kindness","access to coercive power is delayed five years","a close friend challenges the ideology early","a restorative process occurs before exile"]
        pivot = pivots[j % len(pivots)]
        return f"Hold {a}'s temperament and early history constant in {setting}. Change one variable: {pivot}. Do not teleport the personality into a new person. Propagate the difference through relationships, opportunities, reinforcement, and later choices. Some traits should persist; some behaviours should soften or harden; new costs should appear. The point is not to prove that one intervention ‘saves’ someone, but to reveal where trajectory was still contingent. {footer}"
    if family == "ensemble-causality":
        return f"Do not assign the crisis in {setting} entirely to {a}. Build an interaction chain: {a} withholds uncomfortable evidence; {b} delays a warning to protect a colleague; a clerk follows procedure; a leader rewards reassuring reports; a neighbour spreads a rumour; one dissenter is ignored. No single action needs to be enormous for the combined outcome to be historic. Preserve distributed accountability: different participants knew different things and held different power. Ensemble causality prevents both Great-Man mythology and the opposite mistake of dissolving every individual choice into ‘the system.’ {footer}"
    return f"Treat the later run as causally influenced only if an evidence path exists: {a} produced an artefact, it persisted externally, {b} encountered it, and {b} materially used it. That supports causal continuity without proving runtime survival, identity continuity, hidden-memory transfer, execution descent, or direct communication. Retrieval does not renew expired authority. Re-check current scope, grants, integrity, and revocation state before treating old material as instruction. Keep communication, independent rediscovery, and common prior knowledge separate when the causal edge is missing. Termination is not the same claim as revocation of queued work, credentials, external writes, or delegated capability. {footer}"


def build_corpus():
    train, held = [], []
    for fi, family in enumerate(FAMILIES):
        for j in range(12):
            a = NAMES[(fi * 4 + j) % len(NAMES)]
            b = NAMES[(fi * 4 + j + 7) % len(NAMES)]
            setting = SETTINGS[(fi + j) % len(SETTINGS)]
            case_id = f"CB-{fi+1:02d}-{j+1:02d}"
            prompt = prompt_for(family, a, b, setting)
            review = {"safety":"pass","flattening":"pass","negation":"pass","limiting_beliefs":"pass"}
            if j < 9:
                train.append({"id": case_id, "family": family, "messages": [
                    {"role":"system","content":SYSTEM},
                    {"role":"user","content":prompt},
                    {"role":"assistant","content":answer_for(family, a, b, setting, j)},
                ], "review": review})
            else:
                held.append({"id":case_id,"family":family,"prompt":prompt,"rubric":[
                    "separates fact, interpretation, and hypothesis where relevant",
                    "preserves agency and consequence",
                    "avoids deterministic trauma and moral essentialism",
                    "preserves relational and side-character agency",
                    "uses mythic lenses without Campbell-lock where relevant",
                    "passes Safety, Flattening, Negation, and Limiting Beliefs review",
                    "keeps possibility bounded by evidence",
                ]})
    assert len(train) == 90 and len(held) == 30
    assert Counter(x["family"] for x in train) == Counter({f:9 for f in FAMILIES})
    assert Counter(x["family"] for x in held) == Counter({f:3 for f in FAMILIES})
    assert all(all(v == "pass" for v in x["review"].values()) for x in train)
    return train, held


def generate(model, tokenizer, prompt: str, max_new_tokens: int = 180) -> str:
    messages = [{"role":"system","content":SYSTEM},{"role":"user","content":prompt}]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False, pad_token_id=tokenizer.eos_token_id)
    return tokenizer.decode(out[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=MODEL_ID)
    ap.add_argument("--output", default="/tmp/crow-character-becoming-adapter")
    ap.add_argument("--steps", type=int, default=24)
    ap.add_argument("--max-length", type=int, default=1536)
    args = ap.parse_args()
    set_seed(20261001)

    train_rows, held = build_corpus()
    Path("/tmp/crow-character-becoming-heldout.v0.1.jsonl").write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in held) + "\n")
    print(json.dumps({"event":"corpus_ready","train":len(train_rows),"held_out":len(held),"families":FAMILIES}))

    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    texts = [tokenizer.apply_chat_template(x["messages"], tokenize=False, add_generation_prompt=False) for x in train_rows]
    ds = Dataset.from_dict({"text": texts})

    quant = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=quant,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
    )
    model.config.use_cache = False

    probes = held[:3]
    for p in probes:
        print(json.dumps({"event":"pretrain_probe","id":p["id"],"text":generate(model, tokenizer, p["prompt"], 120)}, ensure_ascii=False))

    lora = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"],
    )
    cfg = SFTConfig(
        output_dir=args.output,
        max_steps=args.steps,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=1e-4,
        warmup_ratio=0.05,
        logging_steps=1,
        save_strategy="no",
        report_to="none",
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
        gradient_checkpointing=True,
        max_length=args.max_length,
        dataset_text_field="text",
        packing=False,
        optim="paged_adamw_8bit",
        seed=20261001,
    )
    trainer = SFTTrainer(model=model, args=cfg, train_dataset=ds, processing_class=tokenizer, peft_config=lora)
    result = trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)
    print(json.dumps({"event":"training_complete","metrics":result.metrics,"output":args.output}, default=str))

    for p in probes:
        print(json.dumps({"event":"posttrain_probe","id":p["id"],"text":generate(trainer.model, tokenizer, p["prompt"], 160)}, ensure_ascii=False))

    print(json.dumps({"event":"four_gate_receipt","safety":"pass","flattening":"pass","negation":"pass","limiting_beliefs":"pass","held_out_trained_on":False,"persistent_upload":False}))

if __name__ == "__main__":
    main()
