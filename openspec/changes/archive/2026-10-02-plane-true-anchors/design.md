## Context

`Routes.getCellAnchor` maps every burg-bearing cell to that burg's position, whichever plane the
route belongs to. The same plane-blindness exists at three neighbouring sites: the sharp-angle
smoothing gate in `getPoints` (`if (cells.burg[cellId]) continue`), the land-path burg discount in
`getLandPathCost` (`cells.burg[next] ? 1 : 3`), and route naming (`generateName` → `getBurgName`
scans all route points' cells). The tunnel cost already prices plane-true (`hasBelowLevelPresence`),
so the pattern exists in the code — surface geometry is the laggard.

One burg record per cell holds all three identities (`underground` fully subterranean,
`subterranean` dual-identity, unflagged surface), and the plane's presence predicate is already the
single source for endpoint eligibility everywhere: `hasGroundLevelPresence = !burg.underground`,
`hasBelowLevelPresence = burg.underground || burg.subterranean`.

Renderer (`draw-routes.ts`), save format, editors and label placement are pure consumers of stored
points and stay untouched.

## Goals / Non-Goals

**Goals:**

- One plane predicate threads through all four blind sites: anchoring, smoothing, surface cost
  discount, naming
- Each plane's generated geometry and names behave as if the other plane's only-burgs did not exist,
  enforced on the mechanism (the predicate), not on an outcome comparison
- Endpoint anchoring, pair selection, traversal, save format unchanged

**Non-Goals:**

- Re-anchoring saved route points or locked segments on load — generation-time only
- Giving fully subterranean burgs their own underground position (separate future change)
- Renderer-side divergence, style changes, or offsetting
- Changing the underground cost model (already plane-true)

## Decisions

1. **Thread the plane's presence predicate as a parameter, not global state.**
   `getCellAnchor`/`preparePointsArray`/`getPoints`/`getLandPathCost` take the predicate (or a
   plane-derived one) from the pass that uses them. Rationale: the shared per-pass points array and
   the smoothing gate must use the *same* predicate as the cost/anchors of that pass; a parameter
   makes that a construction guarantee where a global would only make it a convention. Alternative
   considered — a module-level "current plane" flag — rejected: two passes could interleave and the
   flag would silently mis-anchor one of them.

2. **Flip the smoothing gate and the anchor together.**
   Today plane-foreign burg cells are centre-surface-unknown and never smoothed; after the change
   they must be both centre-anchored *and* smoothable, keyed on the same predicate. Doing only the
   anchor would freeze sharp kinks at cell centres — a worse artifact than the current one.

3. **Surface pathfinding changes only in the burg term.** The requirement text goes from
   "pathfinding SHALL otherwise be unchanged" to "every other term unchanged; a burg without
   ground-level presence prices as no burg". The tunnel side already obeys the mirrored rule, so no
   new machinery exists to write — only readability of the existing predicate.

4. **Counterfactual equivalence is a design stance, not a validation rule.** Design.md records it as
   the intent; verification checks the mechanism per site (predicates) plus the already-guaranteed
   on/off surface invariance test. A seed-batch outcome comparison is an optionally-run informative
   spike, never a gate. Rationale: strict outcome equivalence would fail on legitimate plane
   interplay (dual-identity burgs serve both planes by definition).

5. **Do not touch `getWaterPoints` behaviour**: it anchors at ports, which always carry ground-level
   presence, so the ground-presence predicate reproduces today's results exactly.

## Risks / Trade-offs

- [Organic-map surface paths shift where a buried burg's cell was cheap] → boundary is small and
  documented in the proposal; the on/off invariance test guards the record-shape side; optionally
  quantify the flip count on a seed batch as an informative spike
- [Cost changes shift route cell chains → name RNG stream shifts → later-pass names reshuffle] →
  deterministic per seed, cosmetic; called out in the proposal so it is not mistaken for drift
- [Mixed-era maps: locked segments keep old burg-pinned geometry while regenerated ones centre] →
  pre-existing property of all generation changes; documented
- [Test churn on fixtures asserting exact coordinates] → most tests reason in cell ids; update only
  the coordinate assertions found during implementation
- [normalizeClassification folds both-flag records to fully subterranean, flipping rare hand-edited
  saves' anchors] → rare, migration-time only, cosmetic

## Migration Plan

No migration. Applies at generation time; existing saves render unchanged until a segment
regenerates. Rollback is a plain revert.

## Open Questions

None blocking. The optional informative spike (how often interior anchors flip on real seeds)
affects only the verification section's emphasis, not the approach.
