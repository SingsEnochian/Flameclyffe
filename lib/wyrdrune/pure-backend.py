"""WTL v0.1 pure interpreter for the current JS-compiled AST.

This is a *second backend* for the existing wyrdrune.ir/v0.1 format, NOT a
WIR v0.2 compiler. It rejects bridges and host effects. No source parsing,
filesystem, subprocess, network, eval or provider dispatch occurs here.
"""
import json
import math
import sys
import unicodedata
from pathlib import Path

# -I isolates the interpreter from site/user paths; explicitly allow this
# pinned repository-local canonical codec, never caller-supplied modules.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from canonical import digest

PHASES = ("perceive", "compress", "release", "verify", "integrate",
          "choose", "return", "transcend")
NAMES = ("Pa", "Veh", "Ged", "Gal", "Or", "Un", "Graph",
         "Tal", "Gon", "Na", "Ur", "Mals", "Ger", "Drux",
         "Pal", "Med", "Don", "Ceph", "Van", "Fam", "Gisg")
MANUSCRIPT_NOTE = ("Dee/Kelley Angelical alphabet (26 March 1583, Sloane MS 3188); "
                   "comparison: esotericarchives.com/dee/holy_table_lettering.pdf; variants documented")
VARIANTS = {14: ["Drun"], 21: ["Gisa"]}


def _bound(value, label, limit):
    if not isinstance(value, str):
        raise TypeError(label + " must be text")
    value = unicodedata.normalize("NFC", value).strip()
    length = len(value.encode("utf-16-le", "surrogatepass")) // 2
    if not value or length > limit or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError(label + " must be nonempty printable text of at most " +
                         str(limit) + " UTF-16 code units")
    return value


def _seal(record):
    return {**record, "recordHash": digest(record)}


def _enochian(text, source="author-supplied"):
    return _seal({
        "schema": "wyrdrune.ritual.enochian/v0.1",
        "kind": "inscription",
        "tradition": "Angelical/Enochian",
        "transcription": _bound(text, "inscription", 512),
        "sourceLabel": _bound(source, "source label", 160),
        "sourceStatus": "unverified-author-assertion",
        "translation": None,
        "glyphs": None,
        "effect": "none",
    })


def _letter(index):
    if (isinstance(index, bool) or not isinstance(index, (float, int))
            or not float(index).is_integer() or not 1 <= index <= 21):
        raise ValueError("angelicLetter index must be an integer from 1 to 21")
    index = int(index)
    return _seal({
        "schema": "wyrdrune.ritual.enochian-letter/v0.1",
        "kind": "letter-reference",
        "ordinal": index,
        "heptad": math.ceil(index / 7),
        "positionInHeptad": ((index - 1) % 7) + 1,
        "romanizedName": NAMES[index - 1],
        "variants": VARIANTS.get(index, []),
        "historicalNote": MANUSCRIPT_NOTE,
        "glyph": None,
        "glyphStatus": "awaiting-source-verified-mapping",
        "effect": "none",
    })


def _votive(name, dedication):
    return _seal({
        "schema": "wyrdrune.ritual.votive/v0.1",
        "kind": "votive-intention",
        "name": _bound(name, "votive name", 120),
        "dedication": _bound(dedication, "dedication", 512),
        "provenance": "author-declared",
        "effect": "none",
    })


def _ident(name):
    """Same rule as the JS compiler: [\p{L}_][\p{L}\p{N}_]*."""
    return (isinstance(name, str) and bool(name)
            and (name[0] == "_" or unicodedata.category(name[0]).startswith("L"))
            and all(c == "_" or unicodedata.category(c)[0] in "LN" for c in name[1:]))


def _carry_record(value, label):
    if not isinstance(value, dict):
        raise TypeError(label + " must be a record")
    if len(value) > 64:
        raise ValueError(label + " may bind at most 64 names")
    for name in value:
        if not _ident(name):
            raise TypeError(label + " has an invalid name " + str(name))
    digest(value)  # carried values must be WCE-1 canonical (finite, plain data)
    return dict(value)


def _shape(record):
    return sorted(record)


class Execution:
    def __init__(self, ir, max_operations, seeds=None):
        if not isinstance(ir, dict) or ir.get("schema") != "wyrdrune.ir/v0.1":
            raise TypeError("Invalid WTL IR")
        if (isinstance(max_operations, bool) or not isinstance(max_operations, int)
                or not 1 <= max_operations <= 100000):
            raise ValueError("Invalid operation limit")
        self.ir = ir
        self.max_operations = max_operations
        self.operations = 0
        self.environment = {}
        self.scope = self.environment
        self.output = []
        self.receipts = []
        # The carry register: seeds in, each scoped unit's carry out (see wyrdrune.cjs).
        units = ir.get("units") if isinstance(ir.get("units"), list) else []
        self.continuing = seeds is not None or any(
            isinstance(u, dict) and u.get("scope") == "carried" for u in units)
        self.register = {} if seeds is None else _carry_record(seeds, "seeds")
        self.seeds_digest = digest(self.register) if self.continuing else None
        self.crossings = []

    def tick(self):
        self.operations += 1
        if self.operations > self.max_operations:
            raise RuntimeError("WTL operation budget exceeded")

    def expression(self, node):
        self.tick()
        if not isinstance(node, dict):
            raise TypeError("Invalid WTL expression")
        kind = node.get("k")
        if kind == "literal":
            value = node["v"]
            return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else value
        if kind == "read":
            name = node["name"]
            if name not in self.scope:
                raise NameError("Unknown variable " + str(name))
            return self.scope[name]
        if kind == "neg":
            value = self.expression(node["v"])
            if isinstance(value, bool) or not isinstance(value, (float, int)):
                raise TypeError("Unary negative requires number")
            return -value
        if kind == "binary":
            a = self.expression(node["a"])
            b = self.expression(node["b"])
            if (isinstance(a, bool) or isinstance(b, bool)
                    or not isinstance(a, (float, int))
                    or not isinstance(b, (float, int))):
                raise TypeError("Arithmetic requires numbers")
            op = node["op"]
            if op == "/" and b == 0:
                raise ValueError("Division by zero")
            if op == "+":
                result = a + b
            elif op == "-":
                result = a - b
            elif op == "*":
                result = a * b
            elif op == "/":
                result = a / b
            else:
                raise TypeError("Invalid WTL expression")
            if not math.isfinite(result):
                raise ValueError("Nonfinite arithmetic")
            return result
        if kind == "call":
            name = node["name"]
            args = [self.expression(item) for item in node["args"]]
            if name == "enochian":
                if len(args) not in (1, 2):
                    raise TypeError("enochian(text[,sourceLabel]) requires one or two arguments")
                return _enochian(*args)
            if name == "angelicLetter":
                if len(args) != 1:
                    raise TypeError("angelicLetter(index) requires one argument")
                return _letter(*args)
            if name == "votive":
                if len(args) != 2:
                    raise TypeError("votive(name,dedication) requires two arguments")
                return _votive(*args)
            if name == "bridge":
                raise RuntimeError("Bridge capability unavailable: Python backend is pure")
            if name == "star":
                raise RuntimeError("Star trigonometric geometry not yet parity-certified")
            raise NameError("Unknown WTL function " + str(name))
        raise TypeError("Invalid WTL expression")

    def execute(self):
        units = self.ir.get("units")
        if not isinstance(units, list):
            raise TypeError("Invalid WTL IR")
        for unit_index, unit in enumerate(units):
            if unit.get("k") != "mobius" or len(unit.get("phases", [])) != 8:
                raise TypeError("Invalid WTL IR")
            if unit.get("scope") not in (None, "carried"):
                raise TypeError("Invalid WTL IR")
            carried = unit.get("scope") == "carried"
            carried_in = self.register
            out = {}
            if carried:
                carries_out = [x["name"] for x in unit["phases"][7]["body"] if x.get("k") == "carry"]
                if self.register and carries_out and _shape(self.register) != sorted(carries_out):
                    raise TypeError("carry must bind exactly the seeds")
                self.scope = dict(self.register)
            else:
                self.scope = self.environment
            for index, phase in enumerate(unit["phases"]):
                if phase.get("phase") != PHASES[index]:
                    raise TypeError("Noncanonical Eightfold phase order")
                self.tick()
                before = len(self.output)
                for stmt in phase["body"]:
                    self.tick()
                    kind = stmt["k"]
                    if kind == "let":
                        name = stmt["name"]
                        if name in self.scope:
                            raise SyntaxError("Duplicate binding " + name)
                        self.scope[name] = self.expression(stmt["e"])
                    elif kind == "set":
                        name = stmt["name"]
                        if name not in self.scope:
                            raise NameError("Unknown binding " + name)
                        self.scope[name] = self.expression(stmt["e"])
                    elif kind == "emit":
                        self.output.append(self.expression(stmt["e"]))
                    elif kind == "carry" and carried and PHASES[index] == "transcend":
                        out[stmt["name"]] = self.expression(stmt["e"])
                    else:
                        raise TypeError("Invalid statement")
                self.receipts.append({
                    "phase": PHASES[index],
                    "emitted": len(self.output) - before,
                    "operations": self.operations,
                    "sourceHash": self.ir["sourceHash"],
                    "principalId": None,
                })
            if carried:
                if out:
                    self.register = _carry_record(out, "carry")
                self.crossings.append({
                    "unit": unit_index,
                    "carried_in": digest(carried_in),
                    "carried_out": digest(self.register),
                    "names": sorted(self.register),
                })
        self.scope = self.environment
        result = {
            "schema": "wyrdrune.execution/v0.1",
            "sourceHash": self.ir["sourceHash"],
            "output": self.output,
            "bindings": self.environment,
            "receipts": self.receipts,
            "withness": {"center": "withness", "completedCycles": len(units)},
        }
        if self.continuing:
            result["continuity"] = {
                "schema": "wyrdrune.continuity/v0.1",
                "seeds_digest": self.seeds_digest,
                "carry": self.register,
                "carry_digest": digest(self.register),
                "crossings": self.crossings,
            }
        return result


def main():
    raw = sys.stdin.buffer.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError("WTL input too large")
    envelope = json.loads(raw.decode("utf-8"))
    ir = envelope["ir"]
    limit = envelope.get("maxOperations", 10000)
    result = Execution(ir, limit, envelope.get("seeds")).execute()
    sys.stdout.write(json.dumps(result, ensure_ascii=False, allow_nan=False, separators=(",", ":")))
    sys.stdout.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        sys.stderr.write(type(error).__name__ + ": " + str(error) + "\n")
        sys.exit(1)
