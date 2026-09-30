# Tasks — select the underground pair set deliberately

## 1. Setup

- [ ] 1.1 Add `landmassWithSubterranean(count, { dualIdentity?, surfaceRoutes? })` to `src/generators/underground-highways.test.ts`, extending its existing `makePack` idiom, with fixed burg cells and passable heights
- [ ] 1.2 Add `bayWithLandDetour(ratio)` to the same file, reusing the existing bay fixture's known span geometry so the land path is a specified multiple of the direct line
- [ ] 1.3 Export the two layer thresholds as named constants in `routes-generator.ts` (`UNDERGROUND_SHORTCUT_RATIO = 1.5`, `UNDERGROUND_LONG_LINK_FLOOR`) with a comment naming the measurement that chose each, and no behaviour wired to them yet

## 2. Tests (write first — check off as written)

- [ ] 2.1 Test: `serves / fully subterranean burg is connected` (test-design, Requirement "Underground highways serve every burg they can reach")
- [ ] 2.2 Test: `serves / dual burg without a tunnel is not a violation`
- [ ] 2.3 Test: `serves / dual burg as an endpoint is valid`
- [ ] 2.4 Test: `serves / subterranean burg is reconnected` — including the dual-identity counterpart that must be left alone
- [ ] 2.5 Test: `layers / backbone tree is connected` — one component over the subterranean set, plus the five-burg line asserting exactly four pairs
- [ ] 2.6 Test: `layers / dual burg is transit` — the chain carries the dual-identity cell between its ends and does not terminate there
- [ ] 2.7 Test: `layers / shortcut admitted above threshold` — the 1.49x / 1.5x boundary pair pinned from both sides
- [ ] 2.8 Test: `layers / no pair for two served burgs` — asserted on the admitted set, not on the network
- [ ] 2.9 Test: `layers / long link admitted at the floor` — at the floor and just below it
- [ ] 2.10 Test: `layers / thresholds are named and documented` — both constants exported, each carrying its justifying measurement
- [ ] 2.11 Test: edge cases — lone below-level burg on a landmass; landmass with no fully subterranean burgs; a null surface path admitted by the `surfacePath === null` branch; a pair admitted by two layers routed once; a floor above every observed separation
- [ ] 2.12 Integration test: `integration / coverage across all eight seeds` — the narrowed contract on the 8-seed protocol
- [ ] 2.13 Integration test: `integration / shadowing does not regress` — `roadCopiesExpanded` ≤ 6.9/seed mean, no seed more than one above its baseline
- [ ] 2.14 Integration test: `integration / directness does not regress` — mean ≤ 1.28, no seed above 1.5
- [ ] 2.15 Integration test: `integration / network shrinks toward the floor` — records and cells inside the 25.1–67.3 / 394–458 band
- [ ] 2.16 Integration test: `integration / surface network is untouched` — surface route set identical with underground generation on and off
- [ ] 2.17 Integration test: `integration / layers do not alter routing` — one pair, one chain, whichever layer admitted it

## 3. Core Implementation

- [ ] 3.1 Narrow the eligibility predicate: replace `hasBelowLevelPresence` as the pair-set gate with a classification-aware reader that distinguishes fully subterranean from dual-identity burgs (`burg.underground` versus `burg.subterranean`), leaving the endpoint rule itself untouched
- [ ] 3.2 Implement layer 1 (backbone): one tree per feature over the fully subterranean burgs, with dual-identity burgs admissible as transit nodes, and no edge whose two ends are both dual-identity
- [ ] 3.3 Implement layer 2 (shortcut): admit a pair when the surface path between its burgs is `null` or at least `UNDERGROUND_SHORTCUT_RATIO` times the straight-line distance, measuring the surface path through the generated surface records
- [ ] 3.4 Implement layer 3 (long link): admit capped pairs between fully subterranean burgs separated by at least `UNDERGROUND_LONG_LINK_FLOOR`
- [ ] 3.5 Combine the layers into one de-duplicated pair set keyed on the unordered pair, recording which layer justified each pair for reporting
- [ ] 3.6 Narrow the service repair pass to fully subterranean burgs, so a dual-identity burg left without a tunnel is no longer reconnected
- [ ] 3.7 Report per-seed on the 8-seed protocol: admitted pairs per layer, coverage, records, cells, length, directness, and `roadCopiesExpanded`
- [ ] 3.8 Tune `UNDERGROUND_LONG_LINK_FLOOR` against the observed burg distance distribution and record the chosen value with its justification in the change notes

## 4. Test Validation

- [ ] 4.1 Test "serves / fully subterranean burg is connected" passes and matches spec
- [ ] 4.2 Test "serves / dual burg without a tunnel is not a violation" passes and matches spec
- [ ] 4.3 Test "serves / dual burg as an endpoint is valid" passes and matches spec
- [ ] 4.4 Test "serves / subterranean burg is reconnected" passes and matches spec
- [ ] 4.5 Test "layers / backbone tree is connected" passes and matches spec
- [ ] 4.6 Test "layers / dual burg is transit" passes and matches spec
- [ ] 4.7 Test "layers / shortcut admitted above threshold" passes and matches spec
- [ ] 4.8 Test "layers / no pair for two served burgs" passes and matches spec
- [ ] 4.9 Test "layers / long link admitted at the floor" passes and matches spec
- [ ] 4.10 Test "layers / thresholds are named and documented" passes and matches spec
- [ ] 4.11 Edge-case tests pass and match spec
- [ ] 4.12 Integration test "coverage across all eight seeds" passes and matches spec
- [ ] 4.13 Integration test "shadowing does not regress" passes and matches spec
- [ ] 4.14 Integration test "directness does not regress" passes and matches spec
- [ ] 4.15 Integration test "network shrinks toward the floor" passes and matches spec
- [ ] 4.16 Integration test "surface network is untouched" passes and matches spec
- [ ] 4.17 Integration test "layers do not alter routing" passes and matches spec
- [ ] 4.18 Run full test suite — all green
- [ ] 4.19 Verify coverage thresholds met: every testable scenario in `specs/underground-highways/spec.md` has a passing test, and the diagnostic harness is removed from `src/` with the updated copy kept in the change
