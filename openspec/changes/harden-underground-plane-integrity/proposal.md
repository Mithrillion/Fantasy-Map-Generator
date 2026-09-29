## Why

The plane rules hold where the generator *chooses* endpoints, but the behaviour around them leaks. An
audit of the real pipeline over 8 seeds (2026-09-29, `measure-a` … `measure-h`, browser mode, each map
also run with the surface-separation term disabled as a control) found:

- **Pruning disconnects the burgs it was meant to protect.** 50 of 682 subterranean-capable burgs
  (7.3%) end the generation with no underground connection at all, 5 of them with no route of any kind;
  48 of the 50 sat on a record that `pruneUndergroundHighways` deleted wholesale because one of its two
  *ends* landed on a surface-only burg's cell or an under-covered junction. The valid burgs carried in
  the middle of that record were never consulted. Without the separation term the same count is 71.
- **A surface record can terminate at a fully subterranean burg.** 41 surface record boundaries land on
  a below-level burg's cell; 34 are junctions where another surface route carries on, but 7 are records
  whose geometry simply stops there — a trail drawn up to a subterranean city's coordinates. Surface
  pathfinding is attracted to *every* burg cell (`pack.cells.burg[next] ? 1 : 3`), classified ones
  included, so 178 of 682 below-level cells (26%, a lower bound) carry a surface route across them.
- **The editor can re-plane a connection permanently.** `splitRoute()` builds its new record without the
  `underground` record and `joinRoutes()` folds a tunnel into whichever record was opened; since
  `pruneUndergroundHighways` only ever inspects `route.underground`, a record mis-flagged this way is
  never repaired. Tunnels are editable from the routes overview, which lists every route with no plane
  filter.

None of this is caught anywhere, because the rules are pinned by a five-burg synthetic fixture and the
instrument that found it is a one-off harness archived with a finished program. The generation rules
themselves are sound — this change makes the network obey them, and makes that checkable from now on
rather than once.

## What Changes

- **Pruning gains a junction test.** A record boundary is a terminus only when nothing of the
  underground plane continues from that cell; when something does, the boundary is a junction and the
  record survives. No burg with below-level presence loses its connection to a prune.
- **Surface records stop terminating on below-level burg cells.** Segment boundaries land only on
  legitimate ones — a burg cell the surface network may serve, or a plain junction — so a trail can no
  longer start or end at a fully subterranean burg's cell. Targeting is already correct; this closes the
  geometry that produced the 7 dead-end boundaries.
- **Editing preserves the plane.** Splitting an underground highway yields two underground highways;
  joining two records of different planes is refused rather than silently re-flagging one of them, so no
  edit can leave a below-level burg as the endpoint of a surface route.
- **A reusable plane-integrity audit.** One entry point reports, for a generated map, the per-burg plane
  census, every record boundary classified as junction or terminus, and every violation of the endpoint,
  boundary and service rules. Node tests over fixtures ride in `npm run test`; a real-map audit runs the
  full generation pipeline for a fixed seed set and asserts zero violations, wired into the workflow that
  already installs a browser; and a mutation check proves the audit can fail.
- **Explicit non-goals.** Pass-over contact stays: a road crossing *above* a subterranean burg's cell is
  not a connection under the rules as written, and keeping surface pathfinding out of those cells
  entirely would change surface road geometry on every regenerated map. Weakening the tunnel's burg
  attraction (rung 2 of the `diverge-underground-network` ladder) is deliberately not bundled here, so
  its effect on route overlap is measured on its own.

## Capabilities

### New Capabilities

- `plane-integrity-audit`: the audit entry point, the report it produces (census, boundary
  classification, violations), the invariants it enforces, and the requirement that it is exercised
  against a real generated map and demonstrably able to fail.

### Modified Capabilities

- `underground-highways`: *Underground highways connect only subterranean-capable burgs* gains the
  service guarantee (a burg that can be connected is not left unconnected by pruning or merging);
  *Surface connections keep their existing endpoint rule* gains the boundary rule (a surface record does
  not begin or end at a below-level burg's cell); a new requirement states that editing a connection
  preserves its plane. The water, terrain, traversal, self-containment and separation requirements are
  unchanged.

## Impact

- **Generation**: `src/generators/routes-generator.ts` — `pruneUndergroundHighways` compares a boundary
  against the surviving network instead of reading only the burg at the cell; `getRouteSegments` (and the
  merge that consumes it) stops breaking on a cell whose burg has no ground-level presence.
- **Editor**: `src/controllers/route-editor.ts` — `splitRoute` carries the `underground` record onto the
  new half; `joinRoutes` refuses a cross-plane join.
- **New module and tests**: `src/generators/plane-integrity.ts` (pure, no DOM),
  `src/generators/plane-integrity.test.ts` (fixtures, node), `src/generators/plane-integrity.dom.test.ts`
  (real pipeline, browser).
- **CI**: the browser audit needs a step in `.github/workflows/playwright.yml`, which already installs
  Chromium; `unit-tests.yml` picks up the node tests with no change, since `npm run test` excludes only
  `*.dom.test.ts`.
- **Generated geometry changes** wherever a prune used to disconnect a burg or a segment used to break on
  a classified burg cell — the point of the change. Maps regenerate deterministically from their seed;
  no saved map becomes invalid.
- **Cost**: the prune becomes a second pass over the surviving records it already builds a coverage map
  for; the audit is O(cells + records) per map and runs only in tests.
- **No new dependencies.**
