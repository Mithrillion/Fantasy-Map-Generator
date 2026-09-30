// The plane contract between the surface and underground networks: a surface record connects burgs
// with ground-level presence, an underground highway connects burgs with below-level presence, and a
// record boundary never falls on a burg cell of the other plane.
import { getClassification, hasBelowLevelPresence, hasGroundLevelPresence } from "./burg-classification";
import type { Burg } from "./burgs-generator";
import type { Route } from "./routes-generator";

export type Plane = "surface" | "underground";

export type PlaneViolation =
  | { rule: "boundary"; plane: Plane; burg: number; cell: number; route: number; name: string }
  | { rule: "service"; burg: number; cell: number; feature: number; name: string };

/** How a record boundary relates to its own plane's network: a merged boundary is not an endpoint */
export type BoundaryClassification = "junction" | "terminus";

export type Boundary = {
  plane: Plane;
  route: number;
  cell: number;
  burg: number;
  kind: BoundaryClassification;
  carriedBy: number[];
};

export type PlaneReport = {
  census: { surface: number; subterranean: number; underground: number; belowLevel: number };
  boundaries: Record<Plane, { junctions: Boundary[]; termini: Boundary[] }>;
  /** the burg cells each plane reaches: a burg is connected when its own cell carries that plane */
  connections: Record<Plane, number[]>;
  /** below-level burgs nobody can pair with: no other such burg shares their landmass */
  unconnectable: number[];
  /** every record boundary on a burg cell of the other plane, plus every unserved below-level burg */
  violations: PlaneViolation[];
  /** the other plane's cells: exact for tunnels, a lower bound for surface records */
  contact: {
    tunnelsOnSurfaceOnlyBurgs: number;
    tunnelsOnDualIdentityBurgs: number;
    tunnelCellsWithMultipleRecords: number;
    surfaceRoutesOnBelowLevelCells: number;
  };
  /** underground highways the service pass had to add, read off the records' own marks */
  repairs: number;
};

export const emptyReport = (): PlaneReport => ({
  census: { surface: 0, subterranean: 0, underground: 0, belowLevel: 0 },
  boundaries: {
    surface: { junctions: [], termini: [] },
    underground: { junctions: [], termini: [] }
  },
  connections: { surface: [], underground: [] },
  unconnectable: [],
  violations: [],
  contact: {
    tunnelsOnSurfaceOnlyBurgs: 0,
    tunnelsOnDualIdentityBurgs: 0,
    tunnelCellsWithMultipleRecords: 0,
    surfaceRoutesOnBelowLevelCells: 0
  },
  repairs: 0
});

/** A cell is a legitimate boundary for a plane when it carries no burg, or a burg of that plane */
export function isLegitimateBoundary(map: typeof pack, cell: number, plane: Plane): boolean {
  const burgId = map.cells.burg[cell];
  if (!burgId) return true;
  const burg = map.burgs[burgId];
  if (!burg || burg.removed) return true;
  return plane === "underground" ? hasBelowLevelPresence(burg) : hasGroundLevelPresence(burg);
}

const planeOf = (route: Route): Plane => (route.underground ? "underground" : "surface");
const nameOf = (burg: Burg | undefined, id: number) => burg?.name ?? `burg ${id}`;

/**
 * Reads the plane state of a generated map. Records are read through their own geometry rather than
 * `pack.cells.routes`, because the cell links are last-writer-wins over the route list and the
 * underground network is generated last.
 */
export function auditPlanes(map: typeof pack, routes: Route[]): PlaneReport {
  const report = emptyReport();
  const { burgs, cells } = map;

  const burgAt = (cell: number): { id: number; burg: Burg | undefined } => {
    const id = cells.burg[cell] ?? 0;
    const burg = id ? burgs[id] : undefined;
    return { id, burg: burg && !burg.removed ? burg : undefined };
  };

  const live = routes.filter(route => route?.points?.length);
  const cellsOf: Record<Plane, Set<number>> = { surface: new Set(), underground: new Set() };
  const undergroundRecordsByCell = new Map<number, number>();
  const belowLevelByFeature = new Map<number, Burg[]>();

  for (const burg of burgs) {
    if (!burg?.i || burg.removed) continue;
    const classification = getClassification(burg);
    if (!classification) {
      report.census.surface++;
      continue;
    }
    report.census[classification]++;
    report.census.belowLevel++;
    if (burg.feature === undefined) continue;
    const list = belowLevelByFeature.get(burg.feature);
    if (list) list.push(burg);
    else belowLevelByFeature.set(burg.feature, [burg]);
  }

  for (const route of live) {
    const plane = planeOf(route);
    // distinct cells of this record: a route revisiting a cell is still one record there
    for (const cell of new Set(route.points.map(point => point[2]))) {
      cellsOf[plane].add(cell);
      if (plane === "underground") undergroundRecordsByCell.set(cell, (undergroundRecordsByCell.get(cell) ?? 0) + 1);
    }
    if (route.repaired) report.repairs++;
  }

  for (const cell of cellsOf.surface) if (burgAt(cell).burg) report.connections.surface.push(cell);
  for (const cell of cellsOf.underground) if (burgAt(cell).burg) report.connections.underground.push(cell);

  // boundaries: a cell is a junction when another record of the same plane continues from it
  for (const route of live) {
    const plane = planeOf(route);
    const firstCell = route.points[0][2];
    const lastCell = route.points.at(-1)![2];

    for (const cell of [firstCell, lastCell]) {
      const { id: burgId, burg } = burgAt(cell);
      const carriedBy = live
        .filter(other => other !== route && planeOf(other) === plane && other.points.some(point => point[2] === cell))
        .map(other => other.i);
      const kind: BoundaryClassification = carriedBy.length ? "junction" : "terminus";
      report.boundaries[plane][kind === "junction" ? "junctions" : "termini"].push({
        plane,
        route: route.i,
        cell,
        burg: burgId,
        kind,
        carriedBy
      });

      if (kind === "terminus" && !isLegitimateBoundary(map, cell, plane)) {
        report.violations.push({
          rule: "boundary",
          plane,
          burg: burgId,
          cell,
          route: route.i,
          name: nameOf(burg, burgId)
        });
      }
    }
  }

  // the service rule: a below-level burg that could be paired is not left without a connection
  for (const group of belowLevelByFeature.values()) {
    for (const burg of group) {
      if (cellsOf.underground.has(burg.cell)) continue;
      if (group.length < 2) {
        report.unconnectable.push(burg.i);
        continue;
      }
      report.violations.push({
        rule: "service",
        burg: burg.i,
        cell: burg.cell,
        feature: burg.feature as number,
        name: nameOf(burg, burg.i)
      });
    }
  }

  // contact: exact for tunnels crossing surface burg cells, a lower bound for surface records crossing
  // below-level ones, because a tunnel's link shadows the surface one on a shared step
  for (const cell of cellsOf.underground) {
    const { burg } = burgAt(cell);
    if (!burg || !hasGroundLevelPresence(burg)) continue;
    if (hasBelowLevelPresence(burg)) report.contact.tunnelsOnDualIdentityBurgs++;
    else report.contact.tunnelsOnSurfaceOnlyBurgs++;
  }
  for (const records of undergroundRecordsByCell.values()) {
    if (records > 1) report.contact.tunnelCellsWithMultipleRecords++;
  }
  for (const cell of cellsOf.surface) {
    const { burg } = burgAt(cell);
    if (burg && !hasGroundLevelPresence(burg)) report.contact.surfaceRoutesOnBelowLevelCells++;
  }

  return report;
}

/** The one-line report the real-map audit logs per seed, so a drifting number is visible in CI output */
export function formatPlaneReport(seed: string, report: PlaneReport): string {
  const { census, boundaries, contact } = report;
  const surface = boundaries.surface;
  const underground = boundaries.underground;
  const total = (boundaries: { junctions: unknown[]; termini: unknown[] }) =>
    boundaries.junctions.length + boundaries.termini.length;
  return [
    `PLANES ${seed}`,
    `census surface=${census.surface} subterranean=${census.subterranean} underground=${census.underground} belowLevel=${census.belowLevel}`,
    `boundaries surface=${total(surface)} (${surface.junctions.length}j/${surface.termini.length}t)`,
    `underground=${total(underground)} (${underground.junctions.length}j/${underground.termini.length}t)`,
    `connected surface=${report.connections.surface.length} underground=${report.connections.underground.length}`,
    `unconnectable=${report.unconnectable.length} repairs=${report.repairs}`,
    `contact tunnelsOnSurfaceOnlyBurgs=${contact.tunnelsOnSurfaceOnlyBurgs} tunnelsOnDualIdentityBurgs=${contact.tunnelsOnDualIdentityBurgs} tunnelCellsWithMultipleRecords=${contact.tunnelCellsWithMultipleRecords} surfaceRoutesOnBelowLevelCells=${contact.surfaceRoutesOnBelowLevelCells} (lower bound)`,
    `violations=${report.violations.length}`
  ].join(" ");
}

/** Every violation in one line, so a failing audit names the seed, the burg and the record */
export function formatPlaneViolations(seed: string, report: PlaneReport): string[] {
  return report.violations.map(violation =>
    violation.rule === "boundary"
      ? `${seed}: ${violation.plane} record ${violation.route} ends on ${violation.name} (burg ${violation.burg}, cell ${violation.cell})`
      : `${seed}: ${violation.name} (burg ${violation.burg}, cell ${violation.cell}, feature ${violation.feature}) has no underground connection`
  );
}
