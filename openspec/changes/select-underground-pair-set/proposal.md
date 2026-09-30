# Select the underground pair set deliberately

## Why

The underground network is built by pairing **every** burg with below-level presence through the same
neighbour graph the surface roads use, then routing each pair with a cost model copied from the road
cost. A diagnostic (`measure-tunnel-character`) measured the result on 8 paired seeds and found the
network is mostly connecting traffic that is already connected:

- About half of the ~85 below-level burgs per seed are **dual-identity** — they already reach the
  surface network. The other half are **fully subterranean** and do not.
- **52% of the network's records** exist only to connect burgs that already have a surface route, and
  **75% of the road-shadowing offence** (a tunnel connecting the same source and destination as a
  surface route) is attributable to those same pairs.
- Restricting the pairs to fully subterranean burgs cuts the network in half (52.4 → 25.1 records) and
  cuts road shadowing by 75% (6.9 → 1.8 records per seed) — but strands 34.1 below-level burgs per seed,
  because the dual-identity edges were incidentally the only link for some subterranean ones.

The current pair set is therefore both **over-built** (serving already-served burgs) and **unprincipled**
(the neighbour graph optimises geometric proximity, which is not what the underground plane is for).
This change replaces pair selection with a stated policy and relaxes the service contract to match what
the plane is actually for.

## What Changes

- **The service contract is relaxed to the burgs that need it.** A tunnel is required for a fully
  subterranean burg that shares its landmass with another below-level burg. A dual-identity burg keeps
  its right to be an endpoint and to lie on a chain, but no tunnel is required to exist for it, because
  its surface route already connects it. **BREAKING** for the capability's stated guarantee, which
  currently names every below-level burg.
- **Pair selection becomes two explicit layers**, replacing "the neighbour graph over every below-level
  burg":
  1. **backbone** (must): one tree per landmass connecting the fully subterranean burgs. A dual-identity
     burg MAY serve as a transit node inside a chain, so the tree is not forced to route around it, but
     it is never attached as a leaf: no highway is owed to a burg the surface network already connects.
  2. **shortcut** (should): a pair is added when the underground route would be substantially shorter
     than the surface path between the same two burgs, so tunnels appear where overland travel is
     expensive or absent.
- **The long link layer is deferred**, not delivered. A third layer of long, near-straight connections
  between distant subterranean burgs measured two pairs per seed costing seventeen records (81.5 records
  against 54.0 without), which put the network outside this change's own band however the layer was
  capped. The effect is wanted; it moves to a follow-up change, and the measurements it needs (the
  deep-burg separation distribution, the layer's standalone and combined cost) are recorded here.
- **Road shadowing is explicitly out of scope** and recorded as a residual: the diagnostic measured
  6.9 shadowing records per seed on the current build, and this change MUST NOT regress it. Neither a
  straight-line cost model nor a distance-minimising tree reduces it; only an explicit
  settlement-service term would, and that is deliberately not attempted here.
- **The cost model is unchanged.** Only which pairs are routed changes. `getUndergroundPathCost`, the
  water bound, the glacier gate, the separation term and the plane rules all stay exactly as they are.

## Capabilities

**New Capabilities**: none.

**Modified Capabilities**:

- `underground-highways` — the pair-selection policy becomes spec-level behaviour (two named layers with
  their ordering and their eligibility rules), and the service requirement narrows from every below-level
  burg to fully subterranean burgs.

## Impact

- **Code**: `src/generators/routes-generator.ts` — `generateUndergroundHighways` now takes its pairs from
  `selectUndergroundPairs` (the backbone tree plus the shortcut layer) instead of the per-feature
  Urquhart graph, the service repair pass narrows to fully subterranean burgs, and the pair policy and
  its surface-path measure are exported for the tests. `src/generators/plane-integrity.ts` — the audit's
  service rule narrows on the same line, so a dual-identity burg without a tunnel is not a violation.
  No change to `getUndergroundPathCost`, `createUndergroundCost`, prune, merge, or the boundary rule.
- **Existing tests**: behaviour tests that assert a dual-identity burg *must* be connected need to move
  to "MAY be connected". The plane-integrity suites are unaffected — dual-identity burgs remain valid
  endpoints, so no boundary rule changes. The service-repair pass keeps its meaning, narrowed.
- **Existing specs**: `underground-settlements` (classification shares) is **unchanged** — this change
  does not alter how burgs are classified, only which of them a tunnel is built for. `plane-integrity-audit`
  keeps its endpoint eligibility unchanged; only the service rule it reports narrows with the requirement
  above, so a dual-identity burg without a tunnel stops being a violation.
- **Player-visible**: fewer, more purposeful tunnels; some dual-identity burgs lose their tunnel;
  fully subterranean clusters keep a connected tree.
- **Measurement**: the eight-seed protocol lands at 54.0 records / 429.9 cells / 1.196 directness /
  5.13 shadowing records per seed, against the counterfactuals' 25.1 / 394.3 / 1.379 / 1.75
  (subterranean-only) and 67.3 / 458.1 / 1.146 / 8.38 (the tree over every below-level burg). Coverage,
  the surface network and the layer-order independence are asserted per seed; the 6.9/seed shadowing
  ceiling holds at 5.13.
- **Risk**: a dual-identity burg that loses its tunnel becomes unreachable underground, so any map
  relying on tunnels for surface-side travel may change. Traversal rules are unchanged, so a surface
  route still reaches every dual-identity burg.
