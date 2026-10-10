#!/usr/bin/env python3
"""Rarity Atelier: conservative native .procreate layer-name normalizer.

Edits only strings referenced as SilicaLayer names inside Document.archive.
All raster tile/chunk payloads, thumbnails, previews, video, and other archive
members are copied byte-for-byte into a new .procreate file.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import plistlib
import re
import zipfile
from pathlib import Path

BLEND_NAMES = {
    0: "Normal", 1: "Multiply", 2: "Screen", 3: "Add", 4: "Lighten",
    5: "Exclusion", 6: "Difference", 7: "Subtract", 8: "Linear Burn",
    9: "Color Dodge", 10: "Color Burn", 11: "Overlay", 12: "Hard Light",
    13: "Color", 14: "Luminosity", 15: "Hue", 16: "Saturation",
    17: "Soft Light", 18: "Darker Color", 19: "Darken", 20: "Hard Mix",
    21: "Vivid Light", 22: "Linear Light", 23: "Pin Light", 24: "Lighter Color",
    25: "Darker Color", 26: "Divide",
}

DEFAULT_ALIASES = {
    "main color": "02 BASE | Coat",
    "main colour": "02 BASE | Coat",
    "base color": "02 BASE | Coat",
    "base colour": "02 BASE | Coat",
    "base": "02 BASE | Coat",
    "belly": "02 BASE | Belly",
    "wing membrane": "02 BASE | Wing Membrane",
    "wing webbing": "02 BASE | Wing Membrane",
    "wings (under)": "02 BASE | Wings Under",
    "wings (top)": "02 BASE | Wings Top",
    "ridges": "02 BASE | Ridges",
    "spines": "02 BASE | Spines",
    "spikes": "02 BASE | Spines",
    "nails": "02 BASE | Claws",
    "claws": "02 BASE | Claws",
    "claws and mouth": "02 BASE | Claws + Mouth",
    "eye": "07 EYES | Base",
    "eyes": "07 EYES | Base",
    "facets": "07 EYES | Facets",
    "mouth": "02 BASE | Mouth",
    "teeth": "02 BASE | Teeth",
    "shadow": "04 SHADE | Form Shadow",
    "shadows": "04 SHADE | Form Shadow",
    "shadows (multiply)": "04 SHADE | Form Shadow",
    "shading": "04 SHADE | Form Shadow",
    "light": "05 LIGHT | Broad Light",
    "light (overlay)": "05 LIGHT | Broad Light",
    "highlights": "05 LIGHT | Highlights",
    "shiny": "06 MATERIAL | Shine",
    "shine": "06 MATERIAL | Shine",
    "scales": "08 DETAIL | Scales",
    "lines": "09 LINEWORK | Lines",
    "linework": "09 LINEWORK | Lines",
    "mask": "00 HELPERS | Mask",
    "unfihished": "90 REVIEW | Unfinished",
    "unfinished": "90 REVIEW | Unfinished",
}

GENERIC_LAYER = re.compile(r"^layer\s+\d+(?:\s+copy)?$", re.I)


def _uid_index(value):
    if isinstance(value, plistlib.UID):
        return value.data
    if isinstance(value, int):
        return value
    return None


def _class_name(obj, objects):
    if not isinstance(obj, dict):
        return None
    idx = _uid_index(obj.get("$class"))
    if idx is None or not (0 <= idx < len(objects)):
        return None
    cls = objects[idx]
    return cls.get("$classname") if isinstance(cls, dict) else None


def _resolved(objects, value):
    idx = _uid_index(value)
    if idx is not None and 0 <= idx < len(objects):
        return objects[idx]
    return value


def load_document(path: Path):
    with zipfile.ZipFile(path, "r") as zf:
        raw = zf.read("Document.archive")
    archive = plistlib.loads(raw)
    return archive, archive.get("$objects", [])


def inspect_layers(path: Path):
    _, objects = load_document(path)
    rows = []
    for idx, obj in enumerate(objects):
        cls = _class_name(obj, objects)
        if not cls or "SilicaLayer" not in cls:
            continue
        name = _resolved(objects, obj.get("name"))
        uuid = _resolved(objects, obj.get("UUID"))
        if name == "$null":
            continue
        blend_id = obj.get("extendedBlend", obj.get("blend", 0))
        rows.append({
            "object_index": idx,
            "name": str(name) if name is not None else "",
            "uuid": str(uuid) if uuid not in (None, "$null") else "",
            "blend_id": blend_id,
            "blend": BLEND_NAMES.get(blend_id, "Unknown"),
            "opacity": obj.get("opacity", 1.0),
            "clipped": bool(obj.get("clipped", False)),
            "hidden": bool(obj.get("hidden", False)),
            "locked": bool(obj.get("locked", False)),
            "preserve_alpha": bool(obj.get("preserve", False)),
        })
    return rows


def canonical_name(name: str, blend: int, aliases: dict[str, str]):
    clean = name.strip()
    key = clean.casefold()
    if key in aliases:
        return aliases[key]
    if GENERIC_LAYER.match(clean):
        return f"90 REVIEW | {clean}"
    if key in {"shade", "shadow layer"} and blend == 1:
        return "04 SHADE | Form Shadow"
    if key in {"light layer", "lighting"} and blend in {2, 11, 17}:
        return "05 LIGHT | Broad Light"
    return clean


def member_hashes(path: Path):
    hashes = {}
    with zipfile.ZipFile(path, "r") as zf:
        for info in zf.infolist():
            if info.filename == "Document.archive":
                continue
            hashes[info.filename] = hashlib.sha256(zf.read(info.filename)).hexdigest()
    return hashes


def rewrite_archive(src: Path, dst: Path, aliases: dict[str, str]):
    archive, objects = load_document(src)
    changes = []
    for idx, obj in enumerate(objects):
        cls = _class_name(obj, objects)
        if not cls or "SilicaLayer" not in cls:
            continue
        name_idx = _uid_index(obj.get("name"))
        if name_idx is None or not (0 <= name_idx < len(objects)):
            continue
        old = objects[name_idx]
        if not isinstance(old, str) or old == "$null":
            continue
        blend = int(obj.get("extendedBlend", obj.get("blend", 0)) or 0)
        new = canonical_name(old, blend, aliases)
        if new != old:
            objects[name_idx] = new
            changes.append({"object_index": idx, "name_object_index": name_idx, "from": old, "to": new})

    new_archive = plistlib.dumps(archive, fmt=plistlib.FMT_BINARY, sort_keys=False)
    dst.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(dst, "w") as zout:
        for info in zin.infolist():
            data = new_archive if info.filename == "Document.archive" else zin.read(info.filename)
            new_info = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            new_info.compress_type = info.compress_type
            new_info.comment = info.comment
            new_info.extra = info.extra
            new_info.internal_attr = info.internal_attr
            new_info.external_attr = info.external_attr
            new_info.create_system = info.create_system
            new_info.flag_bits = info.flag_bits
            zout.writestr(new_info, data)
    return changes


def verify(src: Path, dst: Path):
    before = member_hashes(src)
    after = member_hashes(dst)
    missing = sorted(set(before) - set(after))
    added = sorted(set(after) - set(before))
    changed = sorted(k for k in before.keys() & after.keys() if before[k] != after[k])
    return {
        "payload_identical": not missing and not added and not changed,
        "missing_members": missing,
        "added_members": added,
        "changed_members": changed,
        "source_layers": inspect_layers(src),
        "output_layers": inspect_layers(dst),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    ap.add_argument("output", nargs="?", type=Path)
    ap.add_argument("--inspect", action="store_true")
    ap.add_argument("--mapping", type=Path, help="JSON object mapping original names to canonical names")
    ap.add_argument("--report", type=Path)
    args = ap.parse_args()

    if args.inspect:
        print(json.dumps({"file": str(args.source), "layers": inspect_layers(args.source)}, indent=2))
        return
    if not args.output:
        ap.error("output is required unless --inspect is used")

    aliases = dict(DEFAULT_ALIASES)
    if args.mapping:
        custom = json.loads(args.mapping.read_text("utf-8"))
        aliases.update({str(k).casefold(): str(v) for k, v in custom.items()})

    changes = rewrite_archive(args.source, args.output, aliases)
    report = {
        "source": str(args.source),
        "output": str(args.output),
        "changes": changes,
        "verification": verify(args.source, args.output),
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not report["verification"]["payload_identical"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
