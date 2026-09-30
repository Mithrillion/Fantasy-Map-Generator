## Context

`getUndergroundPathCost` multiplies five factors per step ([routes-generator.ts:364](src/generators/routes-generator.ts#L364)):
distance, habitability, height, the underground-only discount, and a burg term that reads
`pack.cells.burg[next] ? 1 : UNDERGROUND_BURG_ATTRACTION` ([routes-generator.ts:375](src/generators/routes-generator.ts#L375)).
The term's comment states its intent — "the pull toward the settlements **it serves**" — but the code reads
burg *presence*, not classification, so a surface-only burg attracts a tunnel exactly like a below-level
one. Rung 2 weakened the weight (3 → 2, F6.1) without touching that blindness.

The measured consequence (F7.1): a surface burg cell on a road totals 1 × separation 3 = 3, against 3–6 for
plain cells within three cells of the surface network and 2 clear — the settled fabric's local minimum, so
paths are pulled through surface burgs and the 0.5× shared-pair discount then converges several tunnels on
the same burg cell. Contact sits at 132–190 cells per seed after rung 2; 42/36/56 surface-burg cells per
seed carry two or more tunnels.

The audit cannot see the difference: `contact.tunnelsOnSurfaceBurgs` counts every burg with ground-level
presence ([plane-integrity.ts:165](src/generators/plane-integrity.ts#L165)), which includes dual-identity
burgs — legal endpoints and legitimate mid-route cells by D14. The standing gate therefore mixes the
complaint with the design.

Constraints: the surface cost is the reference every overlap measurement is baselined against and must stay
fixed; the plane audit (zero violations, service intact) is a standing acceptance gate (F5.1); length is a
recorded trade-off, not a veto (D13); the pair set is not a free variable (D14).

## Goals / Non-Goals

**Goals:**
- Make the burg attraction plane-aware: a cell whose burg has below-level presence keeps the pull; a cell
  whose burg has ground-level presence only prices exactly as a plain cell.
- Leave the surface network's cost, and therefore the measurement reference, bit-for-bit unchanged.
- Split the audit's contact report (surface-only vs dual-identity burg cells) and count cells carrying more
  than one underground record, so pass-under and hub formation both gate the rung.
- Keep every pinned guarantee: endpoints, water and landmass, high-ground preference, the underground
  discount, corridor separation, the service repair, the plane rules and traversal.
- Adopt only if the 8-seed paired protocol shows the complaint's metrics down without overlap regressing.

**Non-Goals:**
- Active repulsion from surface-only burg cells — pre-authorized as the escalation (D17), not this rung.
- Any change to the junction-retention rule, its spec scenario, or the drawn anchor (`getCellAnchor`).
- Any change to the surface cost, the separation term, the discount, the pair set or the topology.

## Decisions

### D1 — Neutralize: a surface-only burg cell prices exactly as a plain cell

The cheapest fix that removes the local minimum is to stop paying the attraction on cells the network does
not serve. It adds no new cost input beyond the classification the plane already uses (endpoints sort on it,
the prune and repair call it), so it cannot surprise the corridor requirement's "derived from surface routes
only" clause, and it leaves the below-level pull intact for the burgs the network exists to connect.

*Alternatives rejected.* Repulsion now would make surface-burg cells dearer than their neighbours in one
step, but it is a new above-ground-derived penalty with unmeasured length risk — D17 keeps it as the
escalation. Strengthening the separation term instead cannot win: rung 1 is already capped at 3× at distance
0 and the ÷2 attraction cancels it exactly there. A hard gate (impassable surface-burg cells) would forbid a
passable cell, risk unreachable pairs on narrow corridors, and contradicts the user's "encourage" framing.

### D2 — The classification is read from the burg record; a missing record prices as plain

The term must move from `pack.cells.burg[next]` (presence) to a record read plus
`hasBelowLevelPresence(burg)` ([burg-classification.ts:19](src/generators/burg-classification.ts#L19)) — the
same predicate the endpoint sort, the prune and the service repair use, so cost and topology agree on one
definition of "serves". An absent or removed record prices as a plain cell: a partially rebuilt map must not
keep pulling tunnels toward settlements it cannot classify, and the cost is evaluated per step, so the read
must not throw.

*Alternative rejected.* Treating an unknown record as attractive "to preserve old behavior" preserves exactly
the plane-blindness being fixed.

### D3 — The pinned probe is re-pinned deliberately into three quotients

The probe helper equalizes two destination cells except for the burg map
([underground-highways.test.ts:686](src/generators/underground-highways.test.ts#L686)) and currently asserts
the quotient is 2 for a burg cell whose record does not even exist. The re-pinned contract: a below-level
burg keeps the attraction (quotient `UNDERGROUND_BURG_ATTRACTION`), a surface-only burg prices as plain
(quotient 1), and a record-less burg id prices as plain (quotient 1). The existing "does not move the surface
network" assertion (quotient 3) stays untouched, and is the guard that the plane-aware read did not leak
into `getLandPathCost`.

*Alternative rejected.* Relaxing the single probe to "less than or equal" would stop pinning either side of
the contract; the rung's whole claim is an equality on the surface-only side.

### D4 — The audit's contact report gains the split and a multi-record count, in place

`PlaneReport.contact` becomes:

```ts
contact: {
  tunnelsOnSurfaceOnlyBurgs: number;   // the complaint: pass-under a fully above-ground settlement
  tunnelsOnDualIdentityBurgs: number;  // legal endpoint / mid-route contact (D14)
  tunnelCellsWithMultipleRecords: number; // hub metric: cells two or more underground records run through
  surfaceRoutesOnBelowLevelCells: number; // unchanged, other direction
}
```

`tunnelsOnSurfaceBurgs` is retired; its old value is the sum of the first two, so CH5's 132–190 stays
comparable. `formatPlaneReport`'s contact line prints each figure. The split is read off the classification
the file already imports ([plane-integrity.ts:4](src/generators/plane-integrity.ts#L4)); a live burg is
either dual-identity (below-level presence) or ground-level-only, and fully subterranean burgs are not
contact at all. The multi-record count is per cell over *distinct* underground records, so a record that
revisits a cell counts once — computed from the same `live` list the boundary pass already walks.

*Alternatives rejected.* Leaving the audit and decoding contact in the harness per rung would keep the
standing gate blind — CH5's verification had to separate the two by hand. Keeping `tunnelsOnSurfaceBurgs`
alongside the split invites the conflated number to be read again.

### D5 — Paired measurement on one build, complaint metrics primary

The harness (`diverge-underground-network/harness/underground-measure.dom.test.ts.txt`) gains one variant in
the mold of rung 2's `force-production-back-to-3`: divide the production factor out and multiply the
plane-blind factor back in (`pack.cells.burg[next] ? 1 : 2` on every burg cell), so both arms run on one
build through the production pathfinder. Primary readings: `tunnelsOnSurfaceOnlyBurgs` and
`tunnelCellsWithMultipleRecords`, per seed, both arms. Secondary: overlap share, exact-edge share, corridor
distance, served burgs, length (D10/D13). The real-map audit re-runs on the new geometry as the gate.

*Alternative rejected.* Adopting on the mean alone — both F3.2 and F6.1 hid a worst-seed break behind a mean.

## Risks / Trade-offs

- **Neutralize does not move contact enough** (some surface burgs sit on the only corridor, and the fabric is
  dense) → the metric is reported, never asserted to zero; D17 pre-authorizes repulsion as the next rung and
  the measurement says how much is left.
- **Overlap or length regresses on a seed** → overlap-not-worse is the bar and length is a recorded
  trade-off (D13); the per-seed table is published so the worst case is visible.
- **The split changes the audit's log line**, so older logs need the sum of the two new figures → the mapping
  is documented here and both arms' logs are kept in the change.
- **Reading a second array per step in a hot path** → the record is already dereferenced elsewhere in the
  pass's helpers; the constant-named, branch-free read keeps the 4–32 ms pass budget.
- **A partially rebuilt map holds stale burg ids** → the missing/removed record prices as plain, so a stale
  id stops attracting tunnels instead of throwing or pulling them under an unclassifiable settlement.
- **The rung is judged by contact, not overlap** — a network can reduce contact while overlap rises slightly
  → both are reported; if overlap rises, the rung is not adopted on contact alone.

## Migration Plan

No data, save-format or API change. One cost factor becomes classification-aware, so maps regenerate
deterministically from their seed; rollback is reverting the read to burg presence. `PlaneReport.contact`'s
shape changes, so the audit unit test and `formatPlaneReport` move with it — both in the same change, and
the real-map audit is the end-to-end check.

## Open Questions

- Whether neutralize alone reaches the user's bar for "not interact"; the paired measurement answers it and
  D17 keeps repulsion pre-authorized.
- Whether the multi-record count should ever gate rather than report — the audit's requirement explicitly
  reports contact without enforcing it, so that stays out of scope.
