# underground-settlements Specification

## Purpose
Classifies settlements as dual-identity or fully subterranean so a world can have a population living underground, while guaranteeing every other system in the generator keeps treating those settlements as ordinary burgs.

## Requirements

### Requirement: Burgs can be classified as subterranean-capable

The system SHALL support two independent optional classifications on a burg, distinguishing how the settlement relates to the surface:

- **Dual identity** (`subterranean`): the burg has ground-level presence and below-level presence at the same site. It is one settlement occupying both planes.
- **Fully subterranean** (`underground`): the burg has below-level presence only.

Both classifications SHALL be optional. A burg with neither classification is a surface burg, which SHALL remain the default for every existing map and every map generated without underground generation enabled.

In this capability, "below-level presence" describes a burg carrying either classification, and "subterranean-capable" is its collective term.

#### Scenario: Untouched map classifies nothing

- **WHEN** a map is generated with the underground generation option disabled
- **THEN** no burg carries either classification

#### Scenario: A map saved before this feature loads unchanged

- **WHEN** a `.map` file whose burg records contain neither classification is loaded
- **THEN** every burg resolves to a surface burg and no underground content is generated or displayed

#### Scenario: Dual identity is one settlement, not two

- **WHEN** a burg carries the dual identity classification
- **THEN** it remains a single burg with a single cell, and its ground-level and below-level presences share that one identity

### Requirement: A burg is never classified as both dual-identity and fully subterranean

The two classifications SHALL be mutually exclusive on a single burg.

#### Scenario: Generation never assigns both

- **WHEN** underground generation marks burgs on any map
- **THEN** no burg carries both classifications

#### Scenario: A conflicting stored value is repaired

- **WHEN** a burg record carries both classifications
- **THEN** the system resolves it to one classification rather than treating the burg as two

### Requirement: Generation marks a small share of existing burgs

When underground generation is enabled, the system SHALL classify a share of the burgs that already exist on the map, targeting approximately 5% as dual identity and a separate approximately 5% as fully subterranean. The sets SHALL be disjoint. The marking step SHALL NOT create, remove, relocate, or renumber any burg, and SHALL NOT alter a burg's cell, state, province, culture, market, population, or any other existing property.

#### Scenario: Target shares are met when the burg population allows

- **WHEN** a map with a large burg population is generated with underground generation enabled
- **THEN** approximately 5% of burgs carry the dual-identity classification and approximately 5% carry the fully subterranean classification

#### Scenario: Small maps degrade gracefully

- **WHEN** a map has too few burgs to satisfy both shares with disjoint sets
- **THEN** the system assigns fewer classifications rather than assigning a burg twice, and generation completes without error

#### Scenario: Marking preserves burg identity

- **WHEN** a burg is classified by the marking step
- **THEN** its cell, state, province, culture, market, population, name and emblem are unchanged

### Requirement: Fully subterranean burgs are never placed under water

A burg classified as fully subterranean SHALL occupy a land cell and SHALL NOT be placed on a water cell.

#### Scenario: Marking never selects a water burg

- **WHEN** the marking step runs
- **THEN** no burg carrying the fully subterranean classification occupies a cell below the water level

### Requirement: Selection prefers mountainous sites

Given that classified burgs keep the site they already occupy, the system SHALL express the preference for mountainous terrain through which burgs are selected, weighting higher and less habitable sites more heavily rather than by moving or filtering to a hard set of sites.

#### Scenario: Mountainous sites are over-represented

- **WHEN** the marking step runs on a map with a range of elevations
- **THEN** the classified burgs are drawn preferentially from higher-elevation sites compared to a uniform random selection of the same size

### Requirement: Underground burgs are ordinary burgs everywhere else

Apart from the two classifications, an underground burg SHALL participate in every system exactly as a surface burg does. It SHALL remain a member of the burg collection, belong to a state and a province, and take part in markets, production, trade, religion, military, labels and overviews on the same terms as any other burg. No culture or political system SHALL influence which burgs are classified.

#### Scenario: An underground burg belongs to a state and province

- **WHEN** a burg is classified as underground
- **THEN** it retains membership in its state and province on the same terms as a surface burg

#### Scenario: Economy treats an underground burg as a market participant

- **WHEN** markets and production run after classification
- **THEN** an underground burg can anchor a market and receive production and trade records like any other burg

#### Scenario: Classification is independent of culture and politics

- **WHEN** two maps with identical terrain and burg sites but different cultures and states are generated with the same seed
- **THEN** the classified burg set does not depend on culture or state membership

### Requirement: Classification survives regeneration

The existing regenerate actions that rebuild the map's burgs and routes SHALL preserve the classifications rather than discarding them, and classified burgs SHALL be treated consistently with the locking behaviour those actions already apply to burgs.

#### Scenario: Regenerating burgs does not silently strip classification

- **WHEN** the user regenerates burgs on a map with underground generation enabled
- **THEN** the resulting burgs are classified and the underground network is rebuilt, rather than the map becoming underground-free

#### Scenario: A heightmap edit does not silently strip classification

- **WHEN** the map is regenerated through the erase, keep or risk path after a heightmap edit
- **THEN** the underground content is regenerated or restored consistently with how the path treats other settlement data
