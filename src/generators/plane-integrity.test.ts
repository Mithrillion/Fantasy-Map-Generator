import { describe, expect, it } from "vitest";
import type { Burg } from "./burgs-generator";
import {
  auditPlanes,
  formatPlaneReport,
  formatPlaneViolations,
  type PlaneReport,
  type PlaneViolation
} from "./plane-integrity";
import type { Route } from "./routes-generator";

/**
 * A hand-built pack, deliberately independent of the generator so every violation is placed on
 * purpose. Cell ids are 0..11 on two landmasses: 0..7 are feature 1, 8..11 are feature 2.
 */
const FEATURE_SPLIT = 8;
const CELL_COUNT = 12;

const recordAt = (id: number, cells: number[], underground = false): Route =>
  ({
    i: id,
    group: "roads",
    feature: cells[0] < FEATURE_SPLIT ? 1 : 2,
    ...(underground ? { underground: true } : {}),
    points: cells.map(cell => [cell * 10, cell * 10, cell])
  }) as Route;

type BurgSpec = { i: number; cell: number; feature?: number; classification?: "subterranean" | "underground" };

function mapFixture(specs: BurgSpec[]) {
  const burgs = [0 as unknown as Burg];
  const burgOfCell = new Uint16Array(CELL_COUNT);

  for (const { i, cell, feature, classification } of specs) {
    burgs.push({
      i,
      cell,
      feature: feature ?? (cell < FEATURE_SPLIT ? 1 : 2),
      x: cell * 10,
      y: cell * 10,
      name: `Burg ${i}`,
      capital: 0,
      ...(classification === "subterranean" ? { subterranean: true } : {}),
      ...(classification === "underground" ? { underground: true } : {})
    } as Burg);
    burgOfCell[cell] = i;
  }

  return {
    cells: {
      i: Array.from({ length: CELL_COUNT }, (_, cell) => cell),
      p: Array.from({ length: CELL_COUNT }, (_, cell) => [cell * 10, cell * 10] as [number, number]),
      c: Array.from({ length: CELL_COUNT }, () => [] as number[]),
      h: new Uint8Array(CELL_COUNT).fill(30),
      f: Uint8Array.from({ length: CELL_COUNT }, (_, cell) => (cell < FEATURE_SPLIT ? 1 : 2)),
      burg: burgOfCell
    },
    burgs,
    biomes: [],
    features: [0, { i: 1 }, { i: 2 }],
    rivers: [],
    routes: [] as Route[]
  } as unknown as typeof pack;
}

const boundaryViolations = (report: PlaneReport) => report.violations.filter(v => v.rule === "boundary");
const serviceViolations = (report: PlaneReport) => report.violations.filter(v => v.rule === "service");

describe("plane integrity audit", () => {
  it("reports a surface record ending at a below-level burg as a boundary violation", () => {
    const map = mapFixture([{ i: 1, cell: 3, classification: "underground" }]);
    const routes = [recordAt(0, [1, 2, 3])];

    const report = auditPlanes(map, routes);

    expect(report.census).toEqual({ surface: 0, subterranean: 0, underground: 1, belowLevel: 1 });
    expect(boundaryViolations(report)).toEqual<PlaneViolation[]>([
      { rule: "boundary", plane: "surface", burg: 1, cell: 3, route: 0, name: "Burg 1" }
    ]);
    expect(report.connections.surface.includes(3)).toBe(true); // the surface network reaches that burg
  });

  it("reports an underground highway ending on a surface burg's cell as a boundary violation", () => {
    const map = mapFixture([{ i: 1, cell: 3 }]);
    const routes = [recordAt(0, [1, 2, 3], true)];

    const report = auditPlanes(map, routes);

    expect(boundaryViolations(report)).toEqual<PlaneViolation[]>([
      { rule: "boundary", plane: "underground", burg: 1, cell: 3, route: 0, name: "Burg 1" }
    ]);
  });

  it("reports a merged boundary as a junction, not a violation", () => {
    const map = mapFixture([{ i: 1, cell: 3, classification: "subterranean" }]);
    const routes = [recordAt(0, [0, 1]), recordAt(1, [1, 2, 3])];

    const report = auditPlanes(map, routes);

    expect(report.violations).toEqual([]);
    const merged = report.boundaries.surface.junctions.filter(boundary => boundary.route === 0);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ cell: 1, route: 0, kind: "junction", carriedBy: [1] });
  });

  it("reports a below-level burg without a connection as a service violation", () => {
    const map = mapFixture([
      { i: 1, cell: 2, classification: "underground" },
      { i: 2, cell: 5, classification: "subterranean" }
    ]);
    const routes = [recordAt(0, [1, 2], true)];

    const report = auditPlanes(map, routes);

    expect(serviceViolations(report)).toEqual<PlaneViolation[]>([
      { rule: "service", burg: 2, cell: 5, feature: 1, name: "Burg 2" }
    ]);
    expect(report.unconnectable).toEqual([]);
  });

  it("does not report a lone below-level burg as a violation", () => {
    const map = mapFixture([{ i: 1, cell: 9, classification: "underground" }]);

    const report = auditPlanes(map, []);

    expect(report.violations).toEqual([]);
    expect(report.unconnectable).toEqual([1]);
  });

  it("counts contact without failing it", () => {
    const map = mapFixture([{ i: 1, cell: 2, classification: "underground" }]);
    const routes = [recordAt(0, [0, 1, 2, 3])]; // the surface record runs across the burg's cell

    const report = auditPlanes(map, routes);

    expect(report.contact.surfaceRoutesOnBelowLevelCells).toBe(1);
    expect(report.violations).toEqual([]);
  });

  it("tolerates degenerate records", () => {
    const map = mapFixture([{ i: 1, cell: 3, classification: "subterranean" }]);
    const onePoint = recordAt(0, [1]);
    const duplicated = recordAt(1, [1, 2, 3, 3]);
    const withoutPoints = { i: 2, group: "roads", feature: 1 } as Route;

    const report = auditPlanes(map, [onePoint, duplicated, withoutPoints]);

    expect(report.violations).toEqual([]);
    // the point-less record is ignored rather than thrown on
    const boundaries = [...report.boundaries.surface.termini, ...report.boundaries.surface.junctions];
    expect(boundaries.some(boundary => boundary.route === 2)).toBe(false);
    // the one-point record's cell is continued by the longer one, so it is a junction, not a terminus
    expect(boundaries.find(boundary => boundary.route === 0)).toMatchObject({ cell: 1, kind: "junction" });
    // the duplicated trailing cell counts once, and the other end is a plain terminus
    expect(duplicated.points.map(point => point[2])).toEqual([1, 2, 3, 3]);
    expect(report.boundaries.surface.termini.filter(boundary => boundary.route === 1).map(b => b.cell)).toEqual([3]);
    expect(report.boundaries.surface.junctions.filter(boundary => boundary.route === 1).map(b => b.cell)).toEqual([1]);
  });

  it("formats the report and its violations in one line each", () => {
    const map = mapFixture([{ i: 1, cell: 3, classification: "underground" }]);
    const report = auditPlanes(map, [recordAt(0, [1, 2, 3])]);

    const line = formatPlaneReport("measure-a", report);
    expect(line.includes("PLANES measure-a")).toBe(true);
    expect(line.includes("boundaries surface=2 (0j/2t)")).toBe(true);
    expect(line.includes("violations=1")).toBe(true);
    expect(formatPlaneViolations("measure-a", report)).toEqual([
      "measure-a: surface record 0 ends on Burg 1 (burg 1, cell 3)"
    ]);
  });
});
