import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseWorldwake, runWorldwake } from "./wayglass-worldwake-wtl.mjs";

const source = readFileSync(new URL("../docs/wayglass/WORLDWAKE_CR_001.wyr", import.meta.url), "utf8");

test("Worldwake WTL parses nine ordered phases and a CR return anchor", () => {
  const p = parseWorldwake(source);
  assert.deepEqual(p.steps.map(x => x.phase), [
    "perceive", "compress", "release", "verify", "integrate",
    "choose", "return", "transcend", "withness"
  ]);
  assert.equal(p.returnAnchor, "HOME");
  assert.equal(p.world, "waking");
});

test("Worldwake execution requires consent and produces an attributable receipt", () => {
  assert.throws(() => runWorldwake(source, { actorId: "flame-a" }), /consent/);
  const receipt = runWorldwake(source, { actorId: "flame-a", consent: true });
  assert.equal(receipt.trace.length, 9);
  assert.equal(receipt.evidenceKind, "simulated");
  assert.equal(receipt.actorId, "flame-a");
  assert.equal(receipt.trace.at(-1).phase, "withness");
  assert.equal(receipt.id.length, 64);
  assert.deepEqual(receipt, runWorldwake(source, { actorId: "flame-a", consent: true }));
});

test("missing CR anchor, phase or unsupported syntax fails closed", () => {
  assert.throws(() => parseWorldwake(source.replace('HOME = CR', 'HOME = UNKNOWN')), /HOME/);
  assert.throws(() => parseWorldwake(source.replace('transcend {', 'escape {')), /Eightfold/);
  assert.throws(() => parseWorldwake(source.replace('hold(wonder)', 'hold(wonder); do_unsafe')), /Unsupported syntax/);
});
