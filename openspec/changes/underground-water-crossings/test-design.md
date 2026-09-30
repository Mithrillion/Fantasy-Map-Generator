# Test Design: underground-water-crossings

## Test Strategy

Vitest unit tests extend the existing synthetic-pack idiom in
`src/generators/underground-highways.test.ts` (the 7x3 grid with `makePack`, `cellAt`, hand-built
routes and a `Routes` instance). The fixture gains two fields the new gates read — `pack.cells.t`
(signed shore distance) and `grid.cells.temp` — plus a wider variant with a same-landmass bay and
an isle for path-level tests. Cost-function tests call `Routes.getUndergroundPathCost` /
the new feature-scoped evaluator directly (the file's established style); network-level tests run
`generate()`/`repairUndergroundHighways()` on the fixture and assert through `auditPlanes`. The
real-map 8-seed audit in `playwright.yml` stays the standing zero-violation gate, unchanged.

## Unit Tests

### underground-highways

- **Test: water step within the bound is passable** (Requirement: *Underground highways cross water
  only in bounded stretches* / Scenario: *Water is not categorically impassable*)
  Arrange: fixture land cell (feature 1, h 30) adjacent to a water cell with `t = -1`, temp above
  `MIN_PASSABLE_SEA_TEMP`. Act: `Routes.getUndergroundPathCost(land, water)`.
  Assert: finite (not `Infinity`). Supersedes the first assertion of the pinned test at
  `underground-highways.test.ts:161`.

- **Test: deep water step costs dearer than shallow** (Scenario: *Deep water costs dearer than
  shallow*). Arrange: two water cells, equal `t = -1`, equal distance from the same land cell,
  `h = 19` vs `h = 2`. Act: two cost calls. Assert: deep cost > shallow cost.

- **Test: water step costs more than the same step on land** (Scenario: *A water step costs more
  than the same step on land*). Arrange: two cells at the same coordinates-offset from `from`, one
  land `h = 90` (heightModifier 1.0), one water `t = -1`. Act: two cost calls.
  Assert: water > land.

- **Test: water beyond the shore-distance bound is prohibitive** (Scenario: *A wide sea arm stays
  impassable*). Arrange: water cell with `t = -3` (and a `-4` variant). Act: cost call from each
  bank. Assert: `Infinity`.

- **Test: frozen water is impassable** (Scenario: *Frozen water is impassable*). Arrange: water
  cell `t = -1` with `grid.cells.temp` below `MIN_PASSABLE_SEA_TEMP`; a control cell above it.
  Act: two cost calls. Assert: frozen `Infinity`, control finite.

- **Test: a land step of a foreign landmass is prohibitive** (Scenario: *No crossing steps onto a
  foreign landmass*). Arrange: cost evaluators from the factory (D4) scoped to feature 1 and
  feature 2; a land cell of feature 2 reachable across bound-passable water. Act: cost call under
  each evaluator. Assert: `Infinity` under feature 1, finite under feature 2. Also re-aims the
  glacier half of the pinned test at `:161` (land habitability 0 stays `Infinity`).

- **Test: water steps price as no-burg and keep the separation term** (design D5; extends
  Requirement: *Underground highways are attracted only to the settlements they serve*). Arrange:
  water cell vs plain land cell, identical otherwise. Act: cost comparison; cost comparison with a
  surface route cell nearby (fixture `cells.routes`/surface route points). Assert: water prices as
  no-burg; separation multiplier applies on water as on land.

- **Test: surface costs stay unaware of the underground network** (extends the existing
  `:266` pin; Scenario: *Traversal is unchanged in kind*). Arrange/Act/Assert: as the existing
  test, re-run after the change — `getLandPathCost` still returns `Infinity` on water,
  `getWaterPathCost` untouched.

- **Test: a mixed tunnel keeps its record shape** (Scenario: *Traversal is unchanged in kind*).
  Arrange: generated network with a crossing. Act: inspect the route record.
  Assert: `group: "roads"`, `underground: true`, no new fields — nothing for consumers to
  special-case.

## Re-aimed pins (existing tests that the change intentionally flips)

- `underground-highways.test.ts:161` "makes a water step impassable and never enters an
  uninhabitable cell" — split into the four tests above (bound, depth, frozen, glacier).
- `:315` (and the same assertion at `:423`, `:436`): "every tunnel cell has `h >= 20`" becomes
  "every tunnel cell is land of the pair's feature **or** water with `|t| <= 2`".

## Integration Tests

- **Test: a bay crossing serves its burgs and stays plane-clean** (Scenario: *Endpoints, boundaries
  and the audit are unchanged*; design D1-D4). Arrange: wide fixture — feature 1 land, a bay
  (water `t = -1/-2`), two subterranean burgs on opposite shores, land detour made long or blocked.
  Act: `generate()` (underground pass). Assert: a highway exists whose cells include bay water;
  both endpoints are below-level burg land cells; `auditPlanes` violations empty; no path cell is
  land of another feature.

- **Test: the isle detour is refused** (Scenario: *No crossing steps onto a foreign landmass*;
  design D4). Arrange: feature 1 land — channel — one-cell isle (feature 2) — channel — feature 1
  land, burgs on both outer shores, all water `t = -1`; the land necks blocked (glacier). Act:
  path via the feature-1 evaluator. Assert: path exists, routes around the isle through water, and
  never steps on the isle's land.

- **Test: the repair pass crosses water with the same factory** (design D4 call-site coverage).
  Arrange: an orphan below-level burg across a bound-passable bay from its served peer; peer
  reachable only by crossing. Act: `repairUndergroundHighways()`. Assert: the orphan is served, the
  repair path's land cells are all feature 1, audit clean.

- **Test: real-map audit stays green** (standing gate, no new test code). The `playwright.yml`
  8-seed `PLANES` run asserts zero violations on the changed generator; the harness records the
  per-seed water-cell share (design D6) so the overlap verdict can be read land-only.

## Edge Cases & Negative Tests

- **Bay wider than the bound**: burgs across a `t <= -3` bay connect by land detour; no
  `Infinity`-free path through water exists and none is needed (land path within a landmass always
  exists). Assert: tunnel routes over land; no crash.
- **Frozen bay**: crossing impossible at temperature; land fallback used; repair behaves as today.
- **Lake island burgs**: a `lake_island` land feature is its own landmass — its burgs pair among
  themselves only, exactly as today; the feature-scoped evaluator neither helps nor hurts them.
- **Water adjacent to a burg cell**: the burg term prices the water step as no-burg (covered by the
  D5 unit test); no attraction leaks onto water.

## Test Data / Fixtures

- `makePack` extended with: per-cell `t` (default: land `1`, water `-1`), per-grid-cell temp
  (default above `MIN_PASSABLE_SEA_TEMP`), optional second water column for `-2` cells, and a
  9x3 bay/isle variant (feature 1 shores, feature 2 isle) for the integration tests.
- The strait column's biome 12 (glacier) stops mattering for water steps once legs gate on
  temperature (D3); the land glacier pin keeps biome 12 on a **land** cell.
- Burg fixtures reuse the existing `underground: true` hand-route helpers; no new burg fields.
