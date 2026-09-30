# Tasks: underground-water-crossings

## 1. Fixture setup (minimum for tests to function)

- [x] 1.1 Extend `makePack` in `src/generators/underground-highways.test.ts` with per-cell `pack.cells.t` (default land `1`, water `-1`), `grid.cells.temp` (default above `MIN_PASSABLE_SEA_TEMP`), an optional second water column (`t = -2`) and the 9x3 bay/isle variant (feature 1 shores, feature 2 isle) — verify: existing suite still green, `cellAt`/`isStrait` helpers unchanged.
- [x] 1.2 Add a `createUndergroundCost(feature)` factory seam on the `Routes` generator (behaviour-identical delegation to the current cost function) — verify: full existing suite green, no call-site changes yet.

## 2. Tests (write first — check off as written)

- [x] 2.1 Unit test: "water step within the bound is passable" (test-design §Unit 1) — water `t = -1`, passable temp → finite cost.
- [x] 2.2 Unit test: "deep water step costs dearer than shallow" (test-design §Unit 2) — equal `t`, `h 19` vs `h 2`.
- [x] 2.3 Unit test: "water step costs more than the same step on land" (test-design §Unit 3) — land `h = 90` vs water `t = -1`, equal offsets.
- [x] 2.4 Unit test: "water beyond the shore-distance bound is prohibitive" (test-design §Unit 4) — `t = -3` and `-4` → `Infinity` from both banks.
- [x] 2.5 Unit test: "frozen water is impassable" (test-design §Unit 5) — temp below `MIN_PASSABLE_SEA_TEMP` → `Infinity`, control finite.
- [x] 2.6 Unit test: "a land step of a foreign landmass is prohibitive" (test-design §Unit 6) — feature-1 evaluator vs feature-2 cell across passable water; plus the glacier land pin (`habitability 0` → `Infinity`).
- [x] 2.7 Unit test: "water steps price as no-burg and keep the separation term" (test-design §Unit 7) — water vs plain land; separation applies on water cells.
- [x] 2.8 Unit test: "surface costs stay unaware of the underground network" (test-design §Unit 8; re-run of the `:266` pin).
- [x] 2.9 Unit test: "a mixed tunnel keeps its record shape" (test-design §Unit 9) — `group: "roads"`, `underground: true`, no new fields.
- [x] 2.10 Re-aim the pinned test `:161` into the bound/depth/frozen/glacier four (test-design §Re-aimed pins) — old title retired, assertions redistributed.
- [x] 2.11 Re-aim the land-only assertions at `:315`, `:423`, `:436` to "land of the pair's feature or water with `|t| <= 2`" (test-design §Re-aimed pins).
- [x] 2.12 Integration test: "a bay crossing serves its burgs and stays plane-clean" (test-design §Integration 1) — `generate()` on the bay fixture; endpoints, audit, no foreign land.
- [x] 2.13 Integration test: "the isle detour is refused" (test-design §Integration 2) — path exists around the isle, never on its land.
- [x] 2.14 Integration test: "the repair pass crosses water with the same factory" (test-design §Integration 3) — orphan reconnected across the bay, audit clean.

## 3. Implementation

- [x] 3.1 Implement the bound in the underground cost: water step passable only while `pack.cells.t[next] >= -2`; `t <= -3` → `Infinity` (design D1) — verify: 2.1, 2.4 pass.
- [x] 3.2 Replace the absolute water gate with the conditional gates: land keeps the habitability/glacier gate (`h >= 20 && !habitability` → `Infinity`); water legs gate on `grid.cells.temp[g[next]] < MIN_PASSABLE_SEA_TEMP` → `Infinity` (design D3) — verify: 2.5, 2.6 glacier half pass.
- [x] 3.3 Keep the height term as the depth pricer (no new water factor; water `h` flows through `1 + max(50 - h, 0)/50`) (design D2) — verify: 2.2, 2.3 pass.
- [x] 3.4 Thread the pair's feature: `generateUndergroundHighways` and `repairUndergroundHighways` build their evaluator via `createUndergroundCost(burgFeature)`; the cost returns `Infinity` for land steps with `cells.f[next] !== feature` (design D4) — verify: 2.6, 2.12, 2.13, 2.14 pass.
- [x] 3.5 Confirm the separation and burg terms are untouched on water cells (no water carve-outs) (design D5) — verify: 2.7 pass.
- [x] 3.6 Audit every call site of `getUndergroundPathCost` (generate, repair, any editor draw path) uses the feature-scoped evaluator; no caller keeps the ungated function (design D4 checklist) — verify: grep shows no direct `this.getUndergroundPathCost.bind(this)` remaining in the underground pass.

## 4. Docs & measurement protocol

- [x] 4.1 Update `docs/architecture/generation-pipeline.md`: the underground pass description gains the bounded water crossing (bound, depth pricing, frozen gate, feature scope) — verify: doc states the new rule; no other doc line drift (grep `docs/` for "never run through water").
- [x] 4.2 Harness protocol note: the measurement harness records a per-seed water-cell share and the verdict reads overlap land-only alongside the total (design D6) — verify: harness output lines carry the water share (harness copy-in/run/copy-out per H6 of the metaplan).

## 5. Test Validation (check off as each test passes)

- [x] 5.1 Test "water step within the bound is passable" passes and matches spec
- [x] 5.2 Test "deep water step costs dearer than shallow" passes and matches spec
- [x] 5.3 Test "water step costs more than the same step on land" passes and matches spec
- [x] 5.4 Test "water beyond the shore-distance bound is prohibitive" passes and matches spec
- [x] 5.5 Test "frozen water is impassable" passes and matches spec
- [x] 5.6 Test "a land step of a foreign landmass is prohibitive" passes and matches spec
- [x] 5.7 Test "water steps price as no-burg and keep the separation term" passes and matches spec
- [x] 5.8 Test "surface costs stay unaware of the underground network" passes and matches spec
- [x] 5.9 Test "a mixed tunnel keeps its record shape" passes and matches spec
- [x] 5.10 Test "a bay crossing serves its burgs and stays plane-clean" passes and matches spec
- [x] 5.11 Test "the isle detour is refused" passes and matches spec
- [x] 5.12 Test "the repair pass crosses water with the same factory" passes and matches spec
- [x] 5.13 Run full test suite — all green
- [x] 5.14 Verify coverage thresholds met
