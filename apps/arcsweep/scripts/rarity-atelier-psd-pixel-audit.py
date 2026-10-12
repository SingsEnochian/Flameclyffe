#!/usr/bin/env python3
"""Independent exact-pixel audit for a source PSD and an Atelier derivative."""
from __future__ import annotations
import argparse, hashlib, json, subprocess
from pathlib import Path

def identify(path):
    fmt="%p\t%[label]\t%[compose]\t%g\\n"
    out=subprocess.check_output(["magick","identify","-format",fmt,str(path)],text=True,stderr=subprocess.DEVNULL)
    rows=[]
    for line in out.splitlines():
        p=line.split("\t")
        if len(p)>=4:
            rows.append({"index":int(p[0]),"label":p[1],"compose":p[2],"geometry":p[3]})
    return rows

def rgba_hash(path,index):
    proc=subprocess.Popen(["magick",f"{path}[{index}]","rgba:-"],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    h=hashlib.sha256()
    assert proc.stdout is not None
    while True:
        block=proc.stdout.read(1024*1024)
        if not block: break
        h.update(block)
    if proc.wait():
        raise RuntimeError(f"failed to decode PSD scene {index}: {path}")
    return h.hexdigest()

def audit(src,dst):
    a,b=identify(src),identify(dst)
    out={
      "source":str(src),"output":str(dst),
      "layer_count_equal":len(a)==len(b),
      "compose_equal":False,"geometry_equal":False,
      "scenes":[]
    }
    if len(a)!=len(b):
        out["passed"]=False
        return out
    out["compose_equal"]=all(x["compose"]==y["compose"] for x,y in zip(a,b))
    out["geometry_equal"]=all(x["geometry"]==y["geometry"] for x,y in zip(a,b))
    for x,y in zip(a,b):
        hs,hd=rgba_hash(src,x["index"]),rgba_hash(dst,y["index"])
        out["scenes"].append({
          "index":x["index"],"source_label":x["label"],"output_label":y["label"],
          "source_sha256_rgba":hs,"output_sha256_rgba":hd,"equal":hs==hd
        })
    out["all_pixels_equal"]=all(x["equal"] for x in out["scenes"])
    out["composite_equal"]=bool(out["scenes"] and out["scenes"][0]["equal"])
    out["passed"]=out["layer_count_equal"] and out["compose_equal"] and out["geometry_equal"] and out["all_pixels_equal"] and out["composite_equal"]
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("source",type=Path); ap.add_argument("output",type=Path)
    ap.add_argument("--report",type=Path)
    a=ap.parse_args()
    r=audit(a.source,a.output)
    if a.report:
        a.report.parent.mkdir(parents=True,exist_ok=True)
        a.report.write_text(json.dumps(r,indent=2),encoding="utf-8")
    print(json.dumps(r,indent=2))
    if not r.get("passed"): raise SystemExit(2)

if __name__=="__main__": main()
