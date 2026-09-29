## Test Strategy

Unit tests live in `src/generators/underground-highways.test.ts` (node environment, no DOM) and use its
existing synthetic pack: a 7×3 grid of 10px-spaced, 4-way connected land cells with a water strait in
column 3, `makePack(heights)` for the height field, `handRoute(...)` to lock a route and
`TestFlatQueue` as the `FlatQueue` the pathfinder needs. The separation field is exercised through the
real entry point — `Routes.generate(lockedRoutes, seed)` with `options.generation.underground = true`
builds it at the top of the pass — so no test reaches into module state directly.

The network-level scenario is not a unit test: it is the measurement harness preserved in
`openspec/changes/diverge-underground-network/harness/`, run on 8 seeds under
`vitest.browser.config.ts`, comparing against the recorded baseline (0.708 overlap / 0.326 exact-edge /
0.37 corridor distance).

## Unit Tests

### underground-highways

**Test: prices a tunnel step higher beside a surface route than clear of one** (Requirement:
*Underground highways keep clear of the surface network's corridors* / Scenario: *A step beside a
surface route costs more than the same step clear of one*)
- Arrange: `makePack()`; lock a surface route over a pair of adjacent cells on one row so the route
  cells are known; `options.generation.underground = true`; run `Routes.generate([handRoute(...)], 1)`
  so the separation field is built from that route.
- Act: read `Routes.getUndergroundPathCost(from, to)` for a step on a route cell, for a step one cell
  away from it, and for a step four or more cells away.
- Assert: `costOnRoute > costAdjacent > costFar`.

**Test: decays the penalty with distance and bounds it** (Scenario: *The penalty decays with distance
and is bounded*)
- Arrange: as above, with a single locked surface route.
- Act: sample the penalty at distances 0, 1, 2, 3 and 4+ cells, each time for a step across two cells
  at that distance so the underlying distance-squared term is the same.
- Assert: the multipliers are `3`, `2`, `5/3`, `3/2` and exactly `1` at the cap; the sequence is
  strictly decreasing; the ratio between the farthest and nearest sample equals 3.

**Test: never makes a passable step impassable** (Scenario: *The penalty never blocks a passable step*)
- Arrange: as above; pick a land, habitable step whose cell carries a surface route.
- Act: read the cost.
- Assert: the value is finite and greater than the unpenalised cost — never `Infinity`. The water and
  glacier gates keep returning `Infinity` independently (already pinned by the existing test at
  `:160-171`).

**Test: does not let the underground network repel itself** (Scenario: *Underground highways do not
repel each other*)
- Arrange: a pack with no surface route, and a locked *underground* highway over a pair (`handRoute(1,
  [from, to], true)`); run `Routes.generate([...], 1)` so the field is built from surface routes only.
- Act: read the cost of a step belonging to that underground highway, and of an equal step elsewhere.
- Assert: the underground step is cheaper by exactly the discount (0.5×), i.e. no separation penalty
  applies on its account.

**Test: prices a surface-covered step no lower than a clear one, and higher beside a route** (Requirement:
*Underground connectivity is self-contained* / Scenario: *A surface route does not make a tunnel
cheaper* — re-aims the existing test at `:215-228`)
- Arrange: the existing setup — `pack.cells.h[to] = 40`, generate with the underground option off to
  get a baseline, then generate with a locked surface route over the same step.
- Act: read the cost before and after.
- Assert: `after >= before` (never lower), and `after > before` when the locked route makes the step a
  surface-route step under the separation rule. The old equality assertion is removed because it is
  precisely what this change re-scopes.

**Test: keeps a uniform, path-neutral penalty when no surface network exists** (Design D3)
- Arrange: a pack with no routes at all; call the cost directly without ever running the pass.
- Act: compare the cost of two equal-length steps over different heights.
- Assert: their ratio is unchanged from the pre-change expectation (the penalty is uniform, so
  ordering and the high-ground preference survive); documents why the direct-call tests stay valid.

**Test: rebuilds the separation field on every pass** (Design D1)
- Arrange: generate with a surface route over step A present, then regenerate with a different surface
  route over step B.
- Act: read the cost of a step beside A after the second generation.
- Assert: the penalty that A had is gone unless B covers it — no stale field survives a regeneration.

### Unchanged, still pinned (regression cover for the modified requirement)

- *An underground highway is cheaper alongside the underground network* → existing test `:230-243`.
- *The underground network still merges with itself* → existing test `:386-400`.
- *Traversal is unchanged* → existing tests `:318-361`.
- *Surface routes are not made cheaper by underground highways* → existing tests `:363-385`.

## Integration Tests

**Test: the generated network separates from the surface network** (Scenario: *The separation is
visible in the generated network*)
- Harness: `harness/underground-measure.dom.test.ts.txt` (copy back into `src/generators/` to run), 8
  seeds `measure-a` … `measure-h`, `continents` template, `options.generation.underground = true`.
- Metric: the `baseline-production` row, whose numbers are the production output.
- Assert (against the recorded pre-change baseline): overlap falls from 0.708 toward 0.560,
  exact-edge from 0.326 toward 0.208, corridor distance rises from 0.37 toward 0.57, and length grows
  by no more than 15% on any seed (the recorded per-seed maximum was ×1.138).

## Edge Cases & Negative Tests

- **No surface network at all** (underground generation on a map whose routes were erased): the field
  is uniform, the penalty is path-neutral, generation completes, and the network is unchanged — the
  guard against this rung having any effect on maps it cannot apply to.
- **A map whose only corridor between two burgs is a surface road**: the step stays passable (bounded
  penalty), so no burg pair becomes unreachable. Checked by the "never blocks" test plus the
  measurement's reachability/service share (baseline 0.665, measured 0.691 under the term).
- **Locked surface routes**: they seed the field like any other surface route (they are in `routes`
  and carry no `underground` record).
- **Locked underground routes**: they must *not* seed the field — covered by the self-repulsion test.
- **A tunnel's own cells**: the field is built before the pass pushes any tunnel, so a tunnel can never
  seed the field it is then routed against — covered by the self-repulsion test's arrangement.

## Test Data / Fixtures

- `makePack(heights)` and the 7×3 grid constants (`COLUMNS`, `ROWS`, `STRAIT`, `cellAt`) from
  `underground-highways.test.ts` — reused as-is; no new fixture file.
- `handRoute(i, cells, underground?)` — the existing helper that builds a lockable route.
- For the network-level scenario: the preserved harness and its two raw logs
  (`harness/measure-full.log`, `harness/measure-sweep.log`) holding the pre-change baseline rows.
