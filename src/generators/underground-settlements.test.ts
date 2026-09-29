import Alea from "alea";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClassification } from "./burg-classification";
import type { Burg } from "./burgs-generator";

/** A synthetic map: one land cell per burg, biome 1 with the given habitability */
function makePack(heights: number[], habitability = 50) {
  const burgs: Burg[] = heights.map((_, cell) => ({
    cell,
    x: cell,
    y: 0,
    i: cell + 1,
    state: 1,
    culture: 1,
    population: 10
  }));
  return {
    cells: { h: Uint8Array.from(heights), biome: new Uint8Array(heights.length).fill(1) },
    biomes: [null, { i: 1, habitability }],
    burgs
  };
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe("Burgs.markUndergroundSettlements", () => {
  let Burgs: any;
  const originalRandom = Math.random;

  beforeEach(async () => {
    globalThis.TIME = false;
    await import("./river-generator");
    await import("./burgs-generator");
    Burgs = (globalThis as any).Burgs;
    globalThis.options.generation.underground = true;
  });

  afterEach(() => {
    Math.random = originalRandom;
    globalThis.options.generation.underground = false;
  });

  it("marks close to 5% of each classification, disjoint and changing nothing else on a burg", () => {
    const pack = makePack(new Array(200).fill(30));
    globalThis.pack = pack as unknown as typeof globalThis.pack;
    const before = pack.burgs.map(burg => ({ ...burg }));

    Burgs.markUndergroundSettlements();

    expect(pack.burgs.filter(burg => burg.subterranean)).toHaveLength(10);
    expect(pack.burgs.filter(burg => burg.underground)).toHaveLength(10);
    expect(pack.burgs.filter(burg => burg.subterranean && burg.underground)).toHaveLength(0);
    pack.burgs.forEach((burg, index) => {
      const { subterranean, underground, ...rest } = burg as Burg & { subterranean?: boolean; underground?: boolean };
      expect(rest).toEqual(before[index]); // cell, state, culture, population and everything else untouched
    });
  });

  it("never classifies a burg sitting on a water cell", () => {
    const heights = Array.from({ length: 200 }, (_, cell) => (cell % 2 ? 5 : 30)); // half of it is sea
    const pack = makePack(heights);
    globalThis.pack = pack as unknown as typeof globalThis.pack;

    Burgs.markUndergroundSettlements();

    const classified = pack.burgs.filter(burg => getClassification(burg));
    expect(classified.length).toBeGreaterThan(0);
    expect(classified.every(burg => heights[burg.cell] >= 20)).toBe(true);
  });

  it("draws classified burgs preferentially from high ground", () => {
    const heights = Array.from({ length: 40 }, (_, cell) => 20 + cell * 2); // a 20 to 98 ramp
    const pack = makePack(heights);
    globalThis.pack = pack as unknown as typeof globalThis.pack;

    const weighted: number[] = [];
    const uniform: number[] = [];

    for (let trial = 0; trial < 20; trial++) {
      for (const burg of pack.burgs) {
        delete (burg as Burg).subterranean;
        delete (burg as Burg).underground;
      }

      Math.random = Alea(`weighting-${trial}`);
      Burgs.markUndergroundSettlements();
      const classified = pack.burgs.filter(burg => getClassification(burg));
      weighted.push(...classified.map(burg => heights[burg.cell]));

      // the same number of sites, drawn uniformly from the same ramp
      Math.random = Alea(`weighting-${trial}`);
      const pool = [...pack.burgs];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      uniform.push(...pool.slice(0, classified.length).map(burg => heights[burg.cell]));
    }

    expect(weighted).toHaveLength(uniform.length);
    expect(mean(weighted)).toBeGreaterThan(mean(uniform) + 10);
    expect(mean(weighted)).toBeGreaterThan(mean(heights));
  });

  it("degrades gracefully when the burg population cannot satisfy both shares", () => {
    for (const count of [2, 3, 10, 19]) {
      const pack = makePack(new Array(count).fill(30));
      globalThis.pack = pack as unknown as typeof globalThis.pack;

      expect(() => Burgs.markUndergroundSettlements()).not.toThrow();

      const dual = pack.burgs.filter(burg => burg.subterranean);
      const subterranean = pack.burgs.filter(burg => burg.underground);
      expect(pack.burgs.filter(burg => burg.subterranean && burg.underground)).toHaveLength(0);
      expect(dual.length + subterranean.length).toBeLessThanOrEqual(count);
    }

    // ten burgs: one of each rather than two of one kind
    const pack = makePack(new Array(10).fill(30));
    globalThis.pack = pack as unknown as typeof globalThis.pack;
    Burgs.markUndergroundSettlements();
    expect(pack.burgs.filter(burg => burg.subterranean)).toHaveLength(1);
    expect(pack.burgs.filter(burg => burg.underground)).toHaveLength(1);
  });

  it("classifies nothing and draws nothing when underground generation is off", () => {
    const pack = makePack(new Array(200).fill(30));
    globalThis.pack = pack as unknown as typeof globalThis.pack;
    globalThis.options.generation.underground = false;
    const random = vi.spyOn(Math, "random");

    Burgs.markUndergroundSettlements();

    expect(pack.burgs.some(burg => getClassification(burg))).toBe(false);
    expect(random).not.toHaveBeenCalled(); // the rest of generation is left exactly as it was
    random.mockRestore();
  });

  it("classifies the same burgs whatever the cultures and states are", () => {
    const heights = Array.from({ length: 200 }, (_, cell) => 20 + (cell % 60));
    const pack = makePack(heights);
    globalThis.pack = pack as unknown as typeof globalThis.pack;

    Math.random = Alea("politics-free");
    Burgs.markUndergroundSettlements();
    const classified = pack.burgs.filter(burg => getClassification(burg)).map(burg => burg.i);

    // same terrain, same burg sites, a different political and cultural map
    for (const burg of pack.burgs) {
      burg.state = 42;
      burg.culture = 7;
      delete (burg as Burg).subterranean;
      delete (burg as Burg).underground;
    }

    Math.random = Alea("politics-free");
    Burgs.markUndergroundSettlements();

    expect(pack.burgs.filter(burg => getClassification(burg)).map(burg => burg.i)).toEqual(classified);
  });

  it("classifies only the burgs that carry no classification yet, so a carried record keeps its flag", () => {
    // mirrors the locked-burg pass of Burgs.regenerate, which reuses the record
    const carried: Burg = { cell: 0, x: 0, y: 0, i: 1, subterranean: true };
    const pack = makePack(new Array(200).fill(30));
    pack.burgs[0] = carried as (typeof pack.burgs)[number];
    globalThis.pack = pack as unknown as typeof globalThis.pack;

    Burgs.markUndergroundSettlements();

    expect(carried.subterranean).toBe(true);
    expect(carried.underground).toBeUndefined();
    expect(pack.burgs.filter(burg => burg.subterranean && burg.underground)).toHaveLength(0);
    expect(pack.burgs.filter(burg => burg.subterranean)).toHaveLength(1 + Math.round(199 * 0.05));
  });
});

describe("Burgs.regenerate", () => {
  const originalRandom = Math.random;

  /** Minimal FlatQueue stand-in (correct, not optimised) for the A* the route pathfinder runs */
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

  /** A small two-dimensional land map with room for a rebuilt burg set, and a locked classified burg */
  function makeRegenerablePack() {
    const columns = 6;
    const rows = 10;
    const size = columns * rows;
    const at = (row: number, column: number) => row * columns + column;
    const neighbours = (cell: number) => {
      const [row, column] = [Math.floor(cell / columns), cell % columns];
      const list: number[] = [];
      if (row > 0) list.push(at(row - 1, column));
      if (row < rows - 1) list.push(at(row + 1, column));
      if (column > 0) list.push(at(row, column - 1));
      if (column < columns - 1) list.push(at(row, column + 1));
      return list;
    };

    return {
      cells: {
        i: Array.from({ length: size }, (_, cell) => cell),
        p: Array.from(
          { length: size },
          (_, cell) => [(cell % columns) * 10, Math.floor(cell / columns) * 10] as [number, number]
        ),
        c: Array.from({ length: size }, (_, cell) => neighbours(cell)),
        h: new Uint8Array(size).fill(30),
        biome: new Uint8Array(size).fill(1),
        s: new Uint16Array(size).fill(50),
        pop: new Float32Array(size).fill(10),
        culture: new Uint16Array(size).fill(1),
        burg: new Uint16Array(size),
        f: new Uint16Array(size).fill(1),
        religion: new Uint16Array(size),
        state: new Uint16Array(size).fill(1),
        province: new Uint16Array(size),
        market: new Uint16Array(size),
        haven: new Uint16Array(size),
        harbor: new Uint8Array(size),
        r: new Uint16Array(size),
        fl: new Uint16Array(size),
        t: new Int8Array(size),
        g: Uint8Array.from({ length: size }, (_, cell) => cell),
        good: new Uint16Array(size),
        routes: {} as Record<number, Record<number, number>>
      },
      biomes: [null, { i: 1, name: "Grassland", habitability: 50, cost: 50 }],
      features: [0, { i: 1, type: "island", cells: size, firstCell: 0 }],
      states: [
        { i: 0, name: "Neutrals" },
        { i: 1, name: "Ardenia", capital: 1, center: 0, coa: {}, form: "Monarchy", provinces: [], military: [] }
      ],
      provinces: [],
      markets: [],
      burgs: [
        0 as unknown as Burg,
        {
          cell: 0,
          x: 0,
          y: 0,
          i: 1,
          state: 1,
          culture: 1,
          name: "Deephold",
          feature: 1,
          capital: 1,
          lock: true,
          subterranean: true
        }
      ],
      rivers: [],
      routes: []
    };
  }

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("./population-generator", () => ({ Population: { rankCells: () => undefined } }));
    vi.doMock("./emblems-generator", () => ({ Emblems: { generate: () => ({}), getShield: () => "shape" } }));
    globalThis.TIME = false;
    (globalThis as any).FlatQueue = TestFlatQueue;
    (globalThis as any).Pack = { findCell: () => 0 };
    options.map.graph = { width: 100, height: 100, points: 60 };
    globalThis.grid = { points: new Array(60).fill([0, 0]), cells: { temp: new Array(60).fill(20) } } as never;
    globalThis.Names = { getCulture: () => "Rebuilt", getCultureShort: () => "Reb" } as never;
  });

  afterEach(() => {
    Math.random = originalRandom;
    vi.doUnmock("./population-generator");
    vi.doUnmock("./emblems-generator");
    vi.resetModules();
  });

  it("keeps the locked burg's classification and rebuilds the underground network", async () => {
    await import("./river-generator");
    await import("./routes-generator");
    await import("./burgs-generator");
    const Burgs = (globalThis as any).Burgs;
    globalThis.pack = makeRegenerablePack() as unknown as typeof globalThis.pack;
    globalThis.options.generation.underground = true;

    Burgs.regenerate();

    const carried = pack.burgs.find(burg => burg.name === "Deephold") as Burg;
    expect(carried.lock).toBe(true);
    expect(carried.subterranean).toBe(true); // the locked pass carries the record, flags and all
    expect(carried.underground).toBeUndefined();
    expect(pack.burgs.length).toBeGreaterThan(1); // the burg set was actually rebuilt
    expect(pack.burgs.filter(burg => burg.subterranean && burg.underground)).toHaveLength(0);
    expect(pack.burgs.filter(burg => getClassification(burg)).length).toBeGreaterThan(0);
    // and the underground network was rebuilt for the burgs that came out of the regenerate
    const highways = pack.routes.filter((route: { underground?: boolean }) => route.underground);
    expect(highways.length).toBeGreaterThan(0);
    expect(Object.keys(pack.cells.routes).length).toBeGreaterThan(0);
  });
});
