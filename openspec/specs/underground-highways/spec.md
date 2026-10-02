# underground-highways Specification

## Purpose
Generates a subterranean connection network between underground settlements, governed by endpoint eligibility and terrain constraints at generation time only, so that afterwards every system traverses those connections exactly as it traverses surface paths.

## Requirements

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

### Requirement: Connectivity governs generation only, never traversal

The endpoint eligibility rule SHALL be applied when underground highways are generated and SHALL NOT be applied when existing connections are traversed. Once generated, an underground highway SHALL be traversable on the same terms as a surface path: any travel that can follow a path SHALL be able to follow an underground highway, subject only to the transport rules that already apply to every path regardless of kind.

#### Scenario: Overland travel may follow an underground highway

- **WHEN** a land journey is routed between cells joined by an underground highway
- **THEN** the journey may follow that highway, exactly as it would follow a surface road

#### Scenario: A fully subterranean burg is a reachable destination

- **WHEN** travel is routed to a fully subterranean burg
- **THEN** the burg is a valid destination and the route completes, because the cells it occupies are land cells

#### Scenario: Surface-only burgs remain reachable without an underground highway

- **WHEN** travel is routed between two surface burgs with no underground involvement
- **THEN** the route is found exactly as it was before this feature

#### Scenario: Transport domain rules are unchanged

- **WHEN** a water-domain journey is routed
- **THEN** it is governed by the same land-and-water rules that applied before this feature, and an underground highway on land is no more traversable by water transport than a surface road is

### Requirement: Underground highways are distinguishable from surface routes

The system SHALL record, for each generated underground highway, that it is underground, so that display can distinguish it from a surface route without affecting how any system traverses it. A surface route SHALL NOT carry that record.

#### Scenario: The record is present on underground highways only

- **WHEN** routes are generated with underground generation enabled
- **THEN** every underground highway carries the underground record and no surface route does

#### Scenario: The record does not change traversal

- **WHEN** any system traverses a connection
- **THEN** its behaviour does not depend on whether that connection carries the underground record

### Requirement: The network is rebuilt with the settlements it serves

When the burgs or the terrain are regenerated, the underground highway network SHALL be rebuilt for the resulting settlement set, and underground highways referencing burgs that no longer exist SHALL NOT survive.

#### Scenario: Regenerating routes rebuilds the underground network

- **WHEN** routes are regenerated on a map with underground generation enabled
- **THEN** the underground network is regenerated for the current burgs

#### Scenario: Stale underground highways do not survive

- **WHEN** a burg that was an endpoint of an underground highway is removed or loses its classification
- **THEN** no underground highway retains it as an endpoint

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

### Requirement: Underground highways are selected in two layers

Pair selection SHALL be a stated policy with two layers, applied in order, over the burgs of each
landmass. The layers SHALL NOT alter the routing cost, the water bound, the glacier gate, the separation
term, or the plane rules; they decide only which burg pairs are routed.

1. **Backbone.** One connected tree per landmass SHALL connect the fully subterranean burgs of that
   landmass. A dual-identity burg that carries the path between two backbone burgs SHALL be kept as a
   node the tree passes through, so the backbone is not forced to route around settlements that need no
   connection of their own; a dual-identity burg SHALL NOT be attached as a leaf of the backbone, since
   no highway is owed to it.
2. **Shortcut.** A pair SHALL be admitted when the surface path between its two burgs is substantially
   longer than the straight-line distance between them, so that a tunnel appears where overland travel
   is expensive or absent. A pair whose surface path is no worse than the direct line SHALL NOT be
   admitted on this ground.

The pair set SHALL NOT include a pair whose only justification is that both endpoints have below-level
presence.

#### Scenario: The backbone connects every subterranean cluster

- **WHEN** a landmass holds three or more fully subterranean burgs
- **THEN** the generated network connects them in one tree, whether or not any surface route reaches them

#### Scenario: A dual-identity burg serves as transit

- **WHEN** the shortest backbone connection between two fully subterranean burgs passes through a dual-identity burg's cell
- **THEN** the chain may pass through that cell, and it is not required to terminate there

#### Scenario: A dual-identity burg is not attached for its own sake

- **WHEN** a dual-identity burg is the nearest neighbour of a backbone burg but carries no path between two backbone burgs
- **THEN** no backbone pair is generated for it, and it keeps only what the shortcut layer admits on its own ground

#### Scenario: A shortcut is admitted where overland travel is expensive

- **WHEN** the surface path between two burgs is substantially longer than the straight line between them
- **THEN** a pair is admitted for routing, so the tunnel may serve the connection the surface route serves badly

#### Scenario: No pair exists only to link two served burgs

- **WHEN** two dual-identity burgs are neighbours in the geometric graph and no shortcut or backbone condition admits them
- **THEN** no pair is generated for them, and the network does not grow to connect them

### Requirement: Underground highways serve every burg they can reach

Every **fully subterranean** burg that shares its landmass with at least one other burg with below-level presence SHALL be an endpoint of, or lie on, a generated underground highway. Pruning, merging and boundary resolution SHALL NOT leave such a burg without an underground connection.

A **dual-identity** burg SHALL NOT be required to have an underground connection. Because its surface route already connects it, a tunnel ending at a dual-identity burg, or passing through one, is permitted but never owed: the network MAY leave a dual-identity burg without an underground highway, and SHALL NOT create a highway for it alone.

A burg with below-level presence that is the only such burg on its landmass has no pair to connect to and MAY remain without an underground highway. It SHALL NOT gain a surface route in exchange.

#### Scenario: A fully subterranean burg is connected

- **WHEN** the underground network is generated for a landmass holding two or more fully subterranean burgs
- **THEN** every one of them is an endpoint of, or lies on, an underground highway

#### Scenario: A dual-identity burg without a tunnel is not a violation

- **WHEN** a dual-identity burg shares its landmass with other below-level burgs and the generated network gives it no underground connection
- **THEN** no connection is generated for it on that ground alone, and no service violation is reported for it

#### Scenario: A dual-identity burg may still be an endpoint

- **WHEN** a generated underground highway ends at a dual-identity burg, or carries one between its ends
- **THEN** the highway is valid, and the burg counts as served

#### Scenario: A burg inside a chain keeps its connection

- **WHEN** an underground highway carries a burg with below-level presence between its two ends, and the record ends at a cell that another underground highway continues through
- **THEN** the highway survives and the burg still has an underground connection

#### Scenario: A burg left unserved is reconnected

- **WHEN** the generated underground network leaves a burg with below-level presence without an underground connection, while another such burg shares its landmass
- **THEN** a connection is generated for it when the burg is fully subterranean, so no subterranean burg that can be connected is left out, and a dual-identity burg in the same position is left as it is

#### Scenario: A lone subterranean burg on its landmass

- **WHEN** a landmass holds exactly one burg with below-level presence
- **THEN** no underground highway is generated for it, and it is not given a surface route instead

### Requirement: Editing a connection preserves its plane

An edit that produces a connection record SHALL keep the plane of the record it came from. Splitting an underground highway SHALL produce two underground highways. Joining two records of different planes SHALL be refused rather than re-flag either of them. No edit SHALL leave a burg with ground-level presence only as an endpoint of an underground highway, or a burg without it as an endpoint of a surface route.

#### Scenario: Splitting an underground highway keeps both halves underground

- **WHEN** an underground highway is split
- **THEN** both halves carry the underground record

#### Scenario: Joining across planes is refused

- **WHEN** a join is requested between a surface route and an underground highway
- **THEN** the join does not happen and neither record changes plane

#### Scenario: A below-level burg never becomes a surface endpoint through an edit

- **WHEN** any sequence of edits is applied to a generated map
- **THEN** no surface route gains a burg without ground-level presence as an endpoint

### Requirement: Underground highways are attracted only to the settlements they serve

The generation cost of an underground highway SHALL be lower on a cell whose burg has below-level presence
than on a comparable cell with no burg. On a cell whose burg has ground-level presence only the cost SHALL
NOT be lower than on a comparable cell with no burg, and MAY be higher. A cell whose burg record is missing
or removed SHALL be priced as a cell with no burg.

This requirement governs generation only, and SHALL NOT alter the surface network's own generation cost or
pathfinding, the underground discount, endpoint eligibility, the water and landmass constraints, or the
terrain preference.

#### Scenario: A below-level settlement still attracts a tunnel

- **WHEN** the generation cost of an underground highway step onto a cell whose burg has below-level presence is compared with the same step onto a comparable cell with no burg
- **THEN** the step onto the below-level burg's cell is the cheaper of the two

#### Scenario: A surface-only settlement does not attract a tunnel

- **WHEN** the generation cost of an underground highway step onto a cell whose burg has ground-level presence only is compared with the same step onto a comparable cell with no burg
- **THEN** the step onto the surface-only burg's cell is not cheaper

#### Scenario: A missing or removed burg record prices as no burg

- **WHEN** the destination cell of an underground highway step carries a burg id whose record is missing or removed
- **THEN** the step is priced as if the cell carried no burg

#### Scenario: The surface network's own cost is unchanged

- **WHEN** the land path cost of a step onto a cell whose burg has ground-level presence is compared with the same step onto a comparable cell with no burg
- **THEN** their ratio is the surface network's own burg factor, which this rule does not change

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
