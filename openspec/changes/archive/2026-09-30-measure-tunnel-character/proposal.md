# Prototyping Charter

## Context & Motivation

The underground-divergence ladder (`diverge-underground-network`, rungs 1-3 shipped and archived) has
been optimizing one objective: how much the tunnel network coincides with surface routes. That number
moved 0.708 → 0.430 on the 8-seed paired protocol. On 2026-09-30 the user reported three issues after
the water-crossing change that are a **different objective — tunnel character**:

1. Underground paths still pass under above-ground burgs too often (the rung-3 residual: 72 cells/seed
   mean, F7.2).
2. Tunnels curve and bend the way above-ground routes do — e.g. not boring under a mountain top but
   bending toward lower-elevation parts of the range — and miss obvious shortcuts.
3. An audit request: are tunnels avoiding neutral / uninhabitable cells because of affiliation or
   general biome-avoidance rules carried from regular routes?

The exploration answered (3) statically and produced a mechanism diagnosis for (1) and (2)
(metaplan F8.1-F8.3: the burg pull beats the terrain preference at any elevation; the height term
plateaus at h>=50 and cannot buy a one-cell detour; the separation term — the strongest single shaper —
displaces range crossings to the next-lowest corridor; the tunnel cost still carries two surface-biome
terms and a water pricing quirk). But that is reasoning over the cost function, not evidence about the
generated network, and the program's standing doctrine is measure-first (CH1's precedent; F6.1: never
inherit a figure across a build change).

Prototyping is the right vehicle because the character objective has no metrics at all yet — nobody
knows what "reads as a tunnel" measures as — and because the suspected mechanisms' real contributions
are unknown until the same paired seeds run with them ablated. This change produces evidence and
adoption candidates only; it never lands specs.

## What We Want to Learn

- P1: How does the generated tunnel network behave against character metrics that do not exist yet —
  directness (path length over direct-line distance), tunnel-cell elevation vs the direct corridor,
  crest-hit share at range crossings, biome share of tunnel cells vs land, and pass-under counts of
  surface-only burgs including 1-cell near-misses? (How does the current system behave here?)
- P2: How much does each suspected mechanism actually contribute — the burg string (below-level 1x vs
  plain 2x), the height plateau above h=50, the separation displacement, the biome terms? Which ablation
  moves which character metric?
- P3: Are water crossings under-used — how many water legs appear per seed, what spans occur, and what
  does an "obvious" bay shortcut lose by under the bound and the coastal halo?
- P4: Which of the candidate metrics actually discriminate tunnel character (which move when mechanism
  probes move, and which are saturated like the retired `parallel` metric, F1.4)?
- P5: Which of A/B/C behaves best in practice for the cheap trio's pieces — narrow burg repulsion
  (cell-only vs a narrow halo), a plateauless height term, and biome-blind cost — when character gains
  are read together with the standing alignment columns and network length?

## Ideas to Explore

- **Character columns in the existing harness.** Extend the 8-seed paired harness (H6) with the P1
  metrics as new ROW output, keeping the fidelity anchor (`replica-production` = `baseline-production`)
  and the plane-audit gate. Rough shape: post-pass measurement over the generated routes and cells; no
  pipeline changes.
- **Mechanism ablations.** Re-run the underground pass per variant through the production pathfinder
  (the CH1 idiom): burg-pull removed, plateauless height, separation off, biome-blind cost — each
  reporting both the character columns and the alignment columns.
- **Pass-under near-miss counter.** Tunnel cells within one cell of a surface-only burg, plus the
  drawn anchor's distance from the burg dot — separates path choice from rendering amplification.
- **Water-crossing census.** Water legs per seed, span distribution, and per-crossing detour ratio vs
  the land fallback.
- **Rough rung-5 micro-prototypes**, in-harness only: cell-only vs halo repulsion, one plateauless
  height shape — enough to tell whether the trio co-moves or trades against the alignment columns.

## Known Unknowns & Assumptions

- Does the harness stay acceptably fast once per-pair geometry metrics are added? (The pass runs
  4-32 ms per seed today; the metrics are post-pass, so the risk is low but unstated so far.)
- Does "crest-hit" have a robust definition over Voronoi cells — what counts as the range's top along
  a corridor?
- Is the user's sag perception dominated by path choice or by anchor/curve rendering? (P2's near-miss
  and anchor-distance probes separate the two.)
- Does the burg string read differently on dual-identity burgs (legal endpoints) than on fully
  subterranean ones mid-route?
- Assumption: seeds `measure-a`..`measure-h` remain the paired protocol; D13's "any improvement"
  doctrine governs how readings are adopted, with per-seed reporting (D4 style).
- Assumption: the glacier gate and the water bound stay as-is while measured (both are open user
  calls; measuring the current build first keeps the baseline honest).

## Scope & Boundaries

**In scope**

- The measurement harness and its new character metrics; measurement records and comparison tables.
- In-harness probe variants over the cost terms (production pathfinder and merge/prune, patched cost
  or pairs only).
- The audit write-up of affiliation/biome terms in the three route cost functions.

**Out of scope**

- Any production code change to the cost functions — that is rung 5/6 work in later changes.
- Spec deltas of any kind (`skip_specs: true`).
- Pair-set or topology changes (D14: the underground plane connects the same burgs).
- Traversal, save format, display (D3, D15).

**Deferred**

- Rung 5 (the cheap trio) and rung 6 (deviation penalty) as separate semi-test-driven changes.
- The glacier-gate and water-bound rulings, to the user.

## When Is This Done

- P1-P4 answered with per-seed numbers: a character baseline for the current build, the mechanisms'
  measured contributions, and a verdict on which metrics discriminate — or diminishing returns, or
  probes surprise us and the scope morph is recorded in evidence.md.
- The plane audit stays zero-violation on every run, and the alignment columns are reported alongside
  the character ones so nothing is adopted blind to the standing objective.

## Graduation Path

A promising outcome is a character baseline plus evidence that one or more rung-5/6 levers move the
character metrics at a defensible cost to length and alignment. Those levers then graduate into a
separate semi-test-driven change (rung 5's trio; rung 6's deviation penalty with its spec delta),
measured against this diagnostic's baseline columns. This change itself never lands specs.