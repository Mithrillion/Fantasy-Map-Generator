# child-log: diverge-underground-network

Offload tier for the hot metaplan (`metaplan.md`). Unmanaged: `openspec validate` ignores it, the
archive preserves it. Holds the artifacts and detail that would otherwise blow the metaplan's caps.

## What this holds

- The measurement harness used for tasks 1.1-1.5 and the spikes 3.2/3.3 (preserved, not deleted).
  It is **not** in `src/`, so neither vitest suite collects it. To re-run: copy it back and drop the
  `.txt` suffix.
- The raw 8-seed output it produced (16 variants x 8 seeds).
- The distilled comparison tables cited by findings F1.1-F1.5, F3.2, F3.3.

Files:

- `harness/underground-measure.dom.test.ts.txt` — the harness (783 lines), copied out of `src/` on 2026-09-29.
- `harness/measure-full.log` — raw run output: 8 `SEED` lines, 128 `ROW` lines, 16 `AGG` lines.
- `harness/measure-sweep.log` — the burg-attraction ladder sweep (2026-09-29, second run): 22 variants x 8 seeds.

Re-run recipe:

```
cp openspec/changes/diverge-underground-network/harness/underground-measure.dom.test.ts.txt \
   src/generators/underground-measure.dom.test.ts
CHROMIUM_PATH=/usr/bin/chromium npx vitest run --config vitest.browser.config.ts \
   generators/underground-measure.dom.test.ts          # 8 seeds, ~6 min
VITE_MEASURE_SEEDS=measure-a ...                       # smoke run, one seed
```

The harness runs the real pipeline per seed (`GenerationPipeline.run`), then re-runs the underground
pass per variant through the **production** pathfinder and the **production** merge/prune
(`getUndergroundSegments`, `rememberEdges`, `mergeRoutes`, `getPoints`, `pruneUndergroundHighways`)
with only the pair set and the cost patched. Fidelity anchor: `replica-production` reproduces
`baseline-production` exactly (41 routes / 432 cells / 0.722 overlap / 0.891 parallel on `measure-a`,
identical means over 8 seeds), and `debug-real-noprune` / `debug-real-pruned` bracket it.

## Burg-attraction ladder (second run, 2026-09-29)

Sweep of the burg factor (the cost multiplier applied to a cell with no burg; production is 3) and its
combinations with the surface-repulsion term. Anchor `replica-production` reproduced the baseline exactly.

| variant | overlap | dOv | exact | along | lenRat mean | lenRat max | served |
|---|---|---|---|---|---|---|---|
| baseline-production | 0.708 | 0.000 | 0.326 | 0.523 | 1.000 | 1.000 | 0.665 |
| burg-factor-2.5 | 0.693 | −0.015 | 0.318 | 0.520 | 1.055 | — | 0.689 |
| burg-factor-2 | 0.667 | −0.041 | 0.291 | 0.500 | 1.101 | 1.236 | 0.700 |
| burg-factor-1.5 | 0.634 | −0.074 | 0.254 | 0.481 | 1.121 | 1.263 | 0.709 |
| burg-factor-1 | 0.577 | −0.131 | 0.201 | 0.456 | 1.193 | 1.314 | 0.714 |
| road-repulsion (strength 2) | 0.560 | −0.148 | 0.208 | 0.458 | 1.084 | 1.138 | 0.691 |
| burg-factor-2 + repulsion | 0.512 | −0.195 | 0.172 | 0.435 | 1.142 | 1.311 | 0.693 |
| burg-factor-1.5 + repulsion | 0.474 | −0.234 | 0.143 | 0.408 | 1.181 | 1.363 | 0.716 |
| gate-divergence | 0.622 | −0.086 | 0.219 | 0.464 | 1.148 | 1.337 | 0.650 |
| combo-divergence | 0.405 | −0.303 | 0.075 | 0.360 | 1.381 | 1.616 | 0.758 |

Per-seed overlap delta, to show no seed ever worsens:

- burg-factor-2: −0.012 −0.051 −0.055 −0.048 −0.047 −0.017 −0.062 −0.036
- burg-factor-1.5: −0.046 −0.086 −0.081 −0.086 −0.067 −0.054 −0.101 −0.067
- burg-factor-1: −0.123 −0.127 −0.143 −0.126 −0.108 −0.117 −0.148 −0.156
- burg-factor-2 + repulsion: −0.175 −0.192 −0.212 −0.188 −0.160 −0.213 −0.216 −0.205
- burg-factor-1.5 + repulsion: −0.237 −0.209 −0.241 −0.235 −0.184 −0.236 −0.271 −0.256

## Aggregate over 8 seeds (seeds `measure-a` … `measure-h`)

Measured 2026-09-29 via `vitest.browser.config.ts`, `continents` template, `options.generation.underground = true`.
`overlap` = share of underground cells that any surface route also touches. `parallel` = length share
of tunnel steps with a surface step within one cell in a similar direction (permissive).
`exact` = length share of tunnel steps that *are* a surface step. `along` = length share with a
surface step leaving the same cell (or a neighbour) toward the next cell (or a neighbour), similar
direction. `lenRat` = underground length vs baseline. `served` = share of subterranean burgs that
*end* a highway (mid-route burg cells are not counted).

| variant | overlap | dOv | parallel | dPar | exact | along | lenRat | served | ms |
|---|---|---|---|---|---|---|---|---|---|
| baseline-production | 0.708 | 0.000 | 0.874 | 0.000 | 0.326 | 0.523 | 1.000 | 0.665 | — |
| replica-production (fidelity) | 0.708 | 0.000 | 0.874 | 0.000 | 0.326 | 0.523 | 1.000 | 0.665 | 11 |
| debug-real-noprune | 0.720 | +0.012 | 0.883 | +0.009 | 0.340 | 0.540 | 1.292 | 0.721 | 12 |
| control-point | 0.587 | −0.121 | 0.841 | −0.033 | 0.203 | 0.468 | 1.240 | 0.709 | 4 |
| control-point-discount | 0.588 | −0.120 | 0.841 | −0.033 | 0.206 | 0.468 | 1.191 | 0.708 | 11 |
| control-point-burg | 0.721 | +0.013 | 0.873 | −0.001 | 0.339 | 0.531 | 1.132 | 0.678 | 5 |
| control-point-discount-burg | 0.724 | +0.016 | 0.875 | +0.001 | 0.341 | 0.530 | 1.060 | 0.678 | 11 |
| no-burg-attraction | 0.577 | −0.131 | 0.831 | −0.043 | 0.201 | 0.456 | 1.193 | 0.714 | 11 |
| gate-divergence | 0.622 | −0.086 | 0.825 | −0.050 | 0.219 | 0.464 | 1.148 | 0.650 | 12 |
| smoothed-depth | 0.704 | −0.004 | 0.869 | −0.005 | 0.327 | 0.521 | 1.034 | 0.680 | 12 |
| road-repulsion | 0.560 | −0.148 | 0.810 | −0.064 | 0.208 | 0.458 | 1.084 | 0.691 | 12 |
| road-repulsion-strong | 0.505 | −0.203 | 0.780 | −0.094 | 0.170 | 0.428 | 1.117 | 0.697 | 11 |
| combo-divergence | 0.405 | −0.303 | 0.740 | −0.134 | 0.075 | 0.360 | 1.381 | 0.758 | 13 |
| longhaul-mst | 0.715 | +0.007 | 0.878 | +0.004 | 0.339 | 0.529 | 1.086 | 0.782 | 13 |
| trunk-spurs-25 | 0.704 | −0.004 | 0.859 | −0.016 | 0.301 | 0.472 | 0.920 | 0.650 | 18 |
| trunk-spurs-10 | 0.711 | +0.003 | 0.874 | 0.000 | 0.275 | 0.456 | 0.877 | 0.587 | 31 |

Per-seed spread of the length ratio (the D4 bound is <= 1.15 on every seed):

| variant | lengthRatio min | max | parallel delta min | max |
|---|---|---|---|---|
| control-point | 1.096 | 1.386 | −0.067 | −0.006 |
| no-burg-attraction | 1.071 | 1.314 | −0.073 | −0.018 |
| gate-divergence | 0.924 | 1.337 | −0.095 | +0.000 |
| road-repulsion | 1.028 | 1.138 | −0.097 | −0.023 |
| road-repulsion-strong | 0.951 | 1.265 | −0.114 | −0.047 |
| combo-divergence | 1.198 | 1.616 | −0.159 | −0.110 |

Corridor histogram (share of tunnel cells by BFS distance to the nearest surface-route cell, 0/1/2/3+):

| variant | distance 0 | 1 | 2 | 3+ |
|---|---|---|---|---|
| baseline-production | 0.707 | 0.231 | 0.049 | 0.014 |
| control-point | 0.587 | 0.334 | 0.065 | 0.014 |
| road-repulsion-strong | 0.504 | 0.364 | 0.106 | 0.026 |

Endpoint band by the kind of settlement a chain ends at (shared route-cells in the first/last two
cells over all shared route-cells of that kind):

| variant | dual identity | fully subterranean | junction |
|---|---|---|---|
| baseline-production | 0.386 | 0.287 | 0.355 |
| gate-divergence | 0.415 | 0.230 | 0.299 |
| road-repulsion | 0.423 | 0.339 | 0.391 |

Per-seed surface density (context for F1.5), from the `SEED` lines: land cells 4077-4526 of
5468-6478 total; surface routes 589-691 (`roads` 14-24, `trails` 471-516, `searoutes` 104-154);
cells touched by any surface route 2216-2931; cells touched by land routes 1649-1930 — i.e.
**37-44% of land cells already carry a road or trail**.

## Tunnel-character exploration (2026-09-30)

Offload for metaplan F8.1-F8.3 and D18: the user reported three issues after the water-crossing change —
(1) pass-under of above-ground burgs still too frequent, (2) tunnels curve like roads and miss obvious
bores (they sag to lower elevations instead of boring under range tops), (3) audit whether tunnels avoid
neutral/uninhabitable cells. Static reasoning over the current build, NOT a measurement — the rung-4
diagnostic must turn it into numbers.

### Cost anatomy (getUndergroundPathCost, routes-generator.ts:366-393)

    cost(step) = distanceSquared x habitability x height x connection x burg x separation
                   ~100/step        [1,1.1]      [1,2]    [0.5,1]   [1,2]   [1,3]

- habitability — biome fertility, surface logic: hot desert/tundra (4) → ~1.096, taiga/wetland (12) →
  ~1.088, forests ~1.0-1.02. Water steps pay 1.1: marine habitability is 0 and the water change made the
  gate conditional but not the modifier (test :442 pins `distance * 1.1 * 1.62 * 2`). Looks unintended.
- height — `1 + max(50-h,0)/50`: high ground cheaper, but the term PLATEAUS at h>=50; water depth rides
  the same term (shore ~1.62, deep 2.0).
- connection — 0.5 on cell pairs the underground network already covers (the funnel).
- burg — below-level burgs 1x, everything else 2x (rung 3's plane-aware split).
- separation — `1 + 2/(1+d)` for d < 4: up to 3x on a road corridor; the strongest single shaper.

### Worked arithmetic (spacing ~10 → distanceSquared ~100 per step)

- Below-level burg cell at h=21: 1 x 1.07 x 1.62 ≈ 1.73. Plain crest cell at h=80: 2 x 1.0 = 2.0. The
  burg cell wins at ANY elevation — height cancels in the burg/plain ratio (1/2) and land height spans
  only [1.0, 1.62], so the attraction beats the terrain preference everywhere. Tunnels string through
  burg cells in valleys regardless of the range between.
- Crest vs saddle: saddle h=35 prices 1.3 vs crest 1.0 → ~30 units saved per cell; one detour cell costs
  ~100. The height term pays for ~half a cell of deviation → paths clip saddles instead of boring under
  tops. (The equal-length pin, test :323, still passes.)
- Separation displacement: roads cross a range at its LOWEST pass (their height term punishes elevation,
  [1,3]); the x3 halo makes that corridor the dearest place for a tunnel, which dodges sideways to the
  next-lowest crossing instead of the crest — the reported "bends towards lower elevation parts".
- Water under-use: a bay crossing pays depth (1.62-2.0) x marine-quirk 1.1 x burg 2 x separation
  1.67-3.0 (coastal trails and searoutes halo the bay; the water change's D5 gave water no carve-out),
  and the `t >= -2` bound caps spans at ~4-5 cells. An obvious bay shortcut can lose to a haloed land
  detour; calibration would be one constant.

### Lever table (pin status per lever)

| lever | buys | pin cost |
|---|---|---|
| narrow surface-only burg repulsion (cell-only 3x, or burg cell + ring via a second BFS field) | issue 1: a push, not just no-pull | cell-only: spec-clean today ("MAY be higher", *attracted only to the settlements they serve*); re-aim equality test :1026. Halo: second field + likely delta |
| height reshape — monotone in elevation on land, no h>=50 plateau; keep water depth pricing | issue 2: crest-seeking | spec-clean: strengthens *prefer high ground*; equal-length scenario (test :323) still passes |
| biome-blind cost — drop the habitabilityModifier from the tunnel; fix the water 1.1 quirk | issue 3: removes biome noise | re-aim test :442 and any other modifier-reading tests; no spec requirement mentions the modifier |
| direct-line deviation penalty (per-pair cross-track term inside createUndergroundCost) | issue 2: the bore | NEW spec requirement ("tunnels prefer the direct line between their endpoints"); analytic, no BFS |
| glacier gate drop (tunnels bore under ice) | issue 3 | spec delta — the gate is the passability baseline in the separation scenario; test :310. OPEN user call |
| water bound widen (t >= -3) | issue 2: more bay shortcuts | one constant (water design D1's calibration note). OPEN user call |
| separation trim (strength/range) | straighter tunnels | directly trades away rung 1's overlap win; measure only inside a combination |
| burg attraction 2 → 1.5 | less valley-stringing | measured -4.1 overlap at x1.10 length (F3.2s); tension with the network's purpose |

### Tension between the new issues

    straighter bores  <------------------------>  fewer pass-unders / less overlap
         ^                                              ^
    deviation penalty +                          narrow burg repulsion (adds a
    weaker separation                            bending force) + separation kept
    (remove bending forces)                      (adds bending force)

They are compatible only if the repulsion is narrow and the straightness lever dominates the pushers —
a measurement question for rung 4, not a taste call.
