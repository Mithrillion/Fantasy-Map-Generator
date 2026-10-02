## MODIFIED Requirements

### Requirement: Surface connections keep their existing endpoint rule

Surface routes SHALL continue to connect only burgs with ground-level presence. This includes dual-identity burgs and excludes fully subterranean burgs. A surface route SHALL NOT begin or end at a cell whose burg has no ground-level presence: where the boundary of a generated segment would fall on such a cell, the boundary SHALL fall on a neighbouring cell instead, without dropping any cell of the segment.

The burg discount in the surface land path cost SHALL be governed by the same presence rule: a cell whose burg has ground-level presence is discounted exactly as before, and a cell whose burg lacks ground-level presence SHALL be priced as a cell with no burg. Every other term of the surface land path cost — distance, habitability, height, and the discount on already-connected pairs — SHALL be unchanged, and a burg below level alone SHALL NOT otherwise lower a surface step's cost.

#### Scenario: Fully subterranean burgs get no surface route

- **WHEN** surface routes are generated on a map whose burgs are classified beneath their sites
- **THEN** no surface record connects two burgs both lacking ground-level presence

#### Scenario: No surface endpoint on a fully subterranean burg

- **WHEN** surface routes are generated after classification
- **THEN** no surface record has a fully subterranean burg as an endpoint

#### Scenario: Dual-identity burgs remain surface endpoints

- **WHEN** a surface route is generated to a dual-identity burg
- **THEN** the connection is valid, because the dual-identity burg has ground-level presence

#### Scenario: No surface record begins or ends at a fully subterranean burg

- **WHEN** the surface network is assembled from its segments
- **THEN** neither the first nor the last cell of any surface record is a cell whose burg has no ground-level presence

#### Scenario: A surface route crossing a below-level burg's cell keeps its cells

- **WHEN** a surface path runs across the cell of a burg without ground-level presence
- **THEN** that cell stays on the route, and the record boundary moves to a neighbouring cell, so no step of the path is dropped

#### Scenario: A below-level settlement does not attract a surface road

- **WHEN** the land path cost of a step onto a cell whose burg has no ground-level presence is compared with the same step onto a comparable cell with no burg
- **THEN** the step onto the below-level burg's cell is not cheaper

#### Scenario: A ground-level settlement keeps its surface discount

- **WHEN** the land path cost of a step onto a cell whose burg has ground-level presence is compared with the same step onto a comparable cell with no burg
- **THEN** the step onto the ground-level burg's cell is cheaper, at the surface network's own burg factor, unchanged by this rule

## ADDED Requirements

### Requirement: Generated route geometry anchors only at burgs of the route's plane

The point a generated route takes through a burg-bearing cell SHALL be anchored at the burg's position
iff that burg has presence in the route's plane — ground-level presence for surface records,
below-level presence for underground records. In a cell whose burg lacks presence in the route's plane,
or whose burg record is missing or removed, the route point SHALL be the cell centre, priced and shaped
exactly as a cell with no burg. This requirement governs generation only: it SHALL NOT alter pair
selection, endpoint eligibility, the water and landmass constraints, or how any system traverses a
generated route.

#### Scenario: A tunnel passes a surface burg at the cell centre

- **WHEN** an underground highway's cell chain crosses the cell of a burg with ground-level presence only
- **THEN** the chain's route point for that cell is the cell centre, not the burg's position

#### Scenario: A tunnel still anchors at a below-level settlement

- **WHEN** an underground highway's cell chain crosses the cell of a burg with below-level presence
- **THEN** the chain's route point for that cell is the burg's position

#### Scenario: A surface road passes a fully subterranean burg at the cell centre

- **WHEN** a surface route's cell chain crosses the cell of a fully subterranean burg
- **THEN** the chain's route point for that cell is the cell centre, not the burg's position

#### Scenario: A surface road still anchors at a ground-level settlement

- **WHEN** a surface route's cell chain crosses the cell of a burg with ground-level presence
- **THEN** the chain's route point for that cell is the burg's position

#### Scenario: Endpoints remain anchored in the plane they serve

- **WHEN** a route record is assembled whose boundary falls on a legitimate burg of its own plane
- **THEN** that boundary's route point is the burg's position, exactly as before this change

### Requirement: Sharp-angle smoothing treats plane-foreign burg cells as plain cells

The sharp-angle resolution of generated route geometry SHALL be able to move the route point of a cell
whose burg lacks presence in the route's plane, exactly as it would the cell centre of a cell with no
burg. A cell whose burg has presence in the route's plane SHALL keep the burg's position: the
resolution SHALL NOT move that anchor, because the route must keep touching the burg it anchors. The
existing shared-anchor coupling of a resolution — other routes of the same pass read the moved anchor
of the shared cell — SHALL be unchanged.

#### Scenario: A centre-anchored kink gets resolved

- **WHEN** a tunnel's cell chain bends sharply across the cell of a burg with ground-level presence only
- **THEN** the resolution may move that cell's route point toward the kink's middle, exactly as for a cell with no burg

#### Scenario: An anchored settlement's point stays put

- **WHEN** a tunnel's cell chain bends sharply across the cell of a burg with below-level presence
- **THEN** that cell's route point stays the burg's position, so the rendering keeps touching the settlement

### Requirement: A route name derives from the burgs its plane can see

The name generated for a route SHALL be derived only from burgs with presence in the route's plane:
a surface record SHALL NOT take its name from a burg without ground-level presence, and an underground
record SHALL NOT take its name from a burg without below-level presence. A dual-identity burg remains
name-worthy for records of both planes.

#### Scenario: A surface road is not named after a buried settlement

- **WHEN** a surface route's name is derived while some of its cells carry burgs without ground-level presence
- **THEN** those burgs do not supply the name, exactly as if no burg occupied their cells

#### Scenario: A tunnel is not named after a surface settlement

- **WHEN** an underground highway's name is derived while its chain crosses cells of burgs without below-level presence
- **THEN** those burgs do not supply the name
