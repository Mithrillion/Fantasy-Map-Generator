## Why

Underground highways are drawn on top of the surface roads they were meant to be an alternative to. One cause is a shared routing discount: the surface pass fills the "already connected" map, and underground generation — which runs immediately after — reads the same map, so a tunnel is **cheaper** wherever a surface road already runs. The underground network is therefore rewarded for following roads rather than for being a separate plane. This is the first and cheapest of the causes identified while exploring the feature; it is worth removing before any endpoint or geometry work, because it currently biases the baseline that everything else would be measured against.

## What Changes

- **BREAKING (generated geometry only)**: an underground highway no longer receives the routing discount for running along a surface route. The discount becomes self-contained: a tunnel is cheap next to another tunnel, and indifferent to surface roads.
- The underground network keeps its own connection set, so its segments still merge with each other and the network remains a network rather than a set of independent spurs.
- No change to which burgs are eligible endpoints, to the water and landmass constraints, to the terrain preference, or to how anything traverses the result. Surface route generation is untouched: it already runs before underground generation and never reads the underground network.
- No change to display, styling, layers or content-focus.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `underground-highways`: a new requirement, **Underground connectivity is self-contained** — the routing discount an underground highway receives applies only to the underground network, and surface routes contribute nothing to it. The existing requirements are unchanged; the current requirement that connectivity governs generation only, never traversal, continues to hold and is what makes this a generation-time change with no traversal consequence.

## Impact

- **Generation**: `src/generators/routes-generator.ts` — the underground pass currently shares the surface pass's connection map for its routing discount, and needs one of its own.
- **Tests**: `src/generators/underground-highways.test.ts` pins the current behaviour in a test named *"reuses the already-connected discount"*, which seeds a **surface** route and asserts the underground cost drops. Under this change that assertion inverts, so the test is re-aimed at the new requirement rather than deleted.
- **Data model**: none. No new `Burg` or `Route` fields, no save-format change, no migration.
- **Known limitation, deliberately not addressed here**: removing the road bias does not by itself make the networks distinct. The distance-squared term still dominates both costs, so tunnels between neighbouring burgs will continue to coincide with roads. Endpoint selection and tunnel geometry are the levers for that, and are left to follow-up work driven by measurement rather than by this change.
- **No new dependencies.**
