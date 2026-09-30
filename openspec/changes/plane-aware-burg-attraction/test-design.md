## Test Strategy

Two runners, as the program's rungs have used:

- **The pinned node suite** (`npm run test`) answers "did anything else move?". The rung changes two files
  and re-pins exactly one existing assertion family — the burg-attraction probe. Every other assertion must
  stay untouched; a failure there is a regression, not a test to update. The audit's contact field rename is
  the second deliberate edit and is confined to `plane-integrity.test.ts`'s contact test plus
  `formatPlaneReport`.
- **The real-map runs** (browser, `vitest.browser.config.ts`) answer "does it hold on generated maps?". The
  8-seed plane audit (`plane-integrity.dom.test.ts`) is the standing gate: zero violations, service intact,
  and its `PLANES` line now prints the split contact figures. The 8-seed paired harness
  (`diverge-underground-network/harness/underground-measure.dom.test.ts.txt`) is the adoption measurement,
  with a new plane-blind reverse-control arm so both arms run on one build.

Unit tests map 1:1 to delta scenarios; the harness is the acceptance signal, not a unit test. Spec
scenarios are written for both the new `underground-highways` requirement and the modified
`plane-integrity-audit` requirement, so the re-pinned probes are scenario-backed rather than test-local.

## Unit Tests

### underground-highways — Requirement: Underground highways are attracted only to the settlements they serve

**Test: prices a tunnel step onto a below-level burg cell at the attraction** (re-pin; Scenario: *A below-level
settlement still attracts a tunnel*)
- Arrange: the existing 7×3 fixture and the `withAttractionProbe` equalization helper — two destination cells
  made identical in coordinates, height, biome and separation, differing only in the burg map. Extend the
  helper to take the burg record to place: here `{ i: 99, cell: burgCell, underground: true }` (and a second
  case with `subterranean: true`, since both classifications carry below-level presence).
- Act: `Routes.getUndergroundPathCost(from, plainCell)` against `Routes.getUndergroundPathCost(from, burgCell)`.
- Assert: the quotient is exactly `UNDERGROUND_BURG_ATTRACTION` (2). A future re-tune must change this test
  deliberately, as rung 2's did.

**Test: prices a surface-only burg cell exactly as a plain cell** (new; Scenario: *A surface-only settlement
does not attract a tunnel*)
- Arrange: the same probe with a surface-only record at the burg cell (no flags) — and, to rule out the
  surface network confounding the quotient, no surface route locked.
- Act: the quotient of the two steps.
- Assert: the quotient is 1 — the cell keeps no attraction. Also assert the step stays finite (the rung must
  not make a passable cell impassable).

**Test: prices a record-less burg id as a plain cell** (new; Scenario: *A missing or removed burg record
prices as no burg*)
- Arrange: `pack.cells.burg[burgCell] = 99` with `pack.burgs = [0]` (the probe's current arrangement), and a
  second case with a record carrying `removed: true`.
- Act: the quotient of the two steps.
- Assert: quotient 1 in both cases — a stale id neither throws nor attracts.

**Test: leaves the surface network's own burg attraction at three** (existing, unchanged; Scenario: *The
surface network's own cost is unchanged*)
- Arrange: the same probe against `Routes.getLandPathCost`.
- Act/Assert: quotient 3 — untouched. This is the guard that the plane-aware read did not leak into the land
  cost, and it must not be edited by this change.

**Test: does not move the surface network** (existing, unchanged; supports the same scenario)
- Arrange: the classified-burg fixture; `generate()`.
- Act/Assert: clearing `pack.cells.burg[classified]` multiplies the land step by 3 exactly — the existing
  pack-level guard stays green.

### plane-integrity-audit — Requirement: The audit reports contact without enforcing it

**Test: counts contact without failing it** (existing, adapted to the renamed field; Scenario: *A road crossing
above a subterranean burg is counted, not failed*)
- Arrange: `mapFixture` with one `underground` burg; a surface record crossing its cell.
- Act/Assert: `report.contact.surfaceRoutesOnBelowLevelCells` is 1 and `violations` is empty. The assertion
  target is unchanged; only sibling field names moved.

**Test: reports surface-only and dual-identity tunnel contact apart** (new; Scenario: *Contact on a
surface-only burg is reported apart from a dual-identity burg*)
- Arrange: `mapFixture` with a dual-identity burg (`subterranean`) on one cell and a surface-only burg (no
  flags) on another; two underground records (`recordAt(..., true)`) built so one crosses each cell and
  neither begins nor ends there.
- Act: `auditPlanes(map, routes)`.
- Assert: `tunnelsOnSurfaceOnlyBurgs === 1` and `tunnelsOnDualIdentityBurgs === 1` — each in its own figure,
  neither summed into the other; `violations` empty.

**Test: counts a cell carrying more than one record** (new; Scenario: *A cell carrying more than one record
is counted*)
- Arrange: two underground records that share a cell (and a third, single-record cell nearby as a control).
- Act/Assert: `tunnelCellsWithMultipleRecords === 1`; the control cell is not counted; one record visiting
  the same cell twice (duplicate trailing cell, as `recordAt(1, [1, 2, 3, 3], true)`) is not counted as two.

**Test: reports zero contact on a map with no burgs** (supporting; not a spec scenario)
- Arrange: `mapFixture([])`; underground records only.
- Act/Assert: every contact field is 0 — the split cannot produce `undefined` or `NaN`.

**Test: the formatted report prints each contact figure** (supporting; the audit's log line)
- Arrange: the split fixture above.
- Act: `formatPlaneReport(seed, report)`.
- Assert: the string contains each figure under its own name, so a drifting number is visible in CI output.

## Integration Tests

**Test: a tunnel between two below-level burgs prefers a plain detour to a surface-only burg's cell**
(cost + pathfinder; Requirements: *attracted only to settlements they serve* / *connect only
subterranean-capable burgs*)
- Arrange: the 7×3 fixture; two below-level burgs on one landmass with a surface-only burg record on the
  direct line, and a surface route locked across the surface-only burg's cell (so the old behaviour would
  have made it the cheapest step).
- Act: `Routes.generate([], seed)` with `options.generation.underground` on.
- Assert: the generated underground records' cells still include both below-level burg cells (endpoints are
  unchanged) and exclude the surface-only burg's cell. If grid geometry makes exclusion impossible, the
  assertion narrows to "the surface-only burg's cell is not cheaper than its plain neighbour" — the cost
  contract is the guaranteed part.

**Test: a generated map's audit reports the split without a violation** (audit + generator; the capability
pair end to end)
- Arrange: the fixture with underground generation enabled and both contact kinds present.
- Act: `auditPlanes(pack, pack.routes)`.
- Assert: the split fields count the fixture's burg classes, `repairs` is 0 (the service pass is not carrying
  the rung), and `violations` is empty.

**Test: the real-map audit stays green on the new geometry** (browser; F5.1's standing gate)
- Arrange: `src/generators/plane-integrity.dom.test.ts`, seeds `measure-a` … `measure-h`, underground
  generation on, full pipeline.
- Act: `auditPlanes(pack, pack.routes)` per seed; log `formatPlaneReport`.
- Assert: `formatPlaneViolations` collects nothing. The split figures are recorded in the change's measure
  log, not asserted to a threshold — contact is reported, never enforced.

**Test: the paired harness measures the complaint's metrics on both arms** (browser; the adoption gate, D5)
- Arrange: copy `harness/underground-measure.dom.test.ts.txt` back to `src/generators/`, add the
  plane-blind reverse-control variant (divide the plane-aware factor out, multiply `pack.cells.burg[next] ?
  1 : UNDERGROUND_BURG_ATTRACTION` back in), keep the `replica-production` fidelity anchor.
- Act: 8 seeds, production arm against the reverse-control arm on one build.
- Assert: recorded per seed — `tunnelsOnSurfaceOnlyBurgs` and `tunnelCellsWithMultipleRecords` down on every
  seed, overlap not worse, served burgs intact, length recorded; then remove the copied test from `src/`.

## Edge Cases & Negative Tests

- **Removed burg record** — `removed: true` prices as plain (boundary of the classification read; a removed
  burg must not keep pulling tunnels).
- **Dual-identity vs fully subterranean** — both keep the attraction: the predicate is below-level presence,
  not "is fully underground". The probe covers both classifications.
- **Surface-only burg cell remains passable** — the cost stays finite; the rung encourages, it does not
  forbid (mirrors the separation requirement's "never blocks a passable step").
- **Endpoint reachability** — a below-level burg that is only reachable through a surface-only burg's cell
  must still be reached: the gate is cost, so the path still routes through when no alternative exists. This
  is the case that would break under a hard prohibition, and it is asserted in the integration test.
- **Record revisiting a cell** — one route with the same cell twice counts once toward the multi-record
  figure (the audit walks distinct records per cell).
- **No burgs at all** — every contact field is 0.
- **Record-less burg id in the cost path** — must not throw (the current probe fixture already exercises
  exactly this id-without-record state).

## Test Data / Fixtures

- **7×3 grid fixture** (`src/generators/underground-highways.test.ts`): `COLUMNS`/`ROWS`/`STRAIT`
  (column 3 is water), `cellAt(row, column)`, `makePack`, `handRoute`, and the `withAttractionProbe`
  equalizer. This change extends the probe helper to accept the burg record placed at `burgCell`
  (classified, surface-only, or absent/removed) instead of always writing an id with no record.
- **12-cell two-landmass fixture** (`src/generators/plane-integrity.test.ts`): `mapFixture(specs)` and
  `recordAt(id, cells, underground)`. The contact tests add a surface-only burg and underground records that
  cross burg cells without ending there.
- **Seed set** — `["measure-a" … "measure-h"]`, shared by the real-map audit and the harness so archived
  numbers and this rung's numbers are comparable.
- **Harness** — `openspec/changes/diverge-underground-network/harness/underground-measure.dom.test.ts.txt`
  copied into `src/generators/` to run (`CHROMIUM_PATH=/usr/bin/chromium`), removed afterwards; its output is
  kept under the change's `measure/`.
