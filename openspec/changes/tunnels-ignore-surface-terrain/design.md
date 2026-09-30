# Design — let tunnels ignore the surface's terrain rules

## Context

`getUndergroundPathCost` ([routes-generator.ts:675](src/generators/routes-generator.ts#L675)) prices a
tunnel step as

```
distance^2 x habitabilityModifier x heightModifier x connectionModifier x burgModifier x surfaceSeparation
```

behind three prohibitions — the water crossing bound (`t[next] < -2`), frozen water
(`grid.cells.temp[g[next]] < MIN_PASSABLE_SEA_TEMP`) and uninhabitable land (`!habitability`) — plus
the per-pair landmass gate in `createUndergroundCost`. The factors and gates divide cleanly into two
kinds of statement:

| read | what it describes | kind |
|---|---|---|
| `pack.cells.t` (ring distance from land) | where the water body is | tunnel geometry |
| `pack.cells.f` (feature) | which landmass the bore stays under | tunnel geometry |
| `pack.cells.h` | elevation on land, bathymetry in water | tunnel geometry, and the spec's terrain preference |
| `biome.habitability` | how well people live on the surface | **surface settlement score** |
| `grid.cells.temp` | the climate above the water | **surface climate** |

The last two are the change's subject, and the record already contains the argument for the first of
them. When water crossings were introduced, that design narrowed the habitability gate to land with
the reason *"marine biome habitability 0 is a **surface** statement (no shipping, no settlement), not a
tunnelling statement"*
([underground-water-crossings/design.md, D3](openspec/changes/archive/2026-09-30-underground-water-crossings/design.md)).
The land half kept the same gate, and the cost kept the habitability price for both planes.

What the land gate does in practice, measured this session on the saved maps in `tests/fixtures`:

| fixture | land under glacier biome | cells with `h >= 60` under glacier biome |
|---|---|---|
| `1.112.1` (cold) | 23.4% | **78.7%** |
| `1.139.4` | 0.8% | 12.5% |
| `1.143.1` (warm) | 0.1% | 1.3% |

Two consequences follow. First, the gate walls off the highest ground exactly where the spec demands
the opposite — *Underground highways prefer high ground*
([spec.md:123](openspec/specs/underground-highways/spec.md#L123)) — and the wall is wider than
anything a reader sees, because the biome gate fires below −5 °C
([biomes-generator.ts:134](src/generators/biomes-generator.ts#L134)) while the drawn ice starts at
−8 °C ([ice-generator.ts:42](src/generators/ice-generator.ts#L42)). Second, the scenario the gate was
written for cannot arise: polar ice carries no burgs, so no pair ever needs to tunnel there. It is
pinned by a unit test ([underground-highways.test.ts:508](src/generators/underground-highways.test.ts#L508))
and by a doc line ([generation-pipeline.md:247](docs/architecture/generation-pipeline.md#L247)), but by
**no requirement** in any spec.

The surface side is deliberately different. There the gate is a *surface domain* statement — a road
is built on the ground, not under it — and the surface network is the reference every alignment
measurement in this capability is baselined against. The saved maps show the rule in force: **0 of
3582** and **0 of 4204** route points sit on a glacier cell, on maps where up to 23% of the land is
glacier. That stays.

## Goals / Non-Goals

**Goals:**

- The tunnel cost reads no biome and no water temperature: a cell's habitability changes nothing, and
  frozen water is not a tunnel obstruction.
- Everything else about the tunnel cost is unchanged: the water crossing bound, the landmass
  constraint, the depth price, the elevation preference, the corridor separation, the underground
  discount and the plane-aware burg attraction.
- The **surface** network is bit-identical, so the numbers the pair-set change pinned stay comparable.
- The capability's terrain rules become the tunnel's own: where the bore runs and how deep, not what
  the surface is like.

**Non-Goals:**

- The surface land cost's habitability gate and price ([routes-generator.ts:625](src/generators/routes-generator.ts#L625),
  [L629](src/generators/routes-generator.ts#L629)) — unchanged, and a separate decision if ever taken.
- The value or definition of the water crossing bound. It stays; this change measures whether it is
  still doing work, and records the width-versus-depth wording question rather than acting on it.
- The pair policy, the surface-path measure, the corridor separation, the discount, the burg
  attraction, prune/merge/repair, the boundary rule, traversal, the save format and the display.
- Re-baselining the pair-set numbers: they hold because the surface does not move.

## Decisions

### D1 — The land habitability gate leaves the tunnel cost

`!pack.biomes[biome[next]].habitability -> Infinity` goes. A glacier land cell becomes passable and is
priced by its elevation like any other cell, which is what *prefer high ground* asks for.

*Alternatives rejected.* Keep the gate and exempt cells above some height — an arbitrary line inside a
rule that has no business existing. Keep it and price ice instead — a price cannot repair a sign
error: the requirement wants high ground favoured, and an extra charge on the highest ground fights it.
Remove it from the land cost too — a bigger change that moves the measurement reference, and the
surface rule is defensible on its own terms (D6).

### D2 — The habitability price leaves the tunnel cost with it

`habitabilityModifier` is the same surface score, worth at most 10%, and it carries a defect of its
own: it is applied to water steps as well, where the marine biome's habitability is 0, so a tunnel's
water step paid 1.1 where a sea route's paid 1.0. Removing the price removes the quirk with it. The
archived ablation is the expectation to confirm on the current build: removing both biome terms
shortened the tunnel network (`x0.968`) with directness flat, while raising `passUnder` by 13-41 cells
per seed on the build *before* the plane-aware burg attraction, which is why the re-run measures it
rather than quoting it.

*Alternative rejected.* Keep the price as a weak "prefer barren ground" signal. It is a different
objective smuggled in as a terrain term, and 10% is not a lever anyone can defend on the numbers.

### D3 — Frozen water stops gating a tunnel step, and keeps gating sea routes

The archived justification for the tunnel side — *"a lava/frozen lake bed is no more diggable than a
glacier"* — is the reasoning this change rejects wholesale: ice is a state of the surface, and a bore
passes under it as easily as under open water. Sea routes keep the rule, where ships meet the ice.

*Tooling note.* A `MODIFIED` requirement block must retain the scenarios the current spec has, so the
existing "Frozen water is impassable" scenario is kept by name and re-scoped to the sea-route rule it
now describes alone, with a new scenario stating the tunnel side. Dropping it would leave the water
requirement's text and this change's requirement contradicting each other in the same capability.

### D4 — The water crossing bound stays, and it is a different kind of rule

The bound reads `pack.cells.t`, the pack's ring distance from land
([features-generator.ts:311-324](src/generators/features-generator.ts#L311)) — where the water body is,
not what the surface is like. It exists so that "no ocean-spanning tunnel" is structural rather than a
price outcome, and the measurement behind it holds: the crossings it permits carry a land fallback of
1.00 on 27 of 53 crossing pairs (the crossing bought nothing) and 1.01-6.70 on the other 26, while
widening it by one ring costs overlap 0.422 → 0.565 and `passUnder` 67 → 95.3 per seed.

*Alternatives rejected.* Depth pricing alone, as the archived design already argued: an ocean span at
~2x per step can still beat a long detour around a peninsula. A cap on consecutive water cells — a
stateful rule a per-step cost cannot express under Dijkstra's out-of-order exploration. Removing the
bound as a side effect of "tunnels don't care about the surface" — the premise does not apply: nothing
in this rule looks at the surface.

### D5 — Depth is still priced, elevation is still preferred

Both are prices, both are pinned by requirements (*deep water costs dearer than shallow*, *a water
step costs more than the same step on land*, *a route across a mountain is cheaper than around it*),
and both read `pack.cells.h` — elevation on land, bathymetry in water. After this change the height
term is the tunnel's only terrain read, and that is the intended shape: the tunnel cares how deep it
goes and prefers high ground, not whether the rock above is fertile.

### D6 — The surface cost is untouched, so the planes disagree about ice

A road still refuses a glacier cell; a tunnel now runs beneath one. That asymmetry is the point: the
rule removed here was borrowed from the road cost, and the surface rule is a statement about building
on the ground. It is also what keeps this change measurable — with the land cost untouched, the
surface network is bit-identical, so the pair-set gates (records, cells, directness, shadowing,
coverage) remain applicable and only the tunnel numbers move.

### D7 — Measurement is the acceptance gate, not the reasoning

Three readings decide whether this lands: the surface network asserted bit-identical to the current
build; the standing eight-seed gates re-read (records, cells, directness mean and worst seed,
shadowing, coverage 0/0, violations 0); and two new columns the archived work left open — a histogram
of `pack.cells.t` over water cells with a count of the step candidates the bound blocks (is the bound
or the pack's own sparseness doing the work), and per-pair glacier exposure (does the direct corridor
cross glacier cells, and how far does the chosen path sag around them).

## Risks / Trade-offs

- **`passUnder` rises** (tunnels crossing surface-only burg cells) → the archived arm measured +13…+41
  cells per seed before the plane-aware burg attraction landed; the current build reads 36-63 (mean 49)
  per seed, and the re-run must show it inside the standing band, with the separation term expected to
  hold the line.
- **Tunnels may hug the highest, coldest ground** on cold seeds, where the elevation preference now
  runs unopposed by any ice penalty → the glacier-exposure column and the directness/shadowing gates
  are the check; if it shows, the lever is the elevation term's shape, which is its own decision.
- **A larger passable area changes the search** (more cells to relax) → generation time per seed is
  recorded with the other readings; the pair-set run sat near 0.9 s per seed.
- **The re-scoped sea-route scenario lives in the underground capability** → deliberate, recorded
  above; if the sea-route rule ever gets a capability of its own, the scenario moves there.
- **A cold map's tunnels and roads now differ around every glacier** → intended; the plane rules
  already keep the two networks' endpoints apart, and traversal is unchanged.

## Migration Plan

No data migration and no save-format change: the difference is entirely in generated content, and a
map is regenerated rather than converted. Rollback is reverting the four removed lines and the
restored comments — the spec deltas would need reverting with them.

## Open Questions

- **Is the bound firing at all?** `Pack.generate` drops grid water points beyond the first two rings
  ([pack-generator.ts:29](src/generators/pack-generator.ts#L29)) and `pack.cells.t` is then recomputed
  on the pack graph, so the deep rings a tunnel would need may mostly not exist as cells. The
  histogram above settles it; the rule stays either way.
- **Width or depth?** The requirement says no crossing exceeds the bound's *width*, while the rule
  limits *distance from land* per step, and the archived census measured water spans of 11 and 15
  consecutive cells. If a long coast-hugging submarine run is unwanted, that is a stateful rule and a
  follow-up change.
- **Does the land cost's own habitability gate follow?** Deferred: it is a surface-domain statement and
  removing it re-baselines every alignment number this capability measures against.
