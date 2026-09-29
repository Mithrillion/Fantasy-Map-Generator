## 1. Remove the underground road bias

- [x] 1.1 Add an underground connection set to the routes module, holding cell pairs belonging to the underground network, and seed it in `generate` from the locked routes that carry the underground record — so a pinned highway keeps its attractive force. Verify by inspecting the seed for a map with a locked underground route and confirming a locked surface route contributes nothing.

- [x] 1.2 Point `getUndergroundPathCost` at the underground connection set instead of the shared `connections` map, so a step costs the same whether or not a surface route covers that pair. Verify with a direct call: the same step priced with and without a surface route covering it returns the same number.

- [x] 1.3 Stop the underground pass writing its segments into the shared `connections` map, and record them in the underground set instead. Verify that `getLandPathCost` and `getWaterPathCost` are unchanged for a step the underground network covers, and that `generateUndergroundHighways` no longer references `this.connections`.

- [x] 1.4 Confirm the underground network still merges with itself: a segment already belonging to the underground network is not regenerated as a duplicate, and the existing set used for that de-duplication still has a single clear purpose. Verify via the merge behaviour of a generated network (no duplicated overlapping highway routes).

## 2. Re-aim the pinned test

- [x] 2.1 Rewrite the `underground-highways.test.ts` test that seeds a surface route and expects the underground cost to drop. It becomes the requirement's two halves: an underground step is cheaper alongside an existing underground highway, and identically priced whether or not a surface route covers the pair. Verify with `npx vitest run generators/underground-highways.test.ts` — note the vitest root is `src/`, so filters are relative to it.

- [x] 2.2 Verify the change's remaining scenarios hold as tests: generation cost is unaffected by surface routes, surface generation is unaffected by underground generation, the network still merges on a shared cell, and traversal behaviour is unchanged. Verify with the same file passing.

- [x] 2.3 Confirm no other test or source file asserts the removed behaviour. Verify with `grep -rn "reuses the already-connected discount\|connectionModifier" src/` and by reading each hit.

## 3. Verify and record the outcome

- [x] 3.1 Run the routes, journeys and IO unit suites and confirm no regressions: `npx vitest run generators services/io`. Pre-change baseline: 32 files, 375 tests, all passing.

- [x] 3.2 Confirm types and lint are clean: `npx tsc` (the project's `noEmit` is set in tsconfig) and `npx biome check src/generators/routes-generator.ts src/generators/underground-highways.test.ts`.

- [x] 3.3 Measure the effect and record it: on a map with underground generation enabled, compare the underground network before and after this change for the share of underground cells that also carry a surface route, and the change in mean shortest-path distance between subterranean-capable burgs. Record the numbers in this change's `verification.md`, together with whether endpoint selection or tunnel geometry work is needed next. This is the baseline the follow-up work is judged against.
