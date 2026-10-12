#!/usr/bin/env python3
"""Read-only Rarity Atelier catalogue builder for PSD and native Procreate art."""
from __future__ import annotations
import argparse, json, plistlib, re, subprocess, zipfile
from pathlib import Path

GENERIC=re.compile(r"^layer\s*\d+",re.I)

def psd(path):
    fmt="%p\t%[label]\t%[compose]\t%g\\n"
    text=subprocess.check_output(["magick","identify","-format",fmt,str(path)],text=True,stderr=subprocess.DEVNULL)
    layers=[]
    for line in text.splitlines():
        p=line.split("\t")
        if len(p)>=4:
            layers.append({"index":int(p[0]),"name":p[1],"compose":p[2],"geometry":p[3]})
    flags=[]
    if any(not x["compose"] or x["compose"].casefold()=="none" for x in layers): flags.append("compose-undefined")
    if any(GENERIC.match(x["name"] or "") for x in layers): flags.append("generic-layer-names")
    return {"format":"psd","scene_count":len(layers),"layers":layers,"flags":flags}

def uid(v):
    if isinstance(v,plistlib.UID): return v.data
    if isinstance(v,int): return v
    return None

def procreate(path):
    with zipfile.ZipFile(path) as z:
        ar=plistlib.loads(z.read("Document.archive"))
    objs=ar.get("$objects",[])
    layers=[]
    for i,o in enumerate(objs):
        if not isinstance(o,dict): continue
        ci=uid(o.get("$class"))
        if ci is None or not (0<=ci<len(objs)) or not isinstance(objs[ci],dict): continue
        if "SilicaLayer" not in str(objs[ci].get("$classname","")): continue
        ni=uid(o.get("name")); name=objs[ni] if ni is not None and 0<=ni<len(objs) else ""
        if name=="$null": continue
        layers.append({"object_index":i,"name":str(name),"blend_id":o.get("extendedBlend",o.get("blend",0)),"opacity":o.get("opacity",1.0),"clipped":bool(o.get("clipped",False)),"hidden":bool(o.get("hidden",False))})
    flags=[]
    if any(GENERIC.match(x["name"]) for x in layers): flags.append("generic-layer-names")
    return {"format":"procreate","layer_count":len(layers),"layers":layers,"flags":flags}

def classify(path):
    low=str(path).casefold()
    species="firelizard" if "firelizard" in low else "wher" if "wher" in low else "seadragon" if "seadragon" in low else "dragon"
    state="unfinished" if "unfinished" in low else "finished-or-unknown"
    return species,state

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("roots",nargs="+",type=Path)
    ap.add_argument("--out",type=Path,required=True)
    a=ap.parse_args()
    rows=[]
    for root in a.roots:
        paths=[root] if root.is_file() else sorted(x for x in root.rglob("*") if x.is_file() and x.suffix.casefold() in {".psd",".procreate"})
        for p in paths:
            try:
                meta=procreate(p) if p.suffix.casefold()==".procreate" else psd(p)
                species,state=classify(p)
                rows.append({"path":str(p),"name":p.name,"species":species,"finish_state":state,**meta})
            except Exception as e:
                rows.append({"path":str(p),"name":p.name,"error":str(e)})
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps({"schema":"rarity.atelier.catalogue/v0.1","items":rows},indent=2),encoding="utf-8")
    print(json.dumps({"output":str(a.out),"items":len(rows)},indent=2))
if __name__=="__main__": main()
