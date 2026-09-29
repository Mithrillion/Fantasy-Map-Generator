# underground-display Specification

## Purpose
Lets a reader look at the subterranean plane on its own or together with the surface, by giving underground settlements and underground highways their own map layers and a content-focus mode, without disturbing the layer arrangement of maps that have no underground content.

## Requirements

### Requirement: Underground content has its own map layers

The system SHALL register two map layers — one for underground burgs and one for underground highways — independently of the existing surface burg-icon and route layers. Each SHALL be toggleable on its own and SHALL draw only underground content; the surface layers SHALL draw only surface content. A map with no underground content SHALL show the layers empty rather than absent or broken.

#### Scenario: Underground layers are independently toggleable

- **WHEN** the user enables the underground-burgs layer while leaving the surface burg-icon layer enabled
- **THEN** both underground and surface burgs are drawn

#### Scenario: Surface layers exclude underground content

- **WHEN** the underground layers are disabled
- **THEN** no underground burg or underground highway is drawn

#### Scenario: A map without underground content is unaffected

- **WHEN** a map with no underground content is displayed
- **THEN** its layer list gains the two entries, both draw nothing, and the surface map looks exactly as it did before

### Requirement: A content-focus mode offers surface, underground and both

The system SHALL provide a single control selecting among three content-focus states: **surface** (surface content only), **underground** (underground content only, with the surface map's political, settlement and route content hidden) and **both** (surface and underground content together).

#### Scenario: Underground state shows the underground alone

- **WHEN** the user selects the underground content-focus state
- **THEN** underground burgs and underground highways are drawn and the surface routes, surface burg icons, states, provinces, borders and labels are not

#### Scenario: Both state shows the two planes together

- **WHEN** the user selects the both content-focus state
- **THEN** surface and underground burgs and routes are all drawn

#### Scenario: Surface state is the existing map

- **WHEN** the user selects the surface content-focus state
- **THEN** the displayed map matches what the layer selection showed before this feature existed

### Requirement: The content-focus state is derived from the layer selection

The visible layer selection SHALL be the single source of truth for what is displayed. The content-focus control SHALL be a projection of that selection: setting the state SHALL select the corresponding layers, and toggling layers individually SHALL leave the displayed state reflecting the actual selection. The system SHALL NOT maintain a separate stored value that could disagree with the selected layers.

#### Scenario: Setting the state selects the layers

- **WHEN** the user selects the underground content-focus state
- **THEN** the layer selection is updated to the underground set and the layer list reflects it

#### Scenario: Manual layer changes update the state

- **WHEN** the user disables the underground-highway layer while in the both state
- **THEN** the content-focus control no longer reports the both state, because the selection no longer matches it

#### Scenario: No divergent state exists to desynchronise

- **WHEN** the content-focus state is inspected after any sequence of layer toggles
- **THEN** it is fully determined by the current layer selection and nothing else

### Requirement: The content-focus state persists with the map

Because the layer selection is stored with the map, a map saved while showing underground content SHALL reopen showing underground content.

#### Scenario: Reopening restores the view

- **WHEN** a user saves a map while the underground content-focus state is selected and later loads it
- **THEN** the underground content is displayed

#### Scenario: An older map opens in the surface state

- **WHEN** a map saved before this feature is loaded
- **THEN** it opens showing surface content, and the underground layers are available but off

### Requirement: Underground content is visually distinguishable from surface content

Underground burgs SHALL be drawn with a visual treatment distinct from surface burgs, and underground highways with a treatment distinct from surface routes, so that in the both state a reader can tell which plane an element belongs to.

#### Scenario: The two planes read differently when shown together

- **WHEN** the both content-focus state is displayed
- **THEN** underground burgs are visually distinguishable from surface burgs and underground highways from surface roads and trails

### Requirement: Anchors are drawn in exactly one plane

A port anchor SHALL be drawn only for a burg with ground-level presence, and SHALL be drawn in the surface plane only, so that no anchor is rendered twice at the same coordinates.

#### Scenario: No duplicated anchor in the both state

- **WHEN** the both content-focus state is displayed
- **THEN** no port anchor is drawn more than once

#### Scenario: A fully subterranean burg draws no anchor

- **WHEN** a fully subterranean burg is displayed
- **THEN** no port anchor is drawn for it

### Requirement: Export follows the displayed layer selection

Map export SHALL honour the layer selection, so exporting an underground view produces an underground map rather than silently including or omitting the wrong plane.

#### Scenario: Exporting the underground view

- **WHEN** a full-map export is taken while the underground content-focus state is selected
- **THEN** the exported image contains the underground content and not the surface routes and burg icons
