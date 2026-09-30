## Why

Rung 1 took the underground network off the surface corridors (overlap 0.708 → 0.560), but the dominant
term pulling tunnels *onto* the settlements the roads converge on is untouched: `getUndergroundPathCost`
still makes every cell **without** a burg three times as expensive (`pack.cells.burg[next] ? 1 : 3`), so
the pathfinder is paid to end at a burg and rewarded for grazing one in passing. The diagnostic measured
the term as the largest single lever in the ladder — removing it outright is worth 13.1 points of overlap
— and rung 1 alone cannot reach the improvement the ladder predicted for this rung.

This is rung 2 of the ladder agreed with the user (`diverge-underground-network` — D13, D16, H2): weaken
the burg attraction rather than delete it, which is the smallest step that still moves the number. Measured
on top of rung 1, factor **2** takes overlap from 0.560 to **0.512** with every seed improving, at ×1.142
mean length — against ×1.181 for factor 1.5 and ×1.193 for deleting the term. It is also spec-clean: no
requirement mentions the term, so no delta re-scoping is needed the way rung 1 needed one.

## What Changes

- `getUndergroundPathCost`'s burg attraction goes from **3 → 2**: a cell with no burg costs twice a burg
  cell, not three times. One constant in the tunnel cost; the term stays, so a tunnel still prefers to
  route through settlements it serves without being paid to graze every one it passes.
- **The surface network is untouched.** `getLandPathCost` keeps its own 3× burg factor, so surface route
  geometry, and therefore every overlap measurement's reference, is unchanged. This is the property that
  makes the rung measurable at all.
- **No requirement changes.** No spec text mentions the burg attraction; the endpoint, water, terrain,
  self-containment, corridor-separation, service and plane requirements are all unaffected in their
  wording. The rung is verified by measurement plus the existing pinned tests, not by a spec delta.
- **Generated geometry changes** wherever a tunnel now takes a cheaper route around a settlement —
  intended, and the point of the change. Maps regenerate deterministically from their seed and no saved
  map becomes invalid.
- The plane rules shipped by `harden-underground-plane-integrity` stay in force and are re-checked: a
  longer, more wandering tunnel network must still leave no boundary violation and no connectable burg
  unserved.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The burg attraction is an internal cost weight with no requirement text; the acceptance signal for
this rung is the measured overlap reduction and the pinned test suite, not a spec-level behaviour change.
`underground-highways` already states everything the rung must continue to satisfy (endpoints, water,
terrain, self-containment, separation, service, and the plane rules).

## Impact

- **Generation**: `src/generators/routes-generator.ts` — one constant in `getUndergroundPathCost`. A named
  constant replaces the inline literal so the rung and its value are legible at the call site.
- **Tests**: no existing test pins the underground burg factor's value (the surface one is pinned by the
  "does not move the surface network" test, which must stay green). The suite's pinned endpoint, water,
  high-ground, merge, traversal, service and plane tests all stay as they are; the 8-seed real-map audit
  gains a zero-violation re-run on the new geometry.
- **Specs**: none.
- **Docs**: `docs/architecture/generation-pipeline.md` describes the tunnel cost and gains the term's new
  weight alongside the existing list of cost terms.
- **Measurement**: the rung is adopted on the 8-seed paired protocol (`measure-a` … `measure-h`) using the
  harness kept at `openspec/changes/diverge-underground-network/harness/`, with the rung-1 build as the
  paired baseline so the delta is attributable to this rung alone.
- **Cost**: no new work per map — one multiplier changes value. The underground pass remains 4-32 ms.
- **No new dependencies.**
