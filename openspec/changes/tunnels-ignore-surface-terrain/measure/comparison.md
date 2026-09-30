# Measurement — let tunnels ignore the surface's terrain rules

Two runs of the change's harness (`harness/tunnels-ignore-surface-terrain.dom.test.ts.txt`) over the
eight-seed protocol, `VITE_MEASURE_SEEDS` a–h, both archived beside this file:

- `before.log` — the unchanged build (task 1.2). Its readings are also embedded in the harness's
  `BEFORE` block, which is what turns the identity and exposure checks into assertions.
- `after.log` — the changed build (task 3.8).

Both runs ended with `ALL INTEGRATION CHECKS PASSED`; the standing gates in the after run are inside
their bands, and the three invariants the change rests on hold.

## The invariant: the surface network and the admitted pairs do not move

| reading | before | after |
|---|---|---|
| admitted pairs / seed | 66.4 | 66.4 |
| per-seed pair list | — | identical on all 8 seeds (count and checksum) |
| surface fingerprint | — | identical on all 8 seeds (records, cells, checksum) |
| surface network with the underground pass re-run | identical | identical |

The pair set is admitted from the surface measure and the burg set, and neither is touched, so this
is the check that nothing leaked out of the tunnel cost. It holds bit-for-bit.

## The standing gates

| reading | before | after | band |
|---|---|---|---|
| records / seed | 54 | 54 | [25.1, 67.3] |
| tunnel cells / seed | 429.9 | 429.3 | [394, 458] |
| network length | 4052 | 4051 | — |
| directness mean | 1.196 | 1.197 | ≤ 1.28 |
| directness worst seed / record | 1.369 / 12.695 | 1.375 / 12.695 | ≤ 1.5 per seed |
| shadowing mean | 5.13 | 5.25 | ≤ 6.9, +1 per seed |
| uncovered / service / boundary / repairs | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0 |
| ms per seed | 607 | 605 | recorded |

The network is the same size and the same shape by every gate. Shadowing rises on one seed
(`measure-d`, 7 → 8) and stays inside its per-seed slack; directness moves by a thousandth. The
passable area grew — a glacier cell and a frozen-water cell are no longer walls — and the search cost
did not measurably change.

## The change's own reading: glacier exposure per pair

The sag is the direct corridor's highest cell minus the highest cell of the chosen path: a positive
value means the path never reaches the crest the straight line crosses.

| seed | pairs crossing a glacier corridor | crest sag | worst pair |
|---|---|---|---|
| measure-a | 1 / 61 (was 1 / 60) | 33 → **17** | 21 → 7 |
| measure-b | 0 / 51 (was 0 / 50) | 9 → 9 | 3 → 3 |
| measure-c | 0 / 45 | 23 → 23 | 8 → 8 |
| measure-d | 3 / 56 (was 3 / 57) | 37 → **12** | 10 → 5 |
| measure-e | 0 / 66 | 35 → 35 | 7 → 7 |
| measure-f | 2 / 57 | 65 → **43** | 17 → 17 |
| measure-g | 0 / 43 (was 0 / 44) | 15 → **9** | 6 → 6 |
| measure-h | 1 / 53 | 22 → **17** | 6 → 6 |
| **total** | 7 / 432 | **239 → 165** | 21 → 17 |

The forced detour is measurably reduced: the total sag falls by 31%, the worst single pair by 24%. The
seeds that move are the cold ones — the same seeds where a glacier sits on the direct line. The
corridor's own glacier count is unchanged (7 pairs cross one either way); what changed is that the
path now climbs over the crest instead of around it, which is what *Underground highways prefer high
ground* asks for. The design's risk — tunnels hugging the highest, coldest ground once the ice penalty
is gone — would show as directness or shadowing leaving its band, and neither did.

## The bound is still doing work, and the open question is answered

`pack.cells.t` over the water cells, summed over the eight seeds:

| ring | cells | share |
|---|---|---|
| −1 (shore) | 8019 | 62.5% |
| −2 (the bound's edge) | 4502 | 35.1% |
| −3 and deeper (beyond the bound) | 303 | 2.4% |
| **water cells** | **12824** | 100% |

The bound turns down 1731 step candidates per protocol (216 per seed), 1509 of them from a cell a
tunnel may itself occupy. But only 2.4% of the pack's water cells lie past the bound at all: `Pack`
drops grid water points beyond the first two rings, so the deep water a bore would need mostly does
not exist as cells. **The pack's own sparseness, not the crossing bound, is what limits a crossing on
this protocol** — the design's open question, settled. The bound is unchanged by this change and the
reading is identical before and after, so the rule is kept regardless, exactly as the task requires.

## Reproduction

```bash
cp openspec/changes/tunnels-ignore-surface-terrain/harness/tunnels-ignore-surface-terrain.dom.test.ts.txt \
   src/generators/tunnels-ignore-surface-terrain.dom.test.ts
CHROMIUM_PATH=/usr/bin/chromium npx vitest run --config vitest.browser.config.ts \
   generators/tunnels-ignore-surface-terrain.dom.test.ts
rm src/generators/tunnels-ignore-surface-terrain.dom.test.ts
```

While the `BEFORE` block is `null` the two comparison checks report themselves as unarmed and the
columns have to be read by hand; with it filled in — as it is now — they fail the run on any
difference.
