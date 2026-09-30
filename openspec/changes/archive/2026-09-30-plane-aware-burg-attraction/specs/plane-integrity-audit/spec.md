## MODIFIED Requirements

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
