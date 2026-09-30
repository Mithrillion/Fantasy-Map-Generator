## MODIFIED Requirements

### Requirement: Underground highways cross water only in bounded stretches

An underground highway MAY pass under the water alongside its endpoints' landmass. A step onto a
water cell SHALL NOT be impassable by rule: where the old prohibition made every water step
prohibitive, a water step is passable under the bounds of this requirement. It SHALL be dearer than
an otherwise equal step onto land, so that a crossing is chosen for the geometry it removes and not
for its cheapness, and its cost SHALL rise with the depth of the water, so that a shallow bay costs
less than a deep one. A water step beyond the crossing bound SHALL be prohibitive every time: the
bound is the distance to the nearest land cell, so no underground highway crosses a sea arm wider
than the bound, however cheap the direct line would be. The temperature of the water SHALL NOT gate
a water step: the passable-sea temperature rule continues to govern sea routes, where ice is an
obstacle on the surface, and SHALL NOT make a tunnel step prohibitive.

The landmass constraint is unchanged: an underground highway SHALL NOT cross from one landmass to
another, and with water legs present SHALL NOT step onto land belonging to another landmass. The
endpoint constraint is unchanged: an underground highway continues to carry subterranean-capable
burgs at both of its endpoints, on land. This requirement governs generation only: it SHALL NOT
alter how any system traverses a generated underground highway, and a water-granting stretch
confers no water transport on it.

#### Scenario: Water is not categorically impassable

- **WHEN** the generation cost of an underground highway step onto a shallow water cell within the
  crossing bound is evaluated
- **THEN** the cost is finite, because the step is passable

#### Scenario: Deep water costs dearer than shallow

- **WHEN** the cost of an underground highway step onto a deep water cell is compared with the same
  step onto a shallow water cell at an equal distance
- **THEN** the deep step costs more

#### Scenario: A water step costs more than the same step on land

- **WHEN** the generation cost of an underground highway step onto a water cell is compared with the
  same step onto a land cell identical but for its height
- **THEN** the water step costs more

#### Scenario: A wide sea arm stays impassable

- **WHEN** the generation cost of an underground highway step onto a water cell farther from every
  land cell than the crossing bound is evaluated
- **THEN** the cost is prohibitive, however short the direct line would be

#### Scenario: Frozen water is impassable

- **WHEN** a sea route's step onto colder-than-passable water is evaluated, by the passable-sea
  temperature rule
- **THEN** the cost is prohibitive, exactly as it was before this change, because the rule outlives
  this requirement as a sea-route rule

#### Scenario: Frozen water does not gate a tunnel step

- **WHEN** the generation cost of an underground highway step onto water colder than the
  passable-sea temperature is evaluated
- **THEN** the cost is finite, because a tunnel's passability depends on the water it passes under
  and not on the climate above it

#### Scenario: No crossing steps onto a foreign landmass

- **WHEN** a path between two subterranean-capable burgs on one landmass is found
- **THEN** no cell of the path is land belonging to another landmass, however narrow the water way
  to it

#### Scenario: Endpoints, boundaries and the audit are unchanged

- **WHEN** underground highways are generated with water legs present
- **THEN** every endpoint is a land cell of a burg with below-level presence, every boundary rule
  applies as written, and the plane audit reports zero violations

#### Scenario: Traversal is unchanged in kind

- **WHEN** any system traverses a generated underground highway that carries water cells
- **THEN** the transport rules that already apply to every path apply to it, and the water cells of
  the crossing confer no right of water transport

### Requirement: Underground highways prefer high ground

The generation cost of an underground highway SHALL favour high-elevation terrain over low-elevation terrain, so that the resulting network preferentially runs beneath mountains and highlands. No land cell SHALL be impassable to an underground highway on account of its biome, so the preference is exercised over every cell of the range, including the ground a surface ice sheet covers.

#### Scenario: A route across a mountain is cheaper than around it

- **WHEN** a path over high ground and a path of equal length over low ground connect the same pair of subterranean-capable burgs
- **THEN** the high-ground path is the one selected

#### Scenario: A glacier-covered crest does not block the crossing

- **WHEN** a path over a high cell whose biome is a glacier and a path around it of equal length connect the same pair of subterranean-capable burgs
- **THEN** the high-ground path over the glacier is the one selected, because the cell is passable and priced by its elevation alone

### Requirement: Underground highways keep clear of the surface network's corridors

The generation cost of an underground highway SHALL be raised on cells that lie on or near the surface route network, so that a tunnel prefers a corridor clear of the routes it was meant to be an alternative to. The penalty SHALL be derived from the distance to the nearest surface route, SHALL decay as that distance grows, SHALL be bounded above, and SHALL NOT make an otherwise passable cell impassable. It SHALL be derived from surface routes only: the underground network SHALL NOT repel itself, and this rule SHALL NOT alter the underground discount, endpoint eligibility, the water and landmass constraints, or the terrain preference.

#### Scenario: A step beside a surface route costs more than the same step clear of one

- **WHEN** the generation cost of an underground highway step on a cell that a surface route occupies, or on a cell adjacent to one, is compared with the same step on a cell with no surface route nearby
- **THEN** the cost near the surface route is higher

#### Scenario: The penalty decays with distance and is bounded

- **WHEN** the distance from the nearest surface route grows
- **THEN** the penalty decreases, and beyond the decay range the step costs exactly what it would with no surface route present

#### Scenario: The penalty never blocks a passable step

- **WHEN** a step is passable under the water crossing bound
- **THEN** the separation penalty leaves it passable, whatever its distance to a surface route

#### Scenario: Underground highways do not repel each other

- **WHEN** the generation cost of a step belonging to the underground network is evaluated
- **THEN** the separation penalty is not applied on account of that underground highway, and the underground discount still applies to it

#### Scenario: The separation is visible in the generated network

- **WHEN** the underground network is generated on a map whose surface network is already built
- **THEN** the share of its cells that also carry a surface route is lower than it would be without the separation rule, and the share of its length that runs on an exact surface route step is lower as well

## ADDED Requirements

### Requirement: Underground highways ignore land habitability

The generation cost of an underground highway step SHALL NOT depend on the biome of the cell it steps onto. A land cell SHALL NOT be impassable on account of its biome, whatever that biome's habitability, and the cell's biome SHALL NOT change the cost of the step. A water step SHALL be priced the same way: no biome term SHALL apply to it. This rule SHALL NOT alter the crossing bound, the depth price, the landmass constraint, the elevation preference, the corridor separation, the underground discount or the burg attraction, and it SHALL NOT alter the surface network: the land path cost keeps its own habitability gate and its own habitability price, and surface route pathfinding is otherwise unchanged.

#### Scenario: A step onto uninhabitable land is passable

- **WHEN** the generation cost of an underground highway step onto a land cell whose biome habitability is zero is evaluated
- **THEN** the cost is finite

#### Scenario: Biome habitability does not price a tunnel step

- **WHEN** the generation cost of a step onto a land cell is compared with the same step onto a cell identical but for its biome habitability
- **THEN** the two costs are equal

#### Scenario: A water step pays no biome price

- **WHEN** the biome of the destination cell of an underground highway water step is replaced by a biome of habitability zero
- **THEN** the step's cost is unchanged

#### Scenario: The surface land cost keeps its own habitability rule

- **WHEN** the land path cost of a surface route step onto a land cell whose biome habitability is zero is evaluated
- **THEN** the cost is prohibitive, exactly as it was before this change
