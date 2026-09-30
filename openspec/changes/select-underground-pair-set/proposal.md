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
- **Pair selection becomes three explicit layers**, replacing "the neighbour graph over every below-level
  burg":
  1. **backbone** (must): one tree per landmass connecting the fully subterranean burgs. Dual-identity
     burgs MAY serve as transit nodes inside a chain, so the tree is not forced to route around them.
  2. **shortcut** (should): a pair is added when the underground route would be substantially shorter
     than the surface path between the same two burgs, so tunnels appear where overland travel is
     expensive or absent.
  3. **long link** (may): a bounded number of long, near-straight connections between distant
     subterranean burgs, admitted by a distance floor.
- **Road shadowing is explicitly out of scope** and recorded as a residual: the diagnostic measured
  6.9 shadowing records per seed on the current build, and this change MUST NOT regress it. Neither a
  straight-line cost model nor a distance-minimising tree reduces it; only an explicit
  settlement-service term would, and that is deliberately not attempted here.
- **The cost model is unchanged.** Only which pairs are routed changes. `getUndergroundPathCost`, the
  water bound, the glacier gate, the separation term and the plane rules all stay exactly as they are.

## Capabilities

**New Capabilities**: none.

**Modified Capabilities**:

- `underground-highways` — the pair-selection policy becomes spec-level behaviour (three named layers
  with their ordering and their eligibility rules), and the service requirement narrows from every
  below-level burg to fully subterranean burgs.

## Impact

- **Code**: `src/generators/routes-generator.ts` — `generateUndergroundHighways` and the pair
  construction feeding it; `sortBurgsByFeature`'s eligibility predicate stops being the sole gate.
  No change to `getUndergroundPathCost`, `createUndergroundCost`, prune, merge, or the plane audit.
- **Existing tests**: behaviour tests that assert a dual-identity burg *must* be connected need to move
  to "MAY be connected". The plane-integrity suites are unaffected — dual-identity burgs remain valid
  endpoints, so no boundary rule changes. The service-repair pass keeps its meaning, narrowed.
- **Existing specs**: `underground-settlements` (classification shares) and `plane-integrity-audit`
  (endpoint eligibility) are **unchanged** — this change does not alter how burgs are classified, only
  which of them a tunnel is built for.
- **Player-visible**: fewer, more purposeful tunnels; some dual-identity burgs lose their tunnel;
  fully subterranean clusters keep a connected tree.
- **Measurement**: the next rung is held to the diagnostic's baseline columns — 25.1 records / 394
  cells / 1.8 shadowing records for the subterranean backbone, and a 6.9/seed shadowing ceiling.
- **Risk**: a dual-identity burg that loses its tunnel becomes unreachable underground, so any map
  relying on tunnels for surface-side travel may change. Traversal rules are unchanged, so a surface
  route still reaches every dual-identity burg.
