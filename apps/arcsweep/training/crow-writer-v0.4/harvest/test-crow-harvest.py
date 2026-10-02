#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
CLI = HERE / "crow-harvest.py"

def run(*args):
    return subprocess.run(
        ["python", str(CLI), *map(str,args)],
        text=True,
        capture_output=True,
        check=False,
    )

def main():
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        q = td / "queue.jsonl"
        rows = [
            {
                "id":"a","mode":"DIAGNOSE","prompt":"p","candidate":"c",
                "author_decision":"keep","author_note":"yes",
                "preferred_text":"chosen","rejected_text":"rejected",
                "preference_reason":"voice","tags":["voice"],"project":"test",
                "source_ref":"local:test:a","canon_status":"not-canon",
                "sensitive":False,"holdout":False
            },
            {
                "id":"b","mode":"DRAFT","prompt":"p2","candidate":"c2",
                "author_decision":"pending","tags":["draft"],"project":"test",
                "source_ref":"local:test:b","canon_status":"candidate",
                "sensitive":False,"holdout":None
            }
        ]
        q.write_text("".join(json.dumps(x)+"\n" for x in rows))

        r=run("validate",q)
        assert r.returncode==0, r.stderr+r.stdout
        out=td/"out"
        r=run("export",q,"--out",out,"--holdout-percent","20")
        assert r.returncode==0, r.stderr+r.stdout

        sft=(out/"sft.approved.jsonl").read_text()
        prefs=(out/"preferences.approved.jsonl").read_text()
        held=(out/"heldout.approved.jsonl").read_text()
        receipt=json.loads((out/"export-receipt.json").read_text())

        assert '"id": "a"' in sft
        assert '"id": "b"' not in sft
        assert '"id": "a"' in prefs
        assert held == ""
        assert receipt["approved_total"] == 1
        assert receipt["not_approved_total"] == 1

        # Secret scanner must block accidental token ingestion.
        bad=rows[0].copy()
        bad["id"]="secret"
        bad["candidate"]="hf_" + "x"*24
        q.write_text(json.dumps(bad)+"\n")
        r=run("validate",q)
        assert r.returncode==2
        assert "possible credential/secret detected" in r.stdout

    print("CROW_HARVEST_SMOKE=PASS")

if __name__=="__main__":
    main()
