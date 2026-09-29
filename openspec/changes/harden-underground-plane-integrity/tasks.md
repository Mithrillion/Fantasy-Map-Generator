## 1. Setup

- [ ] 1.1 Create `src/generators/plane-integrity.ts` with the `PlaneReport` / `PlaneViolation` types and a stub `auditPlanes(pack, routes)` returning an empty report, so the audit tests can import it first — verification: `npx vitest run generators/plane-integrity.test.ts` imports the module without error and the module has no DOM import.
- [ ] 1.2 Extract the editor's record-level operations into pure, exported helpers in `src/controllers/route-editor.ts` — `splitRoute(route, index)` returning both halves, `canJoinRoutes(route, joined)` — and have the existing editor closures call them with no behaviour change yet — verification: the existing `src/controllers/route-editor.test.ts` stays green.
- [ ] 1.3 Add the browser scaffold `src/generators/plane-integrity.dom.test.ts` with the archived harness's bootstrap (a `FlatQueue` stub exposing `peekValue()`, `import "./index"`, the `options` global, `globalThis.tip = () => {}`) and a single `measure-a` run printing the report — verification: `HOME=/tmp/dsh-home CHROMIUM_PATH=/usr/bin/chromium npx vitest run --config vitest.browser.config.ts generators/plane-integrity` passes (a writable `HOME` is required, otherwise Playwright fails at `createContext`).

## 2. Tests (write first — check off as written)

- [ ] 2.1 Test "never begins or ends an underground highway on a surface burg's cell" in `src/generators/underground-highways.test.ts` (from test-design *underground-highways*).
- [ ] 2.2 Test "keeps a stretch whose junction sits on a surface burg's cell" in `src/generators/underground-highways.test.ts`.
- [ ] 2.3 Test "keeps a highway whose boundary is a junction, so an interior burg stays connected" in `src/generators/underground-highways.test.ts`.
- [ ] 2.4 Test "reconnects a burg the network left out" in `src/generators/underground-highways.test.ts`.
- [ ] 2.5 Test "leaves a lone below-level burg unconnected, and does not hand it a surface route" in `src/generators/underground-highways.test.ts`.
- [ ] 2.6 Test "never begins or ends a surface record at a fully subterranean burg" in `src/generators/underground-highways.test.ts`.
- [ ] 2.7 Test "keeps every cell of a surface path when the boundary moves" in `src/generators/underground-highways.test.ts`.
- [ ] 2.8 Test "does not move the surface network" in `src/generators/underground-highways.test.ts`.
- [ ] 2.9 Test "splitting an underground highway keeps both halves underground" in `src/controllers/route-editor.test.ts` (from test-design *route-editor*).
- [ ] 2.10 Test "splitting a surface route keeps both halves on the surface" in `src/controllers/route-editor.test.ts`.
- [ ] 2.11 Test "refuses a join across planes" in `src/controllers/route-editor.test.ts`.
- [ ] 2.12 Test "no edit sequence leaves a below-level burg a surface endpoint" in `src/controllers/route-editor.test.ts`, importing the audit.
- [ ] 2.13 Test "a surface record ending at a below-level burg is a violation" in the new `src/generators/plane-integrity.test.ts`, with the `mapFixture()` builder and `recordAt(...)` shorthand (from test-design *plane-integrity-audit*).
- [ ] 2.14 Test "an underground highway ending on a surface burg's cell is a violation" in `src/generators/plane-integrity.test.ts`.
- [ ] 2.15 Test "a merged boundary is reported as a junction, not a violation" in `src/generators/plane-integrity.test.ts`.
- [ ] 2.16 Test "a below-level burg without a connection is a service violation" in `src/generators/plane-integrity.test.ts`.
- [ ] 2.17 Test "a lone below-level burg is not a service violation" in `src/generators/plane-integrity.test.ts`.
- [ ] 2.18 Test "contact is counted, not failed" in `src/generators/plane-integrity.test.ts`.
- [ ] 2.19 Test "tolerates degenerate records" in `src/generators/plane-integrity.test.ts` (one-point records, duplicated trailing cells, missing `points`).
- [ ] 2.20 Browser test "a clean generated map passes the real-map audit" in `src/generators/plane-integrity.dom.test.ts`: seeds `measure-a` … `measure-h`, `continents` template, underground generation on, asserting zero violations per seed and logging one summary line per seed.

## 3. Boundary rule (both planes)

- [ ] 3.1 Add the boundary predicate to `routes-generator.ts`: a cell is a legitimate boundary for a plane when it carries no burg, or a burg whose presence matches that plane (ground-level for surface, below-level for underground) — verification: the predicate is exercised by tests 2.1, 2.2, 2.6.
- [ ] 3.2 Apply it in `getRouteSegments`: when a segment would begin or end on a mismatched burg cell, move the boundary one cell further into the already-covered stretch and repeat, so the step is duplicated rather than dropped — verification: tests 2.6, 2.7.
- [ ] 3.3 Apply the same rule in `getUndergroundSegments` — verification: tests 2.1, 2.2, 3.
- [ ] 3.4 Keep the existing "drop a stretch shorter than two cells" rule and confirm it can only fire when every step of the stretch is already covered — verification: test 2.7 plus the existing merge tests at `underground-highways.test.ts:393-400`.
- [ ] 3.5 Confirm no cost function changed: `getLandPathCost`, `getWaterPathCost` and `getUndergroundPathCost` are untouched, so the surface network still occupies the same cells — verification: test 2.8 and the existing cost tests.

## 4. Prune and the service guarantee

- [ ] 4.1 Make `pruneUndergroundHighways` judge a boundary by whether a surviving underground highway continues through that cell, instead of by the burg at the cell alone, keeping the removed/reclassified-burg rule — verification: tests 2.3 and the existing prune tests at `underground-highways.test.ts:415-480`.
- [ ] 4.2 Add the repair pass after prune: for every burg with below-level presence that has no underground link while another such burg shares its landmass, path to the nearest connected below-level burg with the production tunnel cost, append the stretch, and count the repairs — verification: test 2.4.
- [ ] 4.3 Leave the lone-burg case alone: no pair on the landmass means no repair and no surface route in exchange — verification: test 2.5.
- [ ] 4.4 Keep the repair inside the water and habitability gates (it uses the production cost), and confirm it never crosses the strait — verification: test 2.5 plus the existing "never runs through water" test.

## 5. Editor

- [ ] 5.1 Have `splitRoute` carry the source record's `underground` flag onto the new half and rebuild both halves' links — verification: tests 2.9, 2.10.
- [ ] 5.2 Have `joinRoutes` refuse a cross-plane join with the editor's existing rejection tip, leaving both records untouched — verification: test 2.11.
- [ ] 5.3 Confirm no other editor path changes a record's plane (drag, remove, group edit, overview bulk removal) — verification: test 2.12.

## 6. Audit

- [ ] 6.1 Implement `auditPlanes` in `src/generators/plane-integrity.ts`: burg census by classification, per-burg record-boundary planes, per-burg underground connections, boundary classification as junction or terminus, and violations — reading `pack.routes` geometry rather than `cells.routes` ids, because `buildLinks` is last-writer-wins over the route list — verification: tests 2.13, 2.14, 2.15.
- [ ] 6.2 Implement the service classification: an unserved below-level burg sharing its landmass is a violation, a lone one is reported as unconnectable — verification: tests 2.16, 2.17.
- [ ] 6.3 Implement the contact counters with their precision labelled (exact for tunnels crossing surface burg cells, a lower bound for surface routes crossing below-level cells) — verification: test 2.18.
- [ ] 6.4 Add the one-line report formatter the browser test logs, so a drifting number is visible in CI output — verification: the `measure-a` run in 1.3 prints it.
- [ ] 6.5 Make the audit tolerate degenerate records — verification: test 2.19.

## 7. Real-map audit, CI and the mutation check

- [ ] 7.1 Run the browser audit over the 8 seeds and record the per-seed report beside the change — verification: zero violations on every seed, and the numbers compared against the 2026-09-29 baseline (41 boundaries on below-level cells, 50 of 682 below-level burgs unserved, contact 178/682 and 1059/6114).
- [ ] 7.2 Mutation check: deliberately disable one rule (the underground boundary resolution, then the prune junction test), run the real-map audit, capture the failing output naming seed, burg and route, restore, and re-run green — verification: the captured failure text is recorded in the change's verification notes.
- [ ] 7.3 Add the audit step to `.github/workflows/playwright.yml` after the existing Chromium install, running the browser config for the audit file — verification: the workflow parses (`npx --yes yaml-lint` or a read-through) and the command is the one that ran green locally.
- [ ] 7.4 Update `docs/architecture/generation-pipeline.md` where it describes the underground pass, so it states the boundary rule, the junction-aware prune and the service repair — verification: the doc names all three and matches the code's constants.

## 8. Test Validation (check off as each test passes)

- [ ] 8.1 Test "never begins or ends an underground highway on a surface burg's cell" passes and matches spec
- [ ] 8.2 Test "keeps a stretch whose junction sits on a surface burg's cell" passes and matches spec
- [ ] 8.3 Test "keeps a highway whose boundary is a junction, so an interior burg stays connected" passes and matches spec
- [ ] 8.4 Test "reconnects a burg the network left out" passes and matches spec
- [ ] 8.5 Test "leaves a lone below-level burg unconnected, and does not hand it a surface route" passes and matches spec
- [ ] 8.6 Test "never begins or ends a surface record at a fully subterranean burg" passes and matches spec
- [ ] 8.7 Test "keeps every cell of a surface path when the boundary moves" passes and matches spec
- [ ] 8.8 Test "does not move the surface network" passes and matches spec
- [ ] 8.9 Test "splitting an underground highway keeps both halves underground" passes and matches spec
- [ ] 8.10 Test "splitting a surface route keeps both halves on the surface" passes and matches spec
- [ ] 8.11 Test "refuses a join across planes" passes and matches spec
- [ ] 8.12 Test "no edit sequence leaves a below-level burg a surface endpoint" passes and matches spec
- [ ] 8.13 Test "a surface record ending at a below-level burg is a violation" passes and matches spec
- [ ] 8.14 Test "an underground highway ending on a surface burg's cell is a violation" passes and matches spec
- [ ] 8.15 Test "a merged boundary is reported as a junction, not a violation" passes and matches spec
- [ ] 8.16 Test "a below-level burg without a connection is a service violation" passes and matches spec
- [ ] 8.17 Test "a lone below-level burg is not a service violation" passes and matches spec
- [ ] 8.18 Test "contact is counted, not failed" passes and matches spec
- [ ] 8.19 Test "tolerates degenerate records" passes and matches spec
- [ ] 8.20 Browser test "a clean generated map passes the real-map audit" passes and matches spec
- [ ] 8.21 Run the full node suite (`npm run test`) — all green, including the suites this change does not touch
- [ ] 8.22 Run `npx biome check src` and `npx tsc --noEmit` — clean
- [ ] 8.23 Run the audit under the exact command the CI step uses, and confirm `npm run test` still excludes `*.dom.test.ts`
- [ ] 8.24 Confirm the coverage signal: `vitest.config.ts` defines no coverage thresholds, so the change's regression signal is the audit's per-seed report — verify both statements still hold, and that `openspec validate harden-underground-plane-integrity --strict` passes
