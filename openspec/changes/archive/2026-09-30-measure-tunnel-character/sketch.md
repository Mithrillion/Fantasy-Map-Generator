# Sketch

## Context

- The 8-seed paired harness exists and works: `openspec/changes/diverge-underground-network/harness/underground-measure.dom.test.ts.txt` (recipe H6). It runs the real pipeline per seed, then re-runs the underground pass per variant through the production pathfinder and production merge/prune, patching only pair set and cost. It emits `SEED`/`ROW`/`AGG` lines and already carries the rung-2/3 columns (overlap, overlapLand, waterShare, parallel, exact, along, lenRat, served) plus the `PLANES` audit line. Fidelity anchor: `replica-production` must equal `baseline-production` exactly.
- Current build = post-rung-3 + water crossings. Known production readings on this build: overlap 0.430 mean (F7.2), surface-only burg contact 72 cells/seed mean (F7.2), zero plane violations, `repairs=0`.
- Strong priors from the exploration (context, not commitments): the burg pull beats the terrain preference at any elevation; the height term plateaus at h>=50; separation (up to 3x, 4-cell decay) is the strongest single shaper and displaces range crossings off the road's lowest pass; the tunnel cost still pays the biome habitabilityModifier [1,1.1] (water steps pay 1.1 because marine habitability is 0 — quirk); the glacier gate (habitability 0 → Infinity) blocks tunnels under ice. Full anatomy: metaplan F8.1-F8.3 and the child-log tunnel-character section.
- The glacier gate and the water bound (`t >= -2`) are open user calls: measured as-is; variants that probe them exist only inside the harness.
- Direct line between a pair's burgs is computable from `burg.x, burg.y`; cell chains from route records' `points[2]`; the drawn curve from `points[0..1]`. All post-pass.

## Approach per Probe

- **P1 — character baseline.** Extend the harness ROW with post-pass character metrics over the generated underground records (cell chains + drawn points):
  - `directness`: per record, drawn-path length over direct-line distance between endpoint anchors; report mean and the share of records above 1.25 / 1.5.
  - `elevProfile`: mean h of tunnel land cells vs mean h of corridor cells (cells within ~1.5 cell-widths of the direct segment) vs the land mean — the sag number.
  - `crestHit`: per record crossing a high stretch (corridor cells with h>=50 contiguous), does the chain pass within 1 cell of the corridor's max cell?
  - `biomeShare`: tunnel land cells by biome vs land cells by biome (a table, not a scalar).
  - `passUnder`: tunnel cells on surface-only burg cells (the F7.2 definition), plus `nearMiss` — tunnel cells adjacent to such a burg cell — plus the drawn points' minimum distance to each surface-only burg position.
  - Run: 8 paired seeds, production only (baseline + replica anchor). Evidence: SEED/ROW/AGG lines — the character baseline every later rung is measured against.

- **P2 — mechanism ablations.** Harness cost variants, one mechanism removed at a time: `no-burg-pull` (burgModifier 1 everywhere), `no-plateau` (a monotone height shape, chosen in apply — e.g. `1 + max(80-h,0)/80` and/or `2 - h/100` on land), `no-separation` (surfaceSeparation → 1), `biome-blind` (habitabilityModifier → 1 incl. water). Each reports the P1 columns AND the standing alignment columns on the same paired seeds. Evidence: per-seed delta table; the mechanism that moves a character metric without breaking the length/audit bounds is a rung-5/6 adoption candidate.

- **P3 — water census.** Per seed: water-leg count, span distribution (consecutive water-cell runs), and for pairs whose direct line crosses crossable water: path length vs direct distance vs the land-detour length the path chose instead. One in-harness variant `bound-minus-3` (`t >= -3`) to see what the widened bound would buy. Evidence: counts, spans, detour ratios — the input for the user's bound ruling.

- **P4 — metric discrimination.** Across P2's variant table: which character metrics move consistently per seed and which are saturated (the retired `parallel` lesson, F1.4). Evidence: a small keep/retire verdict per metric, recorded in evidence.md.

- **P5 — rung-5 micro-prototypes.** In-harness only: `repulsion-cell` (surface-only burg cells priced 3x), `repulsion-halo` (a second BFS field: burg cell + ring at reduced strength), then the best-of singles combined as the trio, plus the deviation-penalty shape sketched roughly (per-pair cross-track multiplier) as a feasibility probe for rung 6. Read character + alignment + lenRat + audit per seed. Evidence: the paired table that decides what rung 5 ships and whether rung 6 needs its own child.

## Sanity Expectations

- The fidelity anchor holds: `replica-production` equals `baseline-production` on every column, every seed.
- P1's overlap column reproduces ~0.430 mean and passUnder ~72 cells/seed — if not, suspect harness drift before any conclusion (F6.1).
- Directness of short tunnels (~9-10 steps) should land well below 2.0; a ratio near or above 2 on most records suggests the metric is mis-defined (wrong anchor), not that tunnels wander twice their length.
- elevProfile: tunnel cells should sit at or above the land mean (high-ground preference + mountain-weighted endpoints); if tunnel cells read *below* the land mean, check the corridor sampler first.
- Water legs exist on some seeds (waterShare > 0 where bays occur); zero everywhere means the t-field gate reading is wrong.
- Cost-patch ablations must not change endpoints or boundaries: every variant reports zero plane violations and `repairs=0`.
- `no-burg-pull` should reproduce the direction of CH1's `no-burg-attraction` (overlap down, length up) — direction only; magnitudes do not carry across build changes.

## Known-Answer Checks

- Directness: a synthetic two-cell record (adjacent cells) → 1.0 by construction; a hand-built L-shaped chain → the coordinate-derived ratio.
- crestHit: a synthetic corridor with one obvious peak (h=90 amid h=20) → a chain through the peak hits, a chain skirting it misses.
- passUnder/nearMiss: a synthetic pack with a surface-only burg adjacent to (not on) a tunnel cell → nearMiss 1, passUnder 0; a burg on the chain → passUnder 1.
- Water span: the tests' bay fixture (`makePack({ bay: true })`) → spans read from its known geometry.
- biomeShare: a single-biome fixture → share 1.0 for that biome.
- A cost-patch variant's chains re-routed by the patch must still pass `auditPlanes` with zero violations — the audit is the known-answer check that the patch changed pricing, not the plane rules.

## Constraints

- Seeds `measure-a`..`measure-h`, continents template, `options.generation.underground = true`; per-seed reporting always, means never alone (D4 style, D13 doctrine).
- Fidelity anchor required in every run; plane audit zero-violation on every run (the F5.1 standing gate).
- No production code changes: the harness lives in the change dir and is copied into `src/` only for a run, then removed (H6 recipe). `CHROMIUM_PATH=/usr/bin/chromium`, ~6-10 minutes for 8 seeds expected.
- Re-measure paired on one build; never inherit a figure across a build change (F6.1).
- The glacier gate and the water bound remain at production values in the baseline; probing them is in-harness only, and the ruling stays with the user.

## Risks & Trade-offs

- [Character metrics are contestable definitions] → define each against the complaint it serves (directness = shortcut, elevProfile = sag, nearMiss = pass-under); fix definitions once at P1 and record them in evidence.md; refine only if a known-answer check fails.
- [Metric sprawl bloats ROW and the run] → P4 prunes deliberately; keep the ROW additions small and table-shaped outputs in evidence.md, not the log line.
- [crestHit fragile over Voronoi geometry] → the synthetic known-answer check first; fallback: drop crestHit and read elevProfile alone.
- [Variant explosion] → cap at ~10 variants; run singles before the trio; the deviation-penalty probe stays a feasibility sketch, not a sweep.
- [Runtime growth from per-pair geometry] → all metrics are post-pass; if the run exceeds ~15 minutes, cut the corridor sampler to a cheap segment-sample.
- [The alignment columns drift under a build change mid-change] → all runs on one build; if the build changes, re-run the baseline paired (F6.1).

## Open Questions

- Which monotone height shape to prototype for `no-plateau` (linear inverse vs rescaled max)?
- Does crestHit read the cell chain or the drawn points? (Start with the cell chain; add points only if the sag reading disagrees with the user's perception.)
- Repulsion-halo breadth and strengths (burg cell only, +1 ring, +2 rings)?
- Is the deviation-penalty probe worth building in this change, or does its feasibility sketch belong to rung 6's own child?