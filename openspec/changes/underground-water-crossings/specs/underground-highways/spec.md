# Delta: underground-highways — water crossings

## ADDED Requirements

### Requirement: Underground highways cross water only in bounded stretches

An underground highway MAY pass under the water alongside its endpoints' landmass. A step onto a
water cell SHALL NOT be impassable by rule: where the old prohibition made every water step
prohibitive, a water step is passable under the bounds of this requirement. It SHALL be dearer than
an otherwise equal step onto land, so that a crossing is chosen for the geometry it removes and not
for its cheapness, and its cost SHALL rise with the depth of the water, so that a shallow bay costs
less than a deep one. A water step beyond the crossing bound SHALL be prohibitive every time: the
bound is the distance to the nearest land cell, so no underground highway crosses a sea arm wider
than the bound, however cheap the direct line would be. Frozen water SHALL be impassable, by the
same passable-sea temperature rule that sea routes already use.

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

- **WHEN** the generation cost of an underground highway step onto colder-than-passable water is
  evaluated, by the temperature rule sea routes use
- **THEN** the cost is prohibitive

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

## REMOVED Requirements

### Requirement: Underground highways never run through water

**Reason**: The absolute prohibition is the divergence program's hardest remaining constraint: the
underground and surface networks compete over the same land, and a tunnel that may pass beneath a
bay, a lake or a lagoon diverges where no road can follow at all. The exploration of 2026-09-30
found the prohibition isolated from everything else the underground design enforces — endpoints,
boundaries, pruning, service and the plane audit anchor on burg cells, which stay on land — so the
prohibition can be replaced without touching any other rule.

**Migration**: Superseded by *Underground highways cross water only in bounded stretches*, above.
The landmass sentence moves there unchanged; the endpoint rule is untouched;
"Adjacent landmasses are not joined" holds as written; the prohibition's remaining content — land
instead of water, depth pricing, frozen water, the plane audit staying clean — is carried by the
new requirement's scenarios.
