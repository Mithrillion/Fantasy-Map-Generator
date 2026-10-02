## MODIFIED Requirements

### Requirement: Underground content is visually distinguishable from surface content

Underground burgs SHALL be drawn with a visual treatment distinct from surface burgs, and underground highways with a treatment distinct from surface routes, so that in the both state a reader can tell which plane an element belongs to. In the both state, a link with no connection to a burg in the other plane SHALL NOT be drawn pinned to that burg's icon: tunnel geometry SHALL NOT punctuate the icon of a burg without below-level presence in the tunnel's cell that it merely crosses, and surface road geometry SHALL NOT punctuate the icon of a fully subterranean burg whose cell it merely crosses.

#### Scenario: The two planes read differently when shown together

- **WHEN** the both content-focus state is displayed
- **THEN** underground burgs are visually distinguishable from surface burgs and underground highways from surface roads and trails

#### Scenario: A tunnel does not pin to an unconnected surface burg

- **WHEN** the both content-focus state is displayed and a tunnel crosses the cell of a surface burg it has no connection to
- **THEN** the tunnel's rendered geometry does not pass through that burg's icon position
