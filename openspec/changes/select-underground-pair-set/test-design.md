# Test design — select the underground pair set deliberately

Every testable scenario from `specs/underground-highways/spec.md`, with the test that verifies it. Tests
are named after the requirement and scenario so a reader can go from a failure to the spec line.

## Scope of testing

The change is a **selection** change: the routing cost, water bound, glacier gate, separation term and
plane rules are untouched, so their existing suites stay green and are not re-designed here. What needs
new tests is (a) the narrowed service contract, and (b) the three-layer pair policy and its boundaries.

Two levels are used:

- **Unit / fixture tests** over constructed packs, for the policy boundaries and the coverage rule. These
  are cheap and exact, and they are where the threshold behaviour is pinned.
- **The 8-seed paired protocol** (the diagnostic harness, `VITE_MEASURE_SEEDS` a–h), for the properties
  that only exist at map scale: coverage per landmass, threshold admission counts, shadowing regression,
  and directness. This protocol is the acceptance gate; the fixture tests are the contract.

## Unit tests

### Requirement: Underground highways serve every burg they can reach

**Scenario: A fully subterranean burg is connected** → `serves / fully subterranean burg is connected`
- *Arrange*: a fixture landmass with three fully subterranean burgs and no dual-identity burg.
- *Act*: generate the underground network.
- *Assert*: each of the three is an endpoint of, or lies on, a generated record.
- *Fixture*: `landmassWithSubterranean(count)`, seeded so burg positions are fixed.

**Scenario: A dual-identity burg without a tunnel is not a violation** → `serves / dual burg without a tunnel is not a violation`
- *Arrange*: a landmass with two fully subterranean and one dual-identity burg, where the dual-identity
  burg is not on the backbone's path.
- *Act*: generate, then audit the planes.
- *Assert*: `auditPlanes(...).violations` contains no `service` entry for the dual-identity burg.
- *Note*: this is the scenario that would fail before the change; it is the contract's break.

**Scenario: A dual-identity burg may still be an endpoint** → `serves / dual burg as an endpoint is valid`
- *Arrange*: a landmass where the only connection admitting a shortcut (D3) ends at a dual-identity burg.
- *Act*: generate, then audit.
- *Assert*: the record exists, its endpoint is that burg, and no boundary violation is reported.

**Scenario: A burg inside a chain keeps its connection** → covered by the existing
`underground-highways` suite (prune/junction behaviour is unchanged); re-run, do not re-write.

**Scenario: A burg left unserved is reconnected** → `serves / subterranean burg is reconnected`
- *Arrange*: remove one backbone pair from the admitted set by hand, leaving a fully subterranean burg
  unserved while another below-level burg shares its landmass.
- *Act*: run the service repair pass.
- *Assert*: the burg gains a connection. Then repeat with a *dual-identity* burg in the same position:
  assert it is left as it is.

**Scenario: A lone subterranean burg on its landmass** → covered by the existing suite; re-run.

### Requirement: Underground highways are selected in two layers

**Scenario: The backbone connects every subterranean cluster** → `layers / backbone tree is connected`
- *Arrange*: a fixture landmass with four fully subterranean burgs in two spatial clusters, and no
  surface routes at all.
- *Act*: admit pairs through layer 1 only.
- *Assert*: the admitted pairs form one connected component over the four burgs.
- *Boundary variant*: with five burgs in a line, assert exactly four pairs (a tree, not a graph).
- *Note*: layer 1 must not measure any surface path, so the fixture passes a measure that throws.

**Scenario: A dual-identity burg serves as transit** → `layers / dual burg is transit`
- *Arrange*: two fully subterranean burgs whose straight line passes within one cell of a dual-identity
  burg, which is the only settlement between them.
- *Act*: admit pairs through layer 1, then route.
- *Assert*: the routed chain carries the dual-identity burg's cell between its ends, and the record does
  not terminate there.

**Scenario: A shortcut is admitted where overland travel is expensive** → `layers / shortcut admitted above threshold`
- *Arrange*: two burgs across a bay whose land path is measured at ≥ 1.5x the direct line.
- *Act*: admit pairs through layer 2.
- *Assert*: the pair is admitted.
- *Boundary pair*: the same two burgs with a land path of exactly 1.49x → not admitted; exactly 1.5x →
  admitted. Pin both sides so the comparison cannot drift.

**Scenario: A dual-identity burg is not attached for its own sake** → `layers / dual burg that carries no
path is not a backbone pair` — the dual is the nearest neighbour of a deep burg but carries no path
between two deep burgs, so layer 1 admits no pair for it and the audit owes it nothing. Also measured:
measure-h carries four shadowing records when dual leaves are attached and none without them.
**Scenario: No pair exists only to link two served burgs** → `layers / no pair for two served burgs`
- *Arrange*: two dual-identity burgs adjacent in the geometric graph, on a landmass whose subterranean
  burgs are connected elsewhere, with no shortcut condition met.
- *Act*: admit pairs through both layers.
- *Assert*: the pair between them is absent from the admitted set.
- *Note*: this is the change's central claim; it must be asserted on the admitted set, not inferred from
  the downstream network (which would confound it with merging).

**Deferred: the long link layer.** It is not delivered by this change (design D4). The harness keeps a
`deferred-long-link` / `deferred-all` arm so the cost that deferred it stays measured, and the DIST lines
record the deep-burg separation distribution the follow-up change needs.

**Threshold constants** → `layers / thresholds are named and documented`
- *Assert*: the shortcut ratio is an exported constant carrying the measurement that chose it (1.5x from
  the water census). Guards against a later silent retune.

## Integration tests

1. **`integration / coverage across all eight seeds`** — the acceptance gate for the narrowed contract.
   Run the 8-seed paired protocol and assert, per seed: zero `service` violations under the narrowed rule,
   zero boundary violations, `repairs = 0`, and every fully subterranean burg an endpoint of or on a
   record. References D1 and D2. Measured: 42.6 deep burgs per seed, 0 uncovered, 0 repairs.
2. **`integration / shadowing does not regress`** — the `roadCopiesExpanded` column from the diagnostic's
   road-copy audit must be ≤ 6.9 records/seed averaged over the eight seeds, and no seed may exceed the
   baseline's per-seed value by more than one record. References D6.
3. **`integration / directness does not regress`** — mean `directness` ≤ the baseline's 1.28 and no seed
   above 1.5 (the baseline's worst is 1.365). References the D-level risk that fewer pairs mean fewer
   merges.
4. **`integration / network shrinks toward the floor`** — records and cells lie between the
   subterranean-only counterfactual (25.1 records / 394 cells) and the tree over all below-level burgs
   (67.3 / 458), as means over eight seeds. A result outside that band means a layer is over- or
   under-firing. Measured: 54.0 records / 429.9 cells.
5. **`integration / surface network is untouched`** — the surface route set is byte-identical with
   underground generation on and off. Guards the non-goal: selection changes must not leak into the
   surface pass.
6. **`integration / layers do not alter routing`** — for a fixed pair, the routed chain is identical
   whether the pair was admitted by layer 1, 2 or 3. References D5.

## Edge cases and negative tests

- **A landmass with exactly one below-level burg** → no pair, no record, no surface route granted
  (existing scenario, re-run against the new policy).
- **A dual-identity burg that carries no path between two deep burgs** → not a backbone pair; measured on
  measure-h, where the four dual-leaf tunnels the old rule kept were the whole of its shadowing.
- **A landmass with no fully subterranean burgs** → the backbone admits nothing; only shortcut and
  long-link layers can admit pairs, and the network may legitimately be empty.
- **Two subterranean burgs whose surface path is null (no land route)** → admitted by layer 2 through
  the `surfacePath === null` branch, not by a ratio comparison against `null`.
- **A pair admitted by two layers** → routed once; assert the admitted set is keyed on the unordered
  pair (D5).
- **A dual-identity burg that is also the only transit between two subterranean clusters** → still
  transit, still not required to be an endpoint (the D2 property the counterfactual broke).

## Test data / fixtures

- **`landmassWithSubterranean(count, options)`** — new shared fixture: a small pack with N fully
  subterranean burgs, an optional dual-identity burg, optional surface routes, and cell heights chosen
  so all cells are passable (no glacier, no water unless the case wants it). Extends the existing
  `makePack` idiom from `underground-highways.test.ts` rather than replacing it.
- **`bayWithLandDetour(ratio)`** — new: two burgs across water whose land path length is a specified
  multiple of the direct line, for the threshold boundary tests. The existing bay fixture
  (`makePack({ bay: true })`) already has known span geometry and is reused for the sub-threshold case.
- **The 8-seed protocol** — `measure-a` … `measure-h`, continents template,
  `options.generation.underground = true`. Unchanged from the diagnostic, so every figure compares to the
  recorded baseline (`openspec/changes/archive/2026-09-30-measure-tunnel-character/measure/`), and the
  two counterfactuals are re-measured on every run (`CONTROL-AGG` lines).
- **The diagnostic harness** — `harness/underground-pairset.dom.test.ts.txt` in this change, adapted
  from the archived diagnostic's harness; it emits the coverage, per-layer pair, shadowing and directness
  columns these tests need plus the two counterfactual controls. It is not kept in `src/`.
