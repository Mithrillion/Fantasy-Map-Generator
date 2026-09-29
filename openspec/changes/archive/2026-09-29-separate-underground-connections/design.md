## Context

See `proposal.md` — Why. The constraints that shape the approach, verified in the source:

- **The connection map is filled in generation order, and read at the end.** `RoutesModule.generate` resets `this.connections` to an empty map, seeds it from the locked routes, then builds the surface routes, and only then runs the underground pass. Both cost functions consult it. So `getUndergroundPathCost` observes every surface road generated moments earlier, which is the bias being removed.
- **The underground pass already computes the edge set the requirement needs.** `generateUndergroundHighways` builds a local set of the cell pairs belonging to existing underground highways and feeds it to `getUndergroundSegments`, so the network's own edges are already tracked — just not consulted by the cost function. `this.connections` therefore plays two roles for the underground pass: a routing discount, and network de-duplication. Only the first is wrong.
- **The previous design chose this reuse deliberately.** Decision D6 of the archived change states the discount is reused so that the network merges into trunks rather than staying a triangulation. The requirement being added keeps that intent and narrows its source; it does not reverse D6.
- **A locked route can be an underground highway.** `regenerate()` copies `pack.routes` entries carrying `lock` into `lockedRoutes` by spread, so the `underground` flag survives, and the existing comment on the prune call — "a locked highway may have lost the burg it ended at" — already treats locked highways as a real case. There is no editor affordance to create one, but one can be pinned and saved.
- **Surface generation cannot be affected by construction.** The underground pass runs strictly after `createRoutesData`, and nothing before it reads the underground network. The requirement's surface-facing side holds by ordering, not by audit.

## Goals / Non-Goals

**Goals:**

- Source the underground routing discount from the underground network alone, while keeping the merge-into-trunks behaviour that D6 was protecting.
- Keep the change confined to generation-time cost, so no data model, save format, or traversal code is touched.
- Leave a measurable baseline, so that follow-up endpoint and geometry work is judged against a network that is no longer rewarded for following roads.

**Non-Goals:**

- Making the two networks visually distinct. This change removes one of three identified causes. The distance-squared term still dominates both cost functions, so tunnels between neighbouring burgs will still largely coincide with roads.
- Changing endpoint selection (which burg pairs a tunnel may join).
- Changing tunnel geometry beyond the removal of the road bias.
- Introducing an editor for hand-drawing underground highways.

## Decisions

### D1. The underground pass keeps its own connection set, seeded from locked underground highways

The underground pass gets a dedicated set of connected cell pairs. It is seeded with the cells of locked routes that carry the underground record, and extended with each segment the pass generates. `getUndergroundPathCost` consults this set instead of the shared map, and the underground pass no longer writes into the shared map at all.

This is what makes the requirement's two halves both hold: a tunnel is cheaper alongside another tunnel (the set grows as the pass runs, and locked highways seed it), and indifferent to surface roads (the set never receives a surface edge).

*Alternatives rejected:*

- **The set starts empty, ignoring locked highways.** Simpler by a few lines, but it silently drops the seed-with-locked-routes behaviour that every other route family has, and a pinned tunnel would lose its attractive force. Rejected as an unexplained inconsistency rather than a simplification.
- **Keep the existing `undergroundEdges` set and merely stop writing to `this.connections`.** Superficially the smallest diff, but that set exists for de-duplication and is fully rebuilt inside the pass, so it cannot be seeded and would change meaning. Reusing a set with two jobs under a new third job invites the next reader to break de-duplication while editing cost.
- **Do not reset the shared map, and subtract surface edges instead.** Requires knowing which edges are surface, which means a second full edge set anyway — more state, same outcome.

### D2. The shared map keeps its existing meaning for surface routes

`this.connections` continues to be reset, seeded from locked routes, and filled by the surface passes, and `getLandPathCost` and `getWaterPathCost` are untouched. The only change to the shared map is that the underground pass stops writing to it. This is safe because the pass runs last: nothing after it consults the map, and `pack.cells.routes` — which journeys, connectivity and the preview values read — is rebuilt from `pack.routes` independently.

### D3. The pinned test is re-aimed, not deleted

`underground-highways.test.ts` asserts the current behaviour in a test named *"reuses the already-connected discount"*, seeding a **surface** route and expecting the underground cost to fall. That is precisely the behaviour the requirement removes, so the test's premise is now the bug. It becomes two assertions matching the requirement's scenarios: a tunnel step is cheaper alongside an existing underground highway, and identically priced whether or not a surface route covers the same pair.

The change's own scenarios are the acceptance criteria; the surviving tests already cover the water and landmass gates, the traversal wiring, and that surface routes are byte-identical with underground generation off.

## Risks / Trade-offs

- **[Overlap may barely improve, and the change will look like it failed]** → The measurements taken while exploring put the surface network at a mean degree of 2.2 with all burg pairs already reachable, and one long tunnel worth roughly 7.7% of mean pair distance. The road bias is one of three causes; this change is deliberately the smallest one, and the follow-up levers are endpoint selection and tunnel geometry. Stated as a known limitation in the proposal so this is not read as the whole fix.
- **[Tunnels may become less likely to merge into trunks, producing more separate spurs]** → This is the exact trade D6 was protecting against, so it is the outcome to watch. Mitigation: tunnels still see each other, and the underground pass runs in a stable order, so a corridor used by an earlier tunnel attracts a later one. If spur count rises sharply, the honest fix is an endpoint selection change, not restoring the road bias.
- **[Generated underground geometry changes on every existing map that has underground generation enabled]** → Accepted and intended; this is a generation-time behaviour change, not a data migration. No saved data becomes invalid, and maps regenerate deterministically from their seed. Rollback is reverting the cost line, with no state to unwind.
- **[Locked underground highways pinned by a user could attract new tunnels differently than before]** → Intended, and the reason to seed from locked highways at all. Because the pass currently sees locked surface routes too, a map with many locked routes will show the largest change; that is the bias being removed rather than a side effect.

## Migration Plan

No data migration. The change alters generation-time cost only, so it applies on the next generation, route regeneration, or map regeneration. Existing maps keep loading and rendering unchanged; their underground networks differ only once regenerated.

## Open Questions

- Whether the underground network should additionally gain a distance-based bias now, or wait for the endpoint-selection work. Deferrable: it changes neither the requirement nor the tasks here, and the measurements that would decide it come from this change being in place first.
