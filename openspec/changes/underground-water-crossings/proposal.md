# Proposal: underground-water-crossings

## Why

The underground network is forbidden water: `getUndergroundPathCost` returns `Infinity` on every
water cell (`src/generators/routes-generator.ts:366`), and the spec backs it with the paired rule
*"Underground highways never run through water"*. That prohibition is also the divergence ladder's
hardest remaining constraint — tunnels and surface routes compete over the same land, where the
settled fabric already carries a route on 37-44% of land cells and the measured floor of the
overlap program sits at 0.430 (metaplan F7.2, H4). Water is the one large map surface roads
physically cannot occupy, so letting tunnels pass beneath bays, lakes and lagoons is both a
plausibility win (burgs stay on land; the premise that underground burgs cannot sit under water is
pinned and untouched) and the strongest remaining lever for genuine corridor divergence: a route
that must go *around* a bay on land has no surface rival *under* the bay.

The compatibility exploration (2026-09-30) found the land-only constraint floats free of almost
everything the underground design cares about: endpoint eligibility, the boundary rule, pruning,
the service guarantee and `auditPlanes` all anchor on burg cells, and burgs stay on land. The
change is concentrated in one spec requirement and one cost gate.

## What Changes

- **The tunnel cost gate admits water under a bounds rule.** A crossing of a water body that does
  not leave the tunnel's own landmass becomes passable in `getUndergroundPathCost`, priced so that
  deep water costs dearer than a shallow bay and nothing traversable becomes impassable where a
  land crossing exists. The concrete depth/stride shape is design.md's to fix.
- **Spec delta for `underground-highways`.** *Underground highways never run through water* is
  re-scoped into a bounded water-crossing rule with its endpoint and landmass limits stated.
  No other requirement in any underground spec changes for this scope.
- **Tests re-aimed and added.** The pinned water test (`underground-highways.test.ts:161`,
  "makes a water step impassable…") is re-aimed at the bounded rule; new tests pin shallow-cheaper
  than deep, the landmass limit, and unchanged endpoint/boundary/plane behaviour.
- **Explicitly out of scope (this change):**
  - Cross-landmass tunnels (island ↔ mainland / island ↔ island). The per-landmass Urquhart pair
    set, the per-landmass service rule and *"Adjacent landmasses are not joined"* stay untouched;
    that is a separate, larger delta.
  - Underground burgs under water — cannot happen; burg placement and classification are unchanged.
  - Traversal, transport rules, the save format, the endpoint rule (metaplan D3, still binding).
  - The elevation-profile UI nuance (a mixed land/water route hides its profile in
    `route-editor.ts:126`) is recorded as a known cosmetic follow-up, not changed here.

## Capabilities

### New Capabilities

- *(none)*

### Modified Capabilities

- `underground-highways`: *Underground highways never run through water* is re-scoped. Every cell
  of a tunnel lake/ocean leg stays within the feature its endpoints sit on; the crossing is
  bounded so deep water costs dearer than shallow and a crossing cannot become the universal
  shortcut; endpoint eligibility, the boundary rule, *"Adjacent landmasses are not joined"*, the
  traversal rule and every other requirement stay as written.

## Impact

- **Code:** `src/generators/routes-generator.ts` — the water gate and cost shape of
  `getUndergroundPathCost`; no signature, data-model or traversal changes.
- **Tests:** `src/generators/underground-highways.test.ts` — one pin re-aimed, new water tests
  added; the plane-audit real-map run (`playwright.yml`) is expected to stay green unchanged.
- **Docs:** `docs/architecture/generation-pipeline.md` — the underground pass description.
- **Measurement protocol:** the 8-seed paired harness records water-cell share per run; overlap
  gains partly arrive *by construction* where a tunnel crosses water no road can occupy, so the
  protocol notes that caveat rather than letting it inflate the next rung's delta.
- **Dependencies:** none added.
