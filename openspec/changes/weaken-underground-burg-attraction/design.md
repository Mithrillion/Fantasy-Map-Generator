## Context

`getUndergroundPathCost` multiplies five factors per step
([routes-generator.ts:358](src/generators/routes-generator.ts#L358)): distance, habitability, height, the
underground-only discount, and a burg term worth `pack.cells.burg[next] ? 1 : 2` after this change (3
before it). Rung 1 added a sixth, the bounded surface-separation factor, and took overlap 0.708 → 0.560.

The burg term is the ladder's largest remaining lever. The diagnostic separated it cleanly: with a
distance-only cost the same pairs land at 0.587 overlap, and adding the burg term back *restores* the
pre-rung-1 baseline (0.721) — so the term, not the terrain or the discount, is what pulls tunnels onto
settlements. Removing it entirely is worth 13.1 points on the rung-1-free build; on top of rung 1 the
ladder sweep measured factor 2 at 0.512 (×1.142 length), factor 1.5 at 0.474 (×1.181) and factor 1 at
0.577-alone (×1.193).

Two constraints shape the fix. First, `getLandPathCost` carries an identical-looking burg term with a
*different* consumer, and the surface network is the reference every overlap measurement is baselined
against — touching it would make the rung's own delta unmeasurable. Second, the plane rules shipped by
`harden-underground-plane-integrity` now hold over the generated network; a longer, more wandering tunnel
network must keep satisfying them.

## Goals / Non-Goals

**Goals:**
- Weaken the underground burg attraction to 2, so a tunnel still prefers the settlements it serves without
  being paid to graze every one it passes.
- Leave the surface network's cost, and therefore the measurement reference, bit-for-bit unchanged.
- Keep every pinned guarantee: endpoints, water and landmass, high-ground preference, underground-only
  discount, corridor separation, the service repair, the plane rules and traversal.
- Adopt only if the 8-seed paired protocol shows the predicted overlap reduction.

**Non-Goals:**
- Deleting the burg term (factor 1) or going below 2 — measured, longer and no longer spec-clean.
- Endpoint gates (rung 3) and any pair-set or topology change (superseded, D14).
- Any change to the surface cost, the separation term, or the discount.

## Decisions

### D1 — Weaken to 2, not delete

The ladder is monotone, so the choice is effect per unit of network growth. Factor 2 buys 4.1 points of
overlap over rung 1 for ×1.142 mean length (worst seed ×1.311); factor 1.5 buys 8.6 points for ×1.181
(worst ×1.363); deleting the term buys 13.1 points on the rung-1-free build for ×1.193 (worst ×1.314).
Factor 2 is the smallest step that still moves the number, and it keeps the worst seed closest to the
baseline the surface network is measured against.

*Alternative rejected.* Deleting the term outright is the largest single effect measured, but it removes
the mechanism that makes a tunnel route *toward* the burgs it exists to connect, and it grows the network
most. D13 asks for rung-by-rung escalation, so the cheap rung goes first and the next one stays available.

### D2 — The factor becomes a named constant, scoped to the tunnel cost

The literal `3` sits inline in the tunnel cost next to the surface cost's identically-shaped literal. The
two look like one rule and are not: the surface term is pinned by *"does not move the surface network"*,
the tunnel term is this rung's lever. A named constant beside the other tunnel-cost constants makes the
distinction legible and gives the rung a single, greppable site.

*Alternative rejected.* Parameterising the factor for both planes would invite a surface change later
that would silently move every overlap baseline.

### D3 — The acceptance signal is measurement, not a spec delta

No requirement text mentions the burg attraction, so this rung is spec-free and declares `skip_specs`. The
signal that it worked is the 8-seed paired protocol — overlap share primary, exact-edge share and corridor
distance secondary, length growth recorded as a trade-off — plus the pinned suite and the real-map audit,
which must still report zero violations on the longer network.

*Alternative rejected.* Writing a requirement for the weight would pin a tuning constant in the spec and
make the next rung need a delta for what is a value change.

### D4 — The paired baseline is re-measured on the current build

The ladder's rung-1 numbers were measured before `harden-underground-plane-integrity` changed which cells
the segments cover on some paths. A rung is adopted on a *paired* delta, so the change records both arms
on one build: production (rung 2) against factor 3 (rung 1) with everything else identical, through the
same harness and the same fidelity anchor. The archived 0.560 is the expectation to reproduce, not the
number the delta is computed from.

*Alternative rejected.* Comparing against the archived log alone would attribute any drift introduced
since to this rung.

## Risks / Trade-offs

- **Longer tunnels reduce the service rate** (a network that grazes fewer burgs may *end* at fewer) → the
  ladder measured served rising with a weaker attraction (0.691 → 0.693), and the service repair now
  guarantees the requirement outright; the real-map audit's `connected`/`unconnectable` figures are read
  on every seed.
- **A longer network increases plane contact** (more cells crossing the other plane's burgs) → contact is
  counted, not failed, by design; the audit re-runs on the new geometry and its numbers are recorded.
- **The worst seed breaks the length budget** (factor 2 reached ×1.311 on one seed, over the 15% D4 bound
  that rung 1 respected) → the rung is adopted under D13, where length is a recorded trade-off rather than
  a veto; the per-seed table is published so the worst case is visible rather than averaged away.
- **The rung does not reproduce on the current build** (build drift since rung 1) → D4's paired protocol
  measures both arms on one build, so a failure to move the number is reported as such and the rung is
  not adopted.
- **The plane rules break on the new geometry** → the real-map audit is the gate; a violating seed fails
  the run and names the burg and route.

## Migration Plan

One constant changes value; no data, save-format or API change. Generated geometry changes only where a
tunnel now routes differently, and maps regenerate deterministically from their seed. Rollback is
reverting the constant.

## Open Questions

- None blocking. Rung 3 (endpoint gates) stays open in the metaplan either way; if factor 2 clears the
  number the ladder pauses there, and if it does not, rung 3 is the next step.
