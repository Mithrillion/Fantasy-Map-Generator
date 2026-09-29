## Test Strategy

Three layers, chosen by what each can actually observe:

- **Node unit tests** (`npm run test`, root `src`, no DOM) for the rules that a constructed pack can
  express: the boundary rule, the junction rule, the service guarantee, the edit helpers, and the audit
  itself. These ride in `unit-tests.yml` with no workflow change.
- **Node integration tests** for the audit against editor-driven edits, since the audit is DOM-free and the
  editor's record operations are being extracted into pure helpers.
- **Browser test** (`*.dom.test.ts`, `vitest.browser.config.ts`) for the only thing that can prove the rules
  on real maps: the full `GenerationPipeline` needs a document. This is the same instrument the archived
  `diverge-underground-network` harness used, minus the replica and the variants.

Everything runs on fixed seeds; generation reseeds Alea from `options.map.seed` at the top of
`Routes.generate`, so a seed reproduces a map exactly. No test reaches into module state: the boundary rule
is exercised through `Routes.generate(...)` and read back from `pack.routes`, and the audit is exercised
through its exported entry point.

The audit is the only new production-facing surface, so it is tested twice: against hand-built packs (where
every violation is placed on purpose, including the ones real maps never produce) and against real
generation (where zero is the assertion).

## Unit Tests

### underground-highways

**Test: never begins or ends an underground highway on a surface burg's cell** (Requirement: *Underground
highways connect only subterranean-capable burgs* / Scenario: *No highway begins or ends on a surface burg's
cell*)
- Arrange: the existing 7×3 grid fixture; burg 3 (surface-only) on `cellAt(1, 1)`; lock a hand highway over
  the two cells leading into `cellAt(1, 1)` so the next stretch's boundary would land exactly there; other
  fixture burgs keep their below-level presence.
- Act: `generate(1)`.
- Assert: for every record with `underground === true`, neither `points[0][2]` nor `points.at(-1)?.[2]` is a
  cell whose burg fails `hasGroundLevelPresence`.

**Test: keeps a stretch whose junction sits on a surface burg's cell** (Scenario: *A junction on a surface
burg's cell keeps the stretch*)
- Arrange: as above, plus a below-level burg on the far side of the junction so the stretch carries one.
- Act: `generate(1)`.
- Assert: the stretch is still part of `pack.routes` (its cells appear in a record), the below-level burg has
  at least one underground link, and the surface burg's cell is not an endpoint of any underground record.

**Test: keeps a highway whose boundary is a junction, so an interior burg stays connected** (Requirement:
*Underground highways serve every burg they can reach* / Scenario: *A burg inside a chain keeps its
connection*)
- Arrange: a hand underground chain whose middle cell carries a below-level burg, and a second chain whose
  end meets the first on that same cell; force the second chain's boundary onto a cell the first continues
  through.
- Act: `generate(1)`; then `Routes.pruneUndergroundHighways()`.
- Assert: the middle burg still has an underground link, and prune returns without removing the record that
  carries it.

**Test: reconnects a burg the network left out** (Scenario: *A burg left unserved is reconnected*)
- Arrange: two below-level burgs on the left landmass, with the generated network producing no record that
  touches one of them (construct by locking records that cover every step the pair's path would take, then
  pruning).
- Act: `generate(1)`.
- Assert: the previously unserved burg now has an underground link; the audit reports no service violation;
  the repair did not cross the strait.

**Test: leaves a lone below-level burg unconnected, and does not hand it a surface route** (Scenario: *A lone
subterranean burg on its landmass*)
- Arrange: the right landmass (feature 2) holds exactly one below-level burg; the left holds surface burgs.
- Act: `generate(1)`.
- Assert: no underground record touches its cell; no surface record begins or ends there; the audit lists it
  as unconnectable and raises no violation.

**Test: never begins or ends a surface record at a fully subterranean burg** (Requirement: *Surface
connections keep their existing endpoint rule* / Scenario: *No surface record begins or ends at a fully
subterranean burg*)
- Arrange: flat, uniformly habitable heights so surface paths are free to cross the classified cell; a
  hand surface route covering the step into it, so a later trail's segment boundary would land on the cell.
- Act: `generate(1)`.
- Assert: for every record with `underground !== true`, neither end cell belongs to a burg that fails
  `hasGroundLevelPresence`.

**Test: keeps every cell of a surface path when the boundary moves** (Scenario: *A surface route crossing a
below-level burg's cell keeps its cells*)
- Arrange: as above, with `Routes`' recorded step set read after generation (the module keeps the surface
  steps it emitted).
- Act: compare the steps of the surviving surface records against the recorded step set.
- Assert: the classified burg's cell is still on a surface record, and no step that was emitted for a
  surface pass is missing from the records — the resolution duplicated a step, it did not drop one.

**Test: does not move the surface network** (Design D1, D6 — the non-goal guard)
- Arrange: a classified burg cell that is not a record boundary; read `Routes.getLandPathCost(from, to)`
  across it before and after the change's code path is exercised.
- Assert: the cost is unchanged (3× burg attraction, as today) — this change moves boundaries, not
  pathfinding, so the surface network's cells are the same as before it.

**Regression cover, unchanged:** *No surface-only endpoint*, *Dual-identity burgs are valid endpoints*,
*Fully subterranean burgs get no surface route*, *Dual-identity burgs remain surface endpoints* — already
pinned by `underground-highways.test.ts:279-306` and kept as-is.

### route-editor

The editor's split and join are DOM closures today; the change extracts the record-level parts so they can
be tested without a document, and the editor keeps calling them.

**Test: splitting an underground highway keeps both halves underground** (Requirement: *Editing a connection
preserves its plane* / Scenario: *Splitting an underground highway keeps both halves underground*)
- Arrange: a hand tunnel record with five points and `underground: true`; `splitRoute(route, 2)`.
- Act: read the two returned records.
- Assert: both carry `underground === true`; the halves meet at the split cell and their concatenation equals
  the original points; the ids differ.

**Test: splitting a surface route keeps both halves on the surface** (same requirement, the inverse case)
- Arrange: a surface record, `splitRoute(route, 2)`.
- Assert: neither half carries `underground`.

**Test: refuses a join across planes** (Scenario: *Joining across planes is refused*)
- Arrange: `canJoinRoutes(surfaceRoute, tunnelRecord)` and its reverse.
- Act: call the predicate.
- Assert: `false` for both orders; unchanged (true) for same-plane pairs, which the existing
  `mergeRoutePoints` tests at `route-editor.test.ts:7-36` keep covering.

**Test: no edit sequence leaves a below-level burg a surface endpoint** (Scenario: *A below-level burg never
becomes a surface endpoint through an edit*)
- Arrange: a generated fixture map with underground content; apply the editor's record operations in
  sequence — split the first tunnel, attempt to join each half with each surface route (all refused), split
  a surface route, join two same-plane records.
- Act: `auditPlanes(pack, pack.routes)`.
- Assert: zero boundary violations; every record's plane matches the plane of the record it came from.

### plane-integrity-audit

Unit tests use a small hand-built pack and route list (see fixtures), so each violation is placed
deliberately rather than generated.

**Test: a surface record ending at a below-level burg is a violation** (Requirement: *Plane integrity is
reported from a generated map* / Scenario: *A surface record ending at a below-level burg is a violation*)
- Arrange: a pack with an underground burg; a surface route whose last cell is that burg's cell.
- Act: `auditPlanes(pack, routes)`.
- Assert: the report's violations contain `{ rule: "boundary", plane: "surface", burg, cell, route }`, and
  the census counts that burg as reached by a surface record.

**Test: an underground highway ending on a surface burg's cell is a violation** (Scenario: *An underground
highway ending on a surface burg's cell is a violation*)
- Arrange: mirror of the above with the planes swapped.
- Assert: `{ rule: "boundary", plane: "underground", … }`.

**Test: a merged boundary is reported as a junction, not a violation** (Scenario: *A merged boundary is
reported as a junction, not a violation*)
- Arrange: two surface records where the first ends on a cell the second runs through.
- Assert: that boundary appears under junctions, `carriedBy` names the second route, and violations are
  empty.

**Test: a below-level burg without a connection is a service violation** (Scenario: *A below-level burg
without a connection is a violation*)
- Arrange: two below-level burgs on one landmass, one record touching only the first.
- Assert: `{ rule: "service", burg }` for the second.

**Test: a lone below-level burg is not a service violation** (Scenario: *A lone below-level burg is not a
violation*)
- Arrange: one below-level burg alone on its landmass.
- Assert: violations empty; the burg appears under unconnectable with its landmass.

**Test: contact is counted, not failed** (Requirement: *The audit reports contact without enforcing it* /
Scenario: *A road crossing above a subterranean burg is counted, not failed*)
- Arrange: a surface route with an underground burg's cell in the middle of its cells.
- Assert: the contact count includes that cell; violations are empty.

**Test: tolerates degenerate records** (edge case, from the 2026-09-29 audit)
- Arrange: records with one point, duplicated trailing cells, and no `points` at all.
- Assert: the audit completes, ignores them for boundary purposes, and never throws.

## Integration Tests

**Test: a clean generated map passes the real-map audit** (Requirement: *The audit is exercised against
generated maps* / Scenario: *A clean map passes*)
- Harness: `src/generators/plane-integrity.dom.test.ts` under `vitest.browser.config.ts`, bootstrapped like
  the archived harness: a `FlatQueue` stub exposing `peekValue()`, `import "./index"`, the `options` global
  from `@/components/options-model`, `globalThis.tip = () => {}`, `globalThis.grid`/`pack` reset per run.
- Arrange: seeds `measure-a` … `measure-h`, `options.generation.template = "continents"`,
  `options.generation.underground = true`, `await GenerationPipeline.run({})` per seed.
- Act: `auditPlanes(pack, pack.routes)`.
- Assert: zero violations on every seed; each seed logs one line with its census, boundary split
  (junctions/termini), contact counts and repair count, so a drifting number is visible in CI output.
- Recorded starting point for review (2026-09-29, pre-fix): 41 surface boundaries on below-level cells
  (34 junctions, 7 termini), 50 unserved below-level burgs of 682 (48 on pruned chains), 5 fully
  unconnected, contact 178/682 and 1059/6114.

**Test: a reintroduced defect fails the run** (Scenario: *A reintroduced defect fails the run*)
- This is a recorded mutation check, performed as a task step rather than kept as a test: disable the
  boundary resolution for underground records (or make prune ignore the junction test), run the real-map
  audit, capture the failure output naming seed, burg and route, then restore and re-run green.
- Assert (on the record, in the change's tasks): the run fails with a message naming the offending burg and
  route — a green audit that cannot fail is not evidence.

**Test: the CI step runs it** (Requirement: *The audit is exercised against generated maps*)
- Arrange: one added step in `.github/workflows/playwright.yml` running the browser config for the audit
  file, after the existing Chromium install.
- Assert (by inspection of the workflow and one run): the step executes the audit and fails the job on a
  violation. The step is additive; `unit-tests.yml` picks up the node tests unchanged.

## Edge Cases & Negative Tests

- **A locked record that already violates the boundary rule** (a map saved from before this change): the
  audit reports it rather than silently rewriting user data; the real-map CI run generates fresh maps with no
  locked routes, so it stays green.
- **A locked surface route**: it still seeds the separation field and still may not boundary on a below-level
  burg's cell — the rule is applied to locked and generated records alike when they are assembled.
- **A locked underground route**: `generate` keeps it and its cells; the prune must not delete it while a
  below-level burg depends on it.
- **A landmass with a lake inside it**: the repair pass uses the production tunnel cost, so the water gate
  still applies and a repair cannot tunnel through water; the strait in the fixture pins this.
- **A record whose whole covered stretch is mismatched burg cells** (the boundary cannot move): the record is
  kept and the audit reports it, rather than the record being dropped — a visible violation beats a silently
  shorter network.
- **A prune cascade**: dropping one record re-evaluates spurs that hung on it; after the cascade the audit
  must still show zero service violations (the existing fixpoint test stays green).
- **Empty or single-cell records**: the audit tolerates them (see the audit's own test); the generator's
  segment builders already drop stretches shorter than two cells.
- **Underground generation disabled**: nothing in this change runs, `pack.routes` is unchanged, and the
  existing byte-identical test at `underground-highways.test.ts:370-380` stays green.

## Test Data / Fixtures

- **Reused**: `makePack(heights)`, `COLUMNS`/`ROWS`/`STRAIT`/`CELL_COUNT`, `cellAt(row, column)`,
  `TestFlatQueue`, `handRoute(i, cells, underground?)`, `handHighway(i, cells)`, `generate(seed)`,
  `endpoints(route)` and the five-burg fixture (burg 3 surface-only, burgs 2/4/5 on the below-level planes)
  from `src/generators/underground-highways.test.ts`.
- **Reused**: the `points(...)` helper and `mergeRoutePoints` cases from
  `src/controllers/route-editor.test.ts:7-36`.
- **New**: a `mapFixture()` builder inside `src/generators/plane-integrity.test.ts` that assembles a pack and
  a route list directly (cells, neighbours, heights, features, burg records, route records). It is
  deliberately independent of the generator so the audit's tests place each violation on purpose.
- **New**: a `recordAt(id, cells, underground)` shorthand for building route records in the audit tests.
- **Real-map seeds**: `measure-a` … `measure-h` with the `continents` template — the archived harness's set,
  so its numbers and this run's numbers are comparable.
