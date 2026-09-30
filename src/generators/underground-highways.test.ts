import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { distanceSquared, isLand } from "../utils";
import { findPath } from "../utils/pathUtils";
import { getClassification, hasBelowLevelPresence, hasGroundLevelPresence } from "./burg-classification";
import type { Burg } from "./burgs-generator";
import { auditPlanes, isLegitimateBoundary } from "./plane-integrity";
import { createSurfacePathMeasure, type Route, selectUndergroundPairs } from "./routes-generator";

/**
 * A 7x3 land grid, 10px apart, 4-way connected. Column 3 is a strait: cells left of it are one
 * landmass (feature 1), cells right of it another (feature 2). Cell id = row * 7 + col.
 */
const COLUMNS = 7;
const ROWS = 3;
const STRAIT = 3;
const CELL_COUNT = COLUMNS * ROWS;
const cellAt = (row: number, column: number) => row * COLUMNS + column;
const isStrait = (cell: number) => cell % COLUMNS === STRAIT;

/**
 * The 9x3 bay variant: one landmass (feature 1) shores both sides of a bay (water columns 3-5,
 * feature 3), whose second water column sits at the crossing bound's edge (t = -2). The optional
 * one-cell isle (feature 2, row 1 column 4) is a foreign landmass inside the bay, which makes every
 * water cell a shore cell (t = -1) and leaves no land neck around it. Cell id = row * 9 + col.
 */
const BAY_COLUMNS = 9;
const BAY_WEST = 3; // the bay's first water column
const BAY_EAST = 5; // its last
const BAY_ISLE = 4; // the isle's column inside the bay
const BAY_CELL_COUNT = BAY_COLUMNS * ROWS;
const bayAt = (row: number, column: number) => row * BAY_COLUMNS + column;

/** Minimal FlatQueue stand-in (correct, not optimised) for the A* the pathfinder runs */
class TestFlatQueue {
  private items: Array<{ id: number; value: number }> = [];
  get length() {
    return this.items.length;
  }
  push(id: number, value: number) {
    this.items.push({ id, value });
    this.items.sort((a, b) => a.value - b.value);
  }
  pop() {
    return this.items.shift()?.id;
  }
  peekValue() {
    return this.items[0]?.value;
  }
}

/**
 * Builds the fixture pack with the fields the underground gates read: per-cell `t` is the shore
 * distance (land 1, water -1, the bay's second column -2) and the grid stub built beside it
 * (`makeGrid`) holds `temp` above `MIN_PASSABLE_SEA_TEMP` everywhere. Heights and biomes follow the
 * base fixture: land biome 1, water biome 12 (habitability 0, which water legs do not gate on),
 * water h 5.
 */
function makePack(
  heights: (cell: number) => number = () => 30,
  { bay = false, isle = false }: { bay?: boolean; isle?: boolean } = {}
) {
  const columns = bay ? BAY_COLUMNS : COLUMNS;
  const cellCount = bay ? BAY_CELL_COUNT : CELL_COUNT;
  const p: [number, number][] = [];
  const c: number[][] = [];
  const h = new Uint8Array(cellCount);
  const f = new Uint8Array(cellCount);
  const biome = new Uint8Array(cellCount);
  const t = new Int8Array(cellCount);

  /** the bay variant's land: the shores on both sides, and the isle cell when the variant has one */
  const isBayLand = (row: number, column: number) =>
    row >= 0 &&
    row < ROWS &&
    column >= 0 &&
    column < columns &&
    (column < BAY_WEST || column > BAY_EAST || (isle && row === 1 && column === BAY_ISLE));

  for (let cell = 0; cell < cellCount; cell++) {
    const row = Math.floor(cell / columns);
    const column = cell % columns;
    p.push([column * 10, row * 10]);

    const neighbors: number[] = [];
    if (row > 0) neighbors.push(cell - columns);
    if (row < ROWS - 1) neighbors.push(cell + columns);
    if (column > 0) neighbors.push(cell - 1);
    if (column < columns - 1) neighbors.push(cell + 1);
    c.push(neighbors);

    if (!bay) {
      h[cell] = isStrait(cell) ? 5 : heights(cell);
      f[cell] = column < STRAIT ? 1 : 2;
      biome[cell] = isStrait(cell) ? 12 : 1;
      t[cell] = isStrait(cell) ? -1 : 1;
      continue;
    }

    const isIsle = isle && row === 1 && column === BAY_ISLE;
    const isWater = !isBayLand(row, column);
    h[cell] = isWater ? 5 : heights(cell);
    f[cell] = isIsle ? 2 : isWater ? 3 : 1;
    biome[cell] = isWater ? 12 : 1;
    t[cell] = isWater
      ? isBayLand(row - 1, column) ||
        isBayLand(row + 1, column) ||
        isBayLand(row, column - 1) ||
        isBayLand(row, column + 1)
        ? -1
        : -2
      : 1;
  }

  const burgs = bay
    ? [
        0 as unknown as Burg,
        { cell: bayAt(1, 1), x: 10, y: 10, i: 1, name: "Westshore", feature: 1, capital: 0, underground: true },
        { cell: bayAt(1, 7), x: 70, y: 10, i: 2, name: "Eastshore", feature: 1, capital: 0, underground: true }
      ]
    : [
        0 as unknown as Burg,
        { cell: cellAt(1, 1), x: 10, y: 10, i: 1, name: "Deephold", feature: 1, capital: 0, underground: true },
        { cell: cellAt(0, 2), x: 20, y: 0, i: 2, name: "Twinhall", feature: 1, capital: 0, subterranean: true },
        { cell: cellAt(2, 0), x: 0, y: 20, i: 3, name: "Surfacetown", feature: 1, capital: 0 },
        { cell: cellAt(1, 5), x: 50, y: 10, i: 4, name: "Stonegate", feature: 2, capital: 0, underground: true },
        { cell: cellAt(1, 6), x: 60, y: 10, i: 5, name: "Rockmarch", feature: 2, capital: 0, underground: true }
      ];

  const burgOfCell = new Uint16Array(cellCount);
  for (const burg of burgs) if (burg?.i) burgOfCell[burg.cell] = burg.i;

  return {
    cells: {
      i: Array.from({ length: cellCount }, (_, cell) => cell),
      p,
      c,
      h,
      f,
      biome,
      t,
      burg: burgOfCell,
      haven: new Uint16Array(cellCount),
      harbor: new Uint8Array(cellCount),
      r: new Uint16Array(cellCount),
      fl: new Uint16Array(cellCount),
      g: new Uint8Array(cellCount),
      routes: {} as Record<number, Record<number, number>>
    },
    // biome 1 is habitable, biome 12 is not: `habitability: 0` is the gate the land cost uses
    biomes: [
      null,
      { i: 1, habitability: 50 },
      ...Array.from({ length: 10 }, (_, i) => ({ i: i + 2, habitability: 40 })),
      { i: 12, habitability: 0 }
    ],
    features: bay ? [0, { i: 1 }, { i: 2 }, { i: 3 }] : [0, { i: 1 }, { i: 2 }],
    burgs,
    rivers: [],
    routes: [] as Route[]
  };
}

/** The grid stub the water gates read `grid.cells.temp` from: above `MIN_PASSABLE_SEA_TEMP` everywhere */
const makeGrid = (cellCount = CELL_COUNT) => ({ cells: { temp: new Array(cellCount).fill(20) } });

/** The biome table both fixtures read: biome 1 habitable, 12 (water) not */
const FIXTURE_BIOMES = [
  null,
  { i: 1, habitability: 50 },
  ...Array.from({ length: 10 }, (_, i) => ({ i: i + 2, habitability: 40 })),
  { i: 12, habitability: 0 }
];

type FixtureBurg = { cell: number; name: string; classification?: "underground" | "subterranean" };

/**
 * A rectangular pack built from a per-cell spec, for the pair-selection fixtures: every cell is land
 * of one feature unless `isWater` says otherwise, all heights are passable, and each listed burg is
 * placed on its own cell. Water keeps the bay fixture's shape (h 5, biome 12, its own feature, `t`
 * -1 beside land and -2 otherwise) so a fixture can also route across it.
 */
function makeRectPack({
  columns,
  rows,
  spacing = 10,
  isWater = () => false,
  burgs,
  surfaceRoutes = []
}: {
  columns: number;
  rows: number;
  spacing?: number;
  isWater?: (row: number, column: number) => boolean;
  burgs: FixtureBurg[];
  surfaceRoutes?: number[][];
}) {
  const cellCount = columns * rows;
  const p: [number, number][] = [];
  const c: number[][] = [];
  const h = new Uint8Array(cellCount);
  const f = new Uint8Array(cellCount);
  const biome = new Uint8Array(cellCount);
  const t = new Int8Array(cellCount);
  const isLand = (row: number, column: number) =>
    row >= 0 && row < rows && column >= 0 && column < columns && !isWater(row, column);

  for (let cell = 0; cell < cellCount; cell++) {
    const row = Math.floor(cell / columns);
    const column = cell % columns;
    const water = isWater(row, column);
    p.push([column * spacing, row * spacing]);

    const neighbors: number[] = [];
    if (row > 0) neighbors.push(cell - columns);
    if (row < rows - 1) neighbors.push(cell + columns);
    if (column > 0) neighbors.push(cell - 1);
    if (column < columns - 1) neighbors.push(cell + 1);
    c.push(neighbors);

    h[cell] = water ? 5 : 30;
    f[cell] = water ? 3 : 1;
    biome[cell] = water ? 12 : 1;
    t[cell] = water
      ? isLand(row - 1, column) || isLand(row + 1, column) || isLand(row, column - 1) || isLand(row, column + 1)
        ? -1
        : -2
      : 1;
  }

  const records = burgs.map(({ cell, name, classification }, index) => ({
    i: index + 1,
    cell,
    x: p[cell][0],
    y: p[cell][1],
    name,
    feature: 1,
    capital: 0,
    ...(classification === "underground" ? { underground: true } : {}),
    ...(classification === "subterranean" ? { subterranean: true } : {})
  }));
  const burgsById = [0 as unknown as Burg, ...(records as unknown as Burg[])];
  const burgOfCell = new Uint16Array(cellCount);
  for (const burg of burgsById) if (burg?.i) burgOfCell[burg.cell] = burg.i;

  return {
    cells: {
      i: Array.from({ length: cellCount }, (_, cell) => cell),
      p,
      c,
      h,
      f,
      biome,
      t,
      burg: burgOfCell,
      haven: new Uint16Array(cellCount),
      harbor: new Uint8Array(cellCount),
      r: new Uint16Array(cellCount),
      fl: new Uint16Array(cellCount),
      g: new Uint8Array(cellCount),
      routes: {} as Record<number, Record<number, number>>
    },
    biomes: FIXTURE_BIOMES,
    features: [0, { i: 1 }, { i: 2 }, { i: 3 }],
    burgs: burgsById,
    rivers: [],
    routes: surfaceRoutes.map(
      (cells, index) =>
        ({
          i: index,
          group: "roads",
          feature: 1,
          points: cells.map(cell => [...p[cell], cell])
        }) as Route
    )
  };
}

/**
 * The pair-selection fixture: `count` fully subterranean burgs on one all-land landmass (feature 1),
 * plus `dualIdentity` dual-identity burgs. `layout` places the subterranean burgs either along the
 * middle row (two columns apart, so a dual burg fits between a pair) or in two clusters at opposite
 * corners, which is the case a tree has to span. Dual burgs sit off the middle row unless `dualCells`
 * names their cells. `surfaceRoutes` are hand-built surface records (cell lists), so the shortcut
 * layer has a surface path to measure.
 */
const LANDMASS_COLUMNS = 11;
const LANDMASS_ROWS = 3;
const landmassAt = (row: number, column: number) => row * LANDMASS_COLUMNS + column;

function landmassWithSubterranean(
  count: number,
  {
    dualIdentity = 0,
    dualCells,
    layout = "line",
    surfaceRoutes = []
  }: {
    dualIdentity?: number;
    dualCells?: number[];
    layout?: "line" | "clusters";
    surfaceRoutes?: number[][];
  } = {}
) {
  const clusterSplit = Math.ceil(count / 2);

  const subterranean =
    layout === "line"
      ? Array.from({ length: count }, (_, index) => landmassAt(1, 2 * index + 1))
      : Array.from({ length: count }, (_, index) =>
          index < clusterSplit ? landmassAt(0, index) : landmassAt(2, LANDMASS_COLUMNS - 1 - (count - 1 - index))
        );
  const duals =
    dualCells ??
    Array.from({ length: dualIdentity }, (_, index) =>
      layout === "line" ? landmassAt(0, 2 * index + 2) : landmassAt(1, 4 + index)
    );

  return makeRectPack({
    columns: LANDMASS_COLUMNS,
    rows: LANDMASS_ROWS,
    burgs: [
      ...subterranean.map((cell, index) => ({
        cell,
        name: `Deep ${index + 1}`,
        classification: "underground" as const
      })),
      ...duals.map((cell, index) => ({ cell, name: `Twin ${index + 1}`, classification: "subterranean" as const }))
    ],
    surfaceRoutes
  });
}

/** The bay fixture's own span, scaled up so the land detour can be an exact multiple of the direct line */
const DETOUR_COLUMNS = 211;
const DETOUR_ROWS = 4;
const DETOUR_WEST = 5; // the west burg's column
const DETOUR_EAST = 205; // the east burg's column
const DETOUR_SPAN = DETOUR_EAST - DETOUR_WEST; // 200 cells of ten units: a 2000-unit direct line
const detourAt = (row: number, column: number) => row * DETOUR_COLUMNS + column;

/**
 * Two fully subterranean burgs across a bay whose only land path is a specified multiple of the
 * direct line: the record runs along row 2 (the bay floods row 1 between the shores) and dips into
 * row 3 for the extra length, each dip adding two steps on every second column. With the shore span
 * fixed at 200 cells the ratio is exact to the hundredth, which is what pins the 1.49x / 1.5x
 * boundary. The record's end cells are the cells beside each burg, so the measured path is the
 * record's own span.
 */
function bayWithLandDetour(ratio: number) {
  let detours = Math.round(((ratio - 1) * DETOUR_SPAN) / 2);
  const record: number[] = [];

  for (let column = DETOUR_WEST; column <= DETOUR_EAST; column++) {
    record.push(detourAt(2, column));
    // one dip every second column, so consecutive dips never share a cell
    if (detours > 0 && column < DETOUR_EAST && (column - DETOUR_WEST) % 2 === 0) {
      record.push(detourAt(3, column), detourAt(3, column + 1));
      detours--;
    }
  }

  return makeRectPack({
    columns: DETOUR_COLUMNS,
    rows: DETOUR_ROWS,
    isWater: (row, column) => row === 1 && column > DETOUR_WEST && column < DETOUR_EAST,
    burgs: [
      { cell: detourAt(1, DETOUR_WEST), name: "Westshore", classification: "underground" },
      { cell: detourAt(1, DETOUR_EAST), name: "Eastshore", classification: "underground" }
    ],
    surfaceRoutes: [record]
  });
}

/** Every cell joined by a route link, walked the way a journey walks the shared cell network */
function reachable(from: number, to: number, canTraverse: (cell: number) => boolean): boolean {
  const seen = new Set([from]);
  const queue = [from];

  while (queue.length) {
    const cell = queue.shift() as number;
    for (const next of Object.keys(pack.cells.routes[cell] ?? {}).map(Number)) {
      if (seen.has(next) || !canTraverse(next)) continue;
      if (next === to) return true;
      seen.add(next);
      queue.push(next);
    }
  }

  return false;
}

const endpoints = (route: Route) => [route.points[0][2], route.points.at(-1)?.[2]] as number[];

/** The cell shape a tunnel leg may occupy: land, or water within the crossing bound */
const isTunnelPassableCell = (cell: number) => pack.cells.h[cell] >= 20 || Math.abs(pack.cells.t[cell]) <= 2;

describe("underground highways", () => {
  let Routes: any;
  let Burgs: any;
  let minPassableSeaTemp: number;

  beforeEach(async () => {
    globalThis.TIME = false;
    (globalThis as any).FlatQueue = TestFlatQueue;
    vi.stubGlobal("Pack", { findCell: () => -1 }); // only sharp-angle smoothing reads it
    globalThis.grid = makeGrid() as unknown as typeof grid;
    globalThis.pack = makePack() as unknown as typeof pack;
    globalThis.options.generation.underground = true;

    await import("./river-generator"); // the water cost reads the Rivers global
    ({ MIN_PASSABLE_SEA_TEMP: minPassableSeaTemp } = await import("./routes-generator"));
    await import("./burgs-generator");
    Routes = (globalThis as any).Routes;
    Burgs = (globalThis as any).Burgs;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.options.generation.underground = false;
  });

  const generate = (seed = 1) => Routes.generate([], seed);
  const undergroundRoutes = () => pack.routes.filter(route => route.underground);
  const handRoute = (i: number, cells: number[], underground = false) =>
    ({
      i,
      group: "roads",
      feature: 1,
      ...(underground ? { underground: true } : {}),
      points: cells.map(cell => [...pack.cells.p[cell], cell])
    }) as Route;
  const handHighway = (i: number, cells: number[]) => handRoute(i, cells, true);

  /** bare-cost determinism: the pass's own fields start as they do on a fresh module */
  const freshUndergroundState = () => {
    Routes.surfaceDistances = undefined;
    Routes.undergroundConnections = new Set();
  };

  it("lets a water step within the crossing bound pass", () => {
    freshUndergroundState();
    const west = cellAt(1, 2);
    const east = cellAt(1, 4);
    const water = cellAt(1, STRAIT);

    expect(pack.cells.t[water]).toBe(-1); // a shore water cell
    expect(Routes.getUndergroundPathCost(west, water)).toBeLessThan(Infinity);
    expect(Routes.getUndergroundPathCost(east, water)).toBeLessThan(Infinity); // from either bank

    pack.cells.t[cellAt(0, STRAIT)] = -2; // the bound's edge is still passable
    expect(Routes.getUndergroundPathCost(west, cellAt(0, STRAIT))).toBeLessThan(Infinity);
  });

  it("prices a deep water step dearer than an equal shallow one", () => {
    freshUndergroundState();
    const from = cellAt(1, 2);
    const shallow = cellAt(0, STRAIT);
    const deep = cellAt(2, STRAIT);
    pack.cells.h[shallow] = 19;
    pack.cells.h[deep] = 2;

    expect(pack.cells.t[shallow]).toBe(-1);
    expect(distanceSquared(pack.cells.p[from], pack.cells.p[shallow])).toBe(
      distanceSquared(pack.cells.p[from], pack.cells.p[deep])
    ); // equal distances and equal t: the depth term is the only difference
    expect(Routes.getUndergroundPathCost(from, deep)).toBeGreaterThan(Routes.getUndergroundPathCost(from, shallow));
  });

  it("prices a water step dearer than the same step on land", () => {
    freshUndergroundState();
    const from = cellAt(1, 2);
    const land = cellAt(2, 2);
    const water = cellAt(1, STRAIT);
    pack.cells.h[land] = 90; // heightModifier 1.0

    expect(distanceSquared(pack.cells.p[from], pack.cells.p[land])).toBe(
      distanceSquared(pack.cells.p[from], pack.cells.p[water])
    ); // equal offsets from the bank
    expect(Routes.getUndergroundPathCost(from, water)).toBeGreaterThan(Routes.getUndergroundPathCost(from, land));
  });

  it("keeps water beyond the shore-distance bound prohibitive", () => {
    freshUndergroundState();
    const beyondBound = cellAt(1, STRAIT);
    pack.cells.t[beyondBound] = -3;

    expect(Routes.getUndergroundPathCost(cellAt(1, 2), beyondBound)).toBe(Infinity);
    expect(Routes.getUndergroundPathCost(cellAt(1, 4), beyondBound)).toBe(Infinity); // from either bank

    pack.cells.t[cellAt(0, STRAIT)] = -4;
    expect(Routes.getUndergroundPathCost(cellAt(0, 2), cellAt(0, STRAIT))).toBe(Infinity);
    expect(Routes.getUndergroundPathCost(cellAt(0, 4), cellAt(0, STRAIT))).toBe(Infinity);
  });

  it("keeps frozen water impassable", () => {
    freshUndergroundState();
    const from = cellAt(1, 2);
    const frozen = cellAt(1, STRAIT);
    const control = cellAt(0, STRAIT);
    pack.cells.g[frozen] = 1; // the water leg reads its own grid temperature
    grid.cells.temp[1] = minPassableSeaTemp - 1;

    expect(Routes.getUndergroundPathCost(from, frozen)).toBe(Infinity);
    expect(Routes.getUndergroundPathCost(from, control)).toBeLessThan(Infinity); // the default temp is passable
  });

  it("refuses a land step onto a foreign landmass and keeps the glacier gate", () => {
    freshUndergroundState();
    const crossing = cellAt(1, STRAIT); // bound-passable water between the landmasses
    const foreignShore = cellAt(1, 4); // land of feature 2
    expect(Routes.createUndergroundCost(1)(crossing, foreignShore)).toBe(Infinity);
    expect(Routes.createUndergroundCost(2)(crossing, foreignShore)).toBeLessThan(Infinity);

    const land = cellAt(1, 1);
    const glacier = cellAt(1, 2);
    pack.cells.biome[glacier] = 12; // habitability 0
    expect(Routes.getUndergroundPathCost(land, glacier)).toBe(Infinity);
  });

  it("makes a high-ground step cheaper than an equal-length low-ground step", () => {
    const from = cellAt(1, 1);
    const low = cellAt(1, 2);
    const high = cellAt(0, 1);
    pack.cells.h[low] = 21;
    pack.cells.h[high] = 90;

    expect(Routes.getUndergroundPathCost(from, high)).toBeLessThan(Routes.getUndergroundPathCost(from, low));
  });

  it("selects the high-ground path of two equal-length paths", () => {
    // a 3x3 grid of its own: two four-step ways from the corner to the corner, one under high ground
    const size = 3;
    const highWay = [0, 3, 6, 7, 8];
    const lowWay = [0, 1, 2, 5, 8];
    const cells = {
      p: Array.from(
        { length: size * size },
        (_, cell) => [(cell % size) * 10, Math.floor(cell / size) * 10] as [number, number]
      ),
      c: Array.from({ length: size * size }, (_, cell) => {
        const [row, column] = [Math.floor(cell / size), cell % size];
        const neighbors: number[] = [];
        if (row > 0) neighbors.push(cell - size);
        if (row < size - 1) neighbors.push(cell + size);
        if (column > 0) neighbors.push(cell - 1);
        if (column < size - 1) neighbors.push(cell + 1);
        return neighbors;
      }),
      h: Uint8Array.from({ length: size * size }, (_, cell) => (highWay.includes(cell) ? 90 : 21)),
      biome: new Uint8Array(size * size).fill(1),
      burg: new Uint16Array(size * size)
    };
    globalThis.pack = { ...pack, cells: { ...pack.cells, ...cells } } as unknown as typeof pack;

    const path = findPath(0, cell => cell === 8, Routes.getUndergroundPathCost.bind(Routes), pack as never);

    expect(path).not.toBeNull();
    expect(path).toHaveLength(5);
    expect(path).toEqual(highWay);
    expect(path?.includes(lowWay[1])).toBe(false); // and not the lowland way of the same length
  });

  it("prices a surface-covered step no lower than a clear one, and higher beside a route", () => {
    const from = cellAt(0, 1);
    const to = cellAt(1, 1);
    pack.cells.h[to] = 40;
    // no burgs: the surface network comes out empty, so the pass leaves the field clear everywhere
    pack.cells.burg = new Uint16Array(CELL_COUNT);
    pack.burgs = [0] as unknown as typeof pack.burgs;

    Routes.generate([], 1);
    expect(pack.cells.routes[from]?.[to]).toBeUndefined(); // no surface route covers this step
    const plain = Routes.getUndergroundPathCost(from, to);

    // a locked surface route over the same step is not part of the underground network, but it does
    // seed the separation field, so the step now pays the surface penalty
    Routes.generate([handRoute(1, [from, to])], 1);
    expect(pack.cells.routes[from]?.[to]).toBeDefined(); // the locked route does cover it
    const covered = Routes.getUndergroundPathCost(from, to);

    expect(covered).toBeGreaterThanOrEqual(plain); // a surface route never makes a tunnel cheaper
    expect(covered).toBeGreaterThan(plain); // and beside a route it makes it dearer
  });

  it("discounts a tunnel step that is part of the underground network", () => {
    const from = cellAt(0, 1);
    const to = cellAt(1, 1);
    pack.cells.h[to] = 40;
    globalThis.options.generation.underground = false;
    Routes.generate([], 1);
    pack.routes = [];
    Routes.sync(); // neither network covers the step, so this is the plain cost
    const plain = Routes.getUndergroundPathCost(from, to);

    // a pinned tunnel over the same step seeds the network it belongs to
    Routes.generate([handRoute(1, [from, to], true)], 1);
    expect(Routes.getUndergroundPathCost(from, to)).toBeLessThan(plain);
  });

  it("records a generated segment in the underground network, not the shared map", () => {
    generate();
    const [from, to] = [undergroundRoutes()[0].points[0][2], undergroundRoutes()[0].points[1][2]];
    const discounted = Routes.getUndergroundPathCost(from, to);

    // the same step with both networks cleared: the discount is 0.5, so the plain cost is twice as large
    globalThis.options.generation.underground = false;
    Routes.generate([], 1);
    pack.routes = [];
    Routes.sync();
    expect(discounted * 2).toBeCloseTo(Routes.getUndergroundPathCost(from, to));
  });

  it("leaves the land and water costs unaware of the underground network", () => {
    generate();
    // landmass B has below-level burgs only: no surface route runs where its highway does
    const highway = undergroundRoutes().find(route => route.points.some(([, , cell]) => pack.cells.f[cell] === 2))!;
    const [from, to] = [highway.points[0][2], highway.points[1][2]];
    const landCost = Routes.getLandPathCost(from, to);
    const waterCost = Routes.getWaterPathCost(from, to);

    globalThis.options.generation.underground = false;
    Routes.generate([], 1);
    expect(Routes.getLandPathCost(from, to)).toBe(landCost);
    expect(Routes.getWaterPathCost(from, to)).toBe(waterCost);
  });

  it("keeps the land and water costs unaware of the underground network on water legs", () => {
    generate();
    const land = cellAt(1, 2);
    const water = cellAt(1, STRAIT);
    expect(Routes.getLandPathCost(land, water)).toBe(Infinity); // the height gate stands on water
    const waterCost = Routes.getWaterPathCost(land, water);
    expect(waterCost).toBeLessThan(Infinity);

    globalThis.options.generation.underground = false;
    Routes.generate([], 1);
    expect(Routes.getLandPathCost(land, water)).toBe(Infinity);
    expect(Routes.getWaterPathCost(land, water)).toBe(waterCost); // the sea cost reads the same fields it always did
  });

  it("prices a water step as a plain, burgless cell and keeps the separation term", () => {
    // bare state: no surface network exists, so the water step is distance x 1.1 x 1.62 x 2 — the
    // plain no-burg price, the depth term the only water-specific factor and no burg discount
    freshUndergroundState();
    const from = cellAt(1, 2);
    const water = cellAt(1, STRAIT);
    pack.cells.h[water] = 19; // shallow: the depth term at its gentlest
    const distance = distanceSquared(pack.cells.p[from], pack.cells.p[water]);
    const plain = distance * 1.1 * 1.62 * 2; // the water biome's habitability 0, h 19, no burg on water

    expect(Routes.getUndergroundPathCost(from, water)).toBeCloseTo(plain, 5);

    // a locked surface route over the bay seeds the separation field on the water cell too
    pack.cells.burg = new Uint16Array(CELL_COUNT);
    pack.burgs = [0] as unknown as typeof pack.burgs;
    Routes.generate([handRoute(1, [water, cellAt(1, 4)])], 1);
    expect(Routes.getUndergroundPathCost(from, water) / plain).toBeCloseTo(3, 5); // the full penalty at distance 0
  });

  // The bay variant: one landmass (feature 1) around a bay, an optional foreign isle (feature 2).
  // The crossing tests that need a whole network run generate() on it; useBay also clears the
  // pass's own fields, so a bare call never reads the previous fixture's separation field.
  describe("bounded water crossings on a bay", () => {
    const useBay = ({ isle = false }: { isle?: boolean } = {}) => {
      globalThis.pack = makePack(() => 30, { bay: true, isle }) as unknown as typeof pack;
      globalThis.grid = makeGrid(BAY_CELL_COUNT) as unknown as typeof grid;
      freshUndergroundState();
    };

    it("a bay crossing serves its burgs and stays plane-clean", () => {
      useBay();
      // the bay spans the fixture's every row, so the land detour does not exist: the pair is
      // bridged through the bay's water or not at all
      generate();

      expect(undergroundRoutes()).toHaveLength(1);
      const crossing = undergroundRoutes()[0];
      expect(crossing.points.some(([, , cell]) => pack.cells.h[cell] < 20)).toBe(true);
      for (const cell of endpoints(crossing)) {
        expect(pack.cells.h[cell]).toBeGreaterThanOrEqual(20); // endpoints stay on land
        expect(hasBelowLevelPresence(pack.burgs[pack.cells.burg[cell]])).toBe(true);
      }
      expect(
        crossing.points
          .map(([, , cell]) => cell)
          .filter(cell => pack.cells.h[cell] >= 20)
          .every(cell => pack.cells.f[cell] === 1)
      ).toBe(true); // no cell of the crossing is land of another feature

      const report = auditPlanes(pack, pack.routes);
      expect(report.violations).toEqual([]);
    });

    it("keeps a mixed tunnel's record shape", () => {
      useBay();
      generate();

      const crossing = undergroundRoutes().find(route => route.points.some(([, , cell]) => pack.cells.h[cell] < 20));
      expect(crossing).toBeDefined();
      expect(crossing!.group).toBe("roads"); // the group is what the rest of the app branches on
      expect(crossing!.underground).toBe(true);
      expect(Object.keys(crossing!).sort()).toEqual(["feature", "group", "i", "name", "points", "underground"]);
    });

    it("the isle detour is refused", () => {
      useBay({ isle: true });
      // the bay leaves no land neck, so the crossing is the only way through; the isle sits in the
      // middle of it, and the pair's own feature scope must route around, not through
      const path = findPath(bayAt(1, 1), cell => cell === bayAt(1, 7), Routes.createUndergroundCost(1), pack as never);

      expect(path).not.toBeNull();
      expect(path!.some(cell => pack.cells.h[cell] < 20)).toBe(true); // the way through is the bay's water
      expect(path!.includes(bayAt(1, 4))).toBe(false); // never steps on the isle's land
      expect(path!.every(cell => pack.cells.h[cell] < 20 || pack.cells.f[cell] === 1)).toBe(true);
    });

    it("the repair pass crosses water with the same factory", () => {
      useBay();
      // the east shore is served by a pinned stretch; the west burg is the orphan to reconnect
      const eastshore = pack.burgs[2] as Burg;
      const westshore = pack.burgs[1] as Burg;
      pack.routes = [handHighway(900, [eastshore.cell, bayAt(2, 7)])];

      expect(Routes.repairUndergroundHighways()).toBe(1);
      const repaired = pack.routes.find(route => route.repaired)!;
      expect(endpoints(repaired).includes(westshore.cell)).toBe(true); // the orphan is served
      expect(
        repaired.points
          .map(([, , cell]) => cell)
          .filter(cell => pack.cells.h[cell] >= 20)
          .every(cell => pack.cells.f[cell] === 1)
      ).toBe(true);
      const report = auditPlanes(pack, pack.routes);
      expect(report.violations).toEqual([]);
    });
  });

  it("connects subterranean-capable burgs only, keeping the surface network to itself", () => {
    generate();

    const highways = undergroundRoutes();
    expect(highways.length).toBeGreaterThan(0);

    for (const route of highways) {
      expect(route.group).toBe("roads"); // the group is what the rest of the app branches on
      for (const cell of endpoints(route)) {
        const burg = pack.burgs[pack.cells.burg[cell]];
        expect(hasBelowLevelPresence(burg)).toBe(true);
        expect(getClassification(burg)).not.toBeNull();
      }
    }

    // the surface-only burg is an endpoint of a surface trail and of no highway
    const surfaceOnly = pack.burgs[3] as Burg;
    expect(pack.routes.some(route => !route.underground && endpoints(route).includes(surfaceOnly.cell))).toBe(true);
    expect(highways.some(route => endpoints(route).includes(surfaceOnly.cell))).toBe(false);

    // and the fully subterranean burgs get no surface route, while the dual-identity one keeps its
    for (const route of pack.routes.filter(route => !route.underground)) {
      for (const cell of endpoints(route)) {
        expect(hasGroundLevelPresence(pack.burgs[pack.cells.burg[cell]])).toBe(true);
      }
    }
    expect(undergroundRoutes().every(route => route.underground === true)).toBe(true);
  });

  it("runs on the pair's land or bound-passage water, and never joins two landmasses", () => {
    generate();

    for (const route of undergroundRoutes()) {
      const features = new Set<number>();
      for (const [, , cell] of route.points) {
        if (pack.cells.h[cell] < 20) {
          expect(Math.abs(pack.cells.t[cell])).toBeLessThanOrEqual(2); // a water leg stays within the crossing bound
        } else {
          features.add(pack.cells.f[cell]);
        }
      }
      expect(features.size).toBe(1); // a strait is not a tunnel: land of one feature only
      expect(features.has(route.feature)).toBe(true);
    }

    // the two burgs across the strait are not connected
    const across = [cellAt(1, 1), cellAt(1, 5)];
    expect(undergroundRoutes().some(route => across.every(cell => endpoints(route).includes(cell)))).toBe(false);
  });

  it("wires the highways into the shared cell network, where a land journey may follow them", () => {
    generate();
    const route = undergroundRoutes()[0];
    const [start, end] = endpoints(route);
    const canWalk = (cell: number) => isLand(cell, pack);

    expect(reachable(start, end, canWalk)).toBe(true);
    expect(route.points.every(([, , cell]) => canWalk(cell))).toBe(true);
  });

  it("leaves a water-domain journey governed by the existing land and water rules", () => {
    generate();
    const route = undergroundRoutes()[0];
    const links = route.points.slice(0, -1).map((point, index) => [point[2], route.points[index + 1][2]]);

    // the highway runs over land: water transport cannot take any of its steps
    for (const [from, to] of links) {
      if (pack.cells.h[from] >= 20 && pack.cells.h[to] >= 20) {
        expect(Routes.getWaterPathCost(from, to)).toBe(Infinity);
      }
    }

    const waterPath = Routes.findWaterPath(...(endpoints(route) as [number, number]));
    const highwayLinks = new Set(links.map(([from, to]) => `${from}-${to}`));
    expect(
      (waterPath ?? []).some((cell: number, index: number) => highwayLinks.has(`${cell}-${waterPath?.[index + 1]}`))
    ).toBe(false);
  });

  it("makes a fully subterranean burg a reachable destination", () => {
    generate();
    const burg = pack.burgs.find((candidate: Burg) => getClassification(candidate) === "underground") as Burg;
    const dualIdentity = pack.burgs.find((candidate: Burg) => getClassification(candidate) === "subterranean") as Burg;

    expect(isLand(burg.cell, pack)).toBe(true);
    expect(Object.keys(pack.cells.routes[burg.cell]).length).toBeGreaterThan(0);
    expect(reachable(dualIdentity.cell, burg.cell, cell => isLand(cell, pack))).toBe(true);
  });

  it("is not branched on by the traversal code", () => {
    for (const file of ["src/generators/journeys/journeys-generator.ts", "src/utils/pathUtils.ts"]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/underground/i);
    }
  });

  it("leaves the surface routes byte-identical when the option is off", () => {
    globalThis.options.generation.underground = false;

    generate();
    const first = JSON.stringify(pack.routes);

    generate();
    expect(JSON.stringify(pack.routes)).toBe(first);
    expect(undergroundRoutes()).toHaveLength(0);
    expect(pack.routes.length).toBeGreaterThan(0); // the surface network is still generated
  });

  it("generates the surface network as if the plane were off", () => {
    globalThis.options.generation.underground = false;
    generate();
    const surfaceOnly = JSON.stringify(pack.routes);

    globalThis.options.generation.underground = true;
    generate();
    expect(JSON.stringify(pack.routes.filter(route => !route.underground))).toBe(surfaceOnly);
    expect(undergroundRoutes().length).toBeGreaterThan(0);
  });

  it("merges a tunnel into the pinned network instead of duplicating its stretch", () => {
    const junction = cellAt(1, 2);
    const pinned = handHighway(1, [cellAt(1, 1), junction]);
    pack.cells.h[cellAt(0, 1)] = 20; // lowland: the way around the pinned stretch is the expensive one

    Routes.generate([pinned], 1);
    const highways = undergroundRoutes();
    expect(highways.length).toBeGreaterThan(1); // the pinned tunnel plus what generation joined to it
    // the generated route crosses the junction, so the two stretches are one network, not two records
    expect(highways.some(route => route !== pinned && route.points.some(([, , cell]) => cell === junction))).toBe(true);

    const steps = highways.flatMap(route =>
      route.points.slice(0, -1).map((point, index) => `${point[2]}-${route.points[index + 1][2]}`)
    );
    const laid = steps.filter((step, index) => steps.indexOf(step) !== index);
    // the only step laid twice is the one a boundary resolution took over from the pinned stretch
    expect(new Set(laid)).toEqual(new Set([`${cellAt(1, 1)}-${junction}`]));
  });

  it("drops a highway whose endpoint burg is removed", () => {
    // a pinned highway from Deephold's cell to a burgless one: the burg is what it ends at
    const burgCell = (pack.burgs[1] as Burg).cell;
    const highway = handHighway(7, [burgCell, cellAt(0, 5)]);
    pack.routes = [highway];
    const burgId = pack.cells.burg[burgCell];

    Burgs.remove(burgId);

    expect(pack.routes.some(route => route.i === highway.i)).toBe(false);
    expect(isTunnelPassableCell(cellAt(0, 5))).toBe(true); // the far endpoint was a cell a tunnel may occupy
  });

  it("drops a highway whose endpoint burg loses its classification", () => {
    const deephold = (pack.burgs[1] as Burg).cell;
    const stub = handHighway(7, [deephold, cellAt(0, 1)]);
    pack.routes.push(stub);

    delete pack.burgs[pack.cells.burg[deephold]].underground;
    delete pack.burgs[pack.cells.burg[deephold]].subterranean;

    expect(Routes.pruneUndergroundHighways()).toBeGreaterThan(0);
    expect(pack.routes.some(route => route.i === stub.i)).toBe(false);
    expect(isTunnelPassableCell(cellAt(0, 1))).toBe(true); // the far endpoint was a cell a tunnel may occupy
  });

  it("keeps a highway that ends at a network junction instead of a burg", () => {
    // the trunk runs Twinhall -> Deephold; the spur joins it at the burgless cell between them
    const trunk = handHighway(1, [cellAt(0, 2), cellAt(0, 1), cellAt(1, 1)]);
    const spur = handHighway(2, [cellAt(2, 1), cellAt(1, 1), cellAt(0, 1)]);
    pack.routes = [trunk, spur];
    pack.burgs.push({ i: 6, cell: cellAt(2, 1), x: 10, y: 20, feature: 1, capital: 0, underground: true } as Burg);
    pack.cells.burg[cellAt(2, 1)] = 6;

    expect(Routes.pruneUndergroundHighways()).toBe(0);
    expect(pack.routes.some(route => route.i === 1)).toBe(true);
    expect(pack.routes.some(route => route.i === 2)).toBe(true);
  });

  it("drops an orphaned junction network without crashing before the links are built", () => {
    // Deephold loses its presence: its trunk goes, but the junction keeps the spur and the second trunk alive
    const trunkA = handHighway(1, [cellAt(0, 2), cellAt(0, 1), cellAt(1, 1)]);
    const trunkB = handHighway(2, [cellAt(0, 0), cellAt(0, 1)]);
    const spur = handHighway(3, [cellAt(2, 1), cellAt(1, 1), cellAt(0, 1)]);
    pack.routes = [trunkA, trunkB, spur];
    pack.burgs.push(
      { i: 6, cell: cellAt(2, 1), x: 10, y: 20, feature: 1, capital: 0, underground: true } as Burg,
      { i: 7, cell: cellAt(0, 0), x: 0, y: 0, feature: 1, capital: 0, underground: true } as Burg
    );
    pack.cells.burg[cellAt(2, 1)] = 6;
    pack.cells.burg[cellAt(0, 0)] = 7;

    delete pack.burgs[pack.cells.burg[cellAt(1, 1)]].underground;
    delete (pack.cells as { routes?: unknown }).routes; // a fresh generation prunes before buildLinks

    expect(() => Routes.pruneUndergroundHighways()).not.toThrow();
    // the junction cell keeps the whole network: both trunks reach it and the spur runs through, so
    // nothing that hung on the lost burg is silently dropped with it
    expect(pack.routes.some(route => route.i === 1)).toBe(true);
    expect(pack.routes.some(route => route.i === 2)).toBe(true);
    expect(pack.routes.some(route => route.i === 3)).toBe(true);
  });

  it("rebuilds the network for the burgs that exist when routes are regenerated", () => {
    generate();
    const before = undergroundRoutes().length;
    expect(before).toBeGreaterThan(0);

    // both of landmass B's burgs become surface burgs: their highway has no eligible endpoint left
    for (const burg of pack.burgs) {
      if (burg.underground && burg.feature === 2) delete burg.underground;
    }
    generate();

    expect(undergroundRoutes().every(route => route.points.every(([, , cell]) => pack.cells.f[cell] === 1))).toBe(true);
  });

  // The boundary rule: a stretch may begin or end on a cell with no burg or with a burg of its own
  // plane. A mismatched burg cell is stepped over into the already-covered stretch, so a step is
  // duplicated rather than any cell of the path being dropped.
  describe("boundary rule", () => {
    /** above the ids generation hands out in this fixture, so a pinned route is never removed by id */
    let nextPinnedId = 900;

    /** a new burg on a cell that has none, so both planes can be placed deliberately */
    const burgAt = (cell: number, underground: boolean) => {
      const i = pack.burgs.length;
      pack.burgs.push({
        i,
        cell,
        x: pack.cells.p[cell][0],
        y: pack.cells.p[cell][1],
        feature: 1,
        capital: 0,
        ...(underground ? { underground: true } : {})
      } as Burg);
      pack.cells.burg[cell] = i;
      return i;
    };

    const pinned = (cells: number[]) => handHighway(nextPinnedId++, cells);

    const mismatchedBoundaries = (plane: "surface" | "underground") =>
      pack.routes
        .filter(route => Boolean(route.underground) === (plane === "underground"))
        .flatMap(route => endpoints(route).map(cell => ({ route, cell })))
        .filter(({ cell }) => !isLegitimateBoundary(pack, cell, plane));

    const touches = (cell: number) =>
      undergroundRoutes().some(route => route.points.some(([, , pointCell]) => pointCell === cell));

    /**
     * A surface burg sits on the gateway cell into Twinhall: the locked highway ends there from the
     * east, and the tunnel from Deephold reaches it from the west, so a stretch boundary lands on it.
     * The plain way around the gateway is a glacier, so the settled cell stays the only crossing once
     * it carries no attraction of its own.
     */
    const surfaceGatewayFixture = () => {
      const gateway = cellAt(1, 2);
      const deep = (pack.burgs[1] as Burg).cell;
      const twinhall = (pack.burgs[2] as Burg).cell;
      burgAt(gateway, false);
      pack.cells.h[cellAt(0, 1)] = 21;
      pack.cells.h[cellAt(0, 2)] = 21;
      pack.cells.biome[cellAt(0, 1)] = 12; // uninhabitable, so the way around the gateway is impassable
      return { gateway, deep, twinhall };
    };

    it("never begins or ends an underground highway on a surface burg's cell", () => {
      const { gateway, deep, twinhall } = surfaceGatewayFixture();
      Routes.generate([pinned([twinhall, cellAt(2, 2)])], 1);

      // the pair is bridged, and the bridge crosses the gateway rather than ending on it
      expect(touches(deep)).toBe(true);
      expect(touches(gateway)).toBe(true);
      expect(mismatchedBoundaries("underground")).toEqual([]);
    });

    it("keeps a stretch whose junction sits on a surface burg's cell", () => {
      const { gateway, deep, twinhall } = surfaceGatewayFixture();
      Routes.generate([pinned([twinhall, cellAt(2, 2)])], 1);

      // the below-level burgs stay connected, across a junction cell that is crossed and not ended on
      expect(touches(deep)).toBe(true);
      expect(touches(twinhall)).toBe(true);
      expect(undergroundRoutes().some(route => route.points.some(([, , cell]) => cell === gateway))).toBe(true);
      expect(undergroundRoutes().some(route => endpoints(route).some(cell => cell === gateway))).toBe(false);
    });

    it("keeps a highway whose boundary is a junction, so an interior burg stays connected", () => {
      const junction = cellAt(1, 2);
      const interior = burgAt(cellAt(1, 1), true);
      // the chain carrying the interior burg ends on the cell the other chain crosses
      pack.routes = [pinned([cellAt(0, 1), junction, cellAt(1, 1)]), pinned([cellAt(0, 2), junction, cellAt(1, 2)])];
      burgAt(cellAt(0, 1), true);
      burgAt(cellAt(0, 2), true);
      burgAt(cellAt(1, 2), true);

      expect(Routes.pruneUndergroundHighways()).toBe(0);
      expect(pack.routes).toHaveLength(2);
      expect(endpoints(pack.routes[1]).includes(junction)).toBe(true);
      expect(pack.routes.some(route => route.points.some(([, , cell]) => cell === pack.burgs[interior].cell))).toBe(
        true
      );
    });

    it("keeps a highway whose boundary carries a surface burg, so an interior burg stays connected", () => {
      const junction = cellAt(1, 2);
      const surfaceOnly = burgAt(junction, false);
      const interior = burgAt(cellAt(1, 1), true);
      // the second chain ends on the junction cell the first one continues through
      pack.routes = [pinned([cellAt(2, 2), junction, cellAt(1, 1)]), pinned([cellAt(0, 2), junction])];
      burgAt(cellAt(2, 2), true);
      burgAt(cellAt(0, 2), true);

      expect(pack.burgs[surfaceOnly].cell).toBe(junction);
      expect(Routes.pruneUndergroundHighways()).toBe(0);
      expect(pack.routes).toHaveLength(2);
      expect(endpoints(pack.routes[1]).includes(junction)).toBe(true);
      expect(pack.routes.some(route => route.points.some(([, , cell]) => cell === pack.burgs[interior].cell))).toBe(
        true
      );
    });

    it("reconnects a burg the network left out", () => {
      // two below-level burgs on the left landmass and no surface burg anywhere: the pair is all the
      // underground pass can connect, and nothing else can stand in for it
      pack.burgs = [0] as unknown as typeof pack.burgs;
      pack.cells.burg = new Uint16Array(CELL_COUNT);
      const start = cellAt(1, 1);
      const exit = cellAt(2, 2);
      burgAt(start, true);
      burgAt(exit, true);

      // every step of their path counts as already covered, so the pass leaves at least one out
      const path = findPath(start, cell => cell === exit, Routes.getUndergroundPathCost.bind(Routes), pack as never)!;
      (Routes as unknown as { undergroundConnections: Set<string> }).undergroundConnections = new Set(
        path.flatMap((cell, index) => (path[index + 1] === undefined ? [] : [`${cell}-${path[index + 1]}`]))
      );

      generate();

      // the service pass serves both, and never leaves the landmass the pair sits on
      expect(touches(exit)).toBe(true);
      expect(touches(start)).toBe(true);
      expect(undergroundRoutes().every(route => route.points.every(([, , cell]) => pack.cells.f[cell] === 1))).toBe(
        true
      );

      const report = auditPlanes(pack, pack.routes);
      expect(report.violations.filter(violation => violation.rule === "service")).toEqual([]);
      expect(report.connections.underground.includes(start)).toBe(true);
      expect(report.connections.underground.includes(exit)).toBe(true);
    });

    it("leaves a lone below-level burg unconnected, and does not hand it a surface route", () => {
      // burg 4 is the only below-level burg of the right landmass; the left keeps its own
      const lone = pack.burgs[4] as Burg;
      pack.burgs[5] = 0 as unknown as Burg;
      pack.cells.burg[cellAt(1, 6)] = 0;

      generate();

      expect(touches(lone.cell)).toBe(false);
      for (const route of pack.routes.filter(route => !route.underground)) {
        expect(endpoints(route).includes(lone.cell)).toBe(false);
      }

      const report = auditPlanes(pack, pack.routes);
      expect(report.unconnectable.includes(lone.i)).toBe(true);
      expect(report.violations).toEqual([]);
    });

    it("never begins or ends a surface record at a fully subterranean burg", () => {
      // burgs 1 and 2 are below-level, so the tunnel they draw runs across burg 1's own cell
      const classified = (pack.burgs[1] as Burg).cell;
      generate();

      expect(pack.routes.some(route => route.points.some(([, , cell]) => cell === classified))).toBe(true);
      expect(mismatchedBoundaries("surface")).toEqual([]);
    });

    it("keeps every cell of a surface path when the boundary moves", () => {
      const classified = (pack.burgs[1] as Burg).cell;
      generate();

      const surfaceCells = new Set(
        pack.routes.filter(route => !route.underground).flatMap(route => route.points.map(point => point[2]))
      );
      expect(surfaceCells.has(classified)).toBe(true);

      // every step the surface pass emitted is still drawn: the resolution duplicated, never dropped
      const steps = new Set(
        pack.routes
          .filter(route => !route.underground)
          .flatMap(route =>
            route.points.slice(0, -1).map((point, index) => `${point[2]}-${route.points[index + 1][2]}`)
          )
      );
      for (const [from, to] of Routes.surfaceSteps) expect(steps.has(`${from}-${to}`)).toBe(true);
    });

    it("does not move the surface network", () => {
      const classified = (pack.burgs[1] as Burg).cell;
      const from = classified - COLUMNS;
      generate();

      // the land cost keeps its own attraction: a burg cell costs exactly a third of a plain one, so
      // the weaker underground attraction below cannot be read as a surface change
      const burgStep = Routes.getLandPathCost(from, classified);
      pack.cells.burg[classified] = 0;
      expect(Routes.getLandPathCost(from, classified)).toBeCloseTo(burgStep * 3, 5);
    });
    /**
     * Both plane costs read the *destination* cell's burg: the term is what makes a tunnel prefer the
     * settlements it serves. The probes make two destination cells identical in every respect but the
     * burg map — same coordinates, height, biome and separation — so the quotient of the two steps is
     * that term alone. State is set after the last `generate()`, which replaces `pack.cells`, and put
     * back afterwards so the probe cannot leak into the tests around it. The record argument is the
     * burg *record* placed at the probe cell; without it the id has no record at all.
     */
    const withAttractionProbe = (
      run: (cells: { from: number; burgCell: number; plainCell: number }) => void,
      record?: "underground" | "subterranean" | "surface" | "removed"
    ) => {
      const from = cellAt(1, 0);
      const burgCell = cellAt(1, 1);
      const plainCell = cellAt(1, 2);
      const saved = {
        point: pack.cells.p[plainCell],
        height: pack.cells.h[plainCell],
        biome: pack.cells.biome[plainCell],
        burgs: pack.cells.burg,
        records: pack.burgs
      };

      pack.cells.p[plainCell] = [...pack.cells.p[burgCell]];
      pack.cells.h[plainCell] = pack.cells.h[burgCell];
      pack.cells.biome[plainCell] = pack.cells.biome[burgCell];
      pack.cells.burg = new Uint16Array(CELL_COUNT);
      pack.cells.burg[burgCell] = 99;
      pack.burgs = [0] as unknown as typeof pack.burgs;
      if (record) {
        pack.burgs[99] = {
          i: 99,
          cell: burgCell,
          x: pack.cells.p[burgCell][0],
          y: pack.cells.p[burgCell][1],
          name: "Probe",
          feature: 1,
          capital: 0,
          ...(record === "underground" ? { underground: true } : {}),
          ...(record === "subterranean" ? { subterranean: true } : {}),
          ...(record === "removed" ? { removed: true } : {})
        } as Burg;
      }

      try {
        run({ from, burgCell, plainCell });
      } finally {
        pack.cells.p[plainCell] = saved.point;
        pack.cells.h[plainCell] = saved.height;
        pack.cells.biome[plainCell] = saved.biome;
        pack.cells.burg = saved.burgs;
        pack.burgs = saved.records;
      }
    };

    /** the probe's cost surfaces: a pass that merges nothing, then the option back on for the cost */
    const primeAttractionProbe = () => {
      globalThis.options.generation.underground = false;
      generate();
      pack.routes = [];
      globalThis.options.generation.underground = true;
    };

    /** the quotient the probes pin: a plain step against the step onto the probe's burg cell */
    const probeQuotient = (record?: "underground" | "subterranean" | "surface" | "removed") => {
      let quotient = 0;
      withAttractionProbe(({ from, burgCell, plainCell }) => {
        quotient = Routes.getUndergroundPathCost(from, plainCell) / Routes.getUndergroundPathCost(from, burgCell);
      }, record);
      return quotient;
    };

    it("prices a tunnel step onto a below-level burg cell at the attraction", () => {
      primeAttractionProbe();

      // both classifications carry below-level presence, so both keep the pull
      expect(probeQuotient("underground")).toBeCloseTo(2, 5);
      expect(probeQuotient("subterranean")).toBeCloseTo(2, 5);
    });

    it("prices a surface-only burg cell exactly as a plain cell", () => {
      primeAttractionProbe();

      let finite = false;
      withAttractionProbe(({ from, burgCell, plainCell }) => {
        finite = Number.isFinite(Routes.getUndergroundPathCost(from, burgCell));
        expect(Routes.getUndergroundPathCost(from, plainCell)).toBeCloseTo(
          Routes.getUndergroundPathCost(from, burgCell),
          5
        );
      }, "surface");

      expect(finite).toBe(true); // the rung encourages, it does not forbid
    });

    it("prices a record-less burg id as a plain cell", () => {
      primeAttractionProbe();

      expect(probeQuotient()).toBeCloseTo(1, 5); // the probe's own arrangement: an id with no record
      expect(probeQuotient("removed")).toBeCloseTo(1, 5); // and a record the map has retired
    });

    it("leaves the surface network's own burg attraction at three", () => {
      withAttractionProbe(({ from, burgCell, plainCell }) => {
        const ratio = Routes.getLandPathCost(from, plainCell) / Routes.getLandPathCost(from, burgCell);
        expect(ratio).toBeCloseTo(3, 5);
      });
    });

    it("a tunnel between two below-level burgs prefers a plain detour to a surface-only burg's cell", () => {
      // an empty map but for the pair and the surface-only settlement: two shortest paths of two steps,
      // one across the settlement's cell and one across its plain neighbour
      pack.burgs = [0] as unknown as typeof pack.burgs;
      pack.cells.burg = new Uint16Array(CELL_COUNT);
      const start = cellAt(1, 0);
      const exit = cellAt(0, 1);
      const settled = cellAt(1, 1);
      burgAt(start, true);
      burgAt(exit, true);
      burgAt(settled, false);

      // the settlement is a road hub, so its cell is the local minimum of the settled fabric: the
      // plane-blind attraction is what pulled the tunnel through it
      Routes.generate([handRoute(1, [settled, cellAt(2, 1)])], 1);

      const tunnelCells = new Set(undergroundRoutes().flatMap(route => route.points.map(([, , cell]) => cell)));
      expect(tunnelCells.has(start)).toBe(true); // endpoints are unchanged
      expect(tunnelCells.has(exit)).toBe(true);
      expect(tunnelCells.has(settled)).toBe(false);
    });

    it("a generated map's audit reports the split without a violation", () => {
      const { gateway, deep, twinhall } = surfaceGatewayFixture();
      Routes.generate([pinned([twinhall, cellAt(2, 2)])], 1);

      const report = auditPlanes(pack, pack.routes);

      // the gateway is crossed and not ended on; the tunnels end at the below-level burgs
      expect(touches(gateway)).toBe(true);
      expect(touches(deep)).toBe(true);
      expect(report.contact.tunnelsOnSurfaceOnlyBurgs).toBe(1);
      expect(report.contact.tunnelsOnDualIdentityBurgs).toBe(1);
      expect(report.repairs).toBe(0); // the service pass is not carrying the rung
      expect(report.violations).toEqual([]);
    });
  });

  it("runs on both pipelines: the steps that mark and build are in each step list", async () => {
    const { ErasePipeline, GenerationPipeline } = await import("./generation-pipeline");
    const stepIds = (pipeline: unknown) => ((pipeline as { steps: { id: string }[] }).steps ?? []).map(step => step.id);
    const ids = [GenerationPipeline, ErasePipeline].map(stepIds);

    // marking lives in the `burgs` step and the builder in the `routes` step, so a pipeline that runs
    // both, as the erase path does, regenerates the underground content with no step of its own
    expect(ids[1]).not.toHaveLength(0);
    for (const pipeline of ids) {
      expect(pipeline.includes("burgs")).toBe(true);
      expect(pipeline.includes("routes")).toBe(true);
    }
  });

  // The separation rule: a tunnel step near the surface network costs more than the same step clear
  // of it. Distances below are read off the 7x3 grid with a surface route locked over cells 8-9:
  // 8,9 at 0; 2 at 1; 0 at 2; 4 at 3; 13 and 20 at the cap.
  describe("surface separation", () => {
    /** no burgs, so the burg term cannot confound a ratio between two equal-length steps */
    const clearBurgs = () => {
      pack.cells.burg = new Uint16Array(CELL_COUNT);
      pack.burgs = [0] as unknown as typeof pack.burgs;
    };

    const onRoute = [8, 9];
    const cost = (from: number, to: number) => Routes.getUndergroundPathCost(from, to);

    it("prices a tunnel step higher beside a surface route than clear of one", () => {
      clearBurgs();
      Routes.generate([handRoute(1, onRoute)], 1);

      const onTheRoute = cost(8, 9); // the step the locked route covers
      const besideIt = cost(9, 2); // one cell away from a route cell
      const clear = cost(12, 13); // beyond the decay range

      expect(onTheRoute).toBeGreaterThan(besideIt);
      expect(besideIt).toBeGreaterThan(clear);
    });

    it("decays the penalty with distance and bounds it", () => {
      clearBurgs();
      Routes.generate([handRoute(1, onRoute)], 1);

      const plain = cost(12, 13); // beyond the decay range: no penalty
      const samples = [
        [cost(8, 9), 3], // on a surface route cell
        [cost(9, 2), 2], // one step away
        [cost(1, 0), 5 / 3], // two steps away
        [cost(11, 4), 3 / 2] // three steps away
      ] as const;

      for (const [value, multiplier] of samples) expect(value / plain).toBeCloseTo(multiplier, 5);
      // bounded: two cells past the decay range cost the same as any other clear step
      expect(cost(13, 20)).toBeCloseTo(plain, 5);
    });

    it("never makes a passable step impassable", () => {
      clearBurgs();
      Routes.generate([handRoute(1, onRoute)], 1);

      const penalised = cost(8, 9);
      expect(Number.isFinite(penalised)).toBe(true);
      expect(penalised).toBeGreaterThan(cost(12, 13));
      // the gates that do block are untouched by the separation rule: water beyond the crossing bound
      pack.cells.t[cellAt(1, STRAIT)] = -3;
      pack.cells.t[cellAt(0, STRAIT)] = -4;
      expect(cost(1, cellAt(1, STRAIT))).toBe(Infinity);
      expect(cost(1, cellAt(0, STRAIT))).toBe(Infinity);
      expect(cost(1, cellAt(1, 1) + 1)).toBeLessThan(Infinity);
    });

    it("does not let the underground network repel itself", () => {
      clearBurgs();
      Routes.generate([handRoute(1, onRoute, true)], 1); // a locked tunnel, no surface route at all

      // the locked highway earns its discount and pays no penalty: half of an equal clear step
      expect(cost(8, 9) * 2).toBeCloseTo(cost(12, 13), 5);
    });

    it("keeps a uniform, path-neutral penalty when no surface network exists", () => {
      clearBurgs();
      Routes.generate([], 1); // no burgs and no locked routes, so no surface route exists at all

      // uniform: two equal-length steps cost the same wherever they are
      expect(cost(15, 16) / cost(11, 12)).toBeCloseTo(1, 5);

      // and the terrain preference the direct-call tests rely on is untouched
      pack.cells.h[8] = 90;
      pack.cells.h[2] = 21;
      expect(cost(1, 8)).toBeLessThan(cost(1, 2));
    });

    it("rebuilds the separation field on every pass", () => {
      clearBurgs();
      Routes.generate([handRoute(1, onRoute)], 1);
      expect(cost(8, 9)).toBeGreaterThan(cost(12, 13)); // the first route's step is the penalised one

      // regenerate with the surface route somewhere else: the old penalty must be gone
      Routes.generate([handRoute(2, [12, 13])], 1);
      expect(cost(12, 13)).toBeGreaterThan(cost(9, 2));
      expect(cost(8, 9)).toBeLessThan(cost(12, 13));
    });
  });
});

/** The unordered pair key the admitted set is keyed on, so a test can ask for a pair without its order */
const samePair = (pair: { start: number; end: number }, a: number, b: number) =>
  (pair.start === a && pair.end === b) || (pair.start === b && pair.end === a);

/**
 * The pair-selection contract: the three-layer policy, the narrowed service rule, and the routing
 * that follows from them. The fixtures are built per test, so each case states its own landmass,
 * burg classification and surface records.
 */
describe("underground pair selection", () => {
  let Routes: any;

  const usePack = (fixture: ReturnType<typeof landmassWithSubterranean> | ReturnType<typeof bayWithLandDetour>) => {
    globalThis.pack = fixture as unknown as typeof pack;
    globalThis.grid = makeGrid(fixture.cells.i.length) as unknown as typeof grid;
    Routes.surfaceDistances = undefined;
    Routes.undergroundConnections = new Set();
    return fixture;
  };

  const generate = (seed = 1) => Routes.generate([], seed);
  const undergroundRoutes = () => pack.routes.filter(route => route.underground) as Route[];
  const cellsOf = (route: Route) => route.points.map(point => point[2]);
  const touches = (cell: number) => undergroundRoutes().some(route => cellsOf(route).includes(cell));
  const handHighway = (i: number, cells: number[]) =>
    ({
      i,
      group: "roads",
      feature: 1,
      underground: true,
      points: cells.map(cell => [...pack.cells.p[cell], cell])
    }) as Route;

  /** One component per connected group of burg cells over the admitted pairs */
  const components = (burgs: Burg[], pairs: Array<{ start: number; end: number }>) => {
    const parent = new Map(burgs.map(burg => [burg.cell, burg.cell]));
    const find = (cell: number): number => {
      const next = parent.get(cell) as number;
      if (next === cell) return cell;
      const root = find(next);
      parent.set(cell, root);
      return root;
    };
    for (const { start, end } of pairs) parent.set(find(start), find(end));
    return new Set(burgs.map(burg => find(burg.cell)));
  };

  beforeEach(async () => {
    globalThis.TIME = false;
    (globalThis as any).FlatQueue = TestFlatQueue;
    vi.stubGlobal("Pack", { findCell: () => -1 }); // only sharp-angle smoothing reads it
    globalThis.options.generation.underground = true;
    await import("./river-generator"); // the water cost reads the Rivers global
    await import("./burgs-generator");
    Routes = (globalThis as any).Routes;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.options.generation.underground = false;
  });

  it("serves / fully subterranean burg is connected", () => {
    const fixture = usePack(landmassWithSubterranean(3));
    generate();

    const deep = fixture.burgs.slice(1) as Burg[];
    for (const burg of deep) expect(touches(burg.cell)).toBe(true);

    const report = auditPlanes(pack, pack.routes);
    expect(report.violations).toEqual([]);
    expect(report.connections.underground).toEqual(expect.arrayContaining(deep.map(burg => burg.cell)));
  });

  it("serves / dual burg without a tunnel is not a violation", () => {
    // the two dual burgs are each other's nearest neighbour, so the tree prunes their edge, and the
    // road the surface pass draws between them keeps the shortcut layer quiet
    const fixture = usePack(landmassWithSubterranean(2, { dualCells: [landmassAt(0, 8), landmassAt(0, 9)] }));
    generate();

    const dual = fixture.burgs[4] as Burg;
    expect(getClassification(dual)).toBe("subterranean");
    expect(touches(dual.cell)).toBe(false);

    // the contract's break: no tunnel is owed, so no service violation is reported for it
    const report = auditPlanes(pack, pack.routes);
    expect(report.violations.filter(violation => violation.rule === "service")).toEqual([]);
  });

  it("layers / dual burg that carries no path is not a backbone pair", () => {
    // the dual burg is the nearest neighbour of the second deep burg, but the deep pair is cheaper
    // direct, so the dual carries no path between two deep burgs and is not attached for its own sake
    const fixture = usePack(landmassWithSubterranean(2, { dualCells: [landmassAt(0, 8)] }));
    const deep = fixture.burgs.slice(1, 3) as Burg[];
    const dual = fixture.burgs[3] as Burg;

    const pairs = selectUndergroundPairs(fixture.burgs, () => null, ["backbone"]);
    expect(pairs.some(pair => pair.start === dual.cell || pair.end === dual.cell)).toBe(false);
    expect(components(deep, pairs).size).toBe(1); // the deep pair is still one component

    // nothing is owed to it, so the audit reports no service violation for it
    generate();
    expect(auditPlanes(pack, pack.routes).violations.filter(violation => violation.rule === "service")).toEqual([]);
  });

  it("serves / dual burg as an endpoint is valid", () => {
    // the backbone leaves the dual burg alone; the shortcut admits it, because no surface route reaches
    // either burg, and a tunnel ending at a dual-identity burg is valid
    const fixture = usePack(landmassWithSubterranean(2, { dualCells: [landmassAt(0, 8)] }));
    const dual = fixture.burgs[3] as Burg;
    generate();

    expect(undergroundRoutes().some(route => endpoints(route).includes(dual.cell))).toBe(true);

    const report = auditPlanes(pack, pack.routes);
    expect(report.violations.filter(violation => violation.rule === "boundary")).toEqual([]);
    expect(report.connections.underground.includes(dual.cell)).toBe(true); // the highway serves it

    // and the layer policy admits dual-ended pairs: an expensive overland path is one of them
    const admitted = selectUndergroundPairs(pack.burgs, () => 1e9, ["shortcut"]);
    expect(admitted.some(pair => samePair(pair, dual.cell, (fixture.burgs[2] as Burg).cell))).toBe(true);
  });

  it("serves / subterranean burg is reconnected", () => {
    const fixture = usePack(landmassWithSubterranean(2, { dualCells: [landmassAt(0, 8)] }));
    const [deepA, deepB] = fixture.burgs.slice(1, 3) as Burg[];
    const dual = fixture.burgs[3] as Burg;

    // the network serves one deep burg only, so the other is the orphan the service pass has to reach
    pack.routes = [handHighway(900, [deepB.cell, landmassAt(1, 2)])];
    expect(Routes.repairUndergroundHighways()).toBe(1);
    expect(touches(deepA.cell)).toBe(true);

    // the same position with a dual-identity burg is left as it is: both deep burgs are served, so
    // nothing is owed even though the dual burg has no tunnel
    pack.routes = [handHighway(901, [deepA.cell, landmassAt(1, 2), deepB.cell])];
    expect(Routes.repairUndergroundHighways()).toBe(0);
    expect(touches(dual.cell)).toBe(false);
    expect(auditPlanes(pack, pack.routes).violations.filter(violation => violation.rule === "service")).toEqual([]);
  });

  it("layers / backbone tree is connected", () => {
    const ask = () => {
      throw new Error("the backbone must not measure the surface path");
    };

    const clusters = usePack(landmassWithSubterranean(4, { layout: "clusters" }));
    const tree = selectUndergroundPairs(clusters.burgs, ask, ["backbone"]);
    expect(tree.every(pair => pair.layer === "backbone")).toBe(true);
    expect(components(clusters.burgs.slice(1) as Burg[], tree).size).toBe(1); // one tree over the four
    expect(tree).toHaveLength(3);

    // five in a line: a tree, so exactly four pairs
    const line = usePack(landmassWithSubterranean(5));
    expect(selectUndergroundPairs(line.burgs, ask, ["backbone"])).toHaveLength(4);
  });

  it("layers / dual burg is transit", () => {
    const fixture = usePack(landmassWithSubterranean(2, { dualCells: [landmassAt(1, 2)] }));
    const [deepA, deepB] = fixture.burgs.slice(1, 3) as Burg[];
    const dual = fixture.burgs[3] as Burg;

    // the tree reaches each deep burg through the dual burg's cell rather than routing around it
    const pairs = selectUndergroundPairs(fixture.burgs, () => null, ["backbone"]);
    expect(pairs.some(pair => samePair(pair, deepA.cell, dual.cell))).toBe(true);
    expect(pairs.some(pair => samePair(pair, deepB.cell, dual.cell))).toBe(true);

    generate();

    // the stretches that carry the dual burg's cell also carry a deep burg, so the tree passes through
    // the cell instead of routing around it
    const carrying = undergroundRoutes().filter(route => cellsOf(route).includes(dual.cell));
    expect(carrying.some(route => cellsOf(route).includes(deepA.cell))).toBe(true);
    expect(carrying.some(route => cellsOf(route).includes(deepB.cell))).toBe(true);

    // the audit reads the cell as a junction, so the dual burg is not where the network dead-ends
    const report = auditPlanes(pack, pack.routes);
    expect(report.boundaries.underground.junctions.some(boundary => boundary.cell === dual.cell)).toBe(true);
    expect(report.boundaries.underground.termini.some(boundary => boundary.cell === dual.cell)).toBe(false);
  });

  it("layers / shortcut admitted above threshold", () => {
    for (const [ratio, admitted] of [
      [1.49, 0],
      [1.5, 1]
    ] as const) {
      const fixture = usePack(bayWithLandDetour(ratio));
      const measure = createSurfacePathMeasure(pack.routes, pack);
      const [west, east] = fixture.burgs.slice(1) as Burg[];

      // the measured surface path is the ratio times the direct line, to the hundredth
      expect(measure(west.cell, east.cell)).toBeCloseTo(ratio * 2000, 6);
      expect(selectUndergroundPairs(fixture.burgs, measure, ["shortcut"])).toHaveLength(admitted);
    }
  });

  it("layers / no pair for two served burgs", () => {
    const fixture = usePack(
      landmassWithSubterranean(2, {
        dualCells: [landmassAt(0, 8), landmassAt(0, 9)],
        surfaceRoutes: [[landmassAt(0, 8), landmassAt(0, 9)]] // the road already connects them
      })
    );
    const [dualA, dualB] = fixture.burgs.slice(-2) as Burg[];
    const measure = createSurfacePathMeasure(pack.routes, pack);
    expect(measure(dualA.cell, dualB.cell)).toBeCloseTo(10, 6);

    // asserted on the admitted set, not inferred from the network the merge leaves behind
    const pairs = selectUndergroundPairs(fixture.burgs, measure);
    expect(pairs.some(pair => samePair(pair, dualA.cell, dualB.cell))).toBe(false);
    expect(pairs.some(pair => samePair(pair, (fixture.burgs[1] as Burg).cell, (fixture.burgs[2] as Burg).cell))).toBe(
      true
    ); // the deep pair is still connected
  });

  it("layers / thresholds are named and documented", () => {
    const source = readFileSync("src/generators/routes-generator.ts", "utf8");
    const declaration = source.match(/(\/\*\*[\s\S]*?\*\/)\s*export const UNDERGROUND_SHORTCUT_RATIO = ([\d.]+);/);

    expect(declaration, "the shortcut ratio is an exported constant with its own comment").not.toBeNull();
    expect(Number(declaration![2])).toBe(1.5);
    expect(declaration![1]).toMatch(/water census/i); // the measurement that chose it
    expect(declaration![1]).toMatch(/1\.01-6\.70|53/);
  });

  it("edge cases / a lone below-level burg is left alone", () => {
    usePack(landmassWithSubterranean(1));
    generate();

    expect(undergroundRoutes()).toHaveLength(0);
    expect(pack.routes.filter(route => !route.underground)).toHaveLength(0); // no surface route in exchange

    const report = auditPlanes(pack, pack.routes);
    expect(report.unconnectable).toEqual([1]);
    expect(report.violations).toEqual([]);
  });

  it("edge cases / a landmass with no fully subterranean burg admits no backbone pair", () => {
    const fixture = usePack(
      landmassWithSubterranean(0, {
        dualCells: [landmassAt(0, 8), landmassAt(0, 9)],
        surfaceRoutes: [[landmassAt(0, 8), landmassAt(0, 9)]]
      })
    );
    const measure = createSurfacePathMeasure(pack.routes, pack);

    expect(selectUndergroundPairs(fixture.burgs, measure, ["backbone"])).toEqual([]);
    expect(selectUndergroundPairs(fixture.burgs, measure)).toEqual([]); // the network may legitimately be empty

    generate();
    expect(undergroundRoutes()).toHaveLength(0);
    expect(pack.routes.filter(route => !route.underground).length).toBeGreaterThan(0); // the surface pass still ran
  });

  it("edge cases / a null surface path is admitted, a short one is not", () => {
    const fixture = usePack(landmassWithSubterranean(2));
    const [deepA, deepB] = fixture.burgs.slice(1) as Burg[];
    const direct = Math.sqrt(distanceSquared(pack.cells.p[deepA.cell], pack.cells.p[deepB.cell]));

    // no surface route exists at all, so the measure is null rather than a ratio against null
    expect(
      selectUndergroundPairs(fixture.burgs, createSurfacePathMeasure(fixture.routes, pack), ["shortcut"])
    ).toHaveLength(1);
    // a real, short measurement is below the threshold: the pair is not admitted
    expect(selectUndergroundPairs(fixture.burgs, () => direct, ["shortcut"])).toHaveLength(0);
  });

  it("edge cases / a pair admitted by two layers is routed once", () => {
    const fixture = usePack(landmassWithSubterranean(2));
    const [deepA, deepB] = fixture.burgs.slice(1) as Burg[];

    // the backbone admits the pair, and an expensive surface path would admit it again
    const pairs = selectUndergroundPairs(fixture.burgs, () => 1e9);
    expect(pairs.filter(pair => samePair(pair, deepA.cell, deepB.cell))).toHaveLength(1);
    expect(pairs[0].layer).toBe("backbone"); // the first layer that admitted it

    generate();
    expect(undergroundRoutes()).toHaveLength(1); // and it is routed once
  });

  it("edge cases / a dual burg between two clusters is transit and not an endpoint", () => {
    const fixture = usePack(landmassWithSubterranean(4, { layout: "clusters", dualCells: [landmassAt(1, 5)] }));
    const deep = fixture.burgs.slice(1, 5) as Burg[];
    const dual = fixture.burgs[5] as Burg;

    const pairs = selectUndergroundPairs(fixture.burgs, () => null, ["backbone"]);
    expect(components(deep, pairs).size).toBe(1); // the clusters are one component over the deep burgs
    expect(pairs.some(pair => pair.start === dual.cell || pair.end === dual.cell)).toBe(true); // it is on the way

    generate();
    const report = auditPlanes(pack, pack.routes);
    expect(report.violations).toEqual([]); // not required to be an endpoint, so nothing is owed to it
  });
});
