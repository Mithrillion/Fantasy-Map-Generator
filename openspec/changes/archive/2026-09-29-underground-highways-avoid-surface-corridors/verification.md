# Verification: underground-highways-avoid-surface-corridors

The acceptance measurement for task group 4: the shipped separation term against the pre-change
baseline, on 8 seeds. Recorded 2026-09-29.

## Method

The harness preserved by the diagnostic (`openspec/changes/diverge-underground-network/harness/`) was
copied back into `src/generators/underground-measure.dom.test.ts` and run unchanged:

```
CHROMIUM_PATH=/usr/bin/chromium npx vitest run --config vitest.browser.config.ts generators/underground-measure.dom.test.ts
```

It runs the real pipeline per seed with `options.generation.underground = true` and the `continents`
template, then reports the produced network. `baseline-production` is the shipped generator; the
harness's `replica-production` variant re-runs the same pass through the production pathfinder and
reproduced `baseline-production` **exactly** after the change (overlap 0.560, exact 0.208, 4599 length
over 8 seeds), which is the fidelity anchor that the numbers describe production behaviour.

Baseline numbers come from the pre-change run of the same harness
(`openspec/changes/diverge-underground-network/harness/measure-full.log`); the post-change raw output
is kept beside this file as `measure-after.log`.

Metrics: `overlap` = share of underground cells that any surface route also touches; `exact` = share of
underground *length* running on a step that is itself a surface route step; `road distance` = mean BFS
distance from an underground cell to the nearest surface-route cell; `served` = subterranean burgs that
end a highway.

## Results

| seed | overlap before | overlap after | delta | exact before | exact after | length before | length after | length ratio | road distance before | after | served |
|---|---|---|---|---|---|---|---|---|---|---|---|
| measure-a | 0.722 | 0.596 | −0.126 | 0.393 | 0.277 | 3915 | 4117 | 1.052 | 0.33 | 0.48 | 53 |
| measure-b | 0.722 | 0.587 | −0.135 | 0.298 | 0.178 | 3422 | 3894 | 1.138 | 0.36 | 0.54 | 48 |
| measure-c | 0.710 | 0.565 | −0.145 | 0.327 | 0.217 | 4458 | 4918 | 1.103 | 0.39 | 0.61 | 55 |
| measure-d | 0.688 | 0.532 | −0.156 | 0.331 | 0.202 | 5464 | 5618 | 1.028 | 0.41 | 0.60 | 73 |
| measure-e | 0.680 | 0.535 | −0.145 | 0.271 | 0.166 | 4353 | 4546 | 1.044 | 0.35 | 0.56 | 64 |
| measure-f | 0.714 | 0.558 | −0.156 | 0.307 | 0.206 | 4205 | 4541 | 1.080 | 0.35 | 0.58 | 58 |
| measure-g | 0.722 | 0.570 | −0.152 | 0.344 | 0.223 | 4299 | 4714 | 1.097 | 0.38 | 0.59 | 58 |
| measure-h | 0.703 | 0.539 | −0.164 | 0.339 | 0.196 | 3932 | 4443 | 1.130 | 0.39 | 0.61 | 63 |
| **mean** | **0.708** | **0.560** | **−0.147** | **0.326** | **0.208** | — | — | **1.084** | **0.37** | **0.57** | — |

- **Overlap falls on every seed**, by 12.6 to 16.4 points: the D13 bar (any measured improvement) is met
  with margin, and the effect matches the diagnostic's prediction (−14.8 points) to within a point.
- **Exact-edge sharing falls on every seed** (mean −11.8 points): the network is not merely touching
  fewer road cells, it runs on a road step for a tenth less of its length.
- **Length stays inside the bound**: worst seed ×1.138 against the ×1.15 acceptance bound, mean ×1.084.
- **Endpoint service improves slightly** (0.665 → 0.691 of subterranean burgs ending a highway), so the
  separation does not cost the network its reach.

## Test evidence

| Check | Result |
|---|---|
| `npx vitest run generators/underground-highways.test.ts` | 28 passed (21 pre-existing, 7 new) |
| `npx vitest run generators services/io` | 32 files, 386 tests, all passing |
| `npx tsc` | clean (harness removed from `src/` before the check) |
| `npx biome check src/generators/routes-generator.ts src/generators/underground-highways.test.ts` | clean |
| `openspec validate underground-highways-avoid-surface-corridors --strict` | valid |

Scenario coverage: the separation requirement's five scenarios map to the new unit tests (higher beside
a route; decay and bound; never impassable; no self-repulsion; visible in the generated network via the
measurement above). The re-scoped *Underground connectivity is self-contained* requirement keeps its
four surviving scenarios on their existing tests and re-aims the fifth
(`underground-highways.test.ts:215`) to "never lower, higher beside a route".

## What the next rung should be

The diagnostic's ladder (`diverge-underground-network` — D16, F3.2s) still stands. With overlap at
0.560 the remaining headroom is measured, not guessed:

| next rung | expected overlap | expected length | evidence |
|---|---|---|---|
| weaken the burg attraction to 2, on top of this term | ~0.51 | ×1.14 | F3.2s combination row |
| drop it entirely (factor 1) | ~0.44 | ×1.19 | F3.2s |
| add endpoint gate divergence | ~0.50 | ×1.12 | F3.2s |

If the rendered map still reads as aligned, the burg attraction is the next rung — it is the largest
remaining term and needs no further spec change. Endpoint gates are the rung after that.
