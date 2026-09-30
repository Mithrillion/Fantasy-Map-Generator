# Test design — let tunnels ignore the surface's terrain rules

Every testable scenario from `specs/underground-highways/spec.md`, with the test that verifies it.
Tests are named after the requirement and scenario, so a failure reads back to the spec line.

## Scope of testing

The change removes reads from one function. What needs new tests is (a) the three removals and their
blast radius, and (b) the things that must **not** move: the water crossing bound, the landmass
constraint, the depth price, the elevation preference, and the whole surface cost.

Two levels, as in the previous change:

- **Unit / fixture tests** over constructed packs, for the cost's exact readings. Cheap and exact, and
  where the sign of each term is pinned.
- **The 8-seed protocol** (the harness, `VITE_MEASURE_SEEDS` a–h), for what only exists at map scale.
  It carries three new assertions this change needs: the admitted pair set is unchanged, the surface
  network fingerprints are unchanged, and the standing gates still hold with the new columns.

## Unit tests

### Requirement: Underground highways ignore land habitability

**Scenario: A step onto uninhabitable land is passable** → `habitability / a glacier land step is passable`
- *Arrange*: the rect fixture, with a glacier biome row added to the fixture table (its own index, so it
  does not collide with the water biome the water tests use), `pack.cells.biome[cell] = GLACIER`.
- *Act*: `Routes.getUndergroundPathCost(from, cell)`.
- *Assert*: finite, and equal to the cost of an identical cell of another biome.

**Scenario: Biome habitability does not price a tunnel step** → `habitability / the biome does not price a tunnel step`
- *Arrange*: two cells identical in height, distance, burg and network state, one glacier, one grassland.
- *Act*: both step costs.
- *Assert*: equal — the term is gone in both directions, so ice is neither cheaper nor dearer.

**Scenario: A water step pays no biome price** → `habitability / a water step is not priced by its biome`
- *Arrange*: a bound-passable water cell inside the rect fixture, costed once with the fixture's
  habitability-0 water biome and once with a habitability-50 biome.
- *Act*: both step costs.
- *Assert*: equal. This is the marine quirk's pin: before the change the habitability-0 water paid 1.1.

**Scenario: The surface land cost keeps its own habitability rule** → `habitability / the land cost keeps its gate`
- *Arrange*: the same glacier cell.
- *Act*: `Routes.getLandPathCost(from, glacier)` and the same step onto an identical non-glacier cell.
- *Assert*: `Infinity` for the glacier, finite and habitability-priced for the other. The scope guard:
  this change does not reach the surface cost.

### Requirement: Underground highways prefer high ground

**Scenario: A route across a mountain is cheaper than around it** → existing `makes a high-ground step cheaper than an equal-length low-ground step` (line 521) and `selects the high-ground path of two equal-length paths` (line 531) — re-run unchanged; they must hold *without* the glacier exemption that used to be needed to state them.

**Scenario: A glacier-covered crest does not block the crossing** → `high ground / a glacier ridge is crossed, not skirted`
- *Arrange*: the rect fixture with a ridge of `h = 70` cells astride the direct line between two
  subterranean burgs, set to the glacier biome, and open lowland routes around both ends.
- *Act*: generate the underground network.
- *Assert*: the generated path's cells include at least one ridge cell — the detour the gate used to
  force is gone. A cell-level companion asserts the glacier crest step is cheaper than an equal-distance
  lowland step.

### Requirement: Underground highways cross water only in bounded stretches

**Scenario: Water is not categorically impassable** → existing `lets a water step within the crossing bound pass` (line 441) — re-run.

**Scenario: Deep water costs dearer than shallow** → existing `prices a deep water step dearer than an equal shallow one` (line 455) — re-run. The depth price is deliberately untouched.

**Scenario: A water step costs more than the same step on land** → existing `prices a water step dearer than the same step on land` (line 470) — re-run, and now a clean reading: the land side of the comparison can no longer be `Infinity` on a glacier, so the scenario is true for every land cell.

**Scenario: A wide sea arm stays impassable** → existing `keeps water beyond the shore-distance bound prohibitive` (line 483) — re-run, plus the leak checks in *Edge cases*.

**Scenario: Frozen water is impassable** (now the sea-route rule) → `frozen water / still impassable to a sea route`
- *Arrange*: the same grid stub with a cold water cell, `grid.cells.temp = MIN_PASSABLE_SEA_TEMP - 1`.
- *Act*: `Routes.getWaterPathCost(land, coldWater)`.
- *Assert*: `Infinity`. The test that currently asserts this of the **tunnel** cost (line 496) is the one re-aimed here.

**Scenario: Frozen water does not gate a tunnel step** → `frozen water / a tunnel step under cold water is priced, not prohibited`
- *Arrange*: the same cold water cell, tunnel cost.
- *Act*: `Routes.getUndergroundPathCost(from, coldWater)`.
- *Assert*: finite, and still dearer than an equal shallow, warm water step — removal must not flatten
  the water pricing.

**Scenario: No crossing steps onto a foreign landmass** → existing `refuses a land step onto a foreign landmass and keeps the glacier gate` (line 508), whose landmass half stays and whose glacier half becomes the passability assertion above; plus the integration test at line 768.

**Scenario: Endpoints, boundaries and the audit are unchanged** → the 8-seed plane audit (`plane-integrity.dom.test.ts`) and the integration checks below; no re-design.

**Scenario: Traversal is unchanged in kind** → existing lines 789, 799, 818, 828 — re-run; the change touches generation cost only.

### Requirement: Underground highways keep clear of the surface network's corridors

**Scenario: The penalty never blocks a passable step** → existing line 564 re-run; its spec wording no longer names the habitability gate, so the test's precondition is the water bound only.

## Integration tests

**The admitted pair set is unchanged** → `protocol / pairs and surface are identical to the pre-change build`
- *Arrange*: run the harness on the unchanged build first and archive, per seed, the admitted pair list
  and a surface fingerprint (route count, total cells, a checksum over the cell chains).
- *Act*: run the same harness on the changed build.
- *Assert*: the pair lists and the surface fingerprints are identical on all 8 seeds. The pair set is
  selected from the surface measure and the burg set, neither of which this change touches, so a
  difference means something leaked out of the tunnel cost.

**The standing gates still hold** → `protocol / records, cells, directness, shadowing, coverage`
- *Assert*: the pair-set change's gates re-read on the new build (records, tunnel cells, directness mean
  and worst seed, shadowing with its per-seed slack, coverage 0 uncovered / 0 service violations / 0
  boundary violations / 0 repairs), with the surface bit-identical as the invariant above.

**Glacier exposure** → `protocol / glacier exposure per pair`
- *Assert*: per seed, the share of admitted pairs whose direct corridor crosses a glacier cell, and the
  sag between the corridor's highest cell and the path's own highest cell — the number that says the
  forced detour is gone, and the one that would show tunnels over-hugging ice if the elevation term
  overshoots.

**The bound is still doing work** → `protocol / bound activity`
- *Assert*: a histogram of `pack.cells.t` over water cells per seed, and the count of step candidates the
  bound rejects. The design's open question — whether the rule or the pack's own sparseness limits a
  crossing — is answered here, and the rule stays either way.

**Generation time** → `protocol / ms per seed`, recorded, since the passable area grows.

## Edge cases and negative tests

- **No leak into the bound**: a bound-passable-biome, warm, foreign-shore, or burg-carrying water cell
  beyond the bound is still `Infinity`. Three separate assertions, one per removed term.
- **No leak into the landmass rule**: a foreign shore that is also a glacier is still `Infinity`, for
  both the pair's own feature and the foreign one.
- **No accidental ice discount**: a glacier cell is never *cheaper* than an otherwise identical
  non-glacier cell (the two-sided assertion in `the biome does not price a tunnel step`).
- **Cooling water does not flatten depth**: a cold shallow step is cheaper than a cold deep step, so the
  removal of the temperature gate leaves the depth price doing the work.
- **Service with ice in the way**: a fully subterranean burg whose only land route crosses a glacier is
  connected without a repair pass, which is the failure the old gate could produce.
- **Fixture hazard**: `surfaceGatewayFixture` (line 988) uses a glacier as its wall; with the gate gone
  the wall must become water beyond the bound (or a foreign landmass), or the fixture silently stops
  testing its junction case. The water-bound fixtures at lines 1360-1361 keep their `t = -3/-4` cells.
- **Comment drift**: the fixture comments at lines 56 and 150 and the cost expectation at line 643
  (`x 1.1`) describe the removed terms; they are updated with the behaviour, not after it.

## Test data / fixtures

- **The rect fixture** (`makeRectPack`, `landmassWithSubterranean`, `FIXTURE_BIOMES`) in
  `underground-highways.test.ts` — extended with a glacier biome row on its own index, plus a ridge
  helper for the high-ground path test.
- **`bayWithLandDetour(ratio)`** — reused for the bound and depth assertions, unchanged.
- **The grid temperature stub** (line 164) — reused; it holds `temp` above `MIN_PASSABLE_SEA_TEMP`
  everywhere except the frozen tests, which set one cell.
- **The 8-seed harness** — the pair-set harness copied forward, with the pair-list and surface
  fingerprint columns, the glacier-exposure column and the bound histogram added; its log lands in the
  change's `measure/` directory, and its pre-change run is the baseline the identity assertions compare
  against.
- **The saved maps** (`tests/fixtures/*.map`) — read-only, for the climate-dependence figures in the
  design (glacier share by height); not a test input.
