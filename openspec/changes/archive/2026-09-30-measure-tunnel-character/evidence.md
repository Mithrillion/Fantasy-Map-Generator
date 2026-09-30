# Evidence — measure-tunnel-character

Prototyping charter: `proposal.md`; approach per probe: `sketch.md`. Raw numbers live in `measure/`
and every figure quoted here is reproducible with `measure/analyze.py` against the named log.

## Pre-flight

- `.openspec.yaml` carries `schema: prototyping` and `skip_specs: true` — verified, no change needed.
- Harness: `harness/underground-measure.dom.test.ts.txt` is the record copy; it is copied to
  `src/generators/underground-measure.dom.test.ts` to run and removed at the end (H6 recipe, task 5.6).
- Run recipe: `CHROMIUM_PATH=/usr/bin/chromium VITE_MEASURE_VARIANTS=<arms> npx vitest run --config vitest.browser.config.ts generators/underground-measure.dom.test.ts`.
  `VITE_MEASURE_VARIANTS` restricts the run to the named arms; `baseline-production` and the two
  replica arms always stay (the anchor has to hold in every run). Unset runs every variant.
- Build under test: post-rung-3 + water crossings, commit `2fd18d87` (all runs on this one build; no
  build change mid-change, so no figure is inherited across builds — F6.1).

## Metric definitions

Fixed at P1 and recorded verbatim in every run log as a `CHAR definitions` line, so a log is
self-describing. `crestHit` was revised once, at P1, after the known-answer fixture failed (see "What
Didn't Work"); the definitions below are the final ones.

- **directness** — per record: drawn-path length (`points[0]`, `points[1]` polyline) over the
  straight-line distance between the record's own first and last drawn anchor; records shorter than one
  cell width are dropped. Mean plus the shares above 1.25 and 1.5.
- **elevProfile** — mean h of the record's land cells (h>=20) against the mean h of the corridor cells,
  where the corridor is every cell within 1.5 cell-widths of the record's own direct segment (sampled
  every half cell-width); the land mean is the whole map's land cells.
- **crestHit / crestSag** — for records whose direct corridor holds a cell with h>=50 (the crossing
  set): `crestSag` is the corridor's highest h minus the record's own highest h, and a **hit** is a sag
  of at most 10. `crestHit` is the share of the crossing set that hit; `crestSag` is the mean sag.
  Cell chain, not drawn points (the sketch's open question), because the drawn curve adds rendering
  offsets that the complaint separates out through `anchorMinDist`.
- **biomeShare** — share of the record set's distinct land cells in each biome against that biome's
  share of all land cells (printed as a `BIOME` table line per seed, not a ROW column).
- **passUnder / nearMiss** — distinct tunnel cells that are surface-only burg cells (the F7.2 audit
  definition: ground-level presence and no below-level presence), and distinct tunnel cells one step
  from such a burg cell.
- **anchorMinDist** — per record, the smallest distance (in cell-widths) from any drawn point to any
  surface-only burg dot; the mean over records is reported. Baseline arm only: the variant arms carry
  cell anchors rather than drawn geometry, so the column is `null` for them.

Supporting definitions fixed alongside them, so the tables can be read:

- **cell width** — the mean nearest-neighbour distance over all cells (6.41 on `measure-a`); every
  distance threshold above is expressed in these units.
- **land / water** — a cell is land when `h >= 20`, water otherwise; that is the same split
  `getUndergroundPathCost` and the audit use.
- **length** — the sum of the straight-line steps between consecutive cells of the cell chains, over
  the record set's distinct cells.
- **`nearMiss` vs `passUnder`** — read as a pair: `passUnder` counts cells where the tunnel sits on a
  surface-only burg, `nearMiss` counts cells one step off one and excludes anything already counted in
  `passUnder`.

## Fidelity anchor and the harness's one limitation

- **Anchor holds on 6 of 8 seeds, exactly**, on all 38 columns including the character ones:
  `measure-a`, `-b`, `-c`, `-d`, `-g`, `-h`.
- **`measure-e` and `measure-f` drift by 1-2 cells** (e: production 610 cells / replica 612, length
  6083 → 6088; f: 554 → 553, length 5615 → 5603). Route counts are identical (57 and 54); a single
  stretch is routed differently, 5 length units apart against ~6000, 0.08%.
- The drift is **deterministic** (same seed, same variant, every run) and **not** run-composition: the
  same three-arm run and the full 19-arm run give byte-identical baseline rows
  (`probe-composition-full.log`).
- The **second** replica arm (`replica-production-2`) reproduces production on **all 8 seeds, exactly**.
  The first replica drifts; the second does not.
- Leading hypothesis: the harness's replica reads production's `surfaceSeparation` field off the
  `window.Routes` singleton, which the real pass built earlier in the seed; the first replica's own
  routing and merge leave the singleton in a slightly different state for the second. Not confirmed —
  the investigation stopped once the size and determinism were measured, because every P2/P5 delta
  below is orders of magnitude larger.
- **Consequence for reading the tables:** the **baseline arm is measured directly from the pipeline's
  own routes**, never from the replica, and it is reproducible byte-for-byte across runs
  (`character-baseline.log` vs `probe-replica-fixed.log`, all 8 seeds). Variant deltas are taken against
  that baseline arm under one harness, so they are unaffected by the replica drift. The replica arms are
  controls, and `replica-production-2` is the one to read.
- `debug-real-noprune` is deliberately not on the table: it measures the pass before `pruneUndergroundHighways`,
  so its columns are a different network on purpose.

## P1 — character baseline (8 seeds, production arms)

Log: `measure/character-baseline.log`. Per-seed, production arm:

| seed | overlap | passUnder | nearMiss | directness | >1.25 | crestHit | crestSag | tunnelH | corridorH | landH | anchorMinDist |
|------|---------|-----------|----------|-----------|-------|----------|----------|---------|-----------|-------|---------------|
| a | 0.445 | 75 | 316 | 1.288 | 0.304 | 0.933 | 2.0 | 39.5 | 40.1 | 33.0 | 0.531 |
| b | 0.438 | 57 | 258 | 1.207 | 0.262 | 0.941 | 1.5 | 35.7 | 34.8 | 31.5 | 0.400 |
| c | 0.419 | 75 | 304 | 1.365 | 0.357 | 0.905 | 3.4 | 37.5 | 38.2 | 31.9 | 0.391 |
| d | 0.406 | 71 | 300 | 1.219 | 0.250 | 1.000 | 2.6 | 38.5 | 39.3 | 33.1 | 0.586 |
| e | 0.439 | 79 | 298 | 1.364 | 0.345 | 0.968 | 2.2 | 36.4 | 39.2 | 32.4 | 0.687 |
| f | 0.417 | 59 | 295 | 1.272 | 0.321 | 0.667 | 6.4 | 35.8 | 36.7 | 31.1 | 0.567 |
| g | 0.405 | 81 | 308 | 1.283 | 0.339 | 1.000 | 0.4 | 34.4 | 33.6 | 32.6 | 0.757 |
| h | 0.405 | 39 | 227 | 1.230 | 0.304 | 0.968 | 2.2 | 44.4 | 42.7 | 36.1 | 0.732 |
| **mean** | **0.422** | **67.0** | **288.25** | **1.278** | **0.321** | **0.923** | **2.6** | **37.8** | **38.1** | **32.7** | **0.581** |

Reconciliation with the standing figures (F7.2), under the recorded definitions:

- **overlap 0.422 against F7.2's 0.430** (per-seed 0.405-0.445 against a recorded range of 0.405-0.445):
  reconciles. The 0.008 gap is the same harness's own reproducibility, not a build change.
- **passUnder 67.0 against F7.2's 72 mean** (per-seed 39-81 against the recorded 41-90): reconciles at
  the low end; the harness's cell-chain set is the F7.2 audit definition, and its `surfaceOnlyContact`
  column equals its `passUnder` column on every seed by construction.
- **nearMiss 288.25 cells/seed** is new: the sag the user reports is mostly a *near*-miss problem — 4.3
  cells sit beside a surface-only burg for every one that sits on it.
- **directness 1.278 mean, max 3.048** — well under the sketch's 2.0 concern, and the concern's premise
  ("ratio near or above 2 suggests a mis-defined metric") did not trigger.
- **tunnel cells sit 5.1 h above the land mean** (37.8 against 32.7) but **0.3 h below the corridor mean**
  (38.1): the high-ground preference exists, yet the chosen path is, on average, marginally *below* the
  straight line it replaces. That is the sag complaint in a mean, and it is small.
- `measure-f` is the outlier on every sag-flavoured column (crestHit 0.667, crestSag 6.4, directness
  1.272): recorded, not explained away.
- The **H6 `parallel` metric reads 0.764 mean** on this build; it was retired as saturated at rung 1
  (F1.4) and is reported for continuity only.

## P2 — mechanism ablations (8 seeds, one mechanism removed at a time)

Log: `measure/character-ablations.log`. Every arm reports **zero plane violations and `repairs=0` on all
8 seeds** — the cost patch changes pricing, not the plane rules.

| arm | overlap | Δoverlap (per seed) | lenRat | passUnder | ΔpassUnder (per seed) | Δdirectness | ΔcrestHit | ΔcrestSag |
|-----|---------|--------------------|--------|-----------|----------------------|-------------|-----------|-----------|
| baseline-production | 0.422 | — | 1.000 | 67.0 | — | — | — | — |
| no-burg-pull | 0.579 | +0.122 … +0.186 | ×1.039 | 104.8 | +26 … +44 | +0.05 mean | −0.13 … +0.06 | −0.7 … +2.1 |
| no-plateau-max | 0.682 | +0.200 … +0.294 | ×1.114 | 162.4 | +81 … +103 | +0.08 mean | −0.03 … +0.06 | −1.1 … +1.2 |
| no-plateau-linear | 0.684 | +0.204 … +0.296 | ×1.114 | 163.1 | +81 … +103 | +0.08 mean | −0.04 … +0.06 | −1.1 … +1.2 |
| no-separation | 0.577 | +0.118 … +0.186 | ×1.041 | 103.3 | +25 … +43 | +0.05 mean | −0.13 … +0.05 | −0.7 … +2.1 |
| biome-blind | 0.559 | +0.106 … +0.161 | ×0.968 | 92.9 | +13 … +41 | +0.03 mean | −0.03 … +0.10 | −0.8 … +1.6 |
| `no-burg-attraction` (CH1 control) | 0.579 | — | ×1.039 | 104.8 | — | — | — | — |

Readings:

- **The plateau height term is the strongest single mechanism on every character column**, and the only
  one that moves `passUnder` by more than ~45: removing it adds 81-103 cells/seed (+121% … +264% of the
  39-81 baseline) and costs 10.8% network length. Its two candidate shapes (`no-plateau-max` rescaled
  over 0-80, `no-plateau-linear` inverse over 0-100) are **indistinguishable in practice**: overlap
  0.682 vs 0.684, length ratio identical to three decimals, passUnder 162.4 vs 163.1. The sketch's open
  question is settled as "either; the max-rescaled shape is marginally gentler".
- **The burg string and the separation displacement move the same columns in the same direction at
  similar size** (Δoverlap +0.12 … +0.19, Δlength ×0.96 … ×1.24, passUnder +25 … +43), and both match
  CH1's recorded direction for `no-burg-attraction` (overlap down, length up) — direction only, as the
  sketch requires; no magnitude carries across builds.
- **`no-burg-pull` and `no-burg-attraction` are byte-identical on every seed and column.** That is the
  harness's own consistency check that production's shipped pricing (attraction 2, plane-aware) is the
  same cost the P2 arm is ablating.
- **biome-blind is the only arm that shortens the network** (×0.967): the habitability term is currently
  buying length. It also adds 13-41 cells/seed on `passUnder` — the biome terms push tunnels onto burg
  cells rather than off them.
- **No ablation moves `crestHit` meaningfully** (all within ±0.13, most within ±0.05) and `crestSag`
  moves by −1.1 … +2.1 against a baseline of 2.6. See P4 for the keep/retire verdict.

## P3 — water census (8 seeds)

Log: `measure/water-census.log`. Water legs exist on all 8 seeds (the sketch's "zero everywhere means
the gate reading is wrong" check does not trigger).

| seed | water legs | water cells | span histogram | mean span | max span | direct-line crossing pairs measured |
|------|-----------|-------------|----------------|-----------|----------|-------------------------------------|
| a | 4 | 6 | {1:3, 3:1} | 1.50 | 3 | 6 |
| b | 9 | 42 | {1:2, 2:1, 4:1, 5:2, 6:1, 7:1, 11:1} | 4.67 | 11 | 9 |
| c | 3 | 6 | {1:2, 4:1} | 2.00 | 4 | 2 |
| d | 7 | 19 | {1:2, 2:1, 3:1, 4:3} | 2.71 | 4 | 7 |
| e | 9 | 31 | {1:5, 2:2, 7:1, 15:1} | 3.44 | 15 | 6 |
| f | 12 | 39 | {1:6, 3:1, 5:2, 6:2, 8:1} | 3.25 | 8 | 9 |
| g | 7 | 29 | {1:1, 2:1, 3:1, 5:2, 6:1, 7:1} | 4.14 | 7 | 9 |
| h | 4 | 7 | {1:3, 4:1} | 1.75 | 4 | 5 |

Per-crossing costs, for the pairs whose straight line crosses water inside the bound (ratios:
`waterDetour` = actual path over the straight line, `landPenalty` = the land-only fallback over the
actual path):

- **`waterDetour` is 1.00-1.41, mean ≈ 1.17** — where the bound permits a crossing, the tunnel takes a
  near-straight line under the water and pays only the depth-priced height term.
- **`landPenalty` is 1.00 on 27 of 53 measured crossings** — the land fallback the pathfinder finds is
  the *same* length, i.e. the crossing bought nothing on those pairs. On the other 26 it is 1.01-6.70,
  the largest being 6.70 (`measure-h`) and 5.67 (`measure-b`), where going around would nearly
  triple the connection.
- So the bound is **earning its keep on about half the crossing pairs and paying a character price**:
  `bound-minus-3` (production's `t >= -2` widened to `t >= -3`) reads overlap 0.565 (against 0.422),
  length ×0.969, and passUnder 95.3 (against 67.0) — a widened bound makes the network markedly more
  road-shaped and passes under half again as many surface burgs. This is the cost/benefit the user's
  water-bound call turns on (task 4.3).

## P5 — rung-5 micro-prototypes and the rung-6 feasibility sketch (8 seeds)

Log: `measure/rung5-proto.log`. Zero plane violations and `repairs=0` on every arm and seed.

| arm | overlap | Δoverlap | lenRat | passUnder | ΔpassUnder | directness | Δdirectness | crestSag |
|-----|---------|----------|--------|-----------|------------|-----------|-------------|----------|
| baseline-production | 0.422 | — | 1.000 | 67.0 | — | 1.279 | — | 2.6 |
| repulsion-cell | 0.381 | −0.028 … −0.056 | ×1.025 | **16.5** | −28 … −62 | 1.402 | +0.103 … +0.147 | 2.4 |
| repulsion-halo-1 | **0.376** | −0.015 … −0.057 | ×1.042 | 24.0 | −23 … −54 | 1.416 | +0.085 … +0.217 | 2.2 |
| repulsion-halo-2 | 0.384 | −0.017 … −0.058 | ×1.043 | 34.4 | −17 … −45 | 1.429 | +0.086 … +0.265 | 2.2 |
| trio-skeleton | 0.566 | +0.120 … +0.166 | ×0.965 | 95.5 | +18 … +47 | 1.308 | −0.020 … +0.061 | 2.4 |
| deviation-penalty | 0.479 | +0.028 … +0.093 | **×0.931** | 76.4 | −4 … +20 | 1.285 | −0.036 … +0.028 | 2.8 |

Readings:

- **Repulsion is the only lever measured in this change that attacks the user's first complaint at
  scale.** `repulsion-cell` (the D17 pre-authorized escalation: surface-only burg cells priced 3x)
  cuts `passUnder` from 67.0 to **16.5 cells/seed**, −28 … −62 per seed, every seed improving, for
  ×1.025 length. It also *lowers* overlap to 0.381 — the divergence objective improves at the same
  time. Nothing else measured here moves `passUnder` down at all.
- **The halo breadth answers itself: cell-only is the best value.** `repulsion-halo-1` (cell 3x, ring
  1.5x) reads the lowest overlap (0.376) but costs more length (×1.042 against ×1.025) and pays
  `passUnder` 24.0 for it; `repulsion-halo-2` is worse on both (0.384, 34.4, ×1.043). Since the
  complaint is pass-under and not overlap, and the cell-only arm is both cheaper and stronger on the
  complaint, **the cell-only shape is the one to graduate**; the sketch's open question is settled
  against breadth.
- **The "trio of best singles" is a negative result.** Combining the three arms that moved the
  character columns least (no burg pull, plateauless height, biome-blind) reproduces the P2 degradation
  and adds the three mechanisms together: overlap 0.566 (+0.120 … +0.166, worse than any single),
  length ×0.964, `passUnder` 95.5 (worse than every single arm). Removing the mechanisms production is
  already paying for is not a character improvement; it is a different network that happens to be
  shorter. Recorded as a dead end, not pursued.
- **The rung-6 deviation penalty is feasible and cheap to route.** One cross-track multiplier
  (`1 + crosstrack/20`) shortens the network by up to 11.4% (×0.930 mean, every seed shorter) and moves
  `directness` by −0.036 … +0.028 — the first arm that does *not* make the network bend more. It costs
  overlap (0.479) and leaves `passUnder` slightly worse (76.4). Its shape is routable, so rung 6 is a
  real child rather than a sketch; but this probe tested exactly one strength and is not a sweep.

## P6 — the stripped cost model (added after the user's 2026-09-30 direction)

The user directed that repulsion is not wanted, that underground paths should be as straight as
possible without regard to terrain or affiliation, and that height should not matter. This probe tests
that premise directly rather than assuming it. Log: `measure/geo-straight.log`.

**The arm.** `geo-straight-<λ>`: every road-derived term removed — no height preference, no
habitability/biome price, no burg term, no own-network discount, no surface separation. What remains is
Euclidean step length times a cross-track deviation factor, plus **exactly today's passability** (by the
user's ruling: glaciers block, `t < -2` water blocks, foreign shores block). λ prices one cell-width of
deviation as a fraction of the pair's direct distance; swept at 0.05 / 0.2 / 1.0.

**Why a deviation factor at all:** `findPath` is a plain Dijkstra with no heuristic
(`pathUtils.ts:337-372`), so with a uniform cost the returned path is whichever equal-cost path the
binary heap pops first. Straightness is not the default — it has to be priced.

A new column, `wander`, was added to the character metrics for this probe: the largest distance from any
tunnel cell to the record's own direct segment, in cell-widths. It is the straightness reading
`directness` cannot give, because a path can be short overall and still leave the line.

| metric (8-seed mean) | baseline | geo-straight λ=0.05 | λ=0.2 | λ=1.0 |
|----------------------|----------|---------------------|-------|-------|
| **network length** | 5685 | **×0.884** | ×0.883 | ×0.882 |
| **tunnel cells** | 564 | 464 | 465 | 467 |
| directness | 1.279 | 1.227 | 1.226 | 1.224 |
| directness > 1.25 share | 0.321 | 0.235 | 0.230 | 0.228 |
| **wander (mean / worst record)** | 3.31 / 21.56 | 2.98 / 21.22 | 2.96 / 21.22 | 2.91 / 21.12 |
| **overlap** | 0.422 | 0.561 (+0.114 … +0.160) | 0.562 | 0.562 |
| **passUnder** | 67.0 | 73.5 (+9 … +16 on 7 seeds, −8 on one) | 74.6 | 75.1 |
| nearMiss | 288.3 | 245.4 | 246.5 | 247.6 |
| multi-record cells | 81.1 | **53.1** | 52.9 | 52.5 |
| surface-only burg hubs | 5.1 | **0.6** | 0.6 | 0.6 |
| all other hubs | 50.0 | **26.5** | 26.3 | 25.9 |
| `exactEdge` (tunnel step *is* a road step) | 0.125 | **0.182** | 0.187 | 0.188 |
| burgs served (share of subterranean, as the log reports it) | 0.724 | **0.729** | 0.729 | 0.729 |
| plane violations / repairs | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

Readings — two of which contradict the direction the premise predicted:

- **Stripping the cost does not reduce road overlap; it raises it** (0.422 → 0.561, every seed worse).
  The mechanism is visible in the `exactEdge` column: overlap *rose* while exact-edge coincidence rose
  too — from 0.125 to 0.182. The old network was earning its overlap by **trailing along** road edges;
  a straight line **crosses** them. Crossing is what "not caring" looks like on this metric, and it
  counts as overlap. The character objective and the alignment objective are not the same axis, and
  this probe is the cleanest demonstration of it in the change.
- **`passUnder` gets slightly worse** (67.0 → 73.5 … 75.1; worse on 7 of 8 seeds). Nothing avoids
  surface-only burgs any more, and a straight line goes through whatever sits between its endpoints.
  So the geometry alone does not answer the user's first complaint either.
- **λ is nearly inert across a 20x sweep.** 0.05 → 1.0 moves length by 0.2% and wander by 3%. In this
  cost landscape, an almost trivial straightness incentive already wins; the shape is not a tuning
  knob. (λ=1.0 is marginally the worst on passUnder and overlap — over-forcing straightness pushes paths
  onto obstacles.)
- **The straightness gain is real but small**: directness 1.279 → 1.224 and the >1.25 share 0.321 →
  0.228 (a 29% cut in the records that bend noticeably), but mean wander only **3.31 → 2.98
  cell-widths** and the worst record only 21.56 → 21.22. The paths were never winding far off their own
  line to begin with. **The current network was not very winding to begin with** —
  which means the user's "tunnels curve and bend like above-ground routes" is not primarily a
  path-choice problem.
- **What the strip does change is the network's structure, and it is a large gain:**
  length ×0.884, tunnel cells 564 → 464 (−18%), cells carrying multiple records 81.1 → 53.1 (−35%),
  surface-only burg hubs 5.1 → 0.6, and every other hub 50.0 → 26.5. Service is unchanged (0.729 against
  0.724 of the subterranean burgs served) and the plane audit stays clean. **The convergence that made the network read
  as a road network largely disappears** — which is the complaint's actual shape, since the reported
  symptom was tunnels threading through *the same settlements the roads converge on*.
- Remaining wander is dominated by the passability gates, not by the cost: the worst records (21
  cell-widths off the line) are corridors forced around water and foreign shores, which the user's
  "keep today's passability" ruling preserves by construction.

**Disposition:** the premise is half-confirmed. Straight-line geometry removes the convergence and the
road-*following*, cheaply, and is worth promoting — but it does **not** improve the two numbers the
charter has been reporting (overlap, passUnder), and it should not be sold as doing so. On this evidence
the honest statement is: *character and alignment are different objectives, and the stripped model trades
the alignment number for network simplicity and independence.* Adoption is the user's call; see "Open
Questions".

## P7 — road copies: the "same source and destination" metric (user's 2026-09-30 rule)

The user redefined the alignment offence: **cell overlap is acceptable; a tunnel that connects the same
source and destination as an overland route is not**, with "pass under burg" temporarily treated as a
destination for the calculation. Log: `measure/roadcopy.log`.

**The detector.** For each tunnel record, the settlements it connects are the burgs on its two end cells
(identity, no tolerance — the codebase's own plane rule calls a record's end its burg's cell). Then:

- **`same`** — a surface record connects the same pair of settlements. This is the strict rule.
- **`viaBurg`** — the expanded rule: the tunnel passes under a surface-only burg that some road
  terminates at *and* connects that road's other end, so it shadows the connection into the settlement
  it passes beneath. A burg the tunnel actually connects is not a pass-under; that is the `same` case.
- **`roadCopies`** = `same`; **`roadCopiesExpanded`** = `same` + `viaBurg`.

Four known-answer fixtures pin the comparator (`roadCopy.same-connection`, `.no-settlements`,
`.one-end-only`, plus the pre-existing metric fixtures). The two burg cases are exercised on the real
map instead: on a uniform grid a burg's cell and its neighbour's dot are the same distance apart, so
synthetic "passes under X but connects Y" geometry cannot be made unambiguous. Recorded as a fixture
limitation, not a rule ambiguity.

**Result 1 — the current network copies surface connections on 13% of its records (8 seeds):**

| seed | tunnel records | same-connection | pass-under | road copies | expanded | copy cells |
|------|---------------|-----------------|------------|-------------|----------|-----------|
| a | 57 | 2 | 6 | 2 | 8 | 171 |
| b | 40 | 0 | 5 | 0 | 5 | 41 |
| c | 47 | 2 | 4 | 2 | 6 | 66 |
| d | 63 | 2 | 7 | 2 | 9 | 75 |
| e | 57 | 5 | 8 | 5 | 13 | 209 |
| f | 54 | 6 | 2 | 6 | 8 | 61 |
| g | 52 | 4 | 1 | 4 | 5 | 70 |
| h | 49 | 0 | 1 | 0 | 1 | 13 |
| **total** | **419** | **21** | **34** | **21** | **55** | **706** |

Mean 6.9 copied records per seed (2.6 same-connection, 4.2 pass-under), 88 copied cells per seed.

**Result 2 — the stripped geometry model does not reduce it; it slightly increases it:**

| arm | records | same | pass-under | expanded | copy cells |
|-----|---------|------|------------|----------|-----------|
| baseline-production | 419 | 21 | 34 | **55** | 706 |
| geo-straight λ=0.05 | 395 | 22 | 44 | 66 | 663 |
| geo-straight λ=0.2 | 395 | 22 | 45 | 67 | 690 |
| geo-straight λ=1.0 | 395 | 22 | 39 | 61 | 658 |

Per seed, expanded copies are worse on 5 of 8 seeds for λ=0.05 (a 8→10, c 6→8, d 9→12, f 8→10,
h 1→4), equal on 2 (b, e) and better on 1 (g 5→4). Copy *cells* fall slightly (706 → 663) because the
straight network is smaller, but the *count* of copied connections rises.

**Reading.** This is the same mechanism as P6's overlap result, in a metric that cannot be accused of
measuring incidental cell overlap: **a straight tunnel shadows a surface connection by geometric
necessity** — the straight line between two settlements passes through whatever lies between them,
including the settlements whose roads terminate along the way. The road-shaped model shadowed
connections by *incentive* (the burg term paid it to). Neither is free of the offence; they commit it
for different reasons. On this rule, geometry alone is not the fix, and any rung that wants a low
road-copy count needs an explicit term that distinguishes "passing near a settlement" from "serving it".

**Disposition:** the metric is the right one for the user's rule and is now the recommended alignment
column in place of `overlap` (see Open Questions). It does not favour the stripped model, so it does not
break the P6 tie in either direction.

## P8 — the necessity counterfactual (user's reframe, 2026-09-30)

The user reframed the objective: the underground network does not have to be complete. It exists to
(1) connect underground-only burgs, (2) shortcut what overland cannot or will not connect, and
(3) occasionally run long and straight between distant underground burgs. Isolation is acceptable where
the surface already provides connectivity, so the network should develop naturally only around clusters
of fully subterranean burgs or where overland connections are sparse.

**The structural fact this turns on.** `markUndergroundSettlements` draws dual-identity and fully
subterranean burgs at the *same* share (`SUBTERRANEAN_SHARE = 0.05` each), so a below-level population of
~85 per seed is about **43 dual-identity burgs, which already reach the surface network, and about 43
fully subterranean ones, which do not**. The current pair set (`sortBurgsByFeature(pack.burgs,
hasBelowLevelPresence)`) treats both alike.

Log: `measure/pairset-sub-only.log`. The counterfactual runs the same production cost over a pair set of
**fully subterranean burgs only**:

| metric (8-seed mean) | baseline (all below-level) | subterranean-only | change |
|----------------------|---------------------------|-------------------|--------|
| records | 52.4 | 25.1 | −52% |
| tunnel cells | 564 | 394 | −30% |
| length | 5685 | 3894 | −32% |
| overlap | 0.42 | 0.38 | better |
| passUnder | 67.0 | 45.2 | −33% |
| nearMiss | 288.2 | 197.1 | −32% |
| **road-copy records (expanded)** | **6.9** | **1.8** | **−75%** |
| multi-record cells | 81.1 | 43.1 | −47% |
| exactEdge | 0.13 | 0.10 | better |
| directness | 1.28 | 1.45 | worse |
| service violations | 0 | **34.1** | see below |
| boundary violations / repairs | 0 / 0 | 0 / 0 | clean |

Reading:

- **52% of the current network's records exist only to connect burgs that already have a surface
  route**, and **75% of the road-copy offence is attributable to those same pairs.** Half the records,
  three quarters of the shadowing.
- The trimming is not a sacrifice on the measured objectives: overlap, passUnder, nearMiss and
  multi-record cells all improve, and the plane audit stays clean. The one regression is `directness`
  1.28 → 1.45 — a sparser graph produces fewer merge opportunities, so surviving records bend more to
  reach each other. That is the honest cost and the thing a rung must watch.
- This is consistent with P7's finding that straight geometry does not reduce shadowing: the offence is
  not primarily a path-shape problem, it is a **demand** problem. The network is connecting traffic that
  is already connected.
- **The counterfactual fails the service rule, and that failure is the design constraint.** The
  subterranean-only arm carries **41, 29, 32, 37, 35, 31, 33, 35 service violations** (34.1/seed) against
  0 in the baseline, with zero boundary violations and zero repairs: dropping the dual-identity pairs
  **strands fully subterranean burgs on landmasses where a dual-identity burg was the only link**.
  So the trimming cannot be a flat "endpoints must be subterranean" filter. The rule that satisfies both
  the counterfactual's economics and the service contract is: **pairs connect fully subterranean burgs,
  while dual-identity burgs remain usable as transit** — they may sit inside a chain, they may be the
  junction where two tunnels meet, but a pair should not exist merely to link two already-connected
  settlements. That is one connected tree over the subterranean set, not a forest that abandons the
  burgs the old edges were incidentally serving.

**The backbone alternative, measured.** A tree over *every* below-level burg (the smallest pair set
that can still satisfy the service rule as written) was run in the same session:
**67.3 pairs, 458 cells, 4271 length, overlap 0.46, passUnder 54.0, multi-record cells 63.1, directness
1.20, zero service and boundary violations — but 8.38 road-copy records per seed against the baseline's
6.88.** So the tree improves character columns and directness while making shadowing *worse*: an MST
minimises geometric distance and cannot see the surface network, so its edges are free to run straight
down a road. The two findings together — straight geometry does not reduce shadowing (P7), and a
distance-minimising tree does not either (here) — are what established that shadowing is a
*demand-and-service* problem rather than a path-shape problem.

**Decisions taken on this evidence (user, 2026-09-30):** the service contract is to be relaxed so a
dual-identity burg — which its surface route already connects — is not owed a tunnel, while it keeps the
right to be an endpoint and to serve as transit; and **shadowing stays unaddressed in the follow-up
change**, held as a regression gate at the 6.9 records/seed baseline rather than fixed.

**Disposition:** the pair set, not the cost model, is the highest-leverage lever found in this change.
The three effects the user described are three nested selection rules over pairs — a connectivity
backbone over fully subterranean burgs (must), a shortcut rule for what overland cannot serve
(should), and a distance threshold for occasional long links (may) — and this probe supplies the
baseline the first of them should be measured against: **25.1 records, 394 cells, 1.8 road copies**.

## P4 — which metrics discriminate

Verdict per P1 metric, from the movement across the P2 and P5 tables (means never alone — the per-seed
spread is the evidence):

| metric | verdict | the numbers |
|--------|---------|-------------|
| `overlap` (standing) | **kept — highly discriminating** | moves −0.058 … +0.296 across arms; the only column that separates every mechanism |
| `passUnder` | **kept — the complaint's own metric, most discriminating of the new ones** | 16.5 (repulsion-cell) … 163.1 (no-plateau-linear) against 67.0; every arm separates |
| `directness` (+ >1.25/>1.5 shares) | **kept** | 1.279 baseline, 1.402-1.429 under repulsion, 1.285 under the deviation penalty; separates the arms that bend from the arms that straighten |
| `nearMiss` | **kept, but read as a pair with `passUnder`** | 227-316 baseline; repulsion pushes it *up* to 318.6 while `passUnder` falls to 16.5, i.e. the network moves from on the burg to beside it. Only meaningful beside `passUnder` |
| `elevProfile` (`tunnelH` / `corridorH`) | **kept — weak but directional** | tunnel mean 34.4-44.4 against land 31.1-36.1, i.e. always above land; corridor means move ≤3.9 h across all arms |
| `biomeShare` (table) | **kept — descriptive only** | the table shape is right; it has no scalar to move, and no arm changed the ordering of the top three biomes |
| `crestHit` (share) | **retired as saturated** | 0.667-1.000 baseline, and **no arm moves it beyond ±0.13** (most within ±0.05) while `passUnder` moves by 100+ in the same arms. The F1.4 `parallel` lesson repeats |
| `crestSag` | **retired as saturated** | baseline 2.6; every arm within ±2.1, and the sign is not consistent across seeds. It replaced `crestHit` as a definition but does not discriminate either |
| `anchorMinDist` | **retired as saturated** | 0.581 mean baseline; a rendering-distance reading with no arm that moves it, and only measurable on the baseline arm |

So the discriminating set is **overlap, passUnder, directness (with its shares), nearMiss, and the
elevation profile**; the crest family and the anchor distance join `parallel` as recorded-but-retired.
P1's definitions should keep the retired columns in the log — they cost nothing and are the record that
they were tried — but no rung should be judged on them.

## Sanity expectations (task 3.1)

| expectation (sketch) | verdict | evidence |
|----------------------|---------|----------|
| fidelity anchor holds on every column, every seed | **contradicted on 2 of 8 seeds** | see "Fidelity anchor" — 1-2 cells on e/f; diagnosed, bounded, and not a conclusion-changer |
| overlap reproduces ~0.430 mean | **met** | 0.422 mean, 0.405-0.445 per seed |
| passUnder ~72 cells/seed mean | **met at the low end** | 67.0 mean, 39-81 per seed (F7.2 recorded 41-90) |
| directness well under 2.0 | **met** | 1.278 mean, 1.207-1.365 per seed, max single record 3.048 |
| tunnel cells at or above the land mean; below means check the corridor sampler | **met** | 37.8 against 32.7 land (+5.1, every seed positive) |
| water legs exist where bays occur; zero everywhere means the gate reading is wrong | **met** | water legs on all 8 seeds, 3-12 per seed |
| ablations change no endpoints/boundaries, zero violations, `repairs=0` | **met** | every arm and seed reports `violations=0 repairs=0` in all three probe logs |
| `no-burg-pull` reproduces CH1's direction (overlap down, length up) | **contradicted in sign, explained** | here `no-burg-pull` reads overlap **up** (+0.12 … +0.19) and length **up** (×1.033). CH1 ablated the *rung-2 attraction*, i.e. moved from attraction 3 to production's 2; this arm removes the burg string entirely, so it is a different and larger ablation. The direction match the sketch asked for belongs to the `no-burg-attraction` control, which P2 measured as byte-identical to `no-burg-pull` — the two arms coincide because production's shipped attraction is already the P2 arm's cost |

## What Worked / What Didn't Work (task 3.2)

**Worked**

- The known-answer fixtures: 10 checks, every one against geometry whose answer is known by
  construction, run before the protocol on every invocation. They caught a real metric defect (below)
  that would otherwise have been read as a finding.
- The character-column extension itself: all metrics are post-pass, the 8-seed run takes ~4-6 minutes
  with the full arm set, and the standing columns stayed byte-identical when the character columns were
  added (task 1.2 verification).
- The per-variant `violations`/`repairs` columns added during P2: the standing gate is now checkable
  per arm and per seed straight from the log, rather than only for the production arm.
- `repulsion-cell`: a pre-authorized escalation that turns out to be the strongest character lever in
  the change, improving the divergence objective at the same time.

**Didn't work, with diagnosis**

- **`crestHit` as first defined could not separate "reached the crest" from "bent around it", and the
  known-answer fixture is what exposed it.** First definition: a hit is a tunnel cell within 1
  cell-width of the corridor's highest cell. Diagnosis, in the protocol's order:
  1. *Probe first.* The fixture asked for a chain that crosses high ground but misses the crest. No
     such chain exists near the straight line: the corridor is every cell within 1.5 cell-widths of the
     direct segment, so its highest cell is by construction within 1.5 cell-widths of any chain that
     stays on that line, and a chain cell 1.0 cell-width from the crest must itself lie in the corridor.
     The hit radius being *smaller* than the corridor reach makes "crossing but missing" nearly
     unreachable — the metric was close to tautological for the records it selected.
  2. *Harness second.* The corridor sampler had a real bug of its own, found while chasing this: it
     unioned only the nearest cell's neighbourhood per sample, making the corridor a 1-D chain rather
     than a band. Fixed to union every cell within 1.5 cell-widths of each sample.
  3. *Implementation third.* No defect found in the generator: the routes behave as designed.
  4. *Outcome.* Genuine metric limitation, not an implementation bug. The definition was replaced with
     the sag reading (`crestSag` = corridor crest minus the record's own high point, hit at sag <= 10),
     which the fixture can check both ways, and the fixture now documents why the two peaks are placed
     where they are. P4 then retired both crest columns as saturated anyway — so the effort bought a
     correct definition and a negative result, not a usable metric.
- **The "trio of best singles" (no burg pull + plateauless + biome-blind) failed.** Diagnosis: not a
  probe defect — the arms ran clean, zero violations, and the result reproduces the sum of the P2
  single-arm degradations. Genuine limitation: these mechanisms are what production pays to *keep*
  tunnels off roads and burgs, so removing all three produces a shorter, more road-shaped network. The
  trio premise ("the singles that move character least are the ones to combine") was wrong: an arm that
  does not move a metric when removed is a mechanism the metric does not see, not a lever.
- **`repulsion-halo-2` is dominated.** Same complaint metric as `repulsion-cell` (passUnder 34.4 against
  16.5) at a higher length cost (×1.043 against ×1.025); the wider halo spends length without buying
  the character the narrow one already bought. Diagnosis: probe defect was ruled out (the halo field is
  correctly built by BFS from the surface-only burg cells and the arm is deterministic across seeds) —
  genuine limitation of breadth.
- **The replica's 1-2 cell drift on measures e/f** — see "Issues & Resolutions". Implementation or
  harness defect, not a measurement artefact of the metric: it is deterministic and it vanishes on the
  second replica arm. Not resolved; bounded and worked around.

## Synthesis — which mechanisms actually shape tunnel character (task 4.1)

Per-seed, against the 8-seed baseline (`character-ablations.log`, `rung5-proto.log`; deltas are the
per-seed ranges, never means alone):

| mechanism | verdict | character effect | length cost | alignment effect |
|-----------|---------|------------------|-------------|------------------|
| **Burg string** (below-level pull) | **shapes character, but only pass-under's neighbour** | removing it: `passUnder` +26 … +44 (67.0 → 104.8), `nearMiss` −64 … +36 with no consistent sign, `directness` +0.05 mean, `crestHit`/`crestSag` inside noise | ×0.91 … ×1.24, mean ×1.039 | overlap 0.422 → 0.579 (worse) |
| **Height plateau** (h>=50) | **the strongest single mechanism, and the only one that buys character for length** | removing it: `passUnder` +81 … +103 (67.0 → 162.4, i.e. +142% mean), `directness` +0.08 mean, `tunnelH` −0.5 … −4.9 | ×0.95 … ×1.42, mean ×1.114 — the most expensive | overlap 0.422 → 0.682 (much worse) |
| **Separation displacement** | **shapes character, similar size to the burg string** | removing it: `passUnder` +25 … +43 (67.0 → 103.3), `directness` +0.05 mean | ×0.96 … ×1.24, mean ×1.041 | overlap 0.422 → 0.577 (worse) |
| **Biome terms** (habitability + the water 1.1) | **the only mechanism that currently pays for itself in length** | removing both: `passUnder` +13 … +41 (67.0 → 92.9), and the only arm that shortens the network | ×0.91 … ×0.99, mean **×0.968** | overlap 0.422 → 0.559 (worse) |
| **Burg repulsion** (the escalation) | **the one lever that improves the character objective and the divergence objective together** | `passUnder` −28 … −62 (67.0 → **16.5**, every seed), `nearMiss` up to +30 (the network moves beside the burgs, not onto them), `crestSag` −1.3 … +0.7 | ×1.025 mean, ≤×1.047 | overlap 0.422 → **0.381** (better) |
| **Deviation penalty** (rung-6 sketch) | **the only lever that shortens the network without bending it more** | `directness` −0.036 … +0.028, `crestSag` −0.4 … +1.1 | **×0.886 … ×0.956** (mean ×0.931) | overlap 0.422 → 0.479 (worse) |

The synthesis in one line: **every mechanism that currently shapes character is also what makes the
network shorter and more road-shaped; the character objective and the standing alignment objective pull
in opposite directions under ablations, and only repulsion improves both.**

## Adoption Candidates (tasks 4.2, 4.3, 5.3)

| candidate | evidence rows | shape of the child | spec deltas it would need |
|-----------|---------------|--------------------|---------------------------|
| **`repulsion-cell`** — surface-only burg cells priced 3x | `rung5-proto.log`: passUnder 16.5 vs 67.0, −28 … −62 per seed, all 8 improving; overlap 0.381 vs 0.422; lenRat ×1.025 | **rung 5, semi-test-driven**, as the D17 pre-authorized escalation. It is cheaper than the halo and stronger on the complaint | a new requirement in the underground-highways capability: surface-only burg cells are priced at a multiple. D17 already pre-authorizes the escalation, so this is an adoption of existing policy rather than new policy |
| **Wider water bound (`t >= -3`)** | `water-census.log`: overlap 0.565 vs 0.422, length ×0.969, passUnder 95.3 vs 67.0; but the census also shows `landPenalty` > 1 on 26 of 53 crossings (up to 6.70) | **the user's call, not a rung.** Presented below | a change to the bound constant plus its requirement text, *if* the user rules to widen |
| **Deviation penalty** | `rung5-proto.log`: lenRat ×0.931 mean (every seed shorter, up to ×0.886), directness unchanged within ±0.036 | **rung 6, semi-test-driven**, as its own child — the probe tested one strength and is not a sweep | a **new requirement**: a record's steps pay a cross-track multiplier against the pair's straight line |
| **Plateauless height shape** | `character-ablations.log`: the strongest character gain measured (passUnder +81 … +103 when removed) but the largest length cost (×1.108) | **not adopted as a replacement.** If rung 5/6 wants more crest-reaching, this is the lever, but it must be paid for; P2 settled that either monotone shape reads the same | would amend the height-term requirement |
| **Repulsion halo** | `rung5-proto.log`: halo-1 0.376 overlap / 24.0 passUnder / ×1.042; halo-2 0.384 / 34.4 / ×1.043 | **not adopted.** Cell-only dominates it on the complaint at lower length cost. Re-open only if cell-only proves insufficient in production, which `repulsion-halo-1`'s lower overlap makes conceivable | a halo strength + breadth requirement, if ever adopted |
| **`trio-skeleton`** | `rung5-proto.log`: overlap 0.566, passUnder 95.5, every seed worse | **dead end, not adopted.** Recorded in What Didn't Work | — |

### The water-bound call (task 4.3)

What the census says, for the user to rule on:

- **The bound is doing real work.** On 26 of the 53 measured crossing pairs the land fallback is
  1.01-6.70x the water route — going around would nearly triple some connections. Where the bound
  permits a crossing the tunnel pays only a `waterDetour` of 1.00-1.41 (mean 1.17) over the straight
  line.
- **But on 27 of 53 crossings the fallback is exactly the same length** — the crossing bought nothing
  and still put the tunnel under water, where it overlaps no road by construction.
- **Widening the bound to `t >= -3` is not free.** `bound-minus-3` reads overlap 0.565 against 0.422
  (+0.14), length ×0.969, and `passUnder` 95.3 against 67.0 — a widened bound makes the network
  materially more road-shaped and puts it under half again as many surface burgs.
- **The glacier gate was measured as-is and stays an open call.** No glacier variant was built or run in
  this change (production's `habitability 0 -> Infinity` gate is in every arm as-is); nothing here
  supports or opposes changing it.

## The affiliation / biome audit (user issue 3, static)

Read off the three cost functions in `src/generators/routes-generator.ts`, not measured (the P2
`biome-blind` arm is the measurement of the terms this audit identifies).

- **There is no affiliation term anywhere.** No cost function in the file reads `pack.cells.culture`,
  `state`, `province`, `religion` or any political layer — the only match for those names in the file is
  absent entirely. So a tunnel does **not** avoid neutral or uninhabitable cells because of affiliation:
  the affiliation hypothesis is refuted statically, and nothing in P2 needed to test it.
- **What actually gates and prices cells is biome habitability, in two different roles.**
  1. *A hard gate*: `getLandPathCost` and `getUndergroundPathCost` both return `Infinity` on a land cell
     whose biome `habitability` is 0 (glacier). That is the glacier gate, and it is the same rule on both
     planes — a surface route cannot cross a glacier either.
  2. *A soft price*: `habitabilityModifier = 1 + max(100 - habitability, 0) / 1000`, i.e. **[1, 1.1]** —
     at most a 10% surcharge, on the land cost and on the tunnel cost.
- **The water pricing quirk, confirmed.** `getWaterPathCost` never reads habitability, so sea routes pay
  no biome term; `getUndergroundPathCost` applies the modifier to *every* step including water, and the
  marine biome's habitability is 0, so **a water step in a tunnel pays the full 1.1 while a water step in
  a sea route pays 1.0**. The P2 `biome-blind` arm removes exactly this (its water branch has no
  habitability term).
- **So the answer to the audit request is: biome avoidance, yes — at up to 10% over 1.0; affiliation
  avoidance, no, there is no such term.** The P2 measurement then says what that 10% is worth: removing
  both roles (`biome-blind`) moves `passUnder` up by 13-41 cells/seed and *shortens* the network
  (×0.968), which makes the biome terms a net cost in length and a net cost in character — the one
  mechanism measured here that production would be better off without on both objectives.

## Probe Log

| probe | disposition | evidence |
|-------|-------------|----------|
| P1 character baseline | observed — baseline recorded, reconciles with F7.2 | `measure/character-baseline.log`, table above |
| P2 mechanism ablations | observed — all four mechanisms measured; plateau dominant | `measure/character-ablations.log`, table above |
| P3 water census + bound-minus-3 | observed — bound earns its keep on ~half the crossings, costs character | `measure/water-census.log` |
| P4 metric discrimination | observed — 5 metrics kept, 3 retired as saturated (+ `parallel` already retired) | "P4 — which metrics discriminate" |
| P5 rung-5 micro-prototypes | observed — repulsion-cell strongest; the trio is a dead end; the deviation penalty is routable | `measure/rung5-proto.log` |
| P6 stripped cost model (post-charter, user direction) | observed — structure and independence improve sharply; overlap and passUnder get slightly worse; λ nearly inert | `measure/geo-straight.log`, section "P6" |
| P7 road-copy metric (post-charter, user direction) | observed — 55 of 419 records copy a surface connection; straight geometry does not reduce it | `measure/roadcopy.log`, section "P7" |
| P8 necessity counterfactual (post-charter, user reframe) | observed — 52% of records and 75% of road copies serve already-connected burgs | `measure/pairset-sub-only.log`, section "P8" |
| Known-answer fixtures | pass — 10 checks, run before every protocol | `KNOWN-ANSWER` lines in every log |

## Issues & Resolutions

- **The harness's replica does not reproduce production on 2 of 8 seeds** (1-2 cells, deterministic,
  second replica arm exact). Measured and bounded; not resolved. See "Fidelity anchor" above. No figure
  in this evidence is taken from a replica arm.
- **The harness priced every variant pair without production's per-feature landmass gate.** Production
  prices each pair through `createUndergroundCost(feature)`, which forbids landing on a foreign shore;
  the harness called `getUndergroundPathCost` directly. Fixed during P1 (pairs now carry their feature
  and every arm goes through `createUndergroundCost` or an explicit gate), after the drift above was
  found to be a routing difference rather than a measurement one.

## Open Questions

- Which monotone height shape for a plateauless term: **settled** by P2 (both read the same; the
  max-rescaled shape is marginally gentler).
- Does `crestHit` read the cell chain or the drawn points: **settled** — the cell chain, and the metric
  itself was redefined (see What Didn't Work).
- Repulsion-halo breadth: **settled** — cell-only beats both halos on the complaint's own metric at the
  lowest length cost.
- Is the deviation-penalty probe worth building: **settled yes** — one strength shortened the network on
  every seed without moving directness, so rung 6 is a real child; its strength is not yet swept.
- Why measures e and f drift the replica by 1-2 cells: hypothesis recorded, not confirmed.
- **Open after P6 (user's call):** whether to adopt the stripped geometry model. The evidence is mixed
  and does not favour it on the charter's own numbers: it removes convergence and road-following
  (`exactEdge` up, multi-record cells −35%, surface-only hubs 5.1 → 0.6, length ×0.884) but raises
  overlap (0.422 → 0.561) and `passUnder` (67.0 → 73.5). It is a different objective, not a better
  score on this one.
- **Open after P6:** `overlap` may be the wrong alignment metric for a straight-line plane, since a
  straight tunnel *must* cross whatever lies between its endpoints. If the stripped model is adopted,
  the alignment column probably needs to change to something like "length coincident with a road step"
  (`exactEdge`, currently 0.125 → 0.182) rather than "share of cells that carry a road".
