import { beforeEach, describe, expect, it, vi } from "vitest";
import "./grid-generator";
import { Resample as Resampler } from "./resample";

it("resamples at the requested density and records it in the map", () => {
  options = Options.getDefaultOptions();
  options.map.graph = { width: 800, height: 600, points: 1000 };
  options.generation.graph.density = 2;
  vi.stubGlobal("grid", Grid.generate("old", 800, 600));
  vi.stubGlobal("pack", { cells: { p: [], g: [] }, rivers: [] });
  vi.stubGlobal("Features", {
    markupGrid: () => {
      throw new Error("stop after resampling");
    }
  });
  const identity = (x: number, y: number): [number, number] => [x, y];

  try {
    expect(() => Resampler.process({ projection: identity, inverse: identity, scale: 1 })).toThrow(
      "stop after resampling"
    );
    expect(options.map.graph.points).toBe(2000);
    expect(grid.points.length).toBeGreaterThan(1800);
    expect(grid.points.length).toBeLessThan(2200);
  } finally {
    vi.unstubAllGlobals();
  }
});

describe("restoreJourneys", () => {
  let Resample: any;
  let Journeys: any;

  beforeEach(async () => {
    globalThis.window = globalThis.window || ({} as any);
    (globalThis as any).WARN = false;
    options.map.graph = { width: 100, height: 100, points: 100 };
    (globalThis as any).Pack = { findCell: (x: number, _y: number) => Math.round(x) };
    (globalThis as any).pack = {};

    await import("./journeys/journeys-generator");
    Journeys = (globalThis as any).Journeys;
    Resample = (await import("./resample")).Resample;
  });

  // parent point (30, 30) lands at (10, 10); parent point (10, 10) lands off-map at (-30, -30)
  const projection = (x: number, y: number): [number, number] => [x * 2 - 50, y * 2 - 50];

  const segment = (i: number, points: [number, number, number][]) => ({
    i,
    name: `segment ${i}`,
    transport: "Horse rider",
    speed: 10,
    distance: 999,
    from: points[0][2],
    to: points[points.length - 1][2],
    points
  });

  it("remaps surviving segments, drops out-of-map segments and empty journeys", () => {
    const parentMap = {
      pack: {
        journeys: [
          {
            i: 0,
            name: "kept",
            type: "Quest",
            color: "#333",
            segments: [
              segment(0, [
                [30, 30, 7],
                [40, 30, 8]
              ]),
              segment(1, [
                [30, 30, 7],
                [10, 10, 9] // projects off-map: the segment goes
              ])
            ]
          },
          {
            i: 1,
            name: "gone",
            type: "Raid",
            color: "#444",
            segments: [
              segment(0, [
                [10, 10, 9],
                [15, 10, 10]
              ])
            ]
          }
        ]
      }
    };

    Resample.restoreJourneys(parentMap, projection);

    const journeys = (globalThis as any).pack.journeys;
    expect(journeys).toHaveLength(1);
    expect(journeys[0].name).toBe("kept");
    expect(journeys[0].segments).toHaveLength(1);

    const seg = journeys[0].segments[0];
    expect(seg.points).toEqual([
      [10, 10, 10],
      [30, 10, 30]
    ]);
    expect(seg.from).toBe(10);
    expect(seg.to).toBe(30);
    expect(seg.distance).toBe(Journeys.getPathLength(seg.points));
  });

  it("restores an empty array when the parent map has no journeys", () => {
    Resample.restoreJourneys({ pack: {} }, projection);
    expect((globalThis as any).pack.journeys).toEqual([]);
  });
});

describe("restoreRoutes keeps the underground plane honest", () => {
  let Resample: any;
  const identity = (x: number, y: number): [number, number] => [x, y];

  /** A parent map with one underground highway from cell 0 to cell 1, and a one-cell-wide child */
  const parentMap = {
    pack: {
      routes: [
        {
          i: 0,
          group: "roads",
          feature: 1,
          underground: true,
          points: [
            [10, 10, 0],
            [20, 10, 1]
          ]
        }
      ]
    }
  };

  const newPack = (burgs: unknown[], burgCells: number[] = [0, 1, 2]) => ({
    cells: {
      p: [
        [0, 0],
        [10, 0],
        [20, 0]
      ],
      f: [1, 1, 1],
      burg: burgCells,
      routes: {}
    },
    burgs,
    routes: []
  });
  const twoBurgs = [0, { i: 1, cell: 1, subterranean: true }, { i: 2, cell: 2, underground: true }];

  beforeEach(async () => {
    globalThis.window = globalThis.window || ({} as any);
    (globalThis as any).WARN = false;
    options.map.graph = { width: 100, height: 100, points: 100 };
    (globalThis as any).Pack = { findCell: (x: number) => (x >= 20 ? 2 : 1) }; // 10 -> cell 1, 20 -> cell 2
    (globalThis as any).pack = newPack(twoBurgs);

    await import("./routes-generator");
    Resample = (await import("./resample")).Resample;
  });

  it("restores a highway whose endpoint burgs survived the transform", () => {
    Resample.restoreRoutes(parentMap, identity);

    const [route] = (globalThis as any).pack.routes;
    expect(route.underground).toBe(true);
    expect(route.points.map((point: number[]) => point[2])).toEqual([1, 2]);
    expect((globalThis as any).pack.cells.routes[1][2]).toBe(0); // still linked into the cell network
  });

  it("drops a highway whose endpoint burg the transform removed", () => {
    (globalThis as any).pack = newPack([0], [0, 0, 0]); // neither burg was inside the new map

    Resample.restoreRoutes(parentMap, identity);

    expect((globalThis as any).pack.routes).toEqual([]);
    expect((globalThis as any).pack.cells.routes).toEqual({});
  });
});
