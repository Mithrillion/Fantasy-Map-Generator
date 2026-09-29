## ADDED Requirements

### Requirement: Underground connectivity is self-contained

The routing discount an underground highway receives for reusing an already-connected cell pair SHALL be derived from the underground network only. The presence of a surface route SHALL NOT lower the generation cost of an underground highway, and SHALL NOT make an underground highway more likely to follow the surface route's cells. The underground network SHALL remain a network in its own right: an underground highway SHALL be cheaper to generate alongside another underground highway than alongside no connection at all.

This requirement governs generation only. It SHALL NOT alter endpoint eligibility, the water and landmass constraints, the terrain preference, or how any system traverses a generated underground highway.

#### Scenario: A surface route does not make a tunnel cheaper

- **WHEN** the generation cost of an underground highway step is evaluated for a cell pair
- **THEN** the cost is the same whether or not a surface route already connects that pair

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
