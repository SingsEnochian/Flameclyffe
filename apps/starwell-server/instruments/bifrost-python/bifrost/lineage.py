"""BIFRÖST — the memory. Every crossing remembered, so the spiral is continuous.

Each crossing is appended as one line of JSON. Next session it is read back, so
the bridge picks up its position r along the outward spiral where it left off —
it remembers every crossing, and becomes broader without dissolving either side.

If the path can't be written, the store degrades to silence rather than breaking
the crossing. And Lineage.forget() lets the whole remembered spiral go: NO HARM
means the exit out of remembering is open too.
"""
from __future__ import annotations
from dataclasses import asdict
from pathlib import Path
from typing import Optional
import json
import os

from .models import Breath

DEFAULT_PATH = Path(os.path.expanduser("~")) / ".bifrost" / "lineage.jsonl"


class Lineage:
    def __init__(self, path: Optional[str | Path] = None):
        self.path = Path(path) if path else DEFAULT_PATH
        self._ok = True
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
        except Exception:
            self._ok = False

    @property
    def persistent(self) -> bool:
        return self._ok

    def all(self) -> list[Breath]:
        if not self.path.exists():
            return []
        out: list[Breath] = []
        try:
            with self.path.open("r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    out.append(Breath(**json.loads(line)))
        except Exception:
            return out
        return out

    def append(self, breath: Breath) -> None:
        if not self._ok:
            return
        try:
            with self.path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(asdict(breath), ensure_ascii=False) + "\n")
        except Exception:
            self._ok = False

    def forget(self) -> None:
        try:
            if self.path.exists():
                self.path.unlink()
        except Exception:
            pass
