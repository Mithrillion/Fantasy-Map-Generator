## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Underground highways are selected in three layers

Pair selection SHALL be a stated policy with three layers, applied in order, over the burgs of each
landmass. The layers SHALL NOT alter the routing cost, the water bound, the glacier gate, the separation
term, or the plane rules; they decide only which burg pairs are routed.

1. **Backbone.** One connected tree per landmass SHALL connect the fully subterranean burgs of that
   landmass. Where a dual-identity burg lies between two backbone burgs, it SHALL be usable as a node
   the tree passes through, so the backbone is not forced to route around settlements that need no
   connection of their own.
2. **Shortcut.** A pair SHALL be admitted when the surface path between its two burgs is substantially
   longer than the straight-line distance between them, so that a tunnel appears where overland travel
   is expensive or absent. A pair whose surface path is no worse than the direct line SHALL NOT be
   admitted on this ground.
3. **Long link.** A bounded number of pairs between geographically distant fully subterranean burgs
   SHALL be admitted by a distance floor, so the network keeps some long, near-straight connections
   rather than only local ones.

The pair set SHALL NOT include a pair whose only justification is that both endpoints have below-level
presence.

#### Scenario: The backbone connects every subterranean cluster

- **WHEN** a landmass holds three or more fully subterranean burgs
- **THEN** the generated network connects them in one tree, whether or not any surface route reaches them

#### Scenario: A dual-identity burg serves as transit

- **WHEN** the shortest backbone connection between two fully subterranean burgs passes through a dual-identity burg's cell
- **THEN** the chain may pass through that cell, and it is not required to terminate there

#### Scenario: A shortcut is admitted where overland travel is expensive

- **WHEN** the surface path between two burgs is substantially longer than the straight line between them
- **THEN** a pair is admitted for routing, so the tunnel may serve the connection the surface route serves badly

#### Scenario: No pair exists only to link two served burgs

- **WHEN** two dual-identity burgs are neighbours in the geometric graph and no shortcut, long-link or backbone condition admits them
- **THEN** no pair is generated for them, and the network does not grow to connect them

#### Scenario: Long links survive the selection

- **WHEN** the three layers have been applied
- **THEN** at least one admitted pair connects burgs separated by the distance floor, and the network is not reduced to local connections only
