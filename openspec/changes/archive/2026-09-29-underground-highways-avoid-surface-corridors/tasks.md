## 1. Preparation

- [x] 1.1 Read the delta spec and design in this change, and the diagnostic findings F1.1-F3.2s in `openspec/changes/diverge-underground-network/metaplan.md`, so the measured target (overlap 0.708 → ~0.560, length ≤ ×1.15 per seed) is in hand before any code moves.
- [x] 1.2 Confirm the baseline the change will be judged against is reproducible: copy the preserved harness back (`harness/underground-measure.dom.test.ts.txt` → `src/generators/underground-measure.dom.test.ts`) and run it on one seed, expecting `baseline-production` to read overlap 0.722 / exact-edge ~0.33 on `measure-a` as recorded.

## 2. Tests (write first — check off as written)

- [x] 2.1 Write the test for *prices a tunnel step higher beside a surface route than clear of one* (test-design: underground-highways) — fails today because the cost ignores the surface network.
- [x] 2.2 Write the test for *decays the penalty with distance and bounds it* — asserts the 3 / 2 / 5⁄3 / 3⁄2 / 1 multipliers over distances 0-4.
- [x] 2.3 Write the test for *never makes a passable step impassable* — the penalised step stays finite while the water and glacier gates still return `Infinity`.
- [x] 2.4 Write the test for *does not let the underground network repel itself* — a locked underground highway earns the discount and no penalty.
- [x] 2.5 Re-aim the existing test at `:215-228` into *prices a surface-covered step no lower than a clear one, and higher beside a route*, keeping the scenario name the spec still carries.
- [x] 2.6 Write the test for *keeps a uniform, path-neutral penalty when no surface network exists* — the direct-call assertions that survive this change.
- [x] 2.7 Write the test for *rebuilds the separation field on every pass* — no stale field across a regeneration.

## 3. Implementation

- [x] 3.1 Add the bounded multi-source BFS field to the routes module: seeded from the non-underground routes the pass already receives, expanded over `pack.cells.c`, capped at 4, stored as module state beside `undergroundConnections`, rebuilt at the top of `generateUndergroundHighways` before any tunnel is pushed (design D1, D4).
- [x] 3.2 Add the separation factor `1 + 2 / (1 + distance)` to `getUndergroundPathCost`, applying no penalty at or beyond the cap, and keep the signature unchanged (design D2, D3).
- [x] 3.3 Update the cost model's doc comment and the stale sentence at `docs/architecture/generation-pipeline.md:242` so the documented cost list matches the code.
- [x] 3.4 Confirm the pinned behaviours the change must not touch still hold by reading them: the merge test, the traversal tests and the "surface routes are not made cheaper" test are unchanged and still pass.

## 4. Measurement

- [x] 4.1 Run the harness on all 8 seeds and record the new `baseline-production` row: overlap, exact-edge share, corridor distance, length ratio, endpoint-service share.
- [x] 4.2 Compare against the recorded pre-change baseline per seed: overlap must fall on every seed, exact-edge must fall, and no seed may grow beyond ×1.15. Record the table in this change's `verification.md` with the harness revision and date.
- [x] 4.3 Confirm the ladder's next rung is still the right one after this measurement: if overlap has fallen but the reading is still too aligned, state which rung (burg attraction, then endpoint gates) the evidence now favours; if this rung under-delivers against the diagnostic's −14.8 points, say so rather than adjusting the metric.

## 5. Test Validation (check off as each test passes)

- [x] 5.1 Test "prices a tunnel step higher beside a surface route than clear of one" passes and matches spec
- [x] 5.2 Test "decays the penalty with distance and bounds it" passes and matches spec
- [x] 5.3 Test "never makes a passable step impassable" passes and matches spec
- [x] 5.4 Test "does not let the underground network repel itself" passes and matches spec
- [x] 5.5 Test "prices a surface-covered step no lower than a clear one, and higher beside a route" passes and matches spec
- [x] 5.6 Test "keeps a uniform, path-neutral penalty when no surface network exists" passes and matches spec
- [x] 5.7 Test "rebuilds the separation field on every pass" passes and matches spec
- [x] 5.8 Run the generators, services/io and renderers suites — all green, and `npx tsc` and `npx biome check` clean on the touched files
- [x] 5.9 Run `openspec validate underground-highways-avoid-surface-corridors --strict` — valid
