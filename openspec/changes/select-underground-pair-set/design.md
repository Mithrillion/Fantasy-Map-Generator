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

- **Reducing road shadowing.** Measured at 6.9 records/seed on the old pair set; this change holds it,
  and lands at 5.13. Neither a straight-line cost model nor a distance-minimising tree reduces it (8.38
  records/seed for the tree). Only an explicit settlement-service term would, and that is a separate
  change.
- **The long link layer** (D4): deferred to a follow-up change with the measurements it needs.
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

One tree per landmass, built over the fully subterranean set, with dual-identity burgs kept where they
carry the path between two backbone burgs. That is a Steiner-shaped problem; the implementation does not
solve it exactly — it builds the tree over *all* below-level burgs, drops the edges whose two ends are
dual-identity, then drops dual-identity *leaves*, and rejoins the subterranean components the pruning
splits. A dual-identity burg that carries a path between two deep burgs survives as an interior node; one
that merely hangs off the tree does not, because no highway is owed to it (the spec's "SHALL NOT create a
highway for it alone").

*Why the leaf rule matters (measured, 8 seeds):* the tree over every below-level burg with only the
dual-dual edges dropped keeps 69.4 pairs and produces 57.3 records / 398.9 cells / 5.5 shadowing. The
leaf rule takes it to 51.6 pairs and 41.0 records / 346.1 cells / 3.25 shadowing, and it is what takes
measure-h's shadowing from 4 records back to 0 — every one of those four was a tunnel to a dual-identity
burg whose road already reached it.

*Why not the geometric neighbour graph (current):* it is the proximity graph, not a coverage structure,
so it carries edges nothing needs. Measured: 52.4 → 67.3 pairs, but 564 → 458 cells and 5685 → 4271
length, because the extra pairs merge into far fewer records.

*Why a tree and not "all pairs between nearby subterranean burgs":* a tree is the minimal structure that
satisfies coverage, so any extra pairing has to justify itself by D3.

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

### D4 — Long links are deferred, not delivered

A long link layer would admit a bounded number of pairs between geographically distant fully
subterranean burgs by a distance floor. It is **not part of this change**: measured on the eight-seed
protocol, its two pairs per seed cost seventeen records (74.1 records with it against 57.3 without),
because a long path is cut into stretches wherever it meets the existing network and the directional
merge cannot rejoin them. That put the network outside the change's own band (records ≤ 67.3, cells
≤ 458) no matter how the layer was capped: cap 1 still measured 73.3 records, and routing the long pairs
first measured 75.0 records / 525.1 cells.

The effect it was to buy — an occasional long, near-straight connection — is real and wanted, so the
layer is carried into a follow-up change rather than dropped. This change records the measurements it
needs: the observed deep-burg separation distribution per seed (`DIST` lines in `measure/`), the layer's
standalone cost (7.9 records / 119.6 cells for two pairs) and its combined cost (`deferred-all`:
81.5 records / 473.8 cells / 7.38 shadowing).

*Why the backbone cannot stand in for it:* the backbone is an MST, so it is local by nature; the
shortcut layer only admits pairs the surface network already serves badly. Neither produces a long
connection for its own sake.

### D5 — The layers are additive over a shared candidate set, and de-duplicated

Both layers emit pairs into one set keyed on the unordered pair, so a pair admitted by both is routed
once. Layer order matters for *reporting* (which layer justified a pair) but not for routing; measured on
the eight-seed protocol, the admitted pair set is identical whichever order the layers are applied in.

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
- **[A dual-identity burg is left as a leaf of the backbone, and its tunnel shadows the road into it]** →
  Measured: attaching dual leaves costs measure-h four shadowing records against a baseline of one. D2's
  leaf rule removes them, and the per-seed shadowing gate is what caught it.
- **[Fewer pairs means fewer merges, so records bend more]** → Measured: the tree pair set *improves*
  directness (baseline 1.28 → 1.196) while the subterranean-only set degrades it (1.379). Directness is
  asserted against the baseline, so the regression case cannot land silently.
- **[The shortcut threshold becomes a magic number]** → It lives in a named constant with the measurement
  that chose it recorded in the change, and the test-design pins its boundary behaviour from both sides.

## Measured outcome (8 seeds, `measure/pairset-policy.log`)

| pair set | pairs | records | cells | length | directness | shadowing |
| --- | --- | --- | --- | --- | --- | --- |
| subterranean-only counterfactual | 44.6 | 25.1 | 394.3 | 3706 | 1.379 | 1.75 |
| tree over all below-level burgs (counterfactual) | 82.4 | 67.3 | 458.1 | 4068 | 1.146 | 8.38 |
| **this change (backbone + shortcut)** | **66.4** | **54.0** | **429.9** | **4052** | **1.196** | **5.13** |

Coverage: 42.6 fully subterranean burgs per seed, none uncovered, zero service violations, zero boundary
violations, zero repairs. Every integration gate the change set itself passes: records ≤ 67.3, cells ≤ 458,
shadowing ≤ 6.9 mean and no seed more than one above its own baseline, directness ≤ 1.28 mean and no seed
above 1.5, the surface network byte-identical with underground generation on and off, and the admitted pair
set unchanged by layer order.

## Migration Plan

No data migration: pair selection runs at generation time, and saved maps keep their records. Locked
regeneration rebuilds the underground network from the new policy, which can remove tunnels a saved map
had — that is the intended behaviour and matches how `pruneUndergroundHighways` already treats stale
records. Rollback is reverting the selection policy; no format change is involved.

## Open Questions

- **The deferred long link layer** (D4): should its floor be a constant or derived per map from the
  burg distribution? The follow-up change starts from the measured distribution (`DIST` lines in
  `measure/`): the 90th percentile of deep-burg separations is 388-734 across seeds, the 99th 509-977.
- **The shortcut layer's breadth.** It admits 14.8 pairs per seed, of which only ~1.3 have a straight
  line that crosses water — the population the 1.5x threshold was justified from. The rest fire on roads
  that meander. Whether the layer should be narrower (crossings only) or is right as it stands is a
  question for the follow-up, since the current form passes every gate.
- Whether the shortcut should measure the surface path through the generated road graph (as implemented)
  or through a cheaper proxy such as the number of road cells on the straight corridor. The implemented
  form is the accurate one and costs one cached pathfind per candidate pair.
