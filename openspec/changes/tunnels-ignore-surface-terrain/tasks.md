# Tasks — let tunnels ignore the surface's terrain rules

## 1. Setup

- [ ] 1.1 Copy the pair-set harness into this change as `harness/tunnels-ignore-surface-terrain.dom.test.ts.txt`, adding four readings: the per-seed admitted pair list (start-end cells per pair), a surface fingerprint (surface record count, total surface cells, and a checksum over the surface cell chains), a glacier-exposure column per pair (does the direct corridor cross a glacier-biome cell, and the sag between the corridor's highest cell and the path's own highest cell), and a bound-activity column (`pack.cells.t` histogram over water cells plus the count of step candidates the bound rejects). Verification: the file exists with those columns and the protocol still prints its `ROW`/`AGG` lines.
- [ ] 1.2 Run the harness on the **unchanged** build — copy it into `src/generators/`, run `CHROMIUM_PATH=/usr/bin/chromium npx vitest run --config vitest.browser.config.ts generators/tunnels-ignore-surface-terrain.dom.test.ts`, then delete the copy — and archive the output as `measure/before.log`. Verification: the log carries the pair list and surface fingerprint per seed for all eight seeds, and the standing gates read as they do today.
- [ ] 1.3 Extend the rect fixture in `src/generators/underground-highways.test.ts` with a glacier biome row on its own index (so it does not collide with the habitability-0 water biome the water tests use) and a ridge helper that lays `h = 70` cells astride the line between two subterranean burgs. Verification: the existing suite still passes with the added fixture rows.

## 2. Tests (write first — check off as written)

- [ ] 2.1 Test: `habitability / a glacier land step is passable` (test-design, Requirement "Underground highways ignore land habitability" / Scenario "A step onto uninhabitable land is passable") — finite cost, equal to an identical cell of another biome.
- [ ] 2.2 Test: `habitability / the biome does not price a tunnel step` — two-sided: a glacier cell is neither dearer nor cheaper than an otherwise identical non-glacier cell.
- [ ] 2.3 Test: `habitability / a water step is not priced by its biome` — the same bound-passable water cell costed with a habitability-0 and a habitability-50 biome; equal, which is the removed marine 1.1.
- [ ] 2.4 Test: `habitability / the land cost keeps its gate` — `getLandPathCost` stays `Infinity` on the glacier cell and stays habitability-priced on a plain one.
- [ ] 2.5 Test: `high ground / a glacier ridge is crossed, not skirted` — a glacier ridge astride the direct line with open lowland around both ends is crossed, plus the cell-level companion that a glacier crest step is cheaper than an equal-distance lowland step.
- [ ] 2.6 Test: `frozen water / still impassable to a sea route` — the assertion the current suite makes of the tunnel cost (line 496) re-aimed at `getWaterPathCost`.
- [ ] 2.7 Test: `frozen water / a tunnel step under cold water is priced, not prohibited` — finite, and strictly dearer than an equal shallow warm water step.
- [ ] 2.8 Test: edge cases — no leak into the bound (warm, burg-carrying and foreign water cells beyond it stay `Infinity`); no leak into the landmass rule (a glacier foreign shore stays `Infinity` for both features); no accidental ice discount; cooling water does not flatten the depth price; a subterranean burg whose only land route crosses a glacier is served without a repair.
- [ ] 2.9 Integration test: `protocol / pairs and surface are identical to the pre-change build` — per seed, the admitted pair list and the surface fingerprint equal `measure/before.log`.
- [ ] 2.10 Integration test: `protocol / records, cells, directness, shadowing, coverage` — the standing gates re-read on the changed build (records, tunnel cells, directness mean and worst seed, shadowing with its per-seed slack, 0 uncovered / 0 service violations / 0 boundary violations / 0 repairs).
- [ ] 2.11 Integration test: `protocol / glacier exposure per pair` — per seed, the share of admitted pairs whose direct corridor crosses a glacier cell, and the crest sag, reported next to the pre-change reading.
- [ ] 2.12 Integration test: `protocol / bound activity` — the water-ring histogram and the blocked-candidate count per seed, which answer whether the bound or the pack's own sparseness limits a crossing.
- [ ] 2.13 Integration test: `protocol / ms per seed` — generation time recorded, since the passable area grows.

## 3. Core Implementation

- [ ] 3.1 Remove the land habitability gate from `getUndergroundPathCost` (`!pack.biomes[biome[next]].habitability -> Infinity`) and drop `biome` from the function's destructuring. Verification: `npx tsc --noEmit` is clean (an unused binding fails the build).
- [ ] 3.2 Remove `habitabilityModifier` from the tunnel cost's product, which also removes the marine water-step 1.1. Verification: the cost expression reads `distance x height x connection x burg x separation`.
- [ ] 3.3 Remove the frozen-water gate from the tunnel cost, leaving `getWaterPathCost`'s temperature rule untouched. Verification: the water branch keeps the crossing bound only.
- [ ] 3.4 Rewrite the `getUndergroundPathCost` doc comment to the new contract: the tunnel's rules are its span from land, its landmass, its depth price and the elevation preference — no biome, no climate. Verification: no comment in `routes-generator.ts` still describes a glacier or temperature gate on the tunnel cost.
- [ ] 3.5 Update `docs/architecture/generation-pipeline.md` (routes step): "uninhabitable land impassable" becomes the surface route's rule, and the tunnel cost is described by its own span and depth terms. Verification: the paragraph matches the shipped code line by line.
- [ ] 3.6 Update the fixture comments in `underground-highways.test.ts` (lines 56 and 150) that call habitability "the gate the land cost uses", and drop the `x 1.1` from the water cost expectation at line 643. Verification: no comment in the suite describes a removed term.
- [ ] 3.7 Replace the glacier wall in `surfaceGatewayFixture` (line 988) with a wall that still exists — water beyond the crossing bound, or a foreign landmass — and re-point its two assertions. Verification: both junction tests fail if the wall is removed, i.e. the fixture still constrains what it was written for.
- [ ] 3.8 Run the harness on the changed build and archive `measure/after.log`, printing the before/after comparison for the pair list, the surface fingerprint, the gates, the glacier exposure and the bound activity. Verification: the log shows identical pairs and surface, the gates inside their bands, and the glacier-exposure reading moved in the expected direction.

## 4. Test Validation

- [ ] 4.1 Test "habitability / a glacier land step is passable" passes and matches spec
- [ ] 4.2 Test "habitability / the biome does not price a tunnel step" passes and matches spec
- [ ] 4.3 Test "habitability / a water step is not priced by its biome" passes and matches spec
- [ ] 4.4 Test "habitability / the land cost keeps its gate" passes and matches spec
- [ ] 4.5 Test "high ground / a glacier ridge is crossed, not skirted" passes and matches spec
- [ ] 4.6 Test "frozen water / still impassable to a sea route" passes and matches spec
- [ ] 4.7 Test "frozen water / a tunnel step under cold water is priced, not prohibited" passes and matches spec
- [ ] 4.8 Edge-case tests pass and match spec (bound, landmass, ice discount, depth, service)
- [ ] 4.9 Integration test "pairs and surface are identical to the pre-change build" passes — all eight seeds
- [ ] 4.10 Integration test "records, cells, directness, shadowing, coverage" passes and matches spec — with the surface bit-identical as the invariant
- [ ] 4.11 Integration test "glacier exposure per pair" passes and matches spec — the forced detour is measurably reduced against `measure/before.log`
- [ ] 4.12 Integration test "bound activity" passes and matches spec — the histogram and blocked-candidate count are reported, and the bound is kept regardless of what they show
- [ ] 4.13 Integration test "ms per seed" passes and matches spec — generation time recorded per seed
- [ ] 4.14 Run the full node suite (`npm test`) — all green, including the surface cost suites the change must not touch
- [ ] 4.15 Run `plane-integrity.dom.test.ts` on the eight seeds — 0 violations, 0 repairs, and the `tunnelsOnSurfaceOnlyBurgs` contact reading recorded
- [ ] 4.16 Run `npx tsc --noEmit` and `npx biome check` — both clean
- [ ] 4.17 Verify coverage thresholds met: every testable scenario in `specs/underground-highways/spec.md` has a passing test, and the harness copy is removed from `src/` with the updated copy kept in the change
