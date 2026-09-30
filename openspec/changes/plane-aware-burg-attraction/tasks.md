## 1. Setup

- [ ] 1.1 Extend the attraction probe helper in `src/generators/underground-highways.test.ts` to place a chosen burg *record* at the probe cell — below-level (`underground`/`subterranean`), surface-only, absent, or `removed` — instead of always writing a record-less id — verification: the helper signature is used by the re-pinned probes, and the file typechecks.
- [ ] 1.2 Map the audit field's blast radius before renaming: `grep -rn "tunnelsOnSurfaceBurgs" src/ docs/` — verification: only `plane-integrity.ts` (type, `emptyReport`, contact loop, `formatPlaneReport`) plus archived logs match; nothing else reads the field.

## 2. Tests (write first — check off as written)

- [ ] 2.1 Test "prices a tunnel step onto a below-level burg cell at the attraction" — re-pin the existing probe (`withAttractionProbe`, two destinations identical but for the burg map) for an `underground` and a `subterranean` record; quotient `UNDERGROUND_BURG_ATTRACTION` (from test-design "prices a tunnel step onto a below-level burg cell at the attraction").
- [ ] 2.2 Test "prices a surface-only burg cell exactly as a plain cell" — same probe with a record carrying no classification flags, no surface route locked; quotient 1 and the step finite (test-design, same name).
- [ ] 2.3 Test "prices a record-less burg id as a plain cell" — the probe's current arrangement (`pack.cells.burg[burgCell] = 99`, `pack.burgs = [0]`) plus a `removed: true` record; quotient 1 in both (test-design, same name).
- [ ] 2.4 Test "reports surface-only and dual-identity tunnel contact apart" — `mapFixture` with a `subterranean` burg and a surface-only burg, an underground record crossing each cell without ending there; `tunnelsOnSurfaceOnlyBurgs === 1`, `tunnelsOnDualIdentityBurgs === 1`, `violations` empty (test-design, same name).
- [ ] 2.5 Test "counts a cell carrying more than one record" — two underground records sharing a cell plus a single-record control; `tunnelCellsWithMultipleRecords === 1`, and one record visiting a cell twice counts once (test-design, same name).
- [ ] 2.6 Test "reports zero contact on a map with no burgs" — `mapFixture([])` with underground records; every contact field is 0 (test-design, same name).
- [ ] 2.7 Test "the formatted report prints each contact figure" — `formatPlaneReport` names each figure (test-design, same name).
- [ ] 2.8 Adapt the existing "counts contact without failing it" to the renamed field, leaving its asserted value unchanged — verification: a failure means the split changed the below-level direction, not just a name.
- [ ] 2.9 Integration test "a tunnel between two below-level burgs prefers a plain detour to a surface-only burg's cell" — 7×3 fixture, a surface-only burg on the direct line with a surface route locked across it; generated tunnel cells include both below-level burg cells and exclude the surface-only cell — with the test-design's documented fallback (the surface-only burg cell is not cheaper than its plain neighbour) if the grid cannot exclude it.
- [ ] 2.10 Integration test "a generated map's audit reports the split without a violation" — fixture with underground generation on and both contact kinds; split figures count the fixture's classes, `repairs` 0, `violations` empty (test-design, same name).

## 3. The change

- [ ] 3.1 Make the burg term in `getUndergroundPathCost` plane-aware: a below-level burg record keeps the attraction, a surface-only or missing/removed record prices as a plain cell — verification: tests 2.1-2.3 pass and `getLandPathCost` is byte-identical.
- [ ] 3.2 Confirm the plane-aware read did not leak into the surface cost — verification: "leaves the surface network's own burg attraction at three" and "does not move the surface network" pass with no diff to either test.
- [ ] 3.3 Split the audit's contact report (`tunnelsOnSurfaceOnlyBurgs`, `tunnelsOnDualIdentityBurgs`, `tunnelCellsWithMultipleRecords`; `surfaceRoutesOnBelowLevelCells` unchanged) and print each figure in `formatPlaneReport` — verification: tests 2.4-2.8 and 2.10 pass, and no other `PlaneReport` field changes shape.
- [ ] 3.4 Update `docs/architecture/generation-pipeline.md` where it lists the tunnel cost terms — verification: the doc states the attraction applies only to burgs with below-level presence, matching the code and the new requirement.

## 4. Measurement and gates

- [ ] 4.1 Copy the harness back to `src/generators/` and add the plane-blind reverse-control variant (divide the plane-aware factor out, multiply `pack.cells.burg[next] ? 1 : UNDERGROUND_BURG_ATTRACTION` back in), keeping the `replica-production` anchor — verification: `replica-production` equals `baseline-production` exactly.
- [ ] 4.2 Run the paired 8-seed protocol and save `measure/rung3-paired.log` — verification: both arms recorded per seed with the split contact figures, multi-record cells, overlap, exact-edge, corridor distance, served burgs and length (D5).
- [ ] 4.3 Run the real-map audit on the new geometry (`npx vitest run --config vitest.browser.config.ts generators/plane-integrity`) and save `measure/plane-audit.log` — verification: zero violations on all 8 seeds, service intact, and the `PLANES` lines carry the split contact figures.
- [ ] 4.4 Decide adoption against D13/D17 — verification: adopt when the surface-only contact and multi-record cells fall on every seed with overlap not worse and service intact; otherwise record the residual and the escalation to repulsion (D17) rather than adopting.

## 5. Verification and closure

- [ ] 5.1 Write `verification.md` with the paired per-seed table, the audit lines, the test counts and the adoption decision — verification: every claim cites `measure/rung3-paired.log`, `measure/plane-audit.log`, or a named test.
- [ ] 5.2 Remove the temporary harness from `src/` and restore it (with the new variant) to `openspec/changes/diverge-underground-network/harness/` — verification: `npm run test` no longer sees `*.dom.test.ts`, and the harness file is back under `harness/`.
- [ ] 5.3 Update the metaplan: CH6's checklist entry (outcome, floor, what it unblocks), the Status block and D17 reflect the measured result — verification: `openspec validate plane-aware-burg-attraction --strict` and `openspec validate diverge-underground-network --strict` both pass.

## 6. Test Validation (check off as each test passes)

- [ ] 6.1 Test "prices a tunnel step onto a below-level burg cell at the attraction" passes and matches spec (`underground-highways` / *A below-level settlement still attracts a tunnel*)
- [ ] 6.2 Test "prices a surface-only burg cell exactly as a plain cell" passes and matches spec (`underground-highways` / *A surface-only settlement does not attract a tunnel*)
- [ ] 6.3 Test "prices a record-less burg id as a plain cell" passes and matches spec (`underground-highways` / *A missing or removed burg record prices as no burg*)
- [ ] 6.4 Test "reports surface-only and dual-identity tunnel contact apart" passes and matches spec (`plane-integrity-audit` / *Contact on a surface-only burg is reported apart from a dual-identity burg*)
- [ ] 6.5 Test "counts a cell carrying more than one record" passes and matches spec (`plane-integrity-audit` / *A cell carrying more than one record is counted*)
- [ ] 6.6 Test "reports zero contact on a map with no burgs" passes
- [ ] 6.7 Test "the formatted report prints each contact figure" passes
- [ ] 6.8 Test "counts contact without failing it" (renamed field) passes and matches spec (`plane-integrity-audit` / *A road crossing above a subterranean burg is counted, not failed*)
- [ ] 6.9 Test "a tunnel between two below-level burgs prefers a plain detour to a surface-only burg's cell" passes (or its documented fallback assertion, recorded in `verification.md`)
- [ ] 6.10 Test "a generated map's audit reports the split without a violation" passes
- [ ] 6.11 Run the full node suite (`npm run test`) — all green, with no existing test modified except 2.1's deliberate re-pin and 2.8's field rename
- [ ] 6.12 Run the browser real-map audit (`npx vitest run --config vitest.browser.config.ts generators/plane-integrity`) — zero violations on all 8 seeds
- [ ] 6.13 Run `npx biome check src` and `npx tsc --noEmit` — clean
