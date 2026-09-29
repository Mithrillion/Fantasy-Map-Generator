## Why

The underground network still reads as a copy of the overground routes: 70.8% of underground cells also carry a surface route, and 32.6% of underground *length* runs on steps that literally *are* a surface route step (measured over 8 seeds, 2026-09-29, harness in `openspec/changes/diverge-underground-network/harness/`). The diagnostic that change produced located the cause: the tunnel cost currently rewards exactly what the surface network does — it makes every cell without a burg three times as expensive, so tunnels thread through the same settlements the roads converge on, and nothing in the cost ever notices a road.

This is the first rung of a ladder agreed with the user (`diverge-underground-network` — D13, D16): a bounded surface-separation term in the tunnel cost. On the diagnostic it is the best effect per unit of network growth of every lever measured — 14.8 points of overlap for 8.4% more tunnel length, against 13.1 points for 19.3% when the burg attraction is removed instead — and it is the only rung whose worst seed stays inside 15% growth.

## What Changes

- The underground generation cost gains a **surface-separation term**: a tunnel step near the surface network costs more than the same step away from it, with the penalty decaying over roughly two cells and bounded beyond that. On the diagnostic this takes overlap from 0.708 to 0.560, exact-edge sharing from 0.326 to 0.208, and mean corridor distance from 0.37 to 0.57 cells.
- **BREAKING (requirement only, not data)**: the requirement *Underground connectivity is self-contained* currently pins that a tunnel step costs *the same* whether or not a surface route covers it, and `underground-highways.test.ts` asserts that equality. This change splits the rule: a surface route SHALL NOT **lower** a tunnel's generation cost (unchanged — the discount still comes from the underground network alone), and MAY **raise** it under the new separation rule. The equality assertion is re-aimed accordingly.
- A new requirement states the separation rule itself: the penalty is bounded, decays with distance, and never makes a step impassable.
- No change to endpoint eligibility, the water and landmass constraints, the terrain preference, the network's merge behaviour, traversal, the save format, or the display.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `underground-highways`: *Underground connectivity is self-contained* is re-scoped from "a surface route changes nothing" to "a surface route never lowers the cost"; a new requirement, *Underground highways keep clear of the surface network's corridors*, states the separation rule and its bounds. The existing endpoint, water, terrain, traversal and rebuild requirements are unchanged.

## Impact

- **Generation**: `src/generators/routes-generator.ts` — `getUndergroundPathCost` gains the separation factor; `generateUndergroundHighways` builds a bounded BFS distance field from the surface routes before it paths, so the field is per-generation state like `undergroundConnections`.
- **Tests**: `src/generators/underground-highways.test.ts` — the equality test at `:215-228` becomes the two halves of the re-scoped requirement (a surface route never lowers the cost; it does raise it near the corridor), plus bounds tests for the new term.
- **Specs**: `openspec/specs/underground-highways/spec.md` via the delta in this change.
- **Docs**: `docs/architecture/generation-pipeline.md:242` still lists the old cost model ("the already-connected discount reused") and gains the separation term in the same sentence.
- **Generated geometry changes on every map with underground generation enabled** — intended, and the point of the change. Maps regenerate deterministically from their seed; nothing saved becomes invalid.
- **Cost**: the diagnostic measured the pass at 4-32 ms per map; the BFS field adds one linear pass over the cell graph.
- **No new dependencies.**
