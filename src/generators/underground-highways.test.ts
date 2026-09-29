import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isLand } from "../utils";
import { findPath } from "../utils/pathUtils";
import { getClassification, hasBelowLevelPresence, hasGroundLevelPresence } from "./burg-classification";
import type { Burg } from "./burgs-generator";
import type { Route } from "./routes-generator";

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

function makePack(heights: (cell: number) => number = () => 30) {
  const p: [number, number][] = [];
  const c: number[][] = [];
  const h = new Uint8Array(CELL_COUNT);
  const f = new Uint8Array(CELL_COUNT);
  const biome = new Uint8Array(CELL_COUNT);

  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const row = Math.floor(cell / COLUMNS);
    const column = cell % COLUMNS;
    p.push([column * 10, row * 10]);
    h[cell] = isStrait(cell) ? 5 : heights(cell);
    f[cell] = column < STRAIT ? 1 : 2;
    biome[cell] = isStrait(cell) ? 12 : 1;

    const neighbors: number[] = [];
    if (row > 0) neighbors.push(cellAt(row - 1, column));
    if (row < ROWS - 1) neighbors.push(cellAt(row + 1, column));
    if (column > 0) neighbors.push(cellAt(row, column - 1));
    if (column < COLUMNS - 1) neighbors.push(cellAt(row, column + 1));
    c.push(neighbors);
  }

  const burgs = [
    0 as unknown as Burg,
    { cell: cellAt(1, 1), x: 10, y: 10, i: 1, name: "Deephold", feature: 1, capital: 0, underground: true },
    { cell: cellAt(0, 2), x: 20, y: 0, i: 2, name: "Twinhall", feature: 1, capital: 0, subterranean: true },
    { cell: cellAt(2, 0), x: 0, y: 20, i: 3, name: "Surfacetown", feature: 1, capital: 0 },
    { cell: cellAt(1, 5), x: 50, y: 10, i: 4, name: "Stonegate", feature: 2, capital: 0, underground: true },
    { cell: cellAt(1, 6), x: 60, y: 10, i: 5, name: "Rockmarch", feature: 2, capital: 0, underground: true }
  ];

  const burgOfCell = new Uint16Array(CELL_COUNT);
  for (const burg of burgs) if (burg?.i) burgOfCell[burg.cell] = burg.i;

  return {
    cells: {
      i: Array.from({ length: CELL_COUNT }, (_, cell) => cell),
      p,
      c,
      h,
      f,
      biome,
      burg: burgOfCell,
      haven: new Uint16Array(CELL_COUNT),
      harbor: new Uint8Array(CELL_COUNT),
      r: new Uint16Array(CELL_COUNT),
      fl: new Uint16Array(CELL_COUNT),
      t: new Int8Array(CELL_COUNT),
      g: new Uint8Array(CELL_COUNT),
      routes: {} as Record<number, Record<number, number>>
    },
    // biome 1 is habitable, biome 12 is not: `habitability: 0` is the gate the land cost uses
    biomes: [
      null,
      { i: 1, habitability: 50 },
      ...Array.from({ length: 10 }, (_, i) => ({ i: i + 2, habitability: 40 })),
      { i: 12, habitability: 0 }
    ],
    features: [0, { i: 1 }, { i: 2 }],
    burgs,
    rivers: [],
    routes: [] as Route[]
  };
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

describe("underground highways", () => {
  let Routes: any;
  let Burgs: any;

  beforeEach(async () => {
    globalThis.TIME = false;
    (globalThis as any).FlatQueue = TestFlatQueue;
    vi.stubGlobal("Pack", { findCell: () => -1 }); // only sharp-angle smoothing reads it
    globalThis.grid = { cells: { temp: new Array(CELL_COUNT).fill(20) } } as unknown as typeof grid;
    globalThis.pack = makePack() as unknown as typeof pack;
    globalThis.options.generation.underground = true;

    await import("./river-generator"); // the water cost reads the Rivers global
    await import("./routes-generator");
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

  it("makes a water step impassable and never enters an uninhabitable cell", () => {
    const land = cellAt(1, 1);
    const water = cellAt(1, STRAIT);
    const glacier = cellAt(1, 2);

    expect(Routes.getUndergroundPathCost(land, water)).toBe(Infinity);
    expect(Routes.getUndergroundPathCost(cellAt(1, 4), water)).toBe(Infinity); // water blocks from either bank

    pack.cells.biome[glacier] = 12; // glacier: habitability 0
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

  it("prices a tunnel step the same whether or not a surface route covers it", () => {
    const from = cellAt(0, 1);
    const to = cellAt(1, 1);
    pack.cells.h[to] = 40;
    globalThis.options.generation.underground = false; // keeps the underground network empty
    Routes.generate([], 1);
    expect(pack.cells.routes[from]?.[to]).toBeUndefined(); // the generated surface network leaves this step alone
    const plain = Routes.getUndergroundPathCost(from, to);

    // a locked surface route over the same step is not part of the underground network
    Routes.generate([handRoute(1, [from, to])], 1);
    expect(pack.cells.routes[from]?.[to]).toBeDefined(); // the locked route does cover it
    expect(Routes.getUndergroundPathCost(from, to)).toBe(plain);
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

  it("never runs through water and never joins two landmasses", () => {
    generate();

    for (const route of undergroundRoutes()) {
      const features = new Set<number>();
      for (const [, , cell] of route.points) {
        expect(pack.cells.h[cell]).toBeGreaterThanOrEqual(20);
        features.add(pack.cells.f[cell]);
      }
      expect(features.size).toBe(1); // a strait is not a tunnel
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
    expect(highways.some(route => route !== pinned && endpoints(route).includes(junction))).toBe(true);

    const steps = highways.flatMap(route =>
      route.points.slice(0, -1).map((point, index) => `${point[2]}-${route.points[index + 1][2]}`)
    );
    expect(new Set(steps).size).toBe(steps.length); // the shared stretch is laid once, not twice
  });

  it("drops a highway whose endpoint burg is removed", () => {
    generate();
    const highway = undergroundRoutes()[0];
    const [start, end] = endpoints(highway);
    const burgId = pack.cells.burg[start];

    Burgs.remove(burgId);

    expect(pack.routes.some(route => route.i === highway.i)).toBe(false);
    expect(pack.cells.routes[start]?.[end]).toBeUndefined();
  });

  it("drops a highway whose endpoint burg loses its classification", () => {
    generate();
    const highway = undergroundRoutes()[0];
    const [start, end] = endpoints(highway);

    delete pack.burgs[pack.cells.burg[start]].underground;
    delete pack.burgs[pack.cells.burg[start]].subterranean;

    expect(Routes.pruneUndergroundHighways()).toBeGreaterThan(0);
    expect(pack.routes.some(route => route.i === highway.i)).toBe(false);
    expect(pack.cells.h[end]).toBeGreaterThanOrEqual(20);
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
    expect(pack.routes.some(route => route.i === 1)).toBe(false);
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
});
