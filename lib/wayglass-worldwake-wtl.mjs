/**
 * Worldwake WTL v0.1 constrained ritual interpreter.
 * Accepts the declared Worldwake syntax only, not arbitrary WTL.
 * No eval, network, filesystem writes, or real-world side effects.
 */
import { createHash } from "node:crypto";

const phases = ["perceive","compress","release","verify","integrate","choose","return","transcend","withness"];
const hash = x => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const stripComments = text => text.replace(/^\s*\/\/.*$/gm, "");
const readBlock = (source, label) => {
  const match = new RegExp("\\b" + label + "\\s*\\{", "g").exec(source);
  if (!match) throw new SyntaxError("Missing block: " + label);
  const start = match.index + match[0].length;
  let depth = 1, quoted = false, escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (quoted && ch === "\\") { escaped = true; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (!quoted && ch === "{") depth++;
    if (!quoted && ch === "}" && --depth === 0) return source.slice(start, i);
  }
  throw new SyntaxError("Unclosed block: " + label);
};

export function parseWorldwake(source) {
  if (typeof source !== "string") throw new TypeError("WTL source required");
  const clean = stripComments(source);
  if (!/\bwyrdrune\s+WORLDWAKE_CR_001\b/.test(clean)) throw new SyntaxError("Wrong ritual identity");
  const universe = readBlock(clean, "universe Wayglass");
  if (!/\bworld\s+CR\s*=\s*"Waking World"/.test(universe)) throw new SyntaxError("CR anchor missing");
  if (!/\banchor\s+HOME\s*=\s*CR\b/.test(universe)) throw new SyntaxError("HOME anchor missing");
  const mobius = readBlock(universe, "mobius WORLDWAKE");
  const found = [...mobius.matchAll(/\b(perceive|compress|release|verify|integrate|choose|return|transcend|withness)\s*\{/g)].map(m => m[1]);
  if (JSON.stringify(found) !== JSON.stringify(phases)) throw new SyntaxError("Eightfold order or Withness invalid");
  const steps = phases.map(phase => {
    const block = readBlock(mobius, phase);
    const actions = [...block.matchAll(/\b([a-z_]+)\s*\(([^()]*)\)/g)].map(m => ({
      operation: m[1],
      arguments: m[2].split(",").map(s => s.trim()).filter(Boolean)
    }));
    if (!actions.length) throw new SyntaxError("Empty phase: " + phase);
    const residue = block.replace(/\b[a-z_]+\s*\([^()]*\)\s*/g, "").trim();
    if (residue) throw new SyntaxError("Unsupported syntax in " + phase);
    return { phase, actions };
  });
  return { ritual: "WORLDWAKE_CR_001", world: "waking", returnAnchor: "HOME", steps };
}

export function runWorldwake(source, { actorId, consent = false } = {}) {
  if (!actorId || typeof actorId !== "string") throw new TypeError("actorId required");
  if (consent !== true) throw new Error("Explicit ritual consent required");
  const program = parseWorldwake(source);
  const trace = program.steps.map((step, index) => ({
    index, phase: step.phase, operations: step.actions.map(a => a.operation),
    status: "interpreted-no-external-effects"
  }));
  const receipt = {
    version: "wayglass.worldwake-receipt/v0.1",
    ritual: program.ritual, actorId, world: program.world,
    returnAnchor: program.returnAnchor, consent: true,
    trace, evidenceKind: "simulated",
    effect: "No external effects executed"
  };
  return Object.freeze({ ...receipt, id: hash(receipt) });
}
