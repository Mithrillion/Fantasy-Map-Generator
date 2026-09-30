## 1. Setup

- [x] 1.1 Add the named attraction constant to `routes-generator.ts` and use it in `getUndergroundPathCost` only, leaving `getLandPathCost`'s own burg term untouched — verification: `getUndergroundPathCost` reads the constant, `getLandPathCost` still reads its inline 3, and `npx tsc --noEmit` is clean.
- [x] 1.2 Confirm no other call site re-implements the tunnel cost: the harness's variants are the only other place the factor appears, and they are not production code — verification: `grep -rn "burg\[next\]" src/generators/*.ts` names `getLandPathCost`, `getUndergroundPathCost` and the harness only.

## 2. Tests (write first — check off as written)

- [x] 2.1 Test "prices a tunnel step off a burg cell at the weakened attraction" in `src/generators/underground-highways.test.ts`: two equal-length steps of equal height and habitability, one onto a burg cell and one onto a plain cell, asserting the ratio is exactly `1 : 2`.
- [x] 2.2 Strengthen "does not move the surface network" in the same file to assert the *land* cost's absolute 3× burg factor, so the two terms can no longer be confused — verification: the test fails if `getLandPathCost`'s factor changes.
- [x] 2.3 Swap the harness's now-inverted variant: `force-production-back-to-3` replaces `burg-factor-2`, so the reverse control restores the old attraction on the current build — verification: the harness still runs and `replica-production` equals `baseline-production` exactly.

## 3. The change

- [x] 3.1 Set the tunnel attraction to 2 — verification: test 2.1 passes and the pinned suite is green with no edits.
- [x] 3.2 Confirm the surface network is untouched — verification: test 2.2 passes, `getLandPathCost` is byte-identical, and the harness's `control-point` / `control-point-burg` readings are unchanged from the archived run.
- [x] 3.3 Confirm the water, glacier and high-ground gates are unaffected — verification: the existing gate and high-ground tests pass unmodified, and no `Infinity` becomes finite.
- [x] 3.4 Update `docs/architecture/generation-pipeline.md` where it lists the tunnel cost terms, so the burg attraction's weight is stated — verification: the doc names the term and its value, and matches the constant in the code.

## 4. Measurement and gates

- [x] 4.1 Run the paired 8-seed protocol (production attraction 2, reverse control attraction 3, fidelity anchor) and record the per-seed and aggregate rows beside the change — verification: `replica-production` equals `baseline-production` exactly; overlap falls on every seed; exact-edge falls, corridor distance rises; length growth recorded per seed.
- [x] 4.2 Record the reverse control's exact reproduction of the pre-change production baseline, so the delta is attributable to this rung alone — verification: the control's aggregate equals the pre-change build's aggregate (0.561 / 0.297 / 6386).
- [x] 4.3 Run the real-map plane audit on the new geometry — verification: zero violations on all 8 seeds, and `repairs=0` (the service repair must not be carrying the rung).
- [x] 4.4 Decide adoption against D13 and record the outcome in the change's verification notes — verification: the notes state the delta, the trade-offs and the rung-3 decision.

## 5. Validation

- [x] 5.1 Run the full node suite (`npm run test`) — all green, with no existing test modified except 2.2's strengthening.
- [x] 5.2 Run `npx biome check src` and `npx tsc --noEmit` — clean.
- [x] 5.3 Remove the temporary harness from `src/`, restore it (with the swapped variant) to `openspec/changes/diverge-underground-network/harness/`, and confirm `npm run test` still excludes `*.dom.test.ts`.
- [x] 5.4 Update the metaplan: the checklist entry, its Status block and the rung-2 handover line reflect the measured outcome, and `openspec validate diverge-underground-network --strict` and `openspec validate weaken-underground-burg-attraction --strict` both pass.
