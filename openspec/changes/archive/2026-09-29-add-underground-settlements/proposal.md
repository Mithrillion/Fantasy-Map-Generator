## Why

The generator models a single surface plane: every burg is a ground-level settlement and every route is a surface connection. Fantasy worlds routinely have a second, subterranean geography — dwarven holds, undercities, deep roads — and today the only way to represent one is as ordinary burgs with a note attached, which makes it indistinguishable from a surface village and impossible to explore as its own network. This change adds that second plane as an optional, opt-in generation pass plus a dedicated way to display it.

## What Changes

- **Two new burg classifications**, applied as optional flags on existing burgs rather than new entities, so a burg keeps its cell, state, province, culture, market and production:
  - a burg with **subterranean structures** — above ground and underground at once (dual identity)
  - a burg that is **fully subterranean**
  - a burg is never both. Generation marks roughly 5% of burgs with each classification, scaled to the burg population.
- **A new optional generation step** producing **underground highways** that connect only burgs with below-level presence, preferring mountain terrain and never running through water. Surface roads continue to connect only burgs with ground-level presence, which includes dual-identity burgs.
- **The connectivity rule binds generation only.** Once an underground highway exists, every system treats it exactly as it treats a surface path — overland travel may follow one, and an underground burg is reachable, tradeable, administrable and named like any other burg. Underground burgs continue to belong to provinces and states, and no culture or political system influences their generation.
- **An underground display**: two new toggleable map layers (underground burgs, underground highways) plus a content-focus mode control offering *surface*, *underground* and *both*.
- **Optional and backward compatible**: underground generation is a generation option, absent on existing maps. Maps without it load and behave exactly as before, and burg records written without the new fields remain valid.

Explicitly **not** in this change: depth or strata modelling (a single flat underground plane), any cultural or political influence on underground placement, the dim-and-overlay display treatment, and user-facing editors for drawing underground connections by hand.

## Capabilities

### New Capabilities

- `underground-settlements`: classifying burgs as dual-identity or fully subterranean, how they are selected and how many, and the guarantee that every other system treats them as ordinary burgs.
- `underground-highways`: generating the subterranean connection network, its endpoint eligibility, its terrain and water constraints, and the rule that connectivity governs generation while traversal is uniform.
- `underground-display`: the underground map layers, the content-focus mode, and how underground content is visually distinguished and exported.

### Modified Capabilities

None. `openspec/specs/` is empty, so there are no existing requirement sets to change; the three capabilities above are the project's first specs.

## Impact

- **Generation pipeline**: one new step after `routes`, plus its mandatory twin in the erase pipeline, handlers in the heightmap-editor risk path and the resample path.
- **Data model**: optional flags on `Burg` and on `Route`; one new per-cell connection map. New `.map` records appended at the end of the save array, with an `auto-update` migration for older saves.
- **Regeneration paths**: the existing "Regenerate Burgs" and "Regenerate Routes" actions rebuild `pack.burgs` and `pack.routes` from scratch and would otherwise discard both the classifications and the underground network; they must carry them.
- **Display**: two entries in the layer registry, two toggles, three content-focus states, new style entries, and a split of the route and burg-icon viewport renderers so one scene can be reconciled into surface and underground containers.
- **Rendering and UI surfaces** that enumerate burgs or routes — the Burgs overview, the Routes overview, the Burg editor — need the new fields presented, since a classification with no display is invisible to the user.
- **No new dependencies.**
