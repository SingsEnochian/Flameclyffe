# Wyrdrune RFC-0002 · Wrap-around and a real choice

Status: implemented in `lib/wyrdrune/runtime.mjs` and `lib/wyrdrune/pure-backend.py`, with JavaScript/Python parity tests. Approved by Rowan on 2026-11-19. Proposed by Faer Uial.

## Why

The nursery cells (PR #665) run real `mobius scoped` turns. Writing them showed two gaps:

1. **Nothing could come back round.** A twist that returns is the most Möbius thing there is, but Wyrdrune could not wrap a number.
2. **`choose` could not choose.** It could only do arithmetic, so a cell could compute its voice in Wyrdrune but had to leave the language to turn that voice into a name.

## What is added

### `a % b`: wrap-around

- Same precedence as `*` and `/`.
- **Floored modulo:** the result takes the sign of `b`, so `-1 % 4` is `3` and `7 % -3` is `-2`. This is how a turn comes back round, not how C truncates.
- Works on decimals: `5.5 % 1` is `0.5`.
- `a % 0` is a fault: `Wrap by zero`. In a scoped unit, a fault before Return is a rolled-back verdict, the same as division by zero.
- Both backends compute `fmod` and then fix the sign, so results agree bit for bit. The parity tests include `0.3 % 0.1` and `1000000.5 % 7`.

### `when <truth> then <a> else <b>`: a choice

- It is an expression, so it can appear anywhere a value can: `let side = when face == 1 then "outer" else "inner";`
- **Only the chosen side is evaluated.** `when n > 5 then 1 / 0 else n % 2` never divides by zero.
- The condition must be a truth value.
- Kleene logic holds: if the condition is `unknown`, the result is `unknown`. The choice is not forced.
- It has the lowest precedence; put it in parentheses to use it inside arithmetic.
- `when`, `then` and `else` are words of the language. `else` already ends `require … else "reason"`.

### `pick(options, n)`: counting round

- Returns the option at position `n`, counting round. `n` is floored, then wrapped by the list's length, so every finite number names exactly one option: `pick(["Ae","Lu","Vy"], 4)` is `"Lu"`, and `pick(…, -1)` is `"Vy"`.
- It needs a non-empty list and a finite number; otherwise it fails closed.
- It is pure, so it may be used inside an `operator`.

## Gloss (British English reading)

| Wyrdrune | Reading |
| --- | --- |
| `7 % 3` | 7 wrapped round 3 |
| `when n > 0 then a else b` | if n is more than 0 then a, otherwise b |
| `pick(names, n)` | the option at n, counting round, from names |

## Compatibility

- No existing `.wtl` source in the repository uses `when` or `then` as a name.
- Everything that parsed before still parses, with the same IR and the same `sourceHash`. New IR node kind: `when`. New binary operator: `%`. New pure call: `pick`.
- The Python pure backend gains list values, needed for `pick`. It still has no user `operator`s, so parity fixtures avoid them.

## Evidence

`node --test lib/wyrdrune/cross-backend.parity.cjs`: 35/35, including:
- five new RFC-0002 parity fixtures (wrap signs and decimals, lazy `when`, `unknown` conditions, `pick` both ways, `%` inside a two-unit scoped carry);
- three fail-closed cases that must fail identically on both backends.
