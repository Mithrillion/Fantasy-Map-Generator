## Test Strategy

This rung changes one cost weight, so the layers answer different questions:

- **The pinned suite** (`npm run test`, node) answers "did anything else move?". The rung must not change a
  single existing assertion, because every other guarantee — endpoints, water, high ground, the underground
  discount, corridor separation, the service repair, the plane rules, traversal, and **the surface
  network's own cost** — is already pinned there. A failure in that suite is a regression, not a test to
  update.
- **The 8-seed paired protocol** (browser, the metaplan's harness) answers "did the rung do its job?". Two
  arms measured on one build, same seeds, same template: production (attraction 2) against a
  reverse-control that forces the old attraction 3 back onto the same build. Recording both arms in one
  run makes the delta attributable to the rung alone (design D4).
- **The real-map plane audit** (browser, `plane-integrity.dom.test.ts`) answers "is the longer-network
  worry real?". The rung moves geometry, so the audit's zero-violation assertion and its per-seed
  `connected` / `unconnectable` lines are the acceptance gate the hardening change left behind (metaplan
  F5.1).

The rung declares `skip_specs`: no requirement text mentions the burg attraction, so there are no spec
scenarios to map 1:1. The substitute is a direct unit test of the cost contract plus the measurement.

## Unit Tests

### underground-highways — the cost contract

**Test: prices a tunnel step off a burg cell at the weakened attraction** (new; Requirement: *Underground
highways prefer high ground* is untouched — this pins the weight itself)
- Arrange: the existing 7×3 fixture; clear `pack.cells.burg` and `pack.burgs` so no burg can move the
  ratio, then place one burg on a plain cell (or compare two equal-length steps, one onto a burg cell and
  one onto a burgless cell of the same height and habitability).
- Act: `Routes.getUndergroundPathCost(from, burgCell)` against `Routes.getUndergroundPathCost(from, plainCell)`.
- Assert: the ratio is exactly the documented attraction (`1 : 2`), not `1 : 3` — and the test reads the
  constant's value through the cost, so a future re-tune has to update this test deliberately.
- Why it is needed: the 8-seed measurement can only show an aggregate; without this, a wrong factor that
  still happens to reduce overlap would pass, and the rung's stated value would be unverified.

**Test: does not move the surface network** (existing, `underground-highways.test.ts`; strengthened)
- Arrange: the classified-burg cell and a plain neighbour, `generate()` run so both networks exist.
- Act: read `Routes.getLandPathCost` across the burg cell and across the plain cell.
- Assert: the *land* cost still prices a burg cell at exactly a third of a plain one — the surface
  network's own attraction is unchanged by this rung. Today the test only asserts the 3× ratio while the
  underground factor also sat at 3; the strengthened form asserts the absolute value so the two terms can
  no longer be confused.
- Why it is needed: the surface network is the reference every overlap number is divided by. If the rung
  leaked into `getLandPathCost`, the measurement would compare two moving targets.

**Regression cover, unchanged:** every existing test in `underground-highways.test.ts` (37),
`plane-integrity.test.ts` (8) and `route-editor.test.ts` (11) runs as-is. In particular the water and
glacier gates, the high-ground preference, the network-only discount, the merge behaviour, the service
repair, the boundary rule and the plane rules must all stay green *without edits* — that is the rung's
strongest single signal, because those tests were written to pin behaviour the rung must not disturb.

## Integration Tests

**Test: the paired 8-seed protocol shows the rung's effect** (Requirement: none — the rung's acceptance
gate; design D1, D4)
- Harness: `openspec/changes/diverge-underground-network/harness/underground-measure.dom.test.ts.txt`,
  copied back to `src/generators/underground-measure.dom.test.ts` and removed afterwards (metaplan H6).
- Arrange: seeds `measure-a` … `measure-h`, `continents` template, `options.generation.underground = true`;
  variants `baseline-production` (attraction 2), `replica-production` (fidelity anchor) and
  `force-production-back-to-3` (the reverse control that restores attraction 3 on the same build).
- Act: one run, all three variants, per-seed and aggregate rows.
- Assert, on the current build:
  - `replica-production` equals `baseline-production` exactly — otherwise the run is void.
  - overlap falls on **every** seed against the reverse control (D13's bar is any measured improvement).
  - the secondary readings move the right way: exact-edge share down, median corridor distance up.
  - length growth is **recorded**, per seed, not gated (D13 makes D4's bound advisory).
  - `burgsServed` is read per seed, because a network that grazes fewer settlements may end at fewer.
- Adoption: the rung ships if the overlap reduction is real on every seed. A flat or reversed result means
  the rung is not adopted and the metaplan records it.

**Test: the real-map plane audit stays green on the new geometry** (Requirement: *Plane integrity is
reported from a generated map* / Scenario: *A clean map passes*; metaplan F5.1)
- Harness: `src/generators/plane-integrity.dom.test.ts`, `vitest.browser.config.ts`, 8 seeds.
- Act: `auditPlanes(pack, pack.routes)` per seed.
- Assert: zero violations on every seed, and the per-seed `PLANES …` lines are recorded next to the change
  so a drift in `connected` / `unconnectable` / `contact` is visible rather than inferred.
- Why it matters here: the rung makes tunnels avoid settlements, which is exactly the mechanism that could
  strand a below-level burg and lean on the service repair. `repairs` rising above 0 is the tell.

## Edge Cases & Negative Tests

- **The whole suite, unchanged** (the main negative test): any red test is a regression to fix, not a
  baseline to re-record. The rung is a value change, so it must be invisible to every existing assertion.
- **A water or glacier destination stays impassable** — pinned by the existing gate tests; the new factor
  multiplies a cost and must never turn `Infinity` into a number. Re-run, not re-written.
- **The high-ground preference survives the weaker attraction** — pinned by the existing high-ground test.
  The rung changes how dear a *burg* cell is, not how dear *high ground* is; if the weaker attraction ever
  let lowland win, the terrain requirement would break.
- **Every cell is a burg cell** — the factor is inert (all multipliers are 1), so the network is the
  distance/terrain/discount network. Nothing to assert beyond "no crash", but it is the reason the rung
  cannot change a map with 100% burg coverage.
- **No cell is a burg cell** — the factor is uniform, so relative costs are unchanged and the network
  should be very close to the reverse control; a large change here would mean the factor is leaking into a
  term other than the destination cell's burg test.
- **The rung interacts with the service repair** — a burg that the weaker attraction routes *past* is still
  served (it is an endpoint or the repair adds it). Covered by the audit's `unconnectable=0` and the
  existing service tests; the tell is `repairs > 0` in the audit line.

## Test Data / Fixtures

- **Reused**: the 7×3 `makePack` fixture, `cellAt`, `handRoute`/`handHighway`, `generate(seed)` and the
  cost-probe pattern from `src/generators/underground-highways.test.ts`; the `mapFixture()` builder from
  `src/generators/plane-integrity.test.ts`.
- **Reused**: the harness itself, with two variants added/swapped — `force-production-back-to-3` replaces
  the ladder's linear `burg-factor-2` variant, since with production at 2 the control has to move in the
  other direction to stay useful.
- **New**: nothing beyond the two unit tests and the harness variant.
- **Real-map seeds**: `measure-a` … `measure-h` with the `continents` template, unchanged, so every rung
  stays comparable with rung 1 and with the archived baseline.
