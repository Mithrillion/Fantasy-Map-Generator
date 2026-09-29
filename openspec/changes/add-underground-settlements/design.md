## Context

See `proposal.md` — Why. The constraints that shape the approach, all verified in the source:

- **Generation order is the dependency graph.** `generationPipelineSteps` is a flat `{id, run}` array (`src/generators/generation-pipeline.ts`); generators communicate through the `grid` and `pack` globals. `burgs` runs before `states`, and `routes` runs after `states`. Burg cell ids are final after `regraph`.
- **Burg placement has no terrain filter.** `generateCapitals` / `generateTowns` rank cells by a randomized `cells.s` and scatter with a spacing quadtree (`src/generators/burgs-generator.ts`). Elevation only enters through the score. So "prefer mountains" cannot move a burg; it can only weight a selection.
- **Routes are already two networks unified by a string.** `Risk` topology is an Urquhart graph over one Delaunay triangulation per feature, then Dijkstra through `findPath` with a per-network cost function. `getLandPathCost` returns `Infinity` for water and scales by biome habitability and a height modifier that makes high ground *expensive* (`src/generators/routes-generator.ts`).
- **`pack.cells.routes` is the single link map**, merging every route group into `cell -> neighbor -> routeId`. A full reader inventory found **one** place that walks it cell to cell: `Journeys.findRouteChain`, called from one site. Everything else either serializes it, edits it, or treats it as a boolean "has any route".
- **Route group names carry semantics.** `religions-generator`, `trade-animation`, `Routes.hasRoad` and `Routes.isCrossroad` all compare `route.group` against `"roads"` or `"searoutes"`. A new group name falls through to a default branch in all four.
- **Layers are registration-ordered and preset-driven.** `mapLayers` in `src/components/layers.ts`; toggles are a separate opt-in map; presets can only select *which layers are on*. Each renderer self-gates on `Layers.isOn(id)`.
- **The save format is an append-only CRLF-joined array** (`src/services/io/save.ts`), with migrations in `src/services/io/auto-update.ts`. Layer state is already saved with the map.
- **Four rebuild paths** must each handle a new pipeline step: full generation, erase, keep/risk (`heightmap-editor`), and resample. `docs/architecture/generation-pipeline.md` documents this checklist as authoritative.
- **Two UI actions destroy settlement data**: "Regenerate Burgs" rebuilds `pack.burgs` from scratch, and "Regenerate Routes" keeps only locked routes.

## Goals / Non-Goals

**Goals:**

- One optional generation step that classifies burgs and builds the underground network, insertable with minimal disturbance to the existing pipeline.
- The connectivity rule enforced structurally at generation, with **zero** runtime footprint, so requirement "everything else behaves as before" holds by construction rather than by audit.
- Display as a projection of the existing layer system, so no parallel visibility state exists to desynchronise.
- Backward compatibility without a data-format revision.

**Non-Goals:**

- Depth, strata or z-levels. One flat underground plane.
- Cross-section or dim-and-overlay rendering.
- User-facing editors for drawing underground connections by hand.
- Persisting the generation option into `.map` (see Decisions).
- Any change to how surface routes are generated.

## Decisions

### D1. Classifications are flags on existing burgs, not new entities

Implements `underground-settlements`. Adding a second burg collection would force every reader of `pack.burgs` — markets, production, provinces, labels, overviews, editors — to take a position, for no gain over a flag. Converting in place also means cell, state, province, culture, market and population need no migration or ownership rules.

*Alternatives rejected:* relocating fully subterranean burgs to mountain cells (breaks state/province consistency, needs a foreign-territory rule); a separate collection (largest blast radius).

*Consequence accepted:* because a burg keeps its site, "prefers mountains" is expressed as selection weighting and as the highway cost model, never as a location constraint.

### D2. Marking happens inside the `burgs` step, after ports are assigned

`Burgs.generate()` already runs `generateCapitals()`, `generateTowns()` and `assignPorts()`. Marking joins it as a final phase. It runs after `generateTowns` because it needs the complete burg set, and it must not be a separate pipeline step because `states` (the next step) reads `pack.burgs` and would otherwise observe a different burg set depending on option state.

*Alternatives rejected:* a separate step between `burgs` and `states` (needless pipeline surface, same ordering); folding it into `burgsSpecify` (runs after `routes`, too late for the surface network to see the classifications).

### D3. Selection is elevation-weighted without replacement, disjoint by construction

Weight rises with elevation, with a modest bonus for non-habitable biomes, so the preference is real but a map with no mountains still classifies burgs. A deterministic seeded shuffle of a weighted list gives reproducibility. The first target share is drawn for dual identity, the remainder for fully subterranean, which makes the sets disjoint by construction and degrades gracefully on small maps.

Shares are computed from the eligible burg count and rounded, so a map too small to satisfy both simply classifies fewer. A guard skips a burg whose cell is not land.

### D4. One route collection, one link map, nothing excluded

Implements `underground-highways`. Underground highways are ordinary routes in `pack.routes` and are linked into `pack.cells.routes` exactly as surface routes are. The underground record on a route is presentation data only.

*Alternatives rejected:* a second per-cell link map — measured against the full reader inventory it buys isolation that only one traverser could ever have needed, while costing parity in `getConnectivityRate`, the `hub` and connectivity preview values, and marker placement, each of which would need a second lookup; a traversal gate on the underground record — the specs require traversal to be uniform, and the existing per-transport-domain rules already produce the right answers for tunnels without any edit.

### D5. Connectivity is a generation-time endpoint rule only

`underground-highways` splits the connection rule in two:

- **Generation** — the highway builder runs its topology over subterranean-capable burgs only; surface generation is untouched and continues to see every burg.
- **Traversal** — nothing changes. A land journey may follow an underground highway because its cells are land cells; a water journey cannot, because its cells are not water, which is the same rule that already excludes surface roads. No journey, connectivity or route-lookup code is modified.

This is the decision that keeps the change small. It is also the one most likely to be revisited, so the specs state it explicitly as a requirement rather than leaving it implicit.

### D6. Cost model: water forbidden, peaks cheap

Water cells cost `Infinity`, reusing the existing habitability gate so glaciers block too. The height modifier is inverted relative to `getLandPathCost`, so elevation *reduces* cost — the honest proxy for tunneling under a mountain being easier than boring through lowland. The existing "already connected" discount is reused so the network merges into trunks rather than staying a triangulation.

### D7. Tunnels keep the `roads` group

Because four call sites branch on the group name, a new group value would silently make underground highways non-roads for religion spread, get them animated as land trade, and drop them from the crossroad and road tests. Keeping `group: "roads"` leaves all four correct untouched. The visual distinction comes from the **layer's** style attributes instead, which is also how the style editor already addresses elements.

*Alternatives rejected:* `group: "underground"` (four branch audits, and a divergence that is invisible until someone inspects spread or trade); a second group plus patching all four (same cost, no benefit).

### D8. Underground routes are named by the existing gate

`generateName` returns `undefined` for routes under four points, so short spurs stay unnamed and long tunnels get names for free. No naming rule is needed.

### D9. Display is two layers plus a derived mode

Implements `underground-display`. Two new entries in `mapLayers` — `undergroundRoutes` (with children `tunnels`, `chambers`) and `undergroundBurgs` (with children `undergroundIcons`, `undergroundAnchors`) — each self-gating on its own id, which is what makes "underground only" expressible at all: presets select layers, they cannot filter inside one.

The content-focus control is a three-state button group modelled on the existing view-mode control but **not** added to it: that control switches between SVG and WebGL, which is a different axis from which content is drawn. The control holds no state — it reads `Layers.state.active` and reports whichever canonical set matches, and clicking it writes a layer set. Layer state is already saved with the map, so persistence and the "reopens underground" behaviour come for free with no migration.

The underground layers must use **distinct child element ids**. `draw-burg-icons` resolves its containers by document-wide `querySelector`, so a second `#burgIcons` would shadow the first and both layers would render into one container.

### D10. Anchors belong to the surface plane

A port anchor is a surface maritime marker. In the both state both layers draw over identical coordinates, and underground burgs share their parent's cell, so an anchor rendered in both planes would draw two identical symbols on top of each other. Surface layer draws anchors for burgs with ground-level presence; the underground layer never draws anchors. `burg.port` stays fully intact on every burg, so markets, sea routes and the economy see no difference — the rule is local to one renderer.

### D11. Backward compatibility without a format revision

Both new flags are optional booleans on existing records; absent means false. The save array is unchanged, so no new record indices are needed. A migration is still required: older saves need no action for the flags, but any code reading the new fields defensively should tolerate their absence, and the layer entries are new so stored layer state resolves them as off. If a migration step is added for robustness it sets the fields to false on existing records.

### D12. The generation option lives in `options.generation`, not `options.map`

`options.map` is serialized into the save file but intentionally excludes generation requests. A request to generate underground content on the *next* map is a request, so it belongs beside the other generation options and travels in the browser between maps. The classifications themselves are per-burg map data and persist normally, so a loaded map keeps its underground content regardless of the option.

*Consequence:* reopening an old map does not force underground content into it; the user opts in before generating.

## Risks / Trade-offs

- **The endpoint rule is enforced only by the builder.** A future generator or editor that adds a route between two surface-only burgs and marks it underground would violate the spec with no guard → keep the eligibility predicate as one named, tested helper and route every underground connection through it.
- **`Regenerate Burgs` destroys classifications.** It rebuilds `pack.burgs` from scratch and calls `Routes.regenerate()`, which keeps only locked routes → re-run marking and highway building at the end of both regenerate paths, and carry the flags through the locked-burg and locked-route passes.
- **`getConnectivityRate` inherits the roads rate for tunnels** because the group is unchanged. A burg reached only by tunnel scores as if it had a road → accepted: a tunnel is infrastructure, and the alternative (a second rate table keyed by the flag) reintroduces the divergence D7 avoids.
- **Underground burgs are coincident with no surface counterpart of their own.** A fully subterranean burg sits on the same cell as whatever surface feature is there, and in the both state it reads as an overlay rather than a separate place → mitigated by distinct styling and by the underground content-focus state being the primary way to read the plane.
- **Two reconciliations over one scene.** When both layers are visible the shapes are built once but reconciled twice → accepted; the containers are viewport-culled independently, and the alternative duplicates scene building.
- **A map with one subterranean-capable burg per landmass gets no network.** Connectivity requires a pair → accepted and expected; the spec states the network is for the burgs that exist.
- **`editedRouteId` and `tempRoute` are module globals** consumed during reconciliation and would leak into the underground container → scope both to the surface layer, which is the only plane the route editor and route creator operate in.
- **Marker and measurer behaviour changes** for underground burgs, because they now have route links → this is the intended parity from D4, but it means existing marker-placement expectations shift on maps that use the feature.

## Migration Plan

1. Land the data model and serialization first (optional flags, defensive reads, migration if needed). No visible behaviour change; existing maps round-trip identically.
2. Land marking behind the generation option. Classifications appear in the Burgs overview; the map is otherwise unchanged.
3. Land the highway builder. The Routes overview shows underground highways; nothing is drawn differently yet.
4. Land the layers, styles and content-focus control.

Rollback is per slice: because both flags are optional and the display is opt-in, disabling the generation option returns the generator to its previous behaviour, and a map generated with underground content still loads on a build without this feature, where the flags are simply ignored.

## Open Questions

- The exact underground stroke recipe. The route path is a plain `<path>` with no pattern or mask infrastructure, so the available signals are stroke, width, dash pattern and opacity. Safe to settle during implementation against a rendered map; it does not change the specs or the task breakdown.
- Whether the content-focus control also gets a keyboard shortcut. The layer shortcut namespace is already crowded; additive and deferrable.
- Whether the underground layers should appear in the built-in preset list as a named preset in addition to the mode control. Purely a discoverability convenience.
