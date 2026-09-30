## Why

Rungs 1 and 2 took overlap from 0.708 to 0.516 on every seed, but the user's 2026-09-30 report is about the
symptom neither rung moved: tunnels still pass under fully above-ground burgs, and the surface burgs they
converge on read as the underground network's crossroads. The diagnosis (metaplan F7.1) is one plane-blind
cost term — `getUndergroundPathCost` prices **every** burg cell at 1× against 2× for a plain cell, with no
classification read, so a surface-only burg (782 of 870 burgs in the audit census) attracts a tunnel exactly
like the settlements the network exists to serve. The term's own comment states the intent it does not
implement: "the pull toward the settlements **it serves**".

On the current build the arithmetic makes a surface burg cell the cheapest cell of the settled fabric:
1 × separation 3 = 3, against 3–6 for plain cells within three cells of the surface network and 2 for clear
back-country. Paths are pulled through it, and the 0.5× shared-pair discount then funnels several tunnels
onto the same burg cell — the hub. Rung 2 weakened the pull (3 → 2) but kept it plane-blind.

This is rung 3 of the ladder as re-ordered by D17: make the attraction plane-aware, **neutralize first** —
below-level burgs keep the pull, a surface-only burg cell prices as a plain cell. Repulsion is the
pre-authorized escalation if measurement shows neutralize does not move contact enough; it is not part of
this rung.

## What Changes

- **The burg term becomes plane-aware.** A tunnel step onto a cell whose burg has below-level presence keeps
  the attraction (×1 against `UNDERGROUND_BURG_ATTRACTION`). A step onto a cell whose burg has ground-level
  presence only is priced exactly as a plain cell. A missing or removed burg record prices as a plain cell
  too, so the term never reads a record the map does not have.
- **The surface network is untouched.** `getLandPathCost` keeps its own burg factor, and therefore its
  geometry, so every overlap measurement's reference stays fixed — the property that made rungs 1-2
  measurable.
- **The acceptance metric is split before it is gated.** `auditPlanes` counts tunnels on dual-identity burg
  cells together with tunnels on surface-only burg cells today (both have ground-level presence), so the
  standing gate cannot separate a legal endpoint touch from the complaint. The contact report gains the split
  and a count of cells carrying more than one underground record, so pass-under and hub formation are both
  readable and neither hides in the other's number.
- **Two spec deltas.** `underground-highways` pins the attraction contract as a non-lowering rule — a burg
  with ground-level presence only SHALL NOT lower the cost of an underground highway step — which covers
  both this rung and the repulsion escalation; `plane-integrity-audit` pins the split contact report.
- **The separation rule is not re-scoped.** The plane-aware term reads the burg map, not the surface network,
  so *Underground connectivity is self-contained* and *Underground highways keep clear of the surface
  network's corridors* hold unchanged (the F1.8 pressure point does not apply here).
- **Generated geometry changes** wherever a tunnel now routes around a surface settlement — intended. Maps
  regenerate deterministically from their seed and no saved map becomes invalid.
- The plane rules stay in force and are re-checked: zero boundary violations and no connectable burg
  unserved on every measured seed.
- **Not in this rung:** repulsion (escalation only, D17); the junction-retention rule and its spec scenario
  stay as they are (hubs should thin out as paths stop converging, not by dropping connectivity); the drawn
  anchor (`getCellAnchor`) is unchanged — D15 retired display work, and cell-level geometry is the objective
  here.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `underground-highways`: a new requirement pins that the settlement attraction applies only to burgs with
  below-level presence — a burg with ground-level presence only SHALL NOT lower the generation cost of an
  underground highway step. Everything else in the capability is unaffected.
- `plane-integrity-audit`: *The audit reports contact without enforcing it* is extended — the contact report
  distinguishes cells whose burg has ground-level presence only from cells of dual-identity burgs, and
  reports cells carrying more than one underground record.

## Impact

- **Generation**: `src/generators/routes-generator.ts` — the burg term in `getUndergroundPathCost` reads the
  destination burg's classification (via `burg-classification.ts`); the surface cost is not touched.
- **Audit**: `src/generators/plane-integrity.ts` — the contact section of `PlaneReport` splits by burg kind
  and gains the multi-record count; `formatPlaneReport`'s contact line follows.
- **Tests**: the pinned attraction probe (`underground-highways.test.ts`, "prices a tunnel step off a burg
  cell at the weakened attraction") is **deliberately re-pinned** — it currently probes a burg cell whose
  record does not exist and asserts the weakened ratio for any burg; it becomes two probes: a below-level
  burg keeps the attraction, a surface-only burg prices as plain. The audit's unit and real-map tests gain
  the split assertions. Every other pinned test stays as it is; a failure there is a regression.
- **Specs**: two delta files (`underground-highways`, `plane-integrity-audit`).
- **Docs**: `docs/architecture/generation-pipeline.md` — the tunnel cost list gains the plane-aware
  condition.
- **Measurement**: the 8-seed paired protocol (`measure-a` … `measure-h`, harness under
  `diverge-underground-network/harness/`) with the rung-2 build as the paired control, reporting the split
  contact numbers, hub cells, overlap, exact-edge and length (D13/D10).
- **Cost**: one classification read per evaluated step; the underground pass remains 4-32 ms.
- **No new dependencies.**
