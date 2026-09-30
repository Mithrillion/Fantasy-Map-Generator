import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isLand } from "../utils";
import { findPath } from "../utils/pathUtils";
import { getClassification, hasBelowLevelPresence, hasGroundLevelPresence } from "./burg-classification";
import type { Burg } from "./burgs-generator";
import { auditPlanes, isLegitimateBoundary } from "./plane-integrity";
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
    expect(pack.cells.h[cellAt(0, 5)]).toBeGreaterThanOrEqual(20);
  });

  it("drops a highway whose endpoint burg loses its classification", () => {
    const deephold = (pack.burgs[1] as Burg).cell;
    const stub = handHighway(7, [deephold, cellAt(0, 1)]);
    pack.routes.push(stub);

    delete pack.burgs[pack.cells.burg[deephold]].underground;
    delete pack.burgs[pack.cells.burg[deephold]].subterranean;

    expect(Routes.pruneUndergroundHighways()).toBeGreaterThan(0);
    expect(pack.routes.some(route => route.i === stub.i)).toBe(false);
    expect(pack.cells.h[cellAt(0, 1)]).toBeGreaterThanOrEqual(20);
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
     */
    const surfaceGatewayFixture = () => {
      const gateway = cellAt(1, 2);
      const deep = (pack.burgs[1] as Burg).cell;
      const twinhall = (pack.burgs[2] as Burg).cell;
      burgAt(gateway, false);
      pack.cells.h[cellAt(0, 1)] = 21;
      pack.cells.h[cellAt(0, 2)] = 21;
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

      // pathfinding is untouched: a burg cell still costs a third of a plain one
      const burgStep = Routes.getLandPathCost(from, classified);
      pack.cells.burg[classified] = 0;
      expect(Routes.getLandPathCost(from, classified)).toBeCloseTo(burgStep * 3, 5);
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
      // the gates that do block are untouched by the separation rule
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
