<!-- STAGE 3 PURPOSE: This is the PRIMARY OUTPUT of meta-planning.
     It starts as an empty scaffold and is filled progressively during apply.

     LIFECYCLE DOCTRINE — this comment lives in the document for its whole
     life (it survives compaction and resume; it IS the convention).

     HOT DOC: every session that must touch this file re-ingests it.
     Keep it inside ONE read window (~800 lines / ~51 KB): carry only
     what a later child, panel, or resumed reader must have and cannot
     find elsewhere. Caps below bound the doc BY CONSTRUCTION —
     prevention beats later tidy passes, which move bytes without
     removing information.

     TWO TIERS:
     - Status is the understanding tier: ONE block, REWRITTEN in place
       (never appended; git is the history).
     - Findings/Decisions are the evidence tier: APPEND-ONLY. A
       correction is a new dated entry marking the old one
       `[superseded by <date>]` — never a silent edit.

     CAPS (overflow goes to the offload tier, cited from the hot entry —
     never grow a section in place):
     - Status <= ~10 lines · Findings entry <= ~15 lines · Decisions entry
       <= ~3 lines · closed checklist item <= ~10 lines.

     OFFLOAD TIER: `child-log.md` (declared companion, unmanaged —
     openspec validate ignores it, archive preserves it). It absorbs
     child closure records (verification counts, delivery enumerations),
     live-round narratives, and research detail spent by a shipped
     child; each absorption is one line in Notes registry + a pointer
     from the citing entry. EVIDENCE RULE: retire to a pointer only what
     verifiably exists in the archived child's artifacts / run docs /
     git — facts with no other home stay in the offload tier.

     RULINGS: child-scoped pre-decisions live in that child's own
     proposal/decisions.md; here keep one line (id + binds + text of
     record). Full entries only for cross-child bindings, corrections of
     record, and still-open deferred obligations — and never their
     rationale/alternatives prose (cite the record).

     NAVIGATE (don't ingest): `openspec/.opsxa/opsxa-plan.sh <change>`
     index | show <id> | show item <N> | status | brief --for <tok> |
     check | next-id <prefix>; `handover <archived-change>` reads prior
     cycles. Helper absent: `grep -n '^#'` this file, then windowed
     reads. Navigation is not observation — take ONE windowed harness
     `read` of a file before your first `edit` to it.

     EDIT: harness file tools only, region-scoped — never sed/python
     heredoc writes. One windowed read per file per session satisfies
     the version guard and need not cover the region you edit.

     RETIREMENT: when a child archives, triage its consumed material —
     spent-and-in-archive -> pointer; spent-but-unique -> child-log;
     still-open -> an owner. `check` lists candidates; judgment decides. -->

## Status

Cycle open 2026-09-29. **Rungs 1 and 2 both shipped.** Rung 1 (surface separation) took overlap
0.708 → 0.560, archived; rung 2 (burg attraction 3 → 2) took the current build **0.561 → 0.516**, every
seed improving, at ×0.956 mean length — the network did not grow. The plane-hardening change between them
is archived and its requirements are in the main specs. The metaplan was mistakenly archived on
2026-09-29 and restored 2026-09-30 — the CH1/CH2 archive state below is correct.

Children:

- CH1 `measure-underground-alignment` (prototyping) — diagnostic complete; evidence F1.1-F4.3.
- CH2 `underground-highways-avoid-surface-corridors` (semi-test-driven) — rung 1 shipped, 25/25, **archived 2026-09-29**; delta merged into `openspec/specs/underground-highways`.
- CH3 topology sparsification — superseded (D14); CH4 display separation — superseded (D15).
- CH5 `weaken-underground-burg-attraction` (semi-test-driven) — **rung 2 shipped 2026-09-30**, 17/17,
  valid, not archived; `skip_specs` (no requirement text mentions the term).
- CH6 `plane-aware-burg-attraction` (semi-test-driven) — **rung 3 shipped 2026-09-30**, 36/36, valid, not
  archived; the split contact metric landed and the plane-aware attraction is adopted (F7.2). The user's
  pass-under and hub report is F7.1.

Next session must know: the ladder is **open, not finished** — the floor is **0.430** (was 0.516). The
neutralize rung halved settlement contact and thinned the settlement crossroads, but moved the crossings
onto plain cells (multi-record cells +4.2, none of it on settlements) — that residual is the live question
and repulsion is still the pre-authorized escalation (D17). Rung 4 is endpoint gates (H3, re-ordered by
D17). CH6's evidence is its `verification.md` and `measure/rung3-paired.log`; its reverse control
reproduced CH5's shipped rung-2 column exactly. Re-measure paired, never inherit a length figure (F6.1).

## Findings

<!-- APPEND-ONLY: `### F<X.Y> — <claim> (task <X.Y>, <date>; <consumers>)`, <= ~15 lines each.
     Entries appear as tasks.md items are answered. Full tables and raw output: child-log.md. -->

Prior measurements that motivated this cycle are banked in `proposal.md` — Motivation (archived
`separate-underground-connections` run of 2026-09-29; fixture corridor analysis of 2026-09-29), not
repeated here.

### F1.1 — The geometric floor is 0.587, so path shaping has ~12 points of headroom (task 1.1, 2026-09-29; CH2, D5)

- Control = same burg pairs, distance-only cost, water/uninhabitable gates, no discount/burg/terrain: **overlap 0.587 vs baseline 0.708 (−12.1 points)**, parallel 0.841 (−3.3), length ×1.240.
- D5's rule (floor within 10 points → path shaping exhausted) is **not** triggered: 12.1 > 10.
- Every seed improves by 9.8-13.8 points (`child-log.md`, per-seed table), so this is not seed noise.
- The floor is still high in absolute terms: even with no terrain preference, 58.7% of tunnel cells sit on a road — that part is the pair set plus the density of the surface network (F1.5).

### F1.2 — Room exists one cell away, not two: corridor histogram (task 1.2, 2026-09-29; CH2 cost design)

- Baseline cells by BFS distance to the nearest surface-route cell: **0 → 70.7%, 1 → 23.1%, 2 → 4.9%, 3+ → 1.4%**.
- Control: 58.7 / 33.4 / 6.5 / 1.4. Strong repulsion: 50.4 / 36.4 / 10.6 / 2.6.
- A local penalty can therefore reach the 23-33% of cells that sit one step off a road; corridors two or more cells clear are rare, which is why the achievable floor saturates near half.
- Consequence for CH2: the separation penalty should decay over ~2 cells, not try to push the network across the map.

### F1.3 — Endpoint coincidence is a third of the shared cells and is not uniform by settlement kind (task 1.3, 2026-09-29; CH2 gate rule)

- Baseline: 30.2% of shared cells are in a chain's first/last two cells.
- By the kind of settlement the chain ends at (shared route-cells in band / all shared route-cells): **dual identity 0.386, fully subterranean 0.287, junction 0.355**.
- Gate divergence moves the fully subterranean share to 0.230 and the junction share to 0.299, but *raises* the dual-identity share to 0.415: diverting the approach pushes the *middle* off roads, so the remaining shape is more endpoint-dominated. Read band share together with overlap, never alone.
- The band is a large but not dominant share, so endpoint work alone cannot carry the objective.

### F1.4 — The permissive parallelism metric is saturated; exact/along-edge are the discriminating ones (task 1.4, 2026-09-29; task 2.1)

- `parallel` (a surface step within one cell in a similar direction) is 0.874 at baseline and never moves more than 9 points: with 37-44% of land cells carrying a route, it is true by chance too often. **It is not a good objective.**
- Discriminating alternatives, both length-weighted and both far below saturation: `exact` — the tunnel step *is* a surface step: **0.326 baseline → 0.075 combo**; `along` — a surface step leaves the same cell (or a neighbour) toward the next (or its neighbour): **0.523 → 0.360**.
- Overlap share and the corridor histogram separate the variants cleanly and consistently across all 8 seeds.
- Recommendation for the CH2 objective: overlap share + exact-edge share + corridor distance; retire the permissive `parallel`.

### F1.5 — The surface network occupies 37-44% of land cells, and the tunnel network runs between burgs (task 1.5, 2026-09-29; CH2/CH3)

- Per seed (8 seeds): land cells 4077-4526; cells carrying any surface route 2216-2931; cells carrying a *land* route 1649-1930 → **37-44% of land cells already carry a road or trail**.
- The control connects the same pairs with no terrain, burg or discount influence and still lands 58.7% of its cells on roads: that is the per-pair room on the current build.
- Long connections do not escape it: the pair set is burg-to-burg, burgs sit in the settled fabric, and every route between two burgs crosses the corridors other routes use.

### F1.6 — Tunnels share the surface plane's curve, angle resolution and group; the renderer already separates them (task 1.6, 2026-09-29; CH4)

- A tunnel keeps `group: "roads"`, so `Routes.getPath` selects `ROUTE_CURVES.roads` (`curveCatmullRom.alpha(0.1)`) — the identical curve. `getPath({group, points})` is called from `draw-routes.ts` and `getLength(routeId)`, both of which hold the route object, so an underground-only curve needs no group change (D7 of `add-underground-settlements` stays intact).
- `getPoints` resolves sharp angles by mutating the points array it is given; the underground pass builds its own via `preparePointsArray()`, so nothing leaks into `pack.cells.p` or into surface geometry across passes. Within one underground pass all tunnels share one array, so one tunnel's angle fix can move a later tunnel's vertex.
- The renderer already gives tunnels their own container (`#undergroundRoutes` → `tunnels`) and padding lookup, so a per-plane offset/dash/curve can be applied without touching the surface layer.

### F1.7 — Long routes are cheap to generate; prune, not cost, is what bounds the network (task 1.7, 2026-09-29; CH3)

- The underground pass costs 4-32 ms per map over 8 seeds (all variants), against a full pipeline run of tens of seconds: generation cost is not a constraint at any sparsification tested.
- Prune removes a large share of what the pass draws: pre-prune 1.292× the final length (58 routes / 580 cells vs 41 / 461). A junction cell survives only while two or more routes pass through it, so fewer, longer routes prune more aggressively.
- Only 66.5% of subterranean burgs *end* a highway at baseline (mid-route burg cells are not counted); `trunk-spurs-10` drops that to 58.7%, `longhaul-mst` raises it to 78.2%. The implicit service guarantee is weaker than assumed — CH3 must pin it explicitly if it is revived.

### F1.8 — Road repulsion contradicts a pinned spec scenario; the burg term and gates do not (task 1.8, 2026-09-29; CH2 spec delta)

- `underground-highways.test.ts:215-228` pins "prices a tunnel step the same whether or not a surface route covers it", which is scenario 1 of requirement *Underground connectivity is self-contained* (`openspec/specs/underground-highways/spec.md:113`). **Any cost that reads surface routes violates it**, so CH2's repulsion half needs a spec delta that re-scopes the equality to "SHALL NOT lower the cost" and states the divergence intent.
- Gate divergence and dropping the burg term touch no cost input from the surface network and violate no scenario — CH2's cheaper half is spec-clean.
- Other pins: `:160-179` water/uninhabitable gates and high-ground-cheaper-than-lowland (direct cost calls), `:207` the equal-length high-ground path preference, `:230-255` the network-only discount. A precomputed terrain field must therefore be settable from a unit test (it is not needed by any surviving lever).
- Doc drift: `docs/architecture/generation-pipeline.md:242` still says "the already-connected discount reused" — stale since `separate-underground-connections`; it is the only stale line found.

### F3.2 — The path variants: repulsion is the only lever that passes the pre-registered bound (task 3.2, 2026-09-29; CH2)

Full table in `child-log.md`. Means over 8 seeds:

- **Burg attraction is the dominant term**: `control-point-burg` (distance + burg factor only) is 0.721, i.e. adding the burg term to the distance-only control *restores* the baseline; `no-burg-attraction` (production cost with the term removed) is **0.577 (−13.1 points)**, exact-edge 0.201, but length ×1.193 (up to ×1.314 on one seed).
- **The discount is neutral**: `control-point-discount` 0.588 vs `control-point` 0.587 — the previous change's work holds.
- **Terrain shaping is spent**: `smoothed-depth` −0.4 points (×1.034 length); the per-cell height term is worth ~1.6 points of the baseline.
- **Mild road repulsion passes D4 on every seed**: −14.8 overlap, −6.4 parallel, length ×1.084 with **per-seed range 1.028-1.138** (inside the 15% bound everywhere) and parallel improving on every seed. Strong repulsion (−20.3 / −9.4) breaks the bound on one seed (×1.265).
- Gate divergence: −8.6 overlap, −5.0 parallel, ×1.148 mean but **×1.337 on one seed** — over the bound; adopt only inside a bounded combination.
- Combo (no burg + gate + repulsion): −30.3 overlap, −13.4 parallel, exact-edge 0.075 — the shape of what is achievable — but ×1.381 length, so it fails D4 as configured.

### F3.3 — Topology sparsification does not reduce alignment at all (task 3.3, 2026-09-29; CH3)

- `longhaul-mst` +0.7 overlap / +0.4 parallel; `trunk-spurs-25` −0.4 / −1.6; `trunk-spurs-10` +0.3 / 0.0. No consistent direction on any metric, on any seed; the trunk variants simply produce a *smaller* network (length ×0.88-0.92).
- Connectivity of the intended pair graphs holds **by construction**, not by sampling: longhaul keeps every Urquhart edge above the median and adds the Euclidean MST over each landmass's subterranean burgs; each trunk variant MST-connects its trunk nodes and gives every other burg an edge to its nearest trunk node. What the realized network loses is *endpoints*, measured as service share (burgs that still end a highway): baseline 0.665 → `longhaul-mst` 0.782, `trunk-spurs-25` 0.650, `trunk-spurs-10` 0.587 (F1.7).
- Honest gap: the realized per-seed graph was not re-checked component by component, because the variants failed the objective gate first (D9). Reviving CH3 means running that check.
- Reading: the alignment comes from *where tunnels are forced to go* (burg-to-burg across the settled fabric plus the burg attraction), not from which burg pairs are chosen. Changing pairs shuffles the same corridors.

### F4.2 — Display separation already exists as styling; only geometry is still identical (task 4.2, 2026-09-29; CH4)

- Defaults (`src/generators/default-styles.json`): tunnels `stroke #4a3a2a`, `stroke-width 0.5`, `stroke-dasharray "1.2 0.9"`, `opacity 0.85`; roads `#d06324`, `0.7`, dash `"2"`, `0.9` — pinned as deliberately distinct by `styles.test.ts:193-198`.
- The style editor can change stroke, width, dash, opacity, filter and mask per group; it cannot change the curve (selected from the route's group) or apply an offset.
- So the "still aligned" reading cannot be answered by more styling: the identical *geometry* (same curve, same snapped cell vertices) is what remains, which is exactly what CH4 would change.

### F4.3 — One stale doc line (task 4.3, 2026-09-29; CH2 doc delta) — **spent, retired**

- `docs/architecture/generation-pipeline.md:242` said "the already-connected discount reused"; it is
  **fixed** and the sentence now carries the separation term. No other document described the removed
  behaviour (grep over `docs/` and `openspec/specs/`).
- Retired at CH2's archive: the fix is verifiable in the archived change's diff and in the current doc.

### F3.2s — The burg-attraction ladder is monotone, and repulsion is the best effect per unit length (task 3.2, 2026-09-29; CH2 rung 1)

- Sweep over the burg factor (cost multiplier off a burg cell; production is 3), 8 paired seeds, `replica-production` still exact. Full table: `child-log.md`.
- Endpoints of the ladder: burg 2.5 → Δoverlap −1.5, length ×1.055 · burg 2 → −4.1, ×1.101 · burg 1.5 → −7.4, ×1.121 · burg 1 (removed) → **−13.1**, ×1.193 (worst seed ×1.314).
- **Repulsion alone (strength 2) → −14.8 for ×1.084 (worst seed ×1.138)**: the same effect as deleting the burg term for half the network growth, and it leaves the burg term untouched.
- Combinations: burg 2 + repulsion −19.5 at ×1.142; burg 1.5 + repulsion −23.4 at ×1.181; gate divergence alone −8.6 at ×1.148 (worst ×1.337).
- Every rung improves overlap on **every** seed, so D13's bar ("any measured improvement") is met throughout; effect per unit length decides the order (D16).

### F2.1 — Success is any overlap reduction; the ladder is rung-by-rung (task 2.1, 2026-09-29; whole program)

- User ruling (2026-09-29): "any improved route overlap reduction situation is acceptable at this stage", and "we can move up the complexity ladder if current step does not work, so no need to guarantee one step solution".
- So the D4 adoption thresholds become advisory (D13): the objective is monotone overlap reduction on the 8-seed paired protocol, exact-edge share and corridor distance as the secondary readings, and length growth recorded as a trade-off rather than a veto.
- The permissive `parallel` metric stays retired as an objective (F1.4) but may still be reported.

### F3.4 — Display separation: superseded, not spiked (task 3.4, 2026-09-29; CH4)

- User ruling (2026-09-29): "styling is not the issue". Combined with F4.2 (the tunnel style is already distinct), a display-only child has no purpose: the remaining coincidence is in the generated geometry.
- Task closed as superseded (D15). No in-app judgement session was run, and none is needed.

### F4.1 — The plane is the same settlements through a second set of connections (task 4.1, 2026-09-29; CH3, endpoint rule)

- User ruling (2026-09-29): "some burgs have both above-ground and underground connections while some others are entirely underground".
- Read as: the underground network keeps connecting exactly these burgs — dual-identity burgs on both planes, fully subterranean ones on the underground plane only. It is not a distinct geography with its own places, so the pair set is not a free variable (D14).
- Consequence: CH3 (topology sparsification) is superseded, and F1.5's structural floor stands — the reachable improvement is through where a tunnel runs between two given burgs, which is what CH2 does.

### F5.1 — The plane rules are enforced and audited; the tunnel network also passes *under* surface burgs (2026-09-30; CH5 baseline)

- `harden-underground-plane-integrity` (2026-09-30, archived) hardened what generation does *around* the endpoints: a stretch boundary now steps into the already-covered stretch rather than landing on the other plane's burg cell; the prune keeps a record whose end is a below-level burg **or** a cell another surviving highway runs through; a service pass reconnects any below-level burg that could be paired. Baseline 41 boundaries on below-level cells → 0, 50 of 682 unserved → 0, surface contact on below-level cells 178 → 21-33 per seed, `repairs=0` on all 8 seeds.
- It adds `auditPlanes` + a real-map audit in `playwright.yml`, so **every later rung is gated on a zero-violation audit**: `src/generators/plane-integrity.dom.test.ts`, 8 seeds, one `PLANES …` line each.
- Contact is pass-under, not connection: 636 surface-burg cells touched by tunnels over 3 seeds, ~90% drawn through the burg's own coordinates while not the record's endpoint; no tunnel ends at a surface-only burg (every such endpoint is a junction or a dual-identity burg). So a longer tunnel network raises `contact` without implying new connections.
- Consequence for the ladder: rung 2's longer network must be read together with the audit's boundary and service lines, not overlap alone; the plane rules are a standing acceptance gate from here on.

### F6.1 — Rung 2 landed: overlap 0.561 → 0.516 on every seed, and the network did *not* grow (task CH5 4.1-4.4, 2026-09-30; CH5, next rung)

- Paired 8-seed run on one build: production (attraction 2) **0.516** against the reverse control (attraction 3) **0.561**, Δ −0.045, improving on all 8 seeds (−0.023 to −0.060). Exact-edge 0.297 → 0.243, corridor distance 0.56 → 0.62, served 0.737 → 0.733.
- The control reproduces the pre-change production baseline *exactly* (0.561 / 0.297 / 6386 length), so the delta is attributable to the rung and not build drift.
- **The archived length prediction was wrong in sign**: the ladder expected ×1.142, measured ×0.956 (worst seed ×1.002). The plane-hardening change landed between the two measurements and changed which cells the segment builders cover. Lesson: re-measure paired; never inherit a length figure across a build change.
- Gates: zero plane violations on all 8 seeds, `repairs=0` (the service pass is not carrying the rung), and contact **fell** — tunnels on surface burg cells 132-190, against 159-217 pre-rung — so the weaker attraction really does route tunnel cells under fewer settlements.
- Consequence: the floor for any rung 3 is **0.516**, and the ladder's remaining lever is endpoint gates (H3, ~-8.6 overlap but a ×1.337 worst seed when measured alone). **[Superseded by D17, 2026-09-30: rung 3 is the plane-aware attraction (F7.1); endpoint gates move to rung 4.]**

### F7.1 — Pass-under and the surface-burg hubs are one plane-blind term: surface burg cells are the fabric's cheapest cells (exploration 2026-09-30; CH6, D17)

- `getUndergroundPathCost` prices **any** burg cell 1× against 2× for plain cells (`pack.cells.burg[next] ? 1 : UNDERGROUND_BURG_ATTRACTION`) with no classification read, so a surface-only burg (782 of 870 in the `measure-a` census) gets the pull meant for the settlements the network serves.
- Arithmetic: a surface burg cell on a road totals 3 (1 × separation 3) against 3.3-6 for plain cells within 3 cells of the surface network and 2 clear — the local minimum of every corridor. That is the pass-under engine rungs 1-2 left standing (contact 132-190 cells/seed after rung 2).
- The hub is the same cause plus the 0.5× shared-pair discount: tunnels funnel onto those minima (42/36/56 surface-burg cells carry 2+ tunnels on `measure-a`/`d`/`g`), junction retention keeps the stretch, and `getCellAnchor` draws it through the burg dot (~90% of crossings in the archived pass-under table).
- Metric gap: `auditPlanes` contact counts dual-identity burgs together with surface-only ones (`hasGroundLevelPresence`), so the standing gate cannot separate legal endpoint contact from the complaint; tunnel *ends* on surface-only burgs measured 0.
- User ruling 2026-09-30: neutralize first (surface-only burg cells priced as plain), escalate to repulsion only if contact stays high.

### F7.2 — Rung 3 landed: overlap 0.516 → 0.430, pass-under halved, and the hubs moved off settlements (tasks CH6 4.1-4.4, 2026-09-30; CH6, rung 4)

- Paired 8 seeds on one build: production (plane-aware) **0.430** against the plane-blind reverse control
  **0.516** — every seed improves (−0.072 to −0.107), length ×0.997 mean (worst ×1.020), exact-edge
  0.243 → 0.149, corridor distance 0.61 → 0.72, service 0.996 → 0.994. The control reproduced CH5's
  shipped rung-2 column exactly, so the delta is the rung's, not build drift.
- The complaint fell on every seed: tunnels on surface-only burg cells 127 → **72** mean (41-90 per seed
  against 90-146); multi-record cells that are surface-only burg cells 13.1 → **8.9**, never worse.
- Residual, recorded not adopted away: the **global** multi-record figure rose 92.6 → 96.9 (+4.2 mean, up
  on 7 of 8 seeds) and the whole rise is plain/fully subterranean cells (52.1 → 61.5); dual-identity hubs
  are flat (26.6 → 26.5). Adopted with the residual on the user's 2026-09-30 ruling (D13), with tasks
  4.4's global-hub clause recorded as failed by the metric; repulsion stays pre-authorized (D17).
- Planes: zero violations and `repairs=0` on all 8 seeds, the `PLANES` lines carrying the split figures.
  Tests 1300 → 1308; the gateway fixture gained a glacier so the junction scenarios stay exercisable
  (`verification.md`, "Deliberate deviations").

## Decisions

<!-- APPEND-ONLY, <= ~3 lines per entry. Child-scoped rulings are one-liners here only. -->

- **D1 — The track is diagnostic-first, then different path, then different pairs.** Binds: CH1-CH3 ordering. Text of record: `proposal.md` — Scope & Boundaries (user, 2026-09-29). Status: binding.
- **D2 — The program is one meta-planning change, not three separate changes.** Binds: this change's shape and the child changes it seeds. Text of record: `proposal.md` — Scope & Boundaries (user, 2026-09-29). Status: binding.
- **D3 — No child may change traversal, the save format, or the endpoint rule; each lever is generation-time or display-time.** Binds: all children. Text of record: `openspec/specs/underground-highways/spec.md` and `proposal.md` — Motivation. Status: binding.
- **D4 — Evidence standard: 8 paired seeds (`measure-a` … `measure-h`), primary objective parallel-alignment share, secondary exact-cell overlap and corridor distance.** Binds: CH1-CH4. Adopt a lever at >= 5 points primary improvement or >= 10 points overlap reduction, with <= 15% underground-length growth, no seed worse than 5 points, and per-landmass connectivity intact; report per-seed deltas, never means alone. Text of record: this entry (agent-inferred 2026-09-29; user may override). Status: **adoption gate superseded by D13; the 8-seed paired protocol still stands.**
- **D5 — If the control floor is within 10 points of the baseline, path shaping is exhausted and CH2 is skipped.** Binds: CH1 -> CH2 gate. Text of record: `tasks.md` 2.2 and this entry. Status: **evaluated 2026-09-29 — not triggered (F1.1, 12.1 points); CH2 proceeds.**
- **D6 — CH2 is the next child and its first slice is the burg attraction, not a new cost model.** Binds: CH2 scope. Evidence: F3.2 (the term is worth ~13 points; terrain shaping ~0). Text of record: `child-log.md` + F3.2. Status: binding.
- **D7 — The smoothed depth field is rejected; the per-cell height term stays.** Binds: CH2, closes `tasks.md` 2.3. Evidence: F3.2 (`smoothed-depth` −0.4 points). Text of record: F3.2. Status: binding.
- **D8 — Road repulsion may only be adopted with a spec delta re-scoping the equality scenario, and only at the mild strength.** Binds: CH2. Evidence: F1.8 (equality scenario blocks any surface-reading cost) and F3.2 (mild passes D4 on every seed; strong breaks the length bound on one). Text of record: F1.8, F3.2. Status: binding.
- **D9 — Topology sparsification is not justified as an alignment lever.** Binds: CH3 (re-scope or drop), `tasks.md` 2.5. Evidence: F3.3 (no variant moves any metric; service share falls). Text of record: F3.3. Status: binding pending the task 4.1 answer, which could revive it as a *character* change rather than an alignment change.
- **D10 — The permissive parallelism metric is retired as the primary objective.** Binds: CH2 acceptance gate, `tasks.md` 2.1. Evidence: F1.4 (saturated at 0.874). Use overlap share + exact-edge share + corridor distance. Text of record: F1.4. Status: binding.
- **D11 — Task 2.7's stop condition does not apply.** Binds: CH1 closure. Evidence: F1.1. Text of record: F1.1. Status: binding.
- **D12 — Endpoint gates are a bounded supplement, not a headline lever.** Binds: CH2 scope. Rule: the gate is the burg cell's neighbour with the fewest surface route steps, tie-broken toward high ground; it constrains only the first step out of the start burg and the last step into the exit burg; the burg cell stays the route endpoint (spec-clean, F1.8). Evidence: F3.2 — −8.6 overlap / −5.0 parallel but ×1.337 length on one seed, so it may only ship inside the D4 length budget. Text of record: F3.2, F1.3. Status: binding.
- **D13 — Success at this stage is any measured overlap reduction; the program moves up the complexity ladder rung by rung.** Binds: CH2 and any later child. The D4 thresholds are advisory from here: adopt a lever that reduces overlap on the 8-seed paired protocol, record its length cost as a trade-off rather than a veto, and escalate to the next rung if a rung does not move the number. No single change is expected to solve it. Text of record: user ruling 2026-09-29 (verbatim: "any improved route overlap reduction situation is acceptable at this stage… no need to guarantee one step solution"). Status: binding.
- **D14 — The underground plane is the same settlements seen through a second set of connections, not a distinct geography.** Binds: CH3 (superseded), the endpoint rule. Some burgs carry both above-ground and underground connections (dual identity), others are entirely underground; the underground network keeps connecting exactly these burgs, so the pair set is not a free variable and F1.5's structural floor stands. Text of record: user ruling 2026-09-29 (verbatim: "some burgs have both above-ground and underground connections while some others are entirely underground"). Status: binding.
- **D15 — Styling is not the problem; display separation is dropped as a child.** Binds: CH4 (superseded), `tasks.md` 3.4. The tunnel style is already distinct (F4.2); the objective is the generated geometry, so no display-only child will be created. Text of record: user ruling 2026-09-29 (verbatim: "styling is not the issue"). Status: binding.
- **D16 — Ladder: rung 1 is the surface-repulsion term, rung 2 weakens the burg attraction, rung 3 adds endpoint gates.** Binds: CH2 and its successors. Rationale: F3.2s — repulsion gives −14.8 points for ×1.08 length (best per unit), the burg term −13.1 for ×1.19 (spec-clean), gates −8.6 for ×1.15 (and ×1.34 worst seed). Rung 1 therefore buys the spec delta (F1.8) in exchange for the least network growth. Text of record: F3.2s (agent-inferred 2026-09-29; the user may reorder). Status: binding — rung 3 slot **[superseded by D17, 2026-09-30]**; rungs 1-2 stand.
- **D17 — Rung 3 is the plane-aware burg attraction: below-level burgs keep the pull, surface-only burg cells are priced as plain cells; repulsion is the pre-authorized escalation; endpoint gates move to rung 4.** Binds: CH6, the ladder order (amends D16). Evidence: F7.1. Text of record: user ruling 2026-09-30 (exploration choice: "Neutralize first, escalate if needed"). Status: binding — rung 3 measured and adopted 2026-09-30 (F7.2); repulsion not triggered, still pre-authorized.

## Architecture

<!-- Filled after the architectural decisions (tasks 2.1-2.5) are made. -->

The measured pipeline, as it stands after CH1's diagnostic:

```
burgs ── hasBelowLevelPresence ──> Urquhart per landmass ──> findPath(getUndergroundPathCost)
                                                                   |
                     cost = d^2 x habitability[1,1.1] x height[1,2] x discount[0.5] x BURG[1 or 3]
                                                                   |                    ^
                                        the one term that pulls tunnels through settlements
                                                                   v
                                    segments ── merge ── getPoints ── prune ── pack.routes
```

The cost line above is the CH1 snapshot. Rung 2 set the attraction to 2 (F6.1); rung 3 made it
plane-aware and shipped 2026-09-30 — a below-level burg keeps the pull, a surface-only burg cell prices as
a plain cell (F7.1, F7.2).

Alignment budget over 8 seeds (overlap 0.708 total): geometry of the pair set ~0.587; the burg
attraction +0.135; the terrain preference −0.016. Everything else measured (topology, smoothing,
discount) is neutral. CH2's shape follows: remove or weaken the burg term, optionally add a
2-cell-decaying surface penalty, and consider endpoint gates inside a length budget.

## Risks & Mitigations

- **The metric being optimized is not the objective** (cell-share counts a right-angle crossing like a shared corridor) -> **realised and addressed**: F1.4 retired the permissive parallelism metric (D10) and fixed the objective as overlap + exact-edge + corridor distance.
- **Evidence too thin to decide** (three seeds gave unreachable-pair swings of 79 -> 234 -> 81) -> closed: 8 paired seeds, per-seed bounds reported for every adopted lever (D4/F3.2).
- **Path shaping is spent, and the program burns a child on it** -> closed: the floor is 12.1 points below baseline (F1.1), so CH2 has room.
- **A lever passes on the mean but breaks on one seed** -> realised: gate divergence (×1.337) and strong repulsion (×1.265) each exceed the 15% length bound on one seed; only mild repulsion stays inside it everywhere (F3.2). Mitigation: adopt mild repulsion, and re-check the bound per seed for any combination.
- **Dropping the burg attraction lengthens the network** (up to ×1.314 on one seed) -> mitigation: weaken the factor rather than deleting it, or pair it with the repulsion penalty and measure the combined length before adopting.
- **Road repulsion conflicts with a pinned requirement scenario** -> mitigation: D8 — adopted only with a spec delta that re-scopes the equality to "SHALL NOT lower the cost"; the CH2 design must state that the surface network may *raise* a tunnel's cost.
- **Longer connections explode network length or generation time** -> closed for cost (F1.7: pass runs 4-32 ms), but the topology path is not pursued (F3.3).
- **A connectivity guarantee is silently lost when the topology is thinned** -> partly realised: only 66.5% of subterranean burgs end a highway today, 58.7% at trunk-10 (F1.7). Since CH3 is not pursued for alignment (D9), this needs an owner only if task 4.1 revives it.
- **Display separation masks rather than solves** -> still open: CH4 is strengthened by F4.2 (styling is already distinct, only geometry is identical), and task 3.4 remains the user's visual judgement.

## Implementation Checklist

<!-- WHILE OPEN: scope + delta list + schema + acceptance gate. ONCE CLOSED: scope, deltas, what it
     unblocks, open items with owner, pointers (<= ~10 lines). Child-scoped pre-decisions belong in
     the child's own proposal/decisions.md, not here. -->

- [x] 1. **CH1 — `measure-underground-alignment`** (schema: `prototyping`) — **diagnostic complete 2026-09-29.**
  Delivered: the harness under `vitest.browser.config.ts` (baseline reproduction, neutral-cost control,
  ablations, corridor histogram, endpoint split, metric candidates) plus the path and topology variant
  spikes, run through the real pass with only cost/pairs patched. Delta: none (spec-free).
  Gate **met**: `replica-production` reproduced `baseline-production` exactly. Evidence: F1.1-F1.8,
  F2.1, F3.2, F3.2s, F3.3, F3.4, F4.1-F4.3; tables and raw output in `child-log.md`; harness kept at
  `harness/underground-measure.dom.test.ts.txt`. Ran as tasks inside this change, not as a separate child.

- [x] 2. **CH2 — `underground-highways-avoid-surface-corridors`** (schema: `semi-test-driven`) — **rung 1 shipped 2026-09-29.**
  Delivered: the bounded surface-separation term with a capped BFS field built at the top of the pass;
  `underground-highways` deltas (one requirement re-scoped, one added); 7 new tests, 1 re-aimed; docs fixed.
  Outcome (8 paired seeds): **overlap 0.708 → 0.560 (−14.7, every seed improves), exact-edge 0.326 → 0.208,
  corridor distance 0.37 → 0.57, length ×1.084 mean / ×1.138 worst, service 0.665 → 0.691.** Unblocks the
  next rungs, which now start from 0.560. Complete and valid, **archived 2026-09-29**; delta merged.
  CLOSED: rung 1 does not suffice — the user opened rung 2 on 2026-09-30 (CH5, D16 rung 2).
  Pointers: the change's `verification.md`, `measure-after.log`; this file's D16 and F3.2s.

- [x] 5. **`weaken-underground-burg-attraction`** (schema: `semi-test-driven`; **rung 2, D16**) — **shipped 2026-09-30**, 17/17 tasks, valid, not archived.
  Delivered: the burg attraction in `getUndergroundPathCost` 3 → 2 as `UNDERGROUND_BURG_ATTRACTION`; the
  surface cost's own 3× term untouched so the measurement reference stays fixed; docs updated; two new
  unit tests that pin both terms by making two destination cells identical but for the burg map.
  `skip_specs` declared — no requirement text mentions the term.
  Outcome (paired 8 seeds, one build): **overlap 0.561 → 0.516 (−0.045, every seed improves), exact-edge
  0.297 → 0.243, corridor distance 0.56 → 0.62, length ×0.956 mean / ×1.002 worst, served 0.737 → 0.733**,
  with the reverse control reproducing the pre-rung baseline exactly. Plane audit: zero violations,
  `repairs=0`, contact down (F6.1).
  ANSWERED 2026-09-30 (user): rung 2 does not suffice — the pass-under and hub report opened rung 3 as the
  plane-aware attraction (CH6, D17); endpoint gates re-order to rung 4. The ladder's floor is 0.516.
  Pointers: the change's `verification.md`, `measure/rung2-production.log`, `measure/plane-audit.log`;
  this file's F6.1, F7.1, H2, H3.

- [x] 6. **CH6 — `plane-aware-burg-attraction`** (schema: `semi-test-driven`; **rung 3, D17**) — **shipped 2026-09-30**, 36/36, valid, not archived.
  Delivered: the burg term in `getUndergroundPathCost` made plane-aware (a below-level burg keeps the pull,
  a surface-only or missing/removed record prices as plain, the surface cost untouched); `PlaneReport.contact`
  split into surface-only / dual-identity plus multi-record cells, each figure printed; doc updated; 8 tests.
  Outcome (paired 8 seeds, one build): **overlap 0.516 → 0.430 (−0.086, every seed improves), surface-only
  contact 127 → 72, settlement crossroads 13.1 → 8.9, length ×0.997 / worst ×1.020**; the reverse control
  reproduced CH5's column exactly. Plane audit: zero violations, `repairs=0`.
  Residual: the global multi-record figure rose 92.6 → 96.9, all of it plain-cell crossings — left to
  repulsion (D17) rather than adopted away. Unblocks rung 4 (endpoint gates, H3) from a floor of **0.430**.
  Pointers: the change's `verification.md`, `measure/rung3-paired.log`, `measure/plane-audit.log`; F7.2.

- [ ] 3. **CH3 — topology sparsification** (schema: `spec-driven`; **superseded by D14**).
  Superseded 2026-09-29: the user ruled the underground network keeps connecting the same burgs, so the
  pair set is not a free variable; and on F3.3 no topology variant moved any alignment metric anyway.
  Not planned. Kept here only so the negative evidence is not re-litigated.
  See @[metaplan] D9, D14, F3.3.

- [ ] 4. **CH4 — display separation** (schema: `spec-driven`; **superseded by D15**).
  Superseded 2026-09-29: the user ruled styling is not the problem. The tunnel style is already distinct
  (F4.2) and the objective is the generated geometry. Not planned.

## Notes registry

- `child-log.md` — declared companion (unmanaged). Holds the offload tier: the measurement harness, the raw 8-seed run output, and the full comparison tables. Cited by: F1.1-F1.8, F3.2, F3.3, F4.2.
- `harness/underground-measure.dom.test.ts.txt` — the measuring instrument for every rung (H6); `harness/*.log` the rung-1 raw output. Cited by: F1.1-F4.3, F3.2s, H6, F5.1.
- `openspec/changes/archive/2026-09-29-underground-highways-avoid-surface-corridors/` — CH2's full record (rung 1). Cited by: H1, CH2 checklist entry.
- `openspec/changes/archive/2026-09-30-harden-underground-plane-integrity/` — the plane-hardening change and its `verification.md` (per-seed audit table, mutation check, pass-under measurement). Cited by: F5.1, CH5 gate.
- `openspec/changes/plane-aware-burg-attraction/` — CH6's full record (rung 3): `verification.md`, `measure/rung3-paired.log`, `measure/plane-audit.log`. Cited by: F7.2, CH6 checklist entry.
- Lifecycle note: this metaplan was archived with CH2 on 2026-09-29 by mistake and restored to `openspec/changes/diverge-underground-network` on 2026-09-30, before CH5 was authored. The archive holds only finished children.

## Handover

<!-- WRITTEN AT ARCHIVE TIME; seeds the NEXT cycle. Not prose — this doc's own entry grammar. -->

### H1 — Rung 1 shipped: the surface-separation term is the current behaviour and is in the spec

- Source: measurement + user ruling · measured 2026-09-29 via the 8-seed harness (`harness/measure-sweep.log`, `harness/measure-full.log`).
- Rationale: the tunnel cost now pays `1 + 2/(1+distance)` up to 4 cells from a surface route. Overlap fell 0.708 → **0.560** on every seed, exact-edge 0.326 → 0.208, corridor distance 0.37 → 0.57, length ×1.084 (worst ×1.138), service 0.665 → 0.691. The spec delta is merged: `openspec/specs/underground-highways/spec.md` carries the re-scoped *Underground connectivity is self-contained* and the new *Underground highways keep clear of the surface network's corridors*.
- Binds / suggests for next cycle: treat 0.560 as the baseline any further rung is measured against. Full record: `openspec/changes/archive/2026-09-29-underground-highways-avoid-surface-corridors/` (`verification.md`, `design.md`, `measure-after.log`).

### H2 — Rung 2 DONE 2026-09-30: the burg attraction is 2, overlap 0.516, and the network did not grow

- Source: measurement + user ruling · opened 2026-09-29 from the ladder sweep (`child-log.md`, F3.2s); shipped 2026-09-30 as `weaken-underground-burg-attraction`.
- Result: paired 8 seeds on one build, production **0.516** against the attraction-3 control **0.561** — every seed improves, exact-edge 0.297 → 0.243, corridor distance 0.56 → 0.62, length **×0.956** (worst ×1.002), served 0.737 → 0.733. The control reproduced the pre-rung baseline exactly, so the delta is the rung's. Plane audit: zero violations, `repairs=0`, contact down.
- Correction of record: the archived ladder predicted ×1.142 length for factor 2; on the post-hardening build it is ×0.956. The plane-hardening change altered the segments in between, so **length figures do not carry across a build change** — re-measure paired (F6.1).
- Binds / suggests for next cycle: the next rung is measured against **0.516**, not 0.560. **[Re-ordered by D17, 2026-09-30: rung 3 is the plane-aware attraction (F7.1, CH6); endpoint gates (H3) move to rung 4.]** **[Measured 2026-09-30: rung 3 landed at 0.430 (F7.2) — the floor for rung 4 is 0.430.]**

### H3 — Rung 4 (re-ordered from 3 by D17, 2026-09-30): endpoint gate divergence — expect ~0.50 overlap at ~×1.12, spec-clean

- Source: measurement · measured 2026-09-29 via the harness path variants (F3.2, F1.3, D12).
- Rationale: the gate is the burg cell's neighbour with the fewest surface route steps (tie-break toward high ground), constraining only the first and last step; the burg cell stays the endpoint, so the endpoint requirement holds. Alone it measured −8.6 overlap / −5.0 parallel, with one seed at ×1.337 length — so it needs a length budget or a weaker gate rule.
- Binds / suggests for next cycle: rung 4, after the plane-aware attraction (D17).

### H4 — The floor under the ladder is ~0.44-0.50 cell overlap; below it the constraint is structural

- Source: measurement · measured 2026-09-29 (F1.1, F1.5, F3.2s).
- Rationale: the same burg pairs with a distance-only cost still put 58.7% of tunnel cells on a road, because 37-44% of land cells already carry a route and every burg-to-burg corridor crosses the settled fabric. The most aggressive combination measured (no burg attraction + gates + repulsion) reached 0.405 overlap and 0.075 exact-edge — but at ×1.38 length.
- Binds / suggests for next cycle: if a future cycle wants to go below ~0.44, the levers left are the cost terms again (not measured yet in combination at bounded length), a different endpoint set (ruled out by D14), or geometry that is not the cell chain.

### H5 — Retired, do not re-open without new user intent: topology sparsification and display separation

- Source: measurement + user ruling · 2026-09-29.
- Rationale: topology variants (long-haul, trunk-and-spurs) moved no alignment metric on any seed (F3.3), and the user ruled the underground network keeps connecting the same burgs (D14). Display separation was ruled out as styling (D15): the tunnel style is already distinct (F4.2), so only a geometry-level treatment would matter, and that was not wanted.
- Binds / suggests for next cycle: neither is a candidate rung; both need a new user ruling to return.

### H6 — The harness is the measuring instrument for every later rung

- Source: artifact · 2026-09-29.
- Rationale: `harness/underground-measure.dom.test.ts.txt` re-runs the real pipeline and re-runs the pass per variant through production code, with a fidelity anchor (`replica-production` must equal `baseline-production`). Copy it back to `src/generators/underground-measure.dom.test.ts` to run; `CHROMIUM_PATH=/usr/bin/chromium`, ~6 minutes for 8 seeds; remove it from `src/` afterwards.
- Binds / suggests for next cycle: reuse it verbatim for rungs 2 and 3, and keep recording per-seed deltas — a mean alone hid a ×1.337 worst seed in the gate variant.
