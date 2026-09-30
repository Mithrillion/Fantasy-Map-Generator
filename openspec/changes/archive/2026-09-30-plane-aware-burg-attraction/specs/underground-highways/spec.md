## ADDED Requirements

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
