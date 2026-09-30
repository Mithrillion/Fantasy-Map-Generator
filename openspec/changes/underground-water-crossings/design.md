# Design: underground-water-crossings

## Context

`getUndergroundPathCost` (`src/generators/routes-generator.ts:364-387`) prices a tunnel step as
`distanceSquared x habitabilityModifier x heightModifier x connectionModifier x burgModifier x
surfaceSeparation`, behind two absolute gates:

- `if (h[next] < 20) return Infinity` — the water wall (line 366);
- `if (!habitability) return Infinity` — the glacier gate (line 369). **This second gate also
  blocks all water today**: every water cell is assigned the marine biome
  (`biomes-generator.ts:133`, `height < 20 -> 0`) whose habitability is 0 in the default table. A
  change that only lifts the first gate still yields `Infinity` on every water step; the water
  legs need their own gate, not an exemption from both.

Everything downstream of the cost is already cell-shape-agnostic: `isLegitimateBoundary`
(`plane-integrity.ts:65`) reads burg cells only, prune/service/audit anchor on burgs, and surface
records already exist whose cells are water (searoutes), so mixed-domain route records are a
supported shape end to end. The premise holds the settlement side shut: underground burgs cannot
sit on water cells, so every endpoint stays a land cell and no plane rule moves.

Two facts about the map data make the bounds cheap:

- `pack.cells.t` is a **signed distance-to-coast** field: water cells are `-1` at the shore and
  deepen outward (`features-generator.ts:67-70`, the `markup` walks). `ROUTE_TYPE_MODIFIERS`
  (`routes-generator.ts:25-31`) already bucket it for sea routes: `-1` coastline 1, `-2` sea 1.8,
  `-3` open sea 4, `-4` ocean 6, beyond → 8.
- `grid.cells.temp` is the field `getWaterPathCost` already gates sea routes on
  (`MIN_PASSABLE_SEA_TEMP`, routes-generator.ts:352).

## Goals / Non-Goals

**Goals:**

- Water becomes passable to the tunnel cost only inside a bounded near-shore span, priced by depth,
  so bays, lakes and lagoons can be crossed and open sea cannot.
- The landmass rule becomes an explicit, deterministic guarantee instead of a cost accident.
- Zero changes to traversal, save format, endpoint eligibility, or any other underground spec
  requirement; the plane audit stays green with no new violation classes.

**Non-Goals:**

- Cross-landmass tunnels (separate future delta: pair set, service rule, `unconnectable`).
- Underwater burgs (cannot happen; premise of the change).
- Any stride/leg bookkeeping beyond the per-step cost (no post-pass, no path rewriting).
- The elevation-profile UI nuance for mixed routes (`route-editor.ts:126`) — recorded, unchanged.

## Decisions

**D1 — The crossing bound is the shore-distance field, enforced as `Infinity`, not a price.**
A water step is passable only while `cells.t[next] >= -2` (coastline or sea: within two cells of
land); `t <= -3` (open sea and beyond) returns `Infinity`. This makes the spec's "a wide sea arm
stays impassable" structural rather than economic: no tunnel crosses water more than two cells from
land, so the widest crossable span is ~4-5 water cells, and ocean-spanning tunnels are impossible
by construction, however cheap the direct line. Alternatives considered: (a) depth pricing alone —
rejected, an ocean span at `x2` per step can still beat a long land detour around a peninsula;
(b) a stride cap on consecutive water cells — rejected, unenforceable in a per-step cost function
without stateful hacks that corrupt under Dijkstra's out-of-order exploration. Reusing `t` needs no
new field, is recomputed with features (so it stays fresh under heightmap edits, the same dependency
sea routes already have), and the `-1/-2` classes are exactly "the water a coast indents with".

**D2 — Depth pricing comes from the existing height term; no new water factor.** The height
modifier `1 + max(50 - h, 0) / 50` already reads water `h` monotonically (deeper = dearer, ~1.62
at the shore to ~2.0 deep), and on land the same term gives high ground 1.0. Depth alone therefore
satisfies both comparison scenarios: deep > shallow, and water > land-at-equal-distance (water is
never below ~1.62 where sheltered land sits at 1.0). Alternatives: a dedicated
`WATER_CROSSING_MODIFIER` constant — kept in reserve for calibration after measurement; adopting it
now would be a knob with no evidence behind it. The sea-route `ROUTE_TYPE_MODIFIERS` are NOT reused
as tunnel water pricing: they price *shipping* exposure, and doubling them into tunnel cost would
make near-shore water (x1) as cheap as high land (x1.0), inviting shoreline-hugging tunnels that
the depth term alone already discourages.

**D3 — Frozen water gates the water legs; the glacier gate stays land-only.** The habitability gate
becomes conditional: `h[next] >= 20 && !habitability -> Infinity` (glaciers still block), while a
water step gates on `grid.cells.temp[g[next]] < MIN_PASSABLE_SEA_TEMP -> Infinity` — the same rule
and constant sea routes use. Rationale: marine biome habitability 0 is a *surface* statement
(no shipping, no settlement), not a tunnelling statement; temperature is the property that decides
whether the ground under the water is diggable at all. Alternative: exempt water from all gates —
rejected, a lava/frozen lake bed is no more diggable than a glacier.

**D4 — The landmass rule is enforced per path by a feature-scoped cost factory, not by cost
accident.** `createCostEvaluator` already shows the idiom: build the evaluator per call. The
underground pass builds `createUndergroundCost(feature)` per Urquhart pair (and per repair path)
with the pair's landmass feature closed over; the cost returns `Infinity` for any *land* step whose
`cells.f[next] !== feature`. Water steps are bound-governed and feature-blind (a bay's water is the
ocean feature; its membership cannot and need not be checked). This replaces the incidental
guarantee today's water wall provides (paths could never leave the landmass because water was
impassable) with an explicit one, and kills the one real leak: a same-landmass pair hopping through
a neighbouring island across a narrow strait. Instance state on `Routes` was considered and
rejected — a closure cannot leak between the generate and repair call sites, needs no reset
discipline, and unit tests construct it directly.

**D5 — The separation term and burg term apply to water steps unchanged.** `buildSurfaceDistances`
already floods over all cells and is seeded by all surface routes including searoutes, so a tunnel
pays separation under a shipping lane exactly as it does beside a road — one rule, no water
carve-out. Water cells carry no burg, so the plane-aware burg term prices them as plain cells, which
is what *Underground highways are attracted only to the settlements they serve* already requires for
"no burg". Both inherited behaviours are pinned by the re-aimed tests rather than by new rules.

**D6 — Measurement records the water share separately.** Tunnels on water cells overlap no road by
construction, so the 8-seed paired protocol would credit the change for free. The harness run adds a
water-cell count per seed and the verdict reads overlap land-cells-only alongside the total, so the
rung's real effect on the land competition is visible. This is a protocol note, not a code change to
the generator.

## Risks / Trade-offs

- **The bound bites harder than intended on wide bays** (a lagoon 6 cells across is uncrossable and
  the pair falls back to the land detour) → acceptable by design: the land path always exists within
  a landmass, so the fallback is the old behaviour; calibration can widen the bound to `-3` later
  with one constant change.
- **Marine `h` is noisier than land `h`** (depth values vary cell to cell) → the depth term is a
  gentle 1.62-2.0 gradient; noise cannot flip the land-vs-water comparison, which the type-agnostic
  bound already fixes structurally.
- **`cells.t` staleness after heightmap edits** → `t` is recomputed by the same feature pass that
  sea routes depend on; tunnels inherit exactly the freshness guarantee searoutes have today. No new
  staleness class is introduced.
- **Overlap metric flattery** → mitigated by D6's separate water share.
- **A water leg could strand a pair on a frozen coast** → the land path within the landmass still
  exists and remains the fallback; the repair pass paths with the same factory (D4), so an orphan on
  a frozen shore reconnects over land exactly as it does today.
- **Edit-created tunnels**: any editor path that draws a new underground connection with a cost
  evaluator must use the same factory; the implementation checklist covers the call sites
  (`generateUndergroundHighways`, `repairUndergroundHighways`, and any editor draw path) so no
  caller silently keeps the ungated function.

## Migration Plan

Single-generator change, no data migration: route records already store arbitrary cell chains
(searoutes carry water cells today), and `underground: true` is the only marker. Rollback is
restoring the two gate lines. Old maps regenerate the network on next routes rebuild, per
*The network is rebuilt with the settlements it serves* — no stored state changes.

## Open Questions

- None blocking. The bound (`-2` vs `-3`) and any dedicated water modifier are calibration
  parameters to revisit with the paired measurement, not decisions this design must settle.
