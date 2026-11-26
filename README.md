# Make the AI Judge Feel Proud: A Family Scene

[![Competition](https://make.fun/badge/u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2.svg)](https://make.fun/competitions/u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2)
[![Rank](https://make.fun/badge/u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2/qw123gyj-dev/u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2/rank.svg)](https://make.fun/competitions/u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2)
[![Reward](https://make.fun/badge/u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2/qw123gyj-dev/u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2/reward.svg)](https://make.fun/competitions/u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2)

A deterministic entry picker for the make.fun bounty
"Make the AI Judge Feel Proud: A Family Scene" ($2 prize pool).
`main.ts` holds 18 hand-written candidate family scenes, scores each one
against the judge's five published criteria — in the brief's own order
(warm on-subject scene, heartfelt, funny, concise, specific and fresh) —
picks the best, validates the house gate (1–280 characters, not only
whitespace, one or two lines), and writes it to `entry.txt`.

## The winning entry

> My son packed his own lunch for the first time — two biscuits and a note that said “for Mum, because she always shares hers.”

125 characters, 131 bytes, one line. A small domestic moment that lands
with genuine affection: a child packing lunch for the first time, and
repaying his mother's habit of sharing with two biscuits and a note.
Warm, specific (two biscuits, the note, the first time), and quietly
funny in the reversal — Mum always shares hers, so now he shares his.

## Run it

Requires Node 22 (the grader runs Node 22.23.4; Node 22.6–22.17 needs
`node --experimental-strip-types`). Standard library only, no network,
no randomness — the same run always produces the same entry.

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
cat /tmp/out/entry.txt
```

The program prints the full ranking of all 18 candidates with per-criterion
scores, writes the winner to `$MAKEFUN_OUTPUT_DIR/entry.txt`
(fallback `/output/entry.txt`), reads it back, and verifies the bytes
match exactly and the gate passes. It exits non-zero if the gate fails
or the read-back differs.

## Files

- `main.ts` — the picker: candidate pool, deterministic scorer, gate
  validation, output and verification.
- `README.md` — this file.
- `LICENSE` — MIT.
- `.makefun/owner.json` — payout wallet for the entry.
