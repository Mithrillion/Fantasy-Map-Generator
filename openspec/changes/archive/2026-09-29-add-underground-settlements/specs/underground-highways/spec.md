## Purpose

Generates a subterranean connection network between underground settlements, governed by endpoint eligibility and terrain constraints at generation time only, so that afterwards every system traverses those connections exactly as it traverses surface paths.

## ADDED Requirements

### Requirement: Underground highways connect only subterranean-capable burgs

An underground highway SHALL have subterranean-capable burgs at both of its endpoints. A burg with ground-level presence only SHALL NOT be an endpoint of an underground highway.

#### Scenario: No surface-only endpoint

- **WHEN** underground highways are generated
- **THEN** neither endpoint of any underground highway is a burg that has ground-level presence only

#### Scenario: Dual-identity burgs are valid endpoints

- **WHEN** an underground highway connects a fully subterranean burg to a dual-identity burg
- **THEN** the connection is valid, because the dual-identity burg has below-level presence

### Requirement: Surface connections keep their existing endpoint rule

Surface routes SHALL continue to connect only burgs with ground-level presence. This includes dual-identity burgs and excludes fully subterranean burgs. Existing surface route generation SHALL otherwise be unchanged.

#### Scenario: Fully subterranean burgs get no surface route

- **WHEN** surface routes are generated after classification
- **THEN** no surface route has a fully subterranean burg as an endpoint

#### Scenario: Dual-identity burgs remain surface endpoints

- **WHEN** surface routes are generated after classification
- **THEN** a dual-identity burg can be an endpoint of a surface route exactly as it could before classification

### Requirement: Underground highways never run through water

Every cell on an underground highway SHALL be a land cell. The generation cost of traversing a water cell SHALL be prohibitive, and an underground highway SHALL NOT cross from one landmass to another.

#### Scenario: No water cells on an underground highway

- **WHEN** underground highways are generated
- **THEN** no cell of any underground highway is below the water level

#### Scenario: Adjacent landmasses are not joined

- **WHEN** two subterranean-capable burgs lie on different landmasses separated by water
- **THEN** no underground highway connects them

### Requirement: Underground highways prefer high ground

The generation cost of an underground highway SHALL favour high-elevation terrain over low-elevation terrain, so that the resulting network preferentially runs beneath mountains and highlands.

#### Scenario: A route across a mountain is cheaper than around it

- **WHEN** a path over high ground and a path of equal length over low ground connect the same pair of subterranean-capable burgs
- **THEN** the high-ground path is the one selected

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
