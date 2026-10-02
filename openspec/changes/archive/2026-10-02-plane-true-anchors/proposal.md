# Plane-true anchors

## Why

Route geometry takes its point through a burg cell at the burg's exact position with no regard for
which plane the route and the burg belong to (plane-blind `Routes.getCellAnchor`), so an underground
highway is drawn through the icon of a surface burg it has no connection to, and a surface road is
drawn drawn through the site of a fully subterranean burg. The same blindness leaks into the
sharp-angle smoothing gate, the land-path burg discount, and route naming.

## What Changes

- Route points in burg cells are anchored plane-governed: at the burg's position iff the burg has
  presence in the route's plane (ground-level for surface records, below-level for tunnels),
  otherwise at the cell centre
- The sharp-angle smoothing gate follows the same predicate: cells whose burg is anchored may keep
  their point, every plane-foreign burg cell becomes a smoothable plain cell
- The surface land-path burg discount applies only to burgs with ground-level presence; pathfinding
  is otherwise unchanged (the tunnel cost already obeys this rule)
- Route names derive only from burgs the route's plane can see
- Everything remains generation-time only: saved route points and locked segments are untouched

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `underground-highways`: amend the surface-endpoint requirement's "pathfinding otherwise unchanged"
  clause to a plane-governed burg discount; add requirements for plane-governed anchoring, smoothing
  and naming
- `underground-display`: add a both-state scenario that tunnel geometry does not pin to the icon of
  a surface burg it has no connection to

## Impact

- `src/generators/routes-generator.ts`: `getCellAnchor`, `preparePointsArray`, `getPoints` (smoothing
  gate), `getLandPathCost`, `generateName` — one plane predicate threaded through all five sites
- Renderers unchanged (`draw-routes.ts` stays a pure pass-through); styles, save format, editors and
  labels untouched
- Tests: tunnel-and-surface anchor, smoothing, cost-discount and naming fixtures updated; keep the
  existing on/off surface-invariance test passing
