# Tasks — select the underground pair set deliberately

## 1. Setup

- [x] 1.1 Add `landmassWithSubterranean(count, { dualIdentity?, dualCells?, layout?, surfaceRoutes? })` to `src/generators/underground-highways.test.ts`, extending its existing `makePack` idiom, with fixed burg cells and passable heights
- [x] 1.2 Add `bayWithLandDetour(ratio)` to the same file, reusing the existing bay fixture's known span geometry so the land path is a specified multiple of the direct line
- [x] 1.3 Export the shortcut threshold as a named constant in `routes-generator.ts` (`UNDERGROUND_SHORTCUT_RATIO = 1.5`) with a comment naming the measurement that chose it

## 2. Tests (write first — check off as written)

- [x] 2.1 Test: `serves / fully subterranean burg is connected` (test-design, Requirement "Underground highways serve every burg they can reach")
- [x] 2.2 Test: `serves / dual burg without a tunnel is not a violation`
- [x] 2.3 Test: `serves / dual burg as an endpoint is valid`
- [x] 2.4 Test: `serves / subterranean burg is reconnected` — including the dual-identity counterpart that must be left alone
- [x] 2.5 Test: `layers / backbone tree is connected` — one component over the subterranean set, plus the five-burg line asserting exactly four pairs
- [x] 2.6 Test: `layers / dual burg is transit` — the chain carries the dual-identity cell between its ends and does not terminate there
- [x] 2.7 Test: `layers / shortcut admitted above threshold` — the 1.49x / 1.5x boundary pair pinned from both sides
- [x] 2.8 Test: `layers / no pair for two served burgs` — asserted on the admitted set, not on the network
- [x] 2.9 Test: `layers / dual burg that carries no path is not a backbone pair` — the leaf rule the scenario "A dual-identity burg is not attached for its own sake" asks for
- [x] 2.10 Test: `layers / thresholds are named and documented` — the constant exported, carrying its justifying measurement
- [x] 2.11 Test: edge cases — lone below-level burg on a landmass; landmass with no fully subterranean burgs; a null surface path admitted by the `surfacePath === null` branch; a pair admitted by two layers routed once; a dual burg between two clusters that is transit and not an endpoint
- [x] 2.12 Integration test: `integration / coverage across all eight seeds` — the narrowed contract on the 8-seed protocol
- [x] 2.13 Integration test: `integration / shadowing does not regress` — `roadCopiesExpanded` ≤ 6.9/seed mean, no seed more than one above its baseline
- [x] 2.14 Integration test: `integration / directness does not regress` — mean ≤ 1.28, no seed above 1.5
- [x] 2.15 Integration test: `integration / network shrinks toward the floor` — records and cells inside the 25.1–67.3 / 394–458 band
- [x] 2.16 Integration test: `integration / surface network is untouched` — surface route set identical with underground generation on and off
- [x] 2.17 Integration test: `integration / layers do not alter routing` — one pair, one chain, whichever layer admitted it

## 3. Core Implementation

- [x] 3.1 Narrow the eligibility predicate: replace `hasBelowLevelPresence` as the pair-set gate with a classification-aware reader that distinguishes fully subterranean from dual-identity burgs (`burg.underground` versus `burg.subterranean`), leaving the endpoint rule itself untouched
- [x] 3.2 Implement layer 1 (backbone): one tree per feature over the fully subterranean burgs, with dual-identity burgs kept only where they carry a path between two deep burgs, and no edge whose two ends are both dual-identity
- [x] 3.3 Implement layer 2 (shortcut): admit a pair when the surface path between its burgs is `null` or at least `UNDERGROUND_SHORTCUT_RATIO` times the straight-line distance, measuring the surface path through the generated surface records
- [x] 3.4 Combine the layers into one de-duplicated pair set keyed on the unordered pair, recording which layer justified each pair for reporting
- [x] 3.5 Narrow the service repair pass to fully subterranean burgs, so a dual-identity burg left without a tunnel is no longer reconnected
- [x] 3.6 Narrow the audit's service rule to fully subterranean burgs, so a dual-identity burg without a tunnel is not reported as a violation
- [x] 3.7 Report per-seed on the 8-seed protocol: admitted pairs per layer, coverage, records, cells, length, directness, and `roadCopiesExpanded` (harness `ROW`/`AGG` lines, kept in `measure/pairset-policy.log`)

## 4. Test Validation

- [x] 4.1 Test "serves / fully subterranean burg is connected" passes and matches spec
- [x] 4.2 Test "serves / dual burg without a tunnel is not a violation" passes and matches spec
- [x] 4.3 Test "serves / dual burg as an endpoint is valid" passes and matches spec
- [x] 4.4 Test "serves / subterranean burg is reconnected" passes and matches spec
- [x] 4.5 Test "layers / backbone tree is connected" passes and matches spec
- [x] 4.6 Test "layers / dual burg is transit" passes and matches spec
- [x] 4.7 Test "layers / shortcut admitted above threshold" passes and matches spec
- [x] 4.8 Test "layers / no pair for two served burgs" passes and matches spec
- [x] 4.9 Test "layers / dual burg that carries no path is not a backbone pair" passes and matches spec
- [x] 4.10 Test "layers / thresholds are named and documented" passes and matches spec
- [x] 4.11 Edge-case tests pass and match spec
- [x] 4.12 Integration test "coverage across all eight seeds" passes and matches spec — 42.6 deep burgs/seed, 0 uncovered, 0 service violations, 0 boundary violations, 0 repairs
- [x] 4.13 Integration test "shadowing does not regress" passes and matches spec — mean 5.13 (≤ 6.9), no seed above its own baseline by more than one
- [x] 4.14 Integration test "directness does not regress" passes and matches spec — mean 1.196 (≤ 1.28), worst seed 1.369 (≤ 1.5)
- [x] 4.15 Integration test "network shrinks toward the floor" passes and matches spec — 54.0 records / 429.9 cells, inside 25.1–67.3 / 394–458
- [x] 4.16 Integration test "surface network is untouched" passes and matches spec — identical on all eight seeds
- [x] 4.17 Integration test "layers do not alter routing" passes and matches spec — the admitted pair set is order-independent and a pair routes one chain
- [x] 4.18 Run full test suite — all green
- [x] 4.19 Verify coverage thresholds met: every testable scenario in `specs/underground-highways/spec.md` has a passing test, and the diagnostic harness is removed from `src/` with the updated copy kept in the change

## Deferred to a follow-up change

- The **long link layer** (design D4): a bounded number of pairs between distant fully subterranean burgs
  admitted by a distance floor. Measured on the 8-seed protocol, two pairs per seed cost seventeen records
  (81.5 records with the layer against 54.0 without), because a long path is cut into stretches where it
  meets the existing network, and no cap brought the network back inside the band (cap 1: 73.3 records;
  routing the long pairs first: 75.0 records / 525.1 cells). The measurements the follow-up needs are in
  `measure/pairset-policy.log`: the deep-burg separation distribution per seed (`DIST`), the layer's
  standalone cost (`deferred-long-link`: 7.9 records / 119.6 cells for two pairs) and its combined cost
  (`deferred-all`: 81.5 records / 473.8 cells / 7.38 shadowing).
