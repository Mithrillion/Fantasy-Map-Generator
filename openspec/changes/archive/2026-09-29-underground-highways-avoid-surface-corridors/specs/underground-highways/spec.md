## MODIFIED Requirements

### Requirement: Underground connectivity is self-contained

The routing discount an underground highway receives for reusing an already-connected cell pair SHALL be derived from the underground network only. The presence of a surface route SHALL NOT lower the generation cost of an underground highway, and SHALL NOT make an underground highway more likely to follow the surface route's cells. A surface route MAY raise the generation cost of an underground highway, under the separation rule stated in *Underground highways keep clear of the surface network's corridors*. The underground network SHALL remain a network in its own right: an underground highway SHALL be cheaper to generate alongside another underground highway than alongside no connection at all.

This requirement governs generation only. It SHALL NOT alter endpoint eligibility, the water and landmass constraints, the terrain preference, or how any system traverses a generated underground highway.

#### Scenario: A surface route does not make a tunnel cheaper

- **WHEN** the generation cost of an underground highway step is evaluated for a cell pair
- **THEN** the cost is never lower than it would be with no surface route on that pair

#### Scenario: Surface routes are not made cheaper by underground highways

- **WHEN** surface routes are generated on a map with underground generation enabled
- **THEN** they are generated as they would be with underground generation disabled, because surface generation runs before the underground network exists

#### Scenario: An underground highway is cheaper alongside the underground network

- **WHEN** the generation cost of an underground highway step is evaluated for a cell pair already connected by an underground highway
- **THEN** the cost is lower than for a pair with no underground connection

#### Scenario: The underground network still merges with itself

- **WHEN** underground highways are generated and two of them meet on a shared cell
- **THEN** the shared stretch is generated once rather than duplicated, exactly as before this change

#### Scenario: Traversal is unchanged

- **WHEN** any system traverses a generated underground highway
- **THEN** its behaviour is identical to the behaviour before this change, because only generation-time cost was affected

## ADDED Requirements

### Requirement: Underground highways keep clear of the surface network's corridors

The generation cost of an underground highway SHALL be raised on cells that lie on or near the surface route network, so that a tunnel prefers a corridor clear of the routes it was meant to be an alternative to. The penalty SHALL be derived from the distance to the nearest surface route, SHALL decay as that distance grows, SHALL be bounded above, and SHALL NOT make an otherwise passable cell impassable. It SHALL be derived from surface routes only: the underground network SHALL NOT repel itself, and this rule SHALL NOT alter the underground discount, endpoint eligibility, the water and landmass constraints, or the terrain preference.

#### Scenario: A step beside a surface route costs more than the same step clear of one

- **WHEN** the generation cost of an underground highway step on a cell that a surface route occupies, or on a cell adjacent to one, is compared with the same step on a cell with no surface route nearby
- **THEN** the cost near the surface route is higher

#### Scenario: The penalty decays with distance and is bounded

- **WHEN** the distance from the nearest surface route grows
- **THEN** the penalty decreases, and beyond the decay range the step costs exactly what it would with no surface route present

#### Scenario: The penalty never blocks a passable step

- **WHEN** a step is passable under the water and habitability gates
- **THEN** the separation penalty leaves it passable, whatever its distance to a surface route

#### Scenario: Underground highways do not repel each other

- **WHEN** the generation cost of a step belonging to the underground network is evaluated
- **THEN** the separation penalty is not applied on account of that underground highway, and the underground discount still applies to it

#### Scenario: The separation is visible in the generated network

- **WHEN** the underground network is generated on a map whose surface network is already built
- **THEN** the share of its cells that also carry a surface route is lower than it would be without the separation rule, and the share of its length that runs on an exact surface route step is lower as well
