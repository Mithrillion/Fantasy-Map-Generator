## ADDED Requirements

### Requirement: Underground highways serve every burg they can reach

Every burg with below-level presence that shares its landmass with at least one other such burg SHALL be
an endpoint of, or lie on, a generated underground highway. Pruning, merging and boundary resolution SHALL
NOT leave such a burg without an underground connection.

A burg with below-level presence that is the only such burg on its landmass has no pair to connect to and
MAY remain without an underground highway. It SHALL NOT gain a surface route in exchange.

#### Scenario: A burg inside a chain keeps its connection

- **WHEN** an underground highway carries a burg with below-level presence between its two ends, and the record ends at a cell that another underground highway continues through
- **THEN** the highway survives and the burg still has an underground connection

#### Scenario: A burg left unserved is reconnected

- **WHEN** the generated underground network leaves a burg with below-level presence without an underground connection, while another such burg shares its landmass
- **THEN** a connection is generated for it, so no burg that can be connected is left out

#### Scenario: A lone subterranean burg on its landmass

- **WHEN** a landmass holds exactly one burg with below-level presence
- **THEN** no underground highway is generated for it, and it is not given a surface route instead

### Requirement: Editing a connection preserves its plane

An edit that produces a connection record SHALL keep the plane of the record it came from. Splitting an
underground highway SHALL produce two underground highways. Joining two records of different planes SHALL
be refused rather than re-flag either of them. No edit SHALL leave a burg with ground-level presence only
as an endpoint of an underground highway, or a burg without it as an endpoint of a surface route.

#### Scenario: Splitting an underground highway keeps both halves underground

- **WHEN** an underground highway is split
- **THEN** both halves carry the underground record

#### Scenario: Joining across planes is refused

- **WHEN** a join is requested between a surface route and an underground highway
- **THEN** the join does not happen and neither record changes plane

#### Scenario: A below-level burg never becomes a surface endpoint through an edit

- **WHEN** any sequence of edits is applied to a generated map
- **THEN** no surface route gains a burg without ground-level presence as an endpoint

## MODIFIED Requirements

### Requirement: Underground highways connect only subterranean-capable burgs

An underground highway SHALL have subterranean-capable burgs at both of its endpoints. A burg with ground-level presence only SHALL NOT be an endpoint of an underground highway. An underground highway SHALL NOT begin or end at a cell whose burg has ground-level presence only: where the boundary of a generated stretch would fall on such a cell, the boundary SHALL fall on a neighbouring cell instead, without dropping any cell of the stretch.

#### Scenario: No surface-only endpoint

- **WHEN** underground highways are generated
- **THEN** neither endpoint of any underground highway is a burg that has ground-level presence only

#### Scenario: Dual-identity burgs are valid endpoints

- **WHEN** an underground highway connects a fully subterranean burg to a dual-identity burg
- **THEN** the connection is valid, because the dual-identity burg has below-level presence

#### Scenario: No highway begins or ends on a surface burg's cell

- **WHEN** the underground network is assembled from its stretches
- **THEN** neither the first nor the last cell of any underground highway is a cell whose burg has ground-level presence only

#### Scenario: A junction on a surface burg's cell keeps the stretch

- **WHEN** an underground stretch meets an existing underground highway on a cell that carries a burg with ground-level presence only
- **THEN** the stretch is kept and its boundary moves across the junction, so every below-level burg it carries stays connected

### Requirement: Surface connections keep their existing endpoint rule

Surface routes SHALL continue to connect only burgs with ground-level presence. This includes dual-identity burgs and excludes fully subterranean burgs. A surface route SHALL NOT begin or end at a cell whose burg has no ground-level presence: where the boundary of a generated segment would fall on such a cell, the boundary SHALL fall on a neighbouring cell instead, without dropping any cell of the segment. Surface route pathfinding SHALL otherwise be unchanged.

#### Scenario: Fully subterranean burgs get no surface route

- **WHEN** surface routes are generated after classification
- **THEN** no surface route has a fully subterranean burg as an endpoint

#### Scenario: Dual-identity burgs remain surface endpoints

- **WHEN** surface routes are generated after classification
- **THEN** a dual-identity burg can be an endpoint of a surface route exactly as it could before classification

#### Scenario: No surface record begins or ends at a fully subterranean burg

- **WHEN** surface routes are assembled from their path segments
- **THEN** neither the first nor the last cell of any surface record is a cell whose burg has no ground-level presence

#### Scenario: A surface route crossing a below-level burg's cell keeps its cells

- **WHEN** a surface path runs across the cell of a burg without ground-level presence
- **THEN** that cell stays on the route, and the record boundary moves to a neighbouring cell, so no step of the path is dropped
