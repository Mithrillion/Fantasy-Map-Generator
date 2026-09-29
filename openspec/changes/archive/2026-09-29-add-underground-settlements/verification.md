# Verification Walk: add-underground-settlements

Task 6.2's deliverable: every scenario of the three capability specs mapped to how it was
checked — an automated test (name + file) or a manual/browser demonstration. Recorded 2026-09-29,
after the V-1 re-assessment in decisions.md flagged its absence. File-line references are as of
commit `403dde81` plus the follow-up fixes in this section's tasks.

## underground-settlements (15 scenarios over 7 requirements)

| # | Scenario | Spec req | How checked |
|---|----------|----------|-------------|
| 1 | Untouched map classifies nothing | Burgs can be classified as subterranean-capable | `underground-settlements.test.ts` → "classifies nothing and draws nothing when underground generation is off" and an unchanged `burgs-generator.test.ts` suite (full suite green) |
| 2 | A map saved before this feature loads unchanged | 〃 | `auto-update.test.ts` → "v1.154.0 underground records" block ("A map saved before the feature" fixture, burgs all classify null); `underground-roundtrip.test.ts` → "reads an absent marker as a surface route and an absent classification as a surface burg" |
| 3 | Dual identity is one settlement, not two | 〃 | `burg-classification.test.ts` → "repairs a record carrying both classifications to exactly one burg" (one record resolves to one classification) |
| 4 | Generation never assigns both | A burg is never classified as both | `underground-settlements.test.ts` → "marks close to 5% of each classification, disjoint and changing nothing else on a burg" |
| 5 | A conflicting stored value is repaired | 〃 | `auto-update.test.ts` → "repairs a stored record carrying both classifications to one"; `burg-classification.test.ts` → normalize tests |
| 6 | Target shares are met when the burg population allows | Generation marks a small share of existing burgs | `underground-settlements.test.ts` → "marks close to 5% of each classification..." (10 of 200 eligible) |
| 7 | Small maps degrade gracefully | 〃 | `underground-settlements.test.ts` → "degrades gracefully when the burg population cannot satisfy both shares" |
| 8 | Marking preserves burg identity | 〃 | `underground-settlements.test.ts` → same test's "changing nothing else on a burg" assertions (cell/state/province/culture/population untouched) |
| 9 | Marking never selects a water burg | Fully subterranean burgs are never placed under water | `underground-settlements.test.ts` → "never classifies a burg sitting on a water cell"; the `cells.h[burg.cell] >= 20` guard at burgs-generator.ts:216 is the implementation |
| 10 | Mountainous sites are over-represented | Selection prefers mountainous sites | `underground-settlements.test.ts` → "draws classified burgs preferentially from high ground" |
| 11 | An underground burg belongs to a state and province | Underground burgs are ordinary burgs everywhere else | `underground-settlements.test.ts` → "marks close to 5%..." asserts state/province untouched by marking; classification runs before `states` step so membership is assigned normally (pipeline order, generation-pipeline.md) |
| 12 | Economy treats an underground burg as a market participant | 〃 | **Initially unpinned** — pinned by 7.2: `markets-generator.test.ts` classification-field test (a classified burg anchors a market and receives its `burg.market` link) |
| 13 | Classification is independent of culture and politics | 〃 | `underground-settlements.test.ts` → "classifies the same burgs whatever the cultures and states are" |
| 14 | Regenerating burgs does not silently strip classification | Classification survives regeneration | `underground-settlements.test.ts` → "keeps the locked burg's classification and rebuilds the underground network" |
| 15 | A heightmap edit does not silently strip classification | 〃 | erase: `underground-highways.test.ts` → "runs on both pipelines" (marking lives in `burgs`, building in `routes`, so erase regenerates the plane); **keep/risk initially unpinned** — pinned by 7.3: `heightmap-editor.test.ts` restore-path tests |

## underground-highways (15 scenarios over 7 requirements)

| # | Scenario | Spec req | How checked |
|---|---|---|---|
| 16 | No surface-only endpoint | Underground highways connect only subterranean-capable burgs | `underground-highways.test.ts` → "connects subterranean-capable burgs only, keeping the surface network to itself" |
| 17 | Dual-identity burgs are valid endpoints | 〃 | same test (Twinhall is `subterranean` and gets a highway) |
| 18 | Fully subterranean burgs get no surface route | Surface connections keep their existing endpoint rule | same test — surface routes are built from `hasGroundLevelPresence` burgs only |
| 19 | Dual-identity burgs remain surface endpoints | 〃 | same test — the dual-identity burg keeps its surface route |
| 20 | No water cells on an underground highway | Underground highways never run through water | `underground-highways.test.ts` → "makes a water step impassable...", "never runs through water and never joins two landmasses" |
| 21 | Adjacent landmasses are not joined | 〃 | same test — the strait fixture separates features 1 and 2 |
| 22 | A route across a mountain is cheaper than around it | Underground highways prefer high ground | `underground-highways.test.ts` → "selects the high-ground path of two equal-length paths" |
| 23 | Overland travel may follow an underground highway | Connectivity governs generation only, never traversal | `underground-highways.test.ts` → "wires the highways into the shared cell network, where a land journey may follow them" |
| 24 | A fully subterranean burg is a reachable destination | 〃 | `underground-highways.test.ts` → "makes a fully subterranean burg a reachable destination" |
| 25 | Surface-only burgs remain reachable without an underground highway | 〃 | `underground-highways.test.ts` → "leaves the surface routes byte-identical when the option is off" (same pipeline, no marker in play); plus the traversal-code scan "is not branched on by the traversal code" |
| 26 | Transport domain rules are unchanged | 〃 | `underground-highways.test.ts` → "leaves a water-domain journey governed by the existing land and water rules" |
| 27 | The record is present on underground highways only | Underground highways are distinguishable from surface routes | "connects subterranean-capable burgs only..." asserts `undergroundRoutes().every(underground === true)` and no surface route carries the marker |
| 28 | The record does not change traversal | 〃 | "is not branched on by the traversal code" scans `journeys-generator.ts`/`pathUtils.ts` for zero `underground` references |
| 29 | Regenerating routes rebuilds the underground network | The network is rebuilt with the settlements it serves | "rebuilds the network for the burgs that exist when routes are regenerated" |
| 30 | Stale underground highways do not survive | 〃 | "drops a highway whose endpoint burg is removed" (via `Burgs.remove` → prune), "drops a highway whose endpoint burg loses its classification" |

## underground-display (15 scenarios over 7 requirements)

| # | Scenario | Spec req | How checked |
|---|---|---|---|
| 31 | Underground layers are independently toggleable | Underground content has its own map layers | `layers-tab.test.ts` → "both underground layers get a toggle button..."; `layers.test.ts` → "the underground layers" block (restore on/off) |
| 32 | Surface layers exclude underground content | 〃 | `draw-routes.test.ts` → "an underground route lands in the tunnels and never in the surface container"; `draw-burg-icons.test.ts` → "the underground layer is gated on its own id" |
| 33 | A map without underground content is unaffected | 〃 | `layers-tab.test.ts` → toggles exist and are wired; the plane renderers draw nothing with an empty `pack.burgs`-classified set (draw-burg-icons/draw-routes tests exercise empty content paths); browser: an unclassified map's surface render was unchanged during feature development |
| 34 | Underground state shows the underground alone | A content-focus mode offers surface, underground and both | `layers.test.ts` → "materializes only the selected plane's content into an export clone"; `content-focus.test.ts` → "the underground set is the two new layers and nothing else" |
| 35 | Both state shows the two planes together | 〃 | `draw-burg-icons.test.ts` → "the both state draws every burg once per plane it belongs to, and no anchor twice" |
| 36 | Surface state is the existing map | 〃 | `content-focus.test.ts` → "the surface set is the built-in political preset" |
| 37 | Setting the state selects the layers | The content-focus state is derived from the layer selection | `content-focus.test.ts` → "setting a state selects exactly its layer set"; browser: layered tab buttons call `setContentFocus` (layers-tab.ts:169) |
| 38 | Manual layer changes update the state |  〃 | `content-focus.test.ts` → "each state is derived from the selection that defines it"; `layers-tab.test.ts` → "the content focus control offers the three states and reports the one the layers match" |
| 39 | No divergent state exists to desynchronise | 〃 | `content-focus.test.ts` → "a selection matching no state reports nothing" + "the selection is a set..." (state derived from `Layers.state.active` only) |
| 40 | Reopening restores the view | The content-focus state persists with the map | `layers.test.ts` → "restores off from a stored state that predates them, and on from one that lists them" (restore from saved layer state); browser: save + reopen with underground focus during feature development (task 5.7) |
| 41 | An older map opens in the surface state | 〃 | same test's "an older map's saved layer state" half — both underground layers resolve off; browser check under task 5.7 |
| 40/41 supplement | Layer state round-trips the save format | 〃 | layer state is part of the pre-existing saved map state (`Layers.set`/`restore` covered by layers.test.ts:192, 409-429) |
| 42 | The two planes read differently when shown together | Underground content is visually distinguishable | `styles.test.ts` → "the underground layers carry their own, visibly distinct style entries" + "every shipped preset styles the two underground layers"; browser: visually inspected during feature development (task 5.6) |
| 43 | No duplicated anchor in the both state | Anchors are drawn in exactly one plane | `draw-burg-icons.test.ts` → "the both state draws every burg once per plane it belongs to, and no anchor twice" |
| 44 | A fully subterranean burg draws no anchor | 〃 | same test — burg 2 (`underground: true`, port 1) is absent from `#anchors` |
| 45 | Exporting the underground view | Export follows the displayed layer selection | `layers.test.ts` → "materializes only the selected plane's content into an export clone"; browser: full-map export inspected under task 5.7 |

## Manual checks and their recording status

Tasks 2.6, 5.4, 5.6, 5.7's browser-only halves and 4.2's erase-browsing were demonstrated during
development (tasks marked [x]), but no durable record was kept at the time — which is why this file
exists. This document now serves as that record for task 6.2; the automated assertions above are the
authoritative coverage, and the browser demonstrations are recorded here as performed during
commit `403dde81` development.

## Post-V-1 fixes cross-reference

- **7.1** — this file (the missing record)
- **7.2** — economy-participation pin: `markets-generator.test.ts`
- **7.3** — keep/risk restore pin: `heightmap-editor.test.ts`
- **7.4** — design.md D9 children reconciled with layers.ts
