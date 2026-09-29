## Context

See `proposal.md` — Why. The facts that shape the approach, all measured on 2026-09-29 (harness and
full tables: `openspec/changes/diverge-underground-network/`, findings F1.1-F3.2s):

- **The cause is located.** Over 8 seeds the baseline is 70.8% cell overlap and 32.6% exact-edge
  sharing. A distance-only control over the same burg pairs lands at 58.7%, so ~12 points is the
  cost model's own contribution; of that, the burg attraction (`pack.cells.burg[next] ? 1 : 3`) is
  worth ~13 points and every terrain term together only ~1.6. The isolated surface-separation term
  measured −14.8 points of overlap, −11.8 points of exact-edge sharing, and corridor distance
  0.37 → 0.57 cells, for ×1.084 mean length (worst seed ×1.138).
- **The pass already receives the surface network.** `generateUndergroundHighways(routes)` is called
  from `generate()` after `pack.routes = this.createRoutesData(lockedRoutes)`, so every surface route
  is present in `routes` and every surface cell is readable without touching `this.connections`. The
  underground discount lives in its own set (`this.undergroundConnections`), which is what the last
  change established and what this one must not disturb.
- **The cost function is called directly by unit tests** (`underground-highways.test.ts:160-255`), so
  the separation field cannot be a required argument; it has to be module state with a harmless
  default, or those tests break on setup rather than on behaviour (finding F1.8).
- **A uniform penalty is path-neutral.** If the field is uniform (no surface network at all, as in the
  unit tests' synthetic packs), every candidate step is multiplied by the same constant and Dijkstra's
  choices are unchanged; only the absolute numbers move. This is what keeps the surviving assertions
  meaningful without rescaling them.

## Goals / Non-Goals

**Goals:**

- Make the tunnel cost prefer corridors clear of the surface network, by the measured amount and no
  more: the strongest lever per unit of network growth found in the diagnostic.
- Keep the earlier requirement's intent intact: nothing about the surface network may *attract* a
  tunnel or discount it, and the underground network stays a network that merges with itself.
- Keep the change to one cost term plus one precomputation, so it is trivially revertible and adds no
  state to the save format.

**Non-Goals:**

- Weakening the burg attraction. That is ladder rung 2 (D16): worth ~13 points but ×1.19 length, and
  it is deliberately left out so this rung's effect is measured on its own.
- Endpoint gates (rung 3), topology changes (superseded, D14), display work (superseded, D15).
- Depth, strata, traversal, save-format or editor changes.

## Decisions

### D1. The separation field is a bounded multi-source BFS over the cell graph, seeded from the surface routes

`generateUndergroundHighways` builds `Uint8Array` distances over `pack.cells.i.length`, seeded from
every cell of every non-underground route in the `routes` argument it already receives, expanded over
`pack.cells.c` with a cap of 4 (cells 4 or more steps away are not distinguished and pay no penalty).
The field is stored as module state next to `undergroundConnections` and rebuilt on each pass, so no
stale field can survive a regeneration.

*Alternatives rejected:* seeding from `this.connections` (the shared edge map) — it is the surface
network's edge set, so it would work, but it says "route" in edges where the metric and the tests
speak in cells, and it would silently include locked underground routes if the two sets ever drift;
computing distance on demand per step — O(cells) per step instead of once per map.

### D2. The penalty is `1 + 2 / (1 + distance)`, applied only within the cap

A step on a surface-route cell costs 3×, one step away 2×, two steps 1.67×, three 1.5×, and four or
more 1×. This is exactly the shape measured in the diagnostic (−14.8 points), so the change ships the
behaviour that was measured rather than a re-tuned guess; the factor is bounded by 3 and can never
make a passable step impassable.

*Alternatives rejected:* a hard exclusion of surface cells — would make some burg pairs unreachable
where the only corridor is a road; a longer decay (the diagnostic shows only 1.4% of tunnel cells sit
three or more cells from a road, so a wider radius buys almost nothing); the same penalty without the
cap — a uniform factor everywhere, which is what the unit tests would then see, and which makes the
"no surface route nearby" scenario untestable.

### D3. The field is module state with a path-neutral default, not a parameter

`getUndergroundPathCost(current, next)` keeps its signature. When no field has been built (unit tests
that call the cost directly, or any future caller outside the pass) the penalty is uniform and
therefore path-neutral: the surviving assertions about high ground, water gates and the discount keep
their meaning unchanged, and only the equality assertion that this change deliberately re-aims is
affected.

*Alternatives rejected:* passing the field into the cost — would force every test and every caller to
build one, and would change a signature four existing tests depend on; defaulting to "no penalty" —
would silently make the direct-call tests pass while the real pass behaves differently, which is the
trap the last change's verification already flagged.

### D4. Only surface routes seed the field; the underground network never repels itself

Routes carrying the `underground` record are skipped when seeding. This keeps *Underground
connectivity is self-contained*'s merge intent: tunnels still attract each other through the discount,
and a tunnel is never pushed away from the corridor another tunnel already took.

### D5. The equality assertion is re-aimed, not deleted

`underground-highways.test.ts:215-228` asserts the cost is *the same* whether or not a surface route
covers a step. Under the re-scoped requirement it becomes two assertions: the cost is never *lower*
than the plain cost, and it is strictly *higher* on the covered step. The surrounding tests (water and
habitability gates, high-ground preference, the underground discount, merge behaviour) are unchanged.

## Risks / Trade-offs

- **Tunnels may look like they swerve around roads deliberately.** The penalty is bounded and decays
  within two cells, so the network shifts by a cell or two rather than detouring; the measured length
  cost is ×1.084. If it reads as avoidance for its own sake, the strength is one constant to lower.
- **Longer, more numerous tunnels** (mean length +8.4%, cells +7%) → recorded as the trade-off, not a
  defect: D13 accepted a trade-off per rung. Measurements are re-taken per seed before adoption.
- **A surface route may cross a tunnel on a cell the tunnel cannot avoid**, and the penalty then
  applies on that cell → accepted: bounded at 3×, and the burg attraction and terrain terms still
  compete on the same step.
- **The precomputation reads `pack.routes` before the underground pass appends to it** → the field must
  be built at the top of the pass, from the `routes` argument, before any tunnel is pushed. A test
  pins that a tunnel's own cells never seed the field.
- **The spec delta re-scopes a requirement written two changes ago** → the change keeps the original
  prohibition (a surface route never *lowers* a tunnel's cost, never attracts it) and only adds the
  converse direction, with the old scenario name kept so the archive's requirement diff is readable.

## Migration Plan

No data migration: generation-time cost only, applied on the next generation or regeneration. Maps
regenerate deterministically from their seed; existing maps keep loading and rendering unchanged.
Rollback is deleting the penalty factor and the field build — no state to unwind.

## Open Questions

- Whether rung 2 (weakening the burg attraction) should follow immediately or wait for the user to see
  a rendered map at this rung. Deferrable: it changes neither this change's tasks nor its gates.
