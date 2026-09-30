# plane-integrity-audit Specification

## Purpose

Reports the plane state of a generated map — the burg census, every record boundary classified as a junction or a terminus, the connections of each plane, and every violation of the endpoint, boundary and service rules — so the split between surface routes and underground highways is checkable from the generator's own output rather than from a one-off measurement harness.

## Requirements

### Requirement: Plane integrity is reported from a generated map

The system SHALL provide one audit entry point that reads a generated map and reports, without touching
the DOM: the burg census by classification, the plane of every record boundary, every boundary classified
as a junction or a terminus, the underground connections of every burg with below-level presence, and
every violation of the endpoint, boundary and service rules.

The audit SHALL classify a boundary as a junction when another record of the same plane continues from
that cell, and as a terminus when none does, because the boundary of a merged record is not an endpoint.

#### Scenario: A surface record ending at a below-level burg is a violation

- **WHEN** the audit runs on a map whose surface route begins or ends at a cell whose burg has no ground-level presence
- **THEN** the report names that burg and that route as a boundary violation

#### Scenario: An underground highway ending on a surface burg's cell is a violation

- **WHEN** the audit runs on a map whose underground highway begins or ends at a cell whose burg has ground-level presence only
- **THEN** the report names that burg and that highway as a boundary violation

#### Scenario: A merged boundary is reported as a junction, not a violation

- **WHEN** a record's boundary cell is continued by another record of the same plane
- **THEN** the report classifies that boundary as a junction and raises no violation for it

#### Scenario: A below-level burg without a connection is a violation

- **WHEN** the audit runs on a map where a burg with below-level presence shares its landmass with another such burg and has no underground connection
- **THEN** the report names that burg as a service violation

#### Scenario: A lone below-level burg is not a violation

- **WHEN** the audit runs on a map where a burg with below-level presence is the only such burg on its landmass
- **THEN** the report records it as unconnectable and raises no service violation

### Requirement: The audit reports contact without enforcing it

The audit SHALL report how many cells of one plane carry the other plane's records, because pass-over
contact is a measurable property of the network, and SHALL NOT treat it as a violation: a route crossing a
cell is not a connection. Contact on burg cells SHALL be reported separately for cells whose burg has
ground-level presence only and cells of dual-identity burgs, and the report SHALL count the cells of the
other plane that carry more than one record, so that contact through a settlement can be told from contact
several records converge on.

#### Scenario: A road crossing above a subterranean burg is counted, not failed

- **WHEN** a surface route runs across the cell of a burg with below-level presence without beginning or ending there
- **THEN** the report counts the cell as contact and the audit reports no violation

#### Scenario: Contact on a surface-only burg is reported apart from a dual-identity burg

- **WHEN** underground highways run across the cell of a burg with ground-level presence only and across the cell of a dual-identity burg
- **THEN** the report counts each in its own contact figure, and neither is summed into the other

#### Scenario: A cell carrying more than one record is counted

- **WHEN** two or more underground highways run through the same cell
- **THEN** the report counts that cell in the multi-record contact figure

### Requirement: The audit is exercised against generated maps

The audit SHALL be exercised by tests that ship with the suite: unit tests over constructed packs that
ride in the default test run, and a real-map run that drives the full generation pipeline for a fixed set
of seeds and asserts that a violation-free report is produced. The real-map run SHALL be part of the
project's continuous integration.

The audit SHALL be shown able to fail: a task SHALL confirm that a deliberately reintroduced defect makes
the real-map run fail, so that a green run means the invariants were checked rather than skipped.

#### Scenario: A clean map passes

- **WHEN** the real-map audit runs over the fixed seed set on the current generator
- **THEN** every seed reports zero violations and the run passes

#### Scenario: A reintroduced defect fails the run

- **WHEN** a boundary or service rule is deliberately broken in the generator and the real-map audit runs
- **THEN** the run fails and names the offending burg and route
