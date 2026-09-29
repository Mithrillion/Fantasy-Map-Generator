## Problem / Opportunity

Underground highways exist as a second plane: `add-underground-settlements` built the network, and
`separate-underground-connections` removed the shared routing discount that rewarded a tunnel for
following a road. The bias is gone, but the network still reads as a copy of the overground routes:
**71.8% of underground cells also carry a surface route**, down from 89.4% (mean of seeds
`measure-a/b/c`, archived change `separate-underground-connections`, `verification.md`, measured
2026-09-29 by running the headless generation pipeline under `vitest.browser.config.ts`). The design
objective — an underground network that reads as its own network rather than a shadow of the roads —
is not met.

The residual coincidence is structural, not a tuning miss. Both planes:

- connect the same points — the underground pass takes the ~10% of burgs with below-level presence,
  the surface pass takes all burgs, and both build one **Urquhart topology per landmass**
  (`routes-generator.ts:575` and `:510`), so the tunnel pairs are close to a subset of the trail pairs;
- path over the **same Voronoi cell graph** with the same Dijkstra (`utils/pathUtils.ts:337`), where a
  `distanceSquared` term dominates every terrain term (land cost `1+max(h-25,25)/25`, tunnel cost
  `1+max(50-h,0)/50`, `routes-generator.ts:299-360`);
- snap and draw through the **same geometry code** (`getPoints` at `:765`, the same
  `curveCatmullRom.alpha(0.1)` at `:1065`), differing only in container and stroke.

A tunnel is also short: ~41 routes over ~432 cells, mean length 94 units, cell spacing ~10 — about
nine or ten steps. Its first and last cells are burg cells, where surface routes terminate, and the
cells around a burg are nearly saturated with trails, so a large part of every tunnel is coincident
before the pathfinder makes any choice at all.

Separately, the objective is currently measured with a metric that cannot express it: *share of
tunnel cells that any surface route touches* counts a right-angle crossing and a kilometre of shared
corridor as the same thing, has no notion of how much of a tunnel is aligned, and gives no baseline.

**Why this decomposes into workstreams rather than one proposal.** Four questions are independent and
separately revertible:

1. **Discovery** — how much of the residual is geometry (the pair set, the endpoint band, the density
   of the surface network) and how much is the generator's choice? Until that is answered, every
   other lever is unfalsifiable, and three-seed measurements cannot resolve it (unreachable pairs
   swung 79 → 234 → 81 across seeds in the archived run).
2. **Path level** — where a tunnel runs between two given burgs: endpoint divergence, a terrain
   signal that acts at network scale rather than per cell, and optional road avoidance.
3. **Topology level** — which burg pairs get a tunnel at all. This changes the network's structure and
   raises a guarantee question that today holds only implicitly (every subterranean-capable burg on a
   landmass with at least two of them has at least one highway).
4. **Display level** — separation in the drawing, which is independent of generation and may be worth
   landing on its own even if the geometry never fully diverges.

## Proposed Idea

A staged program with pre-registered decision gates, so evidence decides which lever is worth
building rather than seniority or taste:

1. **Measure with a control.** Rebuild the temporary measurement harness with a better objective
   (parallel-alignment share, corridor-distance histogram, endpoint-band split) and a neutral-cost
   control over the same pairs on the same seeds — the control is the geometric floor for the current
   pair set. Gate: if the control is within ~10% of the baseline, path shaping is exhausted and only
   topology or display can help.
2. **Spend the evidence on the cheapest lever showing headroom** — endpoint (gate) divergence first,
   then a smoothed depth field and/or road-avoidance penalty, each adopted only if it moves the
   objective without an unacceptable length increase.
3. **Escalate to topology** only if the path and display levers cannot reach the objective: thin the
   Urquhart graph toward long connections (with an MST-style connectivity guarantee), or build a trunk
   network among the highest subterranean burgs with spurs from the rest.
4. **Display-level separation** is available at any point and is the only lever guaranteed to change
   what the user sees without touching generation.

General direction only: the specific mechanisms, thresholds and cost shapes are discovered during the
child changes and recorded in their designs.

## Motivation

- **The feature is opt-in and does not deliver its promise.** A user who enables underground
  generation gets a network they read as redundant with the roads. The last change moved the number
  17.6 points and the reading did not change, which is the signal that the remaining distance is not
  reachable by the lever just spent.
- **Measurement is the prerequisite, and it is cheap.** The harness already exists as a recipe in
  `separate-underground-connections/verification.md`; extending it with a control and a corridor
  histogram costs one browser run and settles questions that would otherwise be argued by intuition.
- **Fixed constraints.** The endpoint rule (both endpoints of a highway are subterranean-capable
  burgs) and traversal uniformity are pinned requirements in
  `openspec/specs/underground-highways/spec.md`; depth, strata and z-levels remain explicit non-goals
  from `add-underground-settlements/design.md`; the save format must stay compatible and no traversal
  behaviour may change.
- **A fixture measurement suggests the shape of the answer.** A read-only analysis of
  `tests/fixtures/1.139.4.map` (2026-09-29, sampling straight burg-to-burg corridors against the saved
  route points, "within half a cell" test) found the corridor already occupied by a land route for
  92.0% of its length at trail-like spacing (10-25 units, 573 pairs), 53.8% at tunnel-like spacing
  (60-120 units, 678 pairs) and 41.1% at long-haul spacing (150-300 units, 682 pairs). Different
  release, so it is a shape rather than a current-build number — but it says short links have almost
  no room, and long links have much more.
- **The objective needs rewriting before it is optimized.** "Aligned with overground routes" is a
  property of running *alongside* a route, not of touching one.

## Known Unknowns

1. **Control floor.** With the same burg pairs and a distance-only cost (water and uninhabitable gates
   kept), what overlap share results? This decides whether path shaping has any headroom.
2. **Corridor distribution.** What is the distribution of underground cells by BFS distance to the
   nearest surface-route cell (0, 1, 2, 3+)? If road-free cells sit one step away, a local penalty can
   reach them; if they are far, avoidance means long detours.
3. **Endpoint band.** What share of the shared cells are the first or last two cells of a route? A high
   share makes endpoint divergence the cheapest single change.
4. **Parallel alignment.** What share of underground route length runs within ~30° of a surface route
   within one cell? This is the metric that matches the design objective, and it does not exist yet.
5. **Terrain signal at the right scale.** Is a per-cell height term or a smoothed depth field the
   right signal for a nine-step corridor? A path can be diverted one cell by roughly a 4% cost
   difference and two cells by ~16%, so regional structure matters more than single-cell noise.
6. **Room in the corridors the generator actually picks.** The fixture estimate needs a current-build
   number per burg pair, not a band average.
7. **Connectivity and size under thinning.** Does a long-connection topology keep every
   subterranean-capable burg connected on its landmass, and what happens to total network length and
   generation time when trunks span a landmass?
8. **Is display separation sufficient?** Would distinct curve, offset, dashing and portal marks meet
   the design objective on their own, or only mask the geometry?
9. **Which existing tests pin behaviour a lever would legitimately change?** In particular the direct
   calls to `getUndergroundPathCost` in `underground-highways.test.ts`, which constrain how a
   precomputed terrain field may be introduced.

## Scope & Boundaries

**In scope**

- The generated geometry and topology of the underground highway network.
- The measurement harness and the objective it reports.
- Display-level separation of the underground plane, as an independent slice.

**Out of scope**

- Depth, strata or z-levels; a cross-section or dim-and-overlay treatment.
- Any change to traversal, connectivity, journeys or the shared cell link map.
- The classification shares and the marking weights, except where topology work must reason about
  which burgs exist.
- Surface route generation.
- An editor for hand-drawn underground highways.
- Save-format changes: every lever here is generation-time or display-time.

**Banked rulings**

- The user chose this three-track direction — diagnostic first, then different pairs, then different
  path — in session, 2026-09-29 (user, paraphrased).
- The user chose to capture the program as a single meta-planning change rather than three separate
  changes, in session, 2026-09-29 (user, selected option).
- Specifications emerge in the child changes, not here: this change carries `skip_specs: true` and
  creates no `specs/` directory.
