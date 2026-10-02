## 1. Plane predicate plumbing

- [x] 1.1 Add a plane-driven presence predicate parameter to `getCellAnchor` and `preparePointsArray` (ground-level presence for surface passes, below-level for tunnel passes) and anchor only at burgs of the pass's plane; verify the tunnel/surface anchor scenarios of the anchoring requirement in unit fixtures (`src/generators/underground-highways.test.ts`, `src/generators/routes-generator.test.ts`)
- [x] 1.2 Keep `getWaterPoints` and `Routes.connect` on the ground-presence predicate and verify port anchoring is byte-identical to today's output in the routes-generator tests

## 2. Smoothing gate

- [x] 2.1 Key the sharp-angle gate in `getPoints` on the same pass predicate, so plane-foreign burg cells resolve kinks and plane-true burg cells keep the burg's position; verify both smoothing scenarios in a routes-generator test fixture

## 3. Surface cost discount

- [x] 3.1 Apply the ground-presence predicate to the burg discount term in `getLandPathCost` and verify a below-level burg's cell costs as a no-burg cell while a dual burg's cell keeps its factor (`underground-highways.test.ts` scenario comparisons)

## 4. Route naming

- [x] 4.1 Filter `getBurgName`'s anchor scan by the route record's plane predicate and verify a surface record is not named after a buried burg and a tunnel not after a surface burg

## 5. Regression and evidence

- [x] 5.1 Confirm the existing "generates the surface network as if the plane were off" invariance test still passes together with the full `routes-generator` and `underground-highways` suites (`pnpm test src/generators`)
- [x] 5.2 Add the both-state display scenario check (tunnel geometry does not pin to an unconnected surface burg's icon) to the display-focused tests and run the renderer suite (`pnpm test src/renderers`)
- [x] 5.3 Optional informative spike: count interior anchor flips on a seed batch and record the number in this change's notes; no acceptance gate
- [x] 5.4 Run `openspec validate --change plane-true-anchors` and the project lint/type-check before handoff
