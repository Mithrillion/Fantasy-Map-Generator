## 1. Research & Discovery

- [x] 1.1 Establish the **control floor**: with the current burg pairs and a distance-only cost (water and uninhabitable gates kept, no terrain term, no discount), what overlap share does the underground pass produce? This is the geometric floor for the present pair set and the number every path-level lever is judged against. (Verify: a `### F1.1 — Control floor` entry in `metaplan.md` with the per-seed and mean numbers, the seeds used, and the exact variant definition.)

- [x] 1.2 Measure the **corridor distribution** of tunnel cells: histogram of BFS distance over `pack.cells.c` from each underground cell to the nearest surface-route cell (0 / 1 / 2 / 3+), and the same for the control network from 1.1. (Verify: `### F1.2 — Corridor distribution` in `metaplan.md` with both histograms, which decides whether a local penalty can reach road-free cells or only long detours can.)

- [x] 1.3 Measure the **endpoint band**: what share of the shared cells are the first or last two cells of a route, split by whether the endpoint burg is dual-identity or fully subterranean. (Verify: `### F1.3 — Endpoint band` in `metaplan.md` with the share and the route count it rests on.)

- [x] 1.4 Define and measure the metric that matches the objective: **parallel-alignment share** — the length-weighted share of an underground route that runs within ~30° of a surface route while staying within one cell of it — giving both the current value and the control value. (Verify: `### F1.4 — Parallel alignment` in `metaplan.md` with the metric definition, the current and control values, and whether the metric separates the two networks where the current cell-share metric does not.)

- [x] 1.5 Measure **room in the actual corridors**: for the burg pairs the generator really picks, the share of each corridor that is already covered by a surface route — replacing the band averages from the fixture analysis with a current-build, per-pair distribution. (Verify: `### F1.5 — Per-pair corridor room` in `metaplan.md` with the distribution and the pairs it covers.)

- [x] 1.6 Understand the **geometry path** a display-level or geometry-level lever would have to touch: how `getPoints` mutates shared cell coordinates for sharp angles, what a second curve would require in `Routes.getPath`/`ROUTE_CURVES`, and whether an underground-only point preparation can exist without changing surface geometry. (Verify: `### F1.6 — Geometry surface` in `metaplan.md` naming the call sites, what is shared with the surface plane, and what a tunnel-only treatment can be built on.)

- [x] 1.7 Understand **cost and merge behaviour under longer connections**: how the underground pass de-duplicates and merges, what total network length and generation time a trunk network would imply, and whether `pruneUndergroundHighways` and the junction-cell rule still hold for long routes. (Verify: `### F1.7 — Long-route behaviour` in `metaplan.md` with the measured generation cost and the merge/junction consequences.)

- [x] 1.8 Inventory the **tests and docs that pin behaviour a lever would change** — in particular the direct `getUndergroundPathCost` calls in `underground-highways.test.ts` (which constrain how a precomputed terrain field may be introduced) and `docs/architecture/generation-pipeline.md:242`, which still describes the discount as reused and is stale since `separate-underground-connections`. (Verify: `### F1.8 — Pinned behaviour inventory` in `metaplan.md` listing each test and doc line, what it pins, and whether the lever would legitimately change it.)

## 2. Decisions

- [x] 2.1 **Decision: what counts as success.** The rendered look in both-mode, the parallel-alignment share, or corridor distance. Consider that the cell-share metric cannot express "running alongside" and that a realignment of the metric changes which lever looks best. (Verify: a recorded decision with rationale in `metaplan.md`, and the authoritative metric named.)

- [x] 2.2 **Decision: which family gets the first child change** — path, topology or display — given 1.1 (floor), 1.2 (room) and 1.4 (metric). Consider that a floor within ~10% of the baseline removes path shaping from contention. (Verify: recorded decision naming the first child change and the evidence that selected it.)

- [x] 2.3 **Decision: the terrain signal.** Per-cell height as today, versus a smoothed depth field computed once per map. Consider the threshold analysis (a ~4% cost difference diverts a nine-step path by one cell, ~16% by two), the direct-call tests from 1.8, and whether smoothing changes the pinned "prefers high ground" scenarios. (Verify: recorded decision with the cost shape it implies and the test consequences.)

- [x] 2.4 **Decision: endpoint (gate) divergence.** Whether a tunnel leaves a burg through a gate cell chosen away from surface routes, how the gate is chosen, and whether the burg cell remains the route endpoint. Consider the endpoint requirement in `openspec/specs/underground-highways/spec.md` and the prune rule that reads the route's end cells. (Verify: recorded decision with the selection rule and its spec compatibility.)

- [x] 2.5 **Decision: the topology variant**, if topology work is reached. Urquhart minus short edges with an MST-style backbone, trunk-and-spurs over the highest subterranean burgs per landmass, or one hub per landmass — together with the guarantee to pin: every subterranean-capable burg on a landmass with at least two of them keeps at least one highway. (Verify: recorded decision with the variant, the tunable that sets its sparsity, and the connectivity guarantee.)

- [x] 2.6 **Decision: the evidence standard.** How many seeds and which ones constitute sufficient evidence, and the pre-registered go/no-go thresholds for adopting a lever (for example: adopt at a five-point objective improvement with no more than a 15% length increase). Consider that three seeds produced unreachable-pair swings of 79 → 234 → 81 in the archived run. (Verify: recorded thresholds in `metaplan.md`, fixed before any variant is measured.)

- [x] 2.7 **Decision: what happens if nothing has headroom.** Whether to stop at display-level separation, accept the current network, or re-open the objective. (Verify: recorded decision with the condition that triggers it.)

## 3. Prototypes & Spikes

- [x] 3.1 **Spike: rebuild the measurement harness** as a temporary `src/generators/underground-measure.dom.test.ts` under `vitest.browser.config.ts`, with baseline reproduction first, then the control, the corridor histogram, the endpoint split and the parallel-alignment metric, on the seed count fixed by 2.6. No production code changes; the file is removed afterwards and its content recorded. (Verify: harness output recorded as `### F1.1`–`### F1.4` in `metaplan.md`, baseline reproducing the archived ~71.8% overlap within seed noise.)

- [x] 3.2 **Spike: the path variants in the harness** — gate divergence, the smoothed depth field, and road avoidance, each measured against the baseline and the control on the same seeds. Real pass, patched cost and endpoints only, so the numbers describe production behaviour rather than a replica. (Verify: per-variant numbers in `metaplan.md` under the entry for 2.2's chosen family, including the length cost of each variant.)

- [x] 3.3 **Spike: the topology variants in the harness** — long connections with a backbone, and trunk-and-spurs — measuring the objective metrics, total network length, generation time, and whether every subterranean-capable burg stays connected on its landmass. (Verify: comparison table in `metaplan.md` under `### F3.3`, with the connectivity question answered by construction (MST backbone; trunk MST plus nearest-trunk spokes) and the realized endpoint-service share measured per variant — the gap, a per-seed component re-check, is recorded in that entry rather than papered over.)

- [-] 3.4 **Spike: display-only separation** — how much perceived separation a tunnel-only curve, perpendicular offset, dashing or portal mark gives in both-mode, checked in the running app rather than measured in cells. (Verify: a recorded judgement with the treatment tried and whether it meets the design objective on its own.) (superseded by D15: the user ruled styling is not the issue, so no display-only treatment is worth judging.)

## 4. Stakeholder & Context Gathering

- [x] 4.1 **Consult the user on the underground plane's role**: is it the same settlements mirrored below, or a distinct deep geography that need not serve every burg? The answer bounds how far topology may diverge from the settlement graph and whether trunk-and-spurs is desirable at all. (Verify: a recorded answer in `metaplan.md` under `### F4.1`, tagged as user input with its date.)

- [x] 4.2 **Establish what display separation already exists** without code: how the underground layers are styled today, what the style editor can change, and what both-mode does with z-order, dash and opacity. (Verify: `### F4.2` in `metaplan.md` listing the available style levers and which of them can be set by a user without any change.)

- [x] 4.3 **Reconcile the architecture docs with the last change** and confirm no other document still describes the removed road discount. (Verify: `### F4.3` in `metaplan.md` listing every stale line found, with the fix handed to the child change that touches docs.)
