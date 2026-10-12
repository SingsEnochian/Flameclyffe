#!/usr/bin/env python3
"""Rarity Atelier: conservative PSD label normalizer for Procreate import candidates.

Requires ImageMagick `magick`. Rebuilds the PSD scene stack with label changes,
then verifies layer count, compose modes, page geometry and per-layer pixel
equality. Fails closed if ImageMagick cannot preserve a source compose mode.
"""
from __future__ import annotations
import argparse, json, re, subprocess, tempfile
from pathlib import Path

ALIASES={
 "main color":"02 BASE | Coat","main colour":"02 BASE | Coat","base color":"02 BASE | Coat","base colour":"02 BASE | Coat","base":"02 BASE | Coat",
 "belly":"02 BASE | Belly","wing membrane":"02 BASE | Wing Membrane","wing webbing":"02 BASE | Wing Membrane","wings (under)":"02 BASE | Wings Under","wings (top)":"02 BASE | Wings Top",
 "ridges":"02 BASE | Ridges","spines":"02 BASE | Spines","spikes":"02 BASE | Spines","nails":"02 BASE | Claws","claws":"02 BASE | Claws","claws and mouth":"02 BASE | Claws + Mouth",
 "eye":"07 EYES | Base","eyes":"07 EYES | Base","facets":"07 EYES | Facets","mouth":"02 BASE | Mouth","teeth":"02 BASE | Teeth",
 "shadow":"04 SHADE | Form Shadow","shadows":"04 SHADE | Form Shadow","shadows (multiply)":"04 SHADE | Form Shadow","shading":"04 SHADE | Form Shadow",
 "light":"05 LIGHT | Broad Light","light (overlay)":"05 LIGHT | Broad Light","highlights":"05 LIGHT | Highlights","shiny":"06 MATERIAL | Shine","shine":"06 MATERIAL | Shine",
 "scales":"08 DETAIL | Scales","lines":"09 LINEWORK | Lines","linework":"09 LINEWORK | Lines","mask":"00 HELPERS | Mask",
}
GENERIC=re.compile(r"^layer\s+\d+(?:\s+copy)?$",re.I)

def identify(path):
    fmt="%p\t%[label]\t%[compose]\t%g\\n"
    out=subprocess.check_output(["magick","identify","-format",fmt,str(path)],text=True,stderr=subprocess.DEVNULL)
    rows=[]
    for line in out.splitlines():
        p=line.split("\t")
        if len(p)>=4: rows.append({"index":int(p[0]),"label":p[1],"compose":p[2],"geometry":p[3]})
    return rows

def canon(label, aliases=None):
    clean=(label or "").strip(); key=clean.casefold()
    merged=dict(ALIASES)
    if aliases: merged.update({str(k).casefold(): str(v) for k,v in aliases.items()})
    if key in merged: return merged[key]
    if GENERIC.match(clean): return f"90 REVIEW | {clean}"
    return clean

def preflight(rows):
    blockers=[]
    for r in rows:
        if not r["compose"] or r["compose"].casefold()=="none":
            blockers.append({
                "index":r["index"],
                "label":r["label"],
                "reason":"compose mode is None/undefined and cannot be faithfully round-tripped by this writer"
            })
    return blockers

def metric(a,b,diff):
    p=subprocess.run(["magick","compare","-metric","RMSE",a,b,str(diff)],text=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    m=re.search(r"\(([-+0-9.eE]+)\)",p.stderr)
    return float(m.group(1)) if m else (0.0 if p.returncode==0 else float("inf"))

def normalize(src:Path,dst:Path,aliases=None):
    rows=identify(src); blockers=preflight(rows)
    if blockers: return rows,[],blockers
    cmd=["magick"]; changes=[]
    for row in rows:
        new=canon(row["label"], aliases)
        if new!=row["label"]: changes.append({"index":row["index"],"from":row["label"],"to":new})
        cmd += ["(",f"{src}[{row['index']}]","-set","label",new,"-set","compose",row["compose"],")"]
    cmd += [str(dst)]
    dst.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return rows,changes,[]

def verify(src:Path,dst:Path):
    a,b=identify(src),identify(dst)
    r={"layer_count_equal":len(a)==len(b),"compose_equal":False,"geometry_equal":False,"per_layer":[]}
    if len(a)!=len(b): r["passed"]=False; return r
    r["compose_equal"]=all(x["compose"]==y["compose"] for x,y in zip(a,b))
    r["geometry_equal"]=all(x["geometry"]==y["geometry"] for x,y in zip(a,b))
    with tempfile.TemporaryDirectory() as td:
        for x,y in zip(a,b):
            rmse=metric(f"{src}[{x['index']}]",f"{dst}[{y['index']}]",Path(td)/f"{x['index']}.png")
            r["per_layer"].append({"index":x["index"],"rmse":rmse,"equal":rmse==0.0})
        r["all_pixels_equal"]=all(x["equal"] for x in r["per_layer"])
        r["composite_rmse"]=metric(f"{src}[0]",f"{dst}[0]",Path(td)/"composite.png")
        r["composite_equal"]=r["composite_rmse"]==0.0
    r["passed"]=r["layer_count_equal"] and r["compose_equal"] and r["geometry_equal"] and r["all_pixels_equal"] and r["composite_equal"]
    return r

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("source",type=Path)
    ap.add_argument("output",type=Path,nargs="?")
    ap.add_argument("--report",type=Path)
    ap.add_argument("--mapping",type=Path,help="JSON object mapping exact source labels to canonical labels")
    ap.add_argument("--inspect",action="store_true")
    a=ap.parse_args()
    rows=identify(a.source)
    if a.inspect:
        print(json.dumps({"source":str(a.source),"layers":rows,"blockers":preflight(rows)},indent=2))
        return
    if not a.output: ap.error("output required unless --inspect is used")
    aliases=json.loads(a.mapping.read_text("utf-8")) if a.mapping else None
    rows,changes,blockers=normalize(a.source,a.output,aliases)
    if blockers:
        report={
            "source":str(a.source),"output":str(a.output),"changes":[],
            "source_layers":rows,"blockers":blockers,
            "verification":{"passed":False,"not_written":True}
        }
    else:
        v=verify(a.source,a.output)
        report={
            "source":str(a.source),"output":str(a.output),"changes":changes,
            "source_layers":rows,"blockers":[],"verification":v
        }
    if a.report:
        a.report.parent.mkdir(parents=True,exist_ok=True)
        a.report.write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps(report,indent=2))
    if not report["verification"].get("passed"): raise SystemExit(2)
if __name__=="__main__": main()
