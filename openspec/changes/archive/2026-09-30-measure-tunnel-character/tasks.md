<!-- LIVING DOCUMENT: surprising results routinely revise this list via the openspec update flow;
     superseded tasks are marked [-] with a reason, never silently deleted. A failing or surprising
     probe is first a probe defect, then harness/environment, then implementation, and only last a
     verdict about the idea. -->

## 1. Setup & Scaffolding

- [x] 1.1 Copy the harness back to `src/generators/underground-measure.dom.test.ts` (H6 recipe), retitle its header for this change, and smoke-run one seed (`VITE_MEASURE_SEEDS=measure-a`) — verification: the run emits `SEED`/`ROW`/`AGG` lines and `replica-production` equals `baseline-production` on every standing column.
- [x] 1.2 Add the P1 character columns to the ROW emitter — directness (mean + shares above 1.25/1.5), elevProfile (tunnel / corridor / land means), crestHit share, passUnder + nearMiss + min anchor distance to surface-only burgs, biomeShare printed as a table line — verification: a one-seed smoke run prints every new column, and the standing columns are byte-identical to the 1.1 run.
- [x] 1.3 Build the known-answer fixtures from the sketch (two-cell directness = 1.0, an L-chain's coordinate ratio, a one-peak corridor for crestHit, a near-miss burg pack, the bay fixture spans, a single-biome share) as cheap assertions that run before the 8-seed protocol — verification: every known-answer check passes on its ground truth.

## 2. Probes

- [x] 2.1 P1: run the 8 paired seeds, production arms only, with the character columns — verification: output saved to `measure/character-baseline.log`; overlap and passUnder reconcile with F7.2's readings (~0.430 mean, ~72 cells/seed) under the recorded definitions.
- [x] 2.2 P2: add the mechanism ablations (`no-burg-pull`, `no-plateau` with the monotone shape chosen from the sketch's open question, `no-separation`, `biome-blind` incl. the water 1.1 fix) and run the 8 paired seeds — verification: per-seed deltas saved to `measure/character-ablations.log`; every variant reports zero plane violations and `repairs=0`.
- [x] 2.3 P3: add the water census (water-leg count, consecutive-span distribution, per-pair detour ratio vs the land fallback) and the `bound-minus-3` variant, run the 8 seeds — verification: census saved to `measure/water-census.log` with spans and detour ratios per seed.
- [x] 2.4 P5: add the rung-5 micro-prototypes (`repulsion-cell` 3x on surface-only burg cells, `repulsion-halo` with the breadth chosen from the open question, then the trio of best singles) and the deviation-penalty feasibility probe, run the 8 paired seeds — verification: paired table saved to `measure/rung5-proto.log` carrying character + alignment + lenRat + audit columns.
- [x] 2.7 P7 (added 2026-09-30, on user direction): add the road-copy metric — cell overlap is acceptable, connecting the same source and destination as a surface route is not, with pass-under-burg treated as a destination — and audit the production network and the three geo-straight arms with it — verification: known-answer fixtures pass and the per-arm audit is saved to `measure/roadcopy.log`.
- [x] 2.8 P8 (added 2026-09-30, on user reframe): measure the necessity counterfactual — the same production cost over a pair set of fully subterranean burgs only — to decide whether the network is over-built for burgs that already have surface routes — verification: per-seed anchor and road-copy audit saved to `measure/pairset-sub-only.log`, zero plane violations.
- [x] 2.9 P9 (added 2026-09-30): measure the tree-over-all-below-level pair set to separate "the pair set is over-built" from "the neighbour graph is the wrong structure", and record the resulting direction — verification: per-seed anchor and road-copy audit saved to `measure/pairset-mst.log`; follow-up change `select-underground-pair-set` proposed on the evidence.
- [x] 2.5 P4: derive the metric keep/retire verdict from the P2/P5 tables — verification: every P1 metric marked kept / retired-as-saturated in evidence.md with the per-seed movement that justifies it.
- [x] 2.6 P6 (added 2026-09-30, on user direction): strip the road-derived cost terms and price only geometry — a cross-track deviation factor on Euclidean steps, with today's passability unchanged — swept at λ = 0.05 / 0.2 / 1.0 over the 8 paired seeds — verification: the three arms plus the anchor saved to `measure/geo-straight.log`; zero plane violations and `repairs=0` on every arm.

## 3. Sanity & Diagnosis

- [x] 3.1 Check the sketch's sanity expectations against the runs (anchor equality everywhere; directness well under 2.0; elevProfile at or above the land mean; waterShare > 0 on bay seeds; no-burg-pull direction matches CH1's) — verification: each expectation marked met/contradicted in evidence.md, any contradiction diagnosed before conclusions are drawn.
- [x] 3.2 Diagnose surprises under the probe-defect-first protocol (probe → harness → implementation → outcome) — verification: every dead-end verdict carries a "What Didn't Work" entry splitting implementation bug from genuine limitation.
- [x] 3.3 Settle the open questions the runs answer (which monotone height shape reads best, whether crestHit uses chain or points, halo breadth, whether the deviation probe earns its build) — verification: each decision recorded in evidence.md with the numbers that settled it.

## 4. Analysis & Synthesis

- [x] 4.1 Synthesize the mechanism verdicts — which of the burg string, height plateau, separation displacement and biome terms measurably shape tunnel character, at what length and alignment cost — verification: a verdict table in evidence.md citing per-seed numbers, not means alone.
- [x] 4.2 Judge what graduates: the rung-5 trio pieces and the rung-6 deviation penalty, each into which shape of child — verification: adoption candidates listed with evidence rows and the spec deltas they would need (deviation penalty needs a new requirement; repulsion-halo likely one).
- [x] 4.3 Read the water census into the user's open water-bound call, and note explicitly that the glacier gate was measured as-is and stays an open call — verification: a short bound cost/benefit summary the user can rule on, no glacier variant conclusions.

## 5. Evidence Documentation

- [x] 5.1 Record every probe observation in evidence.md's Probe Log — verification: P1-P5 all have entries with per-seed numbers.
- [x] 5.2 Record What Worked / What Didn't Work entries with diagnosis — verification: every surprise from section 3 has an entry.
- [x] 5.3 Review adoption candidates: what promotes to rung 5/6 children, in which schema and shape — verification: the graduation path stated per candidate.
- [x] 5.4 Claims↔artifacts audit: every evidence number traces to a saved log or ROW — verification: spot-checks of quoted numbers against `measure/*.log` pass.
- [x] 5.5 Final consistency pass: proposal probes ↔ Probe Log ↔ evidence entries — verification: no orphan probe, no orphan number.
- [x] 5.6 Remove the harness from `src/generators/` and keep the updated copy in this change's `harness/` — verification: `git status` shows no `underground-measure.dom.test.ts` under `src/`, and the change dir holds the updated `.txt`.