## Context

Underground highways are generated after the surface network and are marked with an `underground` record
on the route itself ([routes-generator.ts:653](src/generators/routes-generator.ts#L653)); every consumer
traverses them plane-blind by design. Endpoint eligibility is enforced structurally by the two filtered
burg sets ([routes-generator.ts:238](src/generators/routes-generator.ts#L238),
[:612](src/generators/routes-generator.ts#L612)), which is why rule 1 (a surface-only burg is never a
tunnel endpoint) survives every measurement.

What generation does *around* those endpoints is not enforced. Segments are cut where a step is already
covered ([getRouteSegments](src/generators/routes-generator.ts#L445),
[getUndergroundSegments](src/generators/routes-generator.ts#L421)), and the cell a cut lands on is
whatever the path happened to be on. Because both cost functions make every burg cell three times cheaper
than an ordinary cell ([:315](src/generators/routes-generator.ts#L315),
[:363](src/generators/routes-generator.ts#L363)) and classification reuses existing burg sites, paths are
attracted to classified burg cells from both planes. The audit of 2026-09-29 measured the result over 8
seeds: 41 surface record boundaries on below-level burg cells, 7 of them records that simply stop there,
and 50 of 682 below-level burgs left with no tunnel — 48 of them because
[pruneUndergroundHighways](src/generators/routes-generator.ts#L677) deleted a whole record whose boundary
happened to sit on a surface-only burg's cell, discarding the valid burgs inside it.

Two constraints shape the fix. First, `cells.routes` cannot be trusted for plane: `buildLinks` is
last-writer-wins over `pack.routes` and tunnels are pushed last, so a shared step is attributed to the
tunnel. Second, the surface network is the reference every divergence measurement is baselined against
(the `diverge-underground-network` ladder), so this change must not move which cells surface routes
occupy.

## Goals / Non-Goals

**Goals:**
- A record boundary never falls on a burg cell of the other plane, in either direction, without dropping
  a cell of the connection.
- No below-level burg that shares its landmass with another such burg ends the generation unconnected.
- No edit can silently re-plane a connection or leave one broken.
- One reusable, DOM-free audit that reports the rules' state on any generated map, exercised by node tests
  and by a real-map run in CI, and shown able to fail.

**Non-Goals:**
- Pass-over contact: a road crossing above a subterranean burg's cell stays legal and stays counted.
- Rung 2 of the divergence ladder (weakening the tunnel's burg attraction) — it changes overlap and must be
  measured on its own.
- Traversal, the save format, styling, and the display layers.
- Making `cells.routes` plane-aware (see D4).

## Decisions

### D1 — Both planes get a boundary rule, and the boundary moves across the junction

A stretch boundary may fall on a cell with no burg, or on a burg cell whose presence matches the plane. If
it lands on a burg cell of the other plane, the boundary moves one cell further into the already-covered
stretch, repeating while the new boundary cell is again a mismatched burg cell. The record then begins or
ends on a legitimate cell.

The step the record takes over is already drawn by the record that covered it, so nothing is lost — the
step is duplicated, by at most one cell per resolution. This is why the boundary moves *outward* rather
than being trimmed inward: trimming would remove a genuinely new step from both the drawn geometry and
`cells.routes`, shrinking the network to satisfy a bookkeeping rule.

*Alternatives rejected.* Hard-excluding below-level burg cells from surface pathfinding would guarantee
zero contact but changes the surface network everywhere and can strand a burg pair when the cell is the
only corridor. Removing the burg attraction for classified burgs in the surface cost addresses the cause
of the contact but moves the very network every overlap measurement is baselined against. Both belong to a
later rung, if at all.

### D2 — Prune judges junctions, and a final pass guarantees service

Prune keeps its coverage map but stops treating "the boundary cell carries a burg of the other plane" as
proof of staleness on its own: a record is dropped only when no surviving underground highway continues
through its boundary cell and no below-level burg depends on it. After D1 that branch is rare; the coverage
test is what remains, and it is a junction test already.

Because neither D1 nor prune *guarantees* the service requirement, one repair pass closes it: for every
below-level burg that ends the generation without an underground connection while a partner exists on its
landmass, path to the nearest connected below-level burg with the production tunnel cost and append the
stretch. On a healthy map the pass does nothing — measured: 50 unserved burgs before the fix, and the
audit reports each repair afterwards, so a silent drift is visible.

*Alternative rejected.* A fixpoint prune over "burgs served" has no clean termination argument and cannot
repair a burg that was never on a chain in the first place.

### D3 — The editor preserves the plane; a cross-plane join is refused

`splitRoute()` must copy `underground` onto the new half ([route-editor.ts:255](src/controllers/route-editor.ts#L255)),
and `joinRoutes()` must refuse when the two records' planes differ ([route-editor.ts:339](src/controllers/route-editor.ts#L339)),
using the tip mechanism the editor already uses for rejected operations. Silently letting the opened
record's plane win is the current behaviour and the defect: a tunnel's geometry becomes a surface route,
and prune — which only inspects `route.underground` records — can never repair it.

*Alternative rejected.* A plane selector in the editor is a new UI feature, not a fix for an edit that
should not have been possible.

### D4 — The audit is pure, and joins through route geometry

`src/generators/plane-integrity.ts` exports one function plus its report type, taking the pack and the
route list and deriving census, boundaries (junction vs terminus), per-burg plane connections, contact
counts and violations. It reads `pack.routes` geometry rather than `cells.routes` ids, because of the
last-writer-wins property above. It must not touch the DOM, so the default node run exercises it.

The consequence is recorded rather than hidden: contact is exact for tunnels crossing surface burg cells
and a **lower bound** for surface routes crossing below-level burg cells, since a tunnel's id shadows the
surface link on a shared step. The report states which is which.

*Alternative rejected.* Making `cells.routes` carry a plane per step is a data-model change with traversal
consumers of its own; the audit is the only known caller that needs it.

### D5 — The real-map audit runs in the workflow that already has a browser

`*.dom.test.ts` is excluded from `npm run test`, and no workflow runs the browser config today. The
real-map audit is added as a step in `.github/workflows/playwright.yml`, which already installs Chromium
and its system dependencies; the seed set is fixed and small (8 seeds measured at ~5 s of test time plus
browser startup, against a 30-minute job budget).

*Alternative rejected.* Leaving it a manual harness keeps CI cheap but leaves the guarantee unenforced,
which is the state this change exists to end.

### D6 — Contact stays a non-goal, and is reported

The rules connect burgs through endpoints; a road crossing a subterranean burg's cell is not a connection.
Eliminating the contact means moving surface pathfinding (D1's rejected alternatives) and would bundle
rung 2's effect on route overlap into a correctness change, making the two unattributable. The audit counts
the contact so it cannot drift unnoticed, and the spec states explicitly that it is counted, not failed.

## Risks / Trade-offs

- **A duplicated step changes link identity.** The step a boundary resolution takes over now appears in two
  records; `buildLinks` attributes it to the later one. → The audit reports junctions rather than failing on
  them, and the fixture tests pin route counts, lengths and merge behaviour before and after.
- **The repair pass adds connections outside the Urquhart topology.** → It only runs where the network was
  disconnected; it prefers the nearest connected below-level burg on the same landmass; and every repair is
  reported, so a map that needs many repairs is visible rather than absorbed.
- **`getRouteSegments` is shared by roads, trails and sea routes.** → The rule is expressed on the boundary
  cell's burg presence, which cannot apply to water segments (below-level burgs sit on land), and the
  existing water-cost tests stay green.
- **The real-map audit could be slow or flaky in CI.** → Fixed seeds, deterministic generation, a measured
  budget, and an explicit failure message naming seed, burg and route.
- **A green audit that cannot fail.** → The mutation check is a task: break a rule deliberately, watch the
  real-map run fail, restore, and record the observed failure text.

## Migration Plan

No data or save-format change; classification, `underground` records and `cells.routes` keep their shape.
Generated geometry changes only where a record used to boundary on a mismatched burg cell or a burg used to
end up unserved. Maps regenerate deterministically from their seed. Rollback is reverting the generator and
editor commits; nothing persisted depends on the new behaviour.

## Open Questions

- **D5 and D6 are recommendations, not user answers.** The user asked for a change that fixes issues and
  creates ongoing validations and then invoked the propose workflow without answering the two questions
  from the exploration: where the real-map audit runs (recommended: `playwright.yml`) and whether pass-over
  contact is in scope (recommended: no, reported only). Both are recorded above as decisions so review can
  overturn them cheaply; the specs are written so that either answer is a design change, not a spec change.
