# Design — select the underground pair set deliberately

## Context

`generateUndergroundHighways` currently builds its pairs by running the surface neighbour graph
(`calculateUrquhartEdges`) over the burgs of each feature that pass `hasBelowLevelPresence`, and routes
each pair through the production pathfinder. Two facts make that the wrong pair set:

- **The classification splits evenly.** `markUndergroundSettlements` draws dual-identity and fully
  subterranean burgs at the same 5% share, so ~85 below-level burgs per seed are ~43 dual-identity
  (already on the surface network) and ~43 fully subterranean.
- **The neighbour graph optimises the wrong thing.** Urquhart edges are the geometric proximity graph.
  It has no notion of which burgs need connecting, so it spends roughly half its edges on pairs where
  both ends are already served.

The diagnostic (`measure-tunnel-character`, 8 paired seeds, one build) measured the cost of that:
52% of records and 75% of road-shadowing records belong to pairs with no unmet connectivity need.
Restricting pairs to fully subterranean burgs cuts the network in half and shadowing by 75% — and
strands 34.1 below-level burgs per seed, because Urquhart edges through dual-identity burgs were
incidentally the only link for some subterranean ones. Hence this change: keep the coverage, change
the selection, and relax the contract to say what coverage actually means.

## Goals / Non-Goals

**Goals**

- Pair selection becomes a stated, layered policy rather than "the same graph the roads use".
- Full subterranean coverage is preserved (the property the current service rule protects).
- The network shrinks toward its necessity floor without regressing road shadowing.
- The cost model is untouched, so this is a selection change only.

**Non-Goals**

- **Reducing road shadowing.** Measured at 6.9 records/seed; this change holds it, does not improve it.
  Neither a straight-line cost model nor a distance-minimising tree reduces it (8.4 records/seed for the
  tree). Only an explicit settlement-service term would, and that is a separate change.
- Changing the water bound, the glacier gate, the separation term, or endpoint eligibility.
- Changing how burgs are classified, or the share drawn.
- Traversal, save format, display.

## Decisions

### D1 — Service narrows to fully subterranean burgs

A dual-identity burg already reaches the surface network, so a tunnel to it is not owed. The rule keeps
its old force for the burgs that have no other way onto any network.

*Alternative considered:* service for a dual-identity burg only when no surface route reaches it. More
faithful to "connect what nothing else connects", but it needs a surface-reachability test at generation
time, and every dual-identity burg is by construction drawn from burgs the surface network serves.
Rejected as extra machinery for no measured gain.

### D2 — Backbone is a tree over the fully subterranean burgs, with dual-identity transit

One tree per landmass, built over the fully subterranean set, with dual-identity burgs admissible as
nodes the tree passes through. That is a Steiner-shaped problem; the implementation does not need to
solve it exactly — building the tree over *all* below-level burgs and pruning the edges whose both ends
are dual-identity gives the same coverage with the same transit property, and is the form the harness
already exercises (`pairset-backbone-mst`).

*Why not the geometric neighbour graph (current):* it is the proximity graph, not a coverage structure,
so it carries edges nothing needs. Measured: 52.4 → 67.3 pairs, but 564 → 458 cells and 5685 → 4271
length, because the extra pairs merge into far fewer records.

*Why a tree and not "all pairs between nearby subterranean burgs":* a tree is the minimal structure that
satisfies coverage, so any extra pairing has to justify itself by D3 or D4.

### D3 — Shortcut threshold is the surface-to-direct ratio, at 1.5x

A pair is admitted when the surface path between its two burgs is at least **1.5x** the straight-line
distance. The threshold is not invented: this change's own water census uses the same 1.5 convention for
its `landPenalty` readings, and measured real values there span 1.01-6.70 with 26 of 53 crossings above
1.0. 1.5x selects the crossings that are genuinely expensive rather than merely present — and, per the
census, 27 of 53 water crossings had a land fallback of *identical* length, so a lower threshold would
admit pairs that buy nothing.

*Alternative considered:* an absolute detour in map units. Rejected because map scale varies between
maps while the ratio does not, and the ratio is what "the route prefers not to go that way" means.

*Alternative considered:* "no land path exists at all". Kept as the stronger half of the same test — a
pair with no surface path trivially exceeds any ratio, so the implementation tests
`surfacePath === null || surfacePath >= 1.5 * direct`.

### D4 — Long links are a distance floor, not a special mechanism

A pair is admitted when the straight-line distance exceeds a floor, capped at a small number of pairs
per seed so the layer cannot swamp the backbone. The floor is set from the observed distance
distribution rather than fixed a priori, and the initial value is a tuning constant.

*Why a separate layer at all:* it is the only layer that produces the "occasional long straight
connection between relatively distant burgs" effect the user asked for; the backbone and shortcuts are
both local by construction (the backbone is an MST, which is all short edges by nature).

### D5 — The layers are additive over a shared candidate set, and de-duplicated

All three layers emit pairs into one set keyed on the unordered pair, so a pair admitted by two layers
is routed once. Layer order matters for *reporting* (which layer justified a pair) but not for routing.

### D6 — Shadowing is monitored, not fixed

The diagnostic's `roadCopiesExpanded` column becomes a regression gate: ≤ 6.9 records/seed on the
8-seed protocol. This is the one place the change deliberately accepts a known defect, because the
evidence says the alternatives that reduce it (breaking coverage) are worse, and the mechanism that
would fix it (a settlement-service term in the cost) is a separate, riskier change.

## Risks / Trade-offs

- **[A dual-identity burg loses its tunnel and the player notices]** → Surface routes still reach every
  dual-identity burg, so nothing becomes unreachable; the display layer already distinguishes planes.
  The change's tests assert reachability, not tunnel presence, for dual-identity burgs.
- **[The backbone tree strands a subterranean burg the old graph happened to serve]** → This is exactly
  the failure the 34.1/seed counterfactual exposed, and the reason D2 keeps dual-identity transit.
  Coverage is asserted per seed against the *narrowed* rule, which is stricter than "the tree is
  connected": every fully subterranean burg must be an endpoint of, or lie on, a record.
- **[The distance floor admits pairs that shadow roads]** → Long links are the most likely shadowers, so
  the layer is capped in count and its contribution to `roadCopiesExpanded` is reported per seed.
- **[Fewer pairs means fewer merges, so records bend more]** → Measured: the MST pair set *improves*
  directness (1.28 → 1.20) while the subterranean-only set degrades it (1.45). Directness is asserted
  against the baseline, so the regression case cannot land silently.
- **[Layer thresholds become magic numbers]** → Both thresholds live in named constants with the
  measurement that chose them recorded in the change, and the test-design pins their boundary behaviour.

## Migration Plan

No data migration: pair selection runs at generation time, and saved maps keep their records. Locked
regeneration rebuilds the underground network from the new policy, which can remove tunnels a saved map
had — that is the intended behaviour and matches how `pruneUndergroundHighways` already treats stale
records. Rollback is reverting the selection policy; no format change is involved.

## Open Questions

- Whether the long-link floor should be a constant or derived per map from the burg distribution. The
  design sets a constant initially and the test-design pins the boundary; deriving it is a follow-up if
  the constant proves map-size sensitive.
- Whether the shortcut layer should measure the surface path through the generated road graph (accurate,
  costs a pathfind per candidate pair) or through a cheaper proxy such as the number of road cells on
  the straight corridor. The test-design assumes the accurate form, because the diagnostic already
  measured `landPenalty` that way and the run is minutes, not hours.
