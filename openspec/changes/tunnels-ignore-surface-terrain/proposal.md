# Let tunnels ignore the surface's terrain rules

## Why

`getUndergroundPathCost` prices a tunnel through two fields that describe the **surface**, not the
bore: the land cell's biome `habitability` (both as a hard gate — `!habitability -> Infinity` — and as
a [1, 1.1] price) and the water cell's `grid.cells.temp` against the sea-route temperature rule. The
first makes the highest ground on a cold map impassable, which is the exact opposite of what
*Underground highways prefer high ground* requires: on a real saved map with 23.4% of its land under
glacier biome, **78.7% of all cells with `h >= 60` are glacier**, and the blocked band is wider than
the ice a reader sees (the biome gate fires below −5°C, the drawn ice starts at −8°C). The rule's
stated intent — keep tunnels out of polar ice — cannot arise either, because no burg is ever placed
there, so its only live effect is to route tunnels around mountains.

The same category error was already rejected for water when crossings were introduced: that design
recorded *"marine biome habitability 0 is a **surface** statement (no shipping, no settlement), not a
tunnelling statement"* and left the land half of the gate in place. This change finishes that
argument: a tunnel's passability is its own span and its own landmass, not the habitability,
glaciation or water temperature of the world above it.

## What Changes

- **Land habitability leaves the tunnel cost entirely.** The `!habitability -> Infinity` gate goes (a
  glacier land cell becomes passable), and so does the `habitabilityModifier` price, so the cell's
  biome changes a tunnel step's cost by nothing at all. This also removes the marine-biome quirk that
  came with the price: a tunnel's water step paid 1.1 where a sea route's paid 1.0.
- **Frozen water leaves the tunnel cost.** `grid.cells.temp[g[next]] < MIN_PASSABLE_SEA_TEMP` no
  longer prohibits a tunnel water step: a bore under ice is as diggable as a bore under open water.
  **BREAKING** for *Underground highways cross water only in bounded stretches*, whose "frozen water
  SHALL be impassable, by the same passable-sea temperature rule that sea routes already use" clause
  narrows to sea routes; the tunnel side keeps the crossing bound and the landmass rule.
- **The water span bound stays.** A tunnel step is still prohibited beyond `pack.cells.t >= -2`, so
  the widest crossable arm cannot exceed the near-shore span however cheap the direct line. Measured:
  the crossings it permits carry a land fallback of 1.00 on 27 of 53 crossing pairs and 1.01-6.70 on
  the other 26, and widening it by one ring costs overlap 0.422 → 0.565 and passUnder 67 → 95.3.
- **The depth price stays**, because it is a price and not a surface statement: deep water costs
  dearer through the existing height term, shallow water cheaper, and water dearer than land at equal
  distance — the comparisons the water requirement already names.
- **Everything else about the tunnel cost is untouched**: the height preference, the corridor
  separation, the underground-only discount, the plane-aware burg attraction, the pair policy, the
  landmass constraint, the boundary, prune and service rules, and traversal. The **surface** land cost
  keeps both its own habitability gate and its habitability price, so surface route pathfinding stays
  exactly as it is.
- **The tunnel cost's remaining reads are stated as the rule**: where the bore runs (landmass, water
  span) and how deep (bathymetry), plus the elevation preference and the network terms. No biome, no
  climate, no settlement score.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `underground-highways`: the terrain rules of the tunnel cost change. The frozen-water prohibition
  narrows to sea routes, the habitability gate and price disappear from the tunnel cost, and the
  requirement text that names "the water and habitability gates" as passability states is corrected.
  *Underground highways prefer high ground* gains a scenario pinning that a glacier-covered high cell
  is not impassable to a tunnel, since the removal is what makes the existing requirement true.

## Impact

- **Code**: `src/generators/routes-generator.ts` — `getUndergroundPathCost` loses the habitability
  gate, the habitability price and the frozen-water gate (three lines and the destructured `biome`),
  and its doc comment stops describing the land gates. `createUndergroundCost`, the pair policy, the
  surface costs, prune/merge/repair and the plane rules are untouched.
- **Existing tests**: `underground-highways.test.ts` — the water suite's "keeps frozen water
  impassable" (line 496) is re-aimed at "frozen water is passable to a tunnel, still impassable to a
  sea route"; the foreign-landmass test (line 508) drops its glacier half in favour of a glacier
  passability assertion; the `surfaceGatewayFixture` (line 988) uses a glacier as the wall that makes
  its gateway the only crossing, so it needs a water-span wall instead; the cost expectation at line
  643 loses its ×1.1; the fixture comments at lines 56 and 150 stop calling habitability the gate. The
  water-bound tests (lines 447-491, 775) and the surface cost tests are unaffected.
- **Existing specs**: `plane-integrity-audit` is unaffected — passability is not part of its rules.
  `underground-settlements` is unaffected: no classification or placement changes.
- **Docs**: `docs/architecture/generation-pipeline.md` (routes step) — "uninhabitable land
  impassable" becomes the surface route's rule only, and the tunnel cost is described by its own span
  and depth terms.
- **Player-visible**: fewer forced detours on cold and high maps — tunnels cross the crests and the
  ice they now go around, and stop avoiding fertile lowland. The surface network is bit-identical, so
  the change is confined to the underground plane.
- **Measurement**: the eight-seed protocol re-run, with the surface network asserted bit-identical as
  the invariant that keeps the pair-set baselines comparable, plus two new readings the archived work
  left open: a histogram of `pack.cells.t` over water cells and a count of the step candidates the
  span bound actually blocks (is the bound or the pack's own sparseness doing the work), and a
  glacier-exposure column per pair (whether the direct corridor crosses glacier cells and how far the
  chosen path sags around them). The archived `biome-blind` arm is the expectation to beat: tunnel
  network ×0.968, directness flat, but `passUnder` up 13-41 cells per seed on the older build — which
  must be re-measured, because that arm predates the plane-aware burg attraction.
- **Risk**: on cold maps the tunnel network changes shape where glaciers are — the same seeds where
  the surface network is unchanged, so the two planes diverge further. If the corridor separation and
  the height preference are not enough on their own, tunnels may hug the highest, coldest ground, and
  the re-run's directness and shadowing gates are what decide whether that is acceptable.
