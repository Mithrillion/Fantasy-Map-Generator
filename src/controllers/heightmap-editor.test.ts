import { describe, expect, it, vi } from "vitest";
import type { Burg } from "@/generators/burgs-generator";
import type { Point } from "@/types/global";

// the restore path removes a burg's emblem alongside the burg; the scene side is inert in jsdom
vi.mock("@/renderers/draw-emblems", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  removeEmblem: () => {}
}));

(globalThis as Record<string, unknown>).ERROR = false;
(globalThis as Record<string, unknown>).changeViewMode = () => {};
const originalGetElementById = document.getElementById;
document.getElementById = (() =>
  ({
    on: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    remove: () => {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    style: {}
  }) as unknown as HTMLElement) as typeof document.getElementById;
const { createAvailableLandCellFinder, restoreKeptData, restoreRiskedData } = await import("./heightmap-editor");
document.getElementById = originalGetElementById;

describe("createAvailableLandCellFinder", () => {
  const cells: Parameters<typeof createAvailableLandCellFinder>[0] = {
    h: [25, 30, 18, 40],
    p: [
      [0, 0],
      [10, 0],
      [5, 0],
      [100, 0]
    ]
  };

  it("returns the nearest land cell and removes it from later assignments", () => {
    const findCell = createAvailableLandCellFinder(cells);

    expect(findCell(1, 0)).toBe(0);
    expect(findCell(1, 0)).toBe(1);
    expect(findCell(1, 0)).toBe(3);
  });

  it("never returns water cells", () => {
    const findCell = createAvailableLandCellFinder(cells);

    expect(findCell(5, 0)).not.toBe(2);
  });

  it("returns undefined when no land cell remains", () => {
    const findCell = createAvailableLandCellFinder({ h: [10], p: [[0, 0]] });

    expect(findCell(0, 0)).toBeUndefined();
  });
});

describe("the heightmap restore paths and underground content", () => {
  it("keep mode reheights only: classifications and the underground records ride along", () => {
    const world = {
      cells: {
        i: [0, 1, 2],
        g: [0, 1, 2],
        h: new Uint8Array([10, 10, 10]),
        routes: { 0: { 1: 1 }, 1: { 0: 1 } },
        burg: new Uint16Array([1, 2, 0])
      },
      burgs: [
        { i: 0 } as unknown as Burg,
        { i: 1, cell: 0, subterranean: true } as unknown as Burg,
        { i: 2, cell: 1, underground: true } as unknown as Burg
      ],
      routes: [
        {
          i: 1,
          group: "roads",
          underground: true,
          points: [
            [0, 0, 0],
            [10, 0, 1]
          ]
        }
      ],
      zones: []
    } as unknown as typeof pack;
    globalThis.pack = world;
    globalThis.grid = { cells: { h: new Uint8Array([55, 60, 50]) } } as unknown as typeof grid;

    restoreKeptData();

    expect(Array.from(pack.cells.h)).toEqual([55, 60, 50]); // the only data keep mode writes
    expect(pack.burgs[1].subterranean).toBe(true);
    expect(pack.burgs[2].underground).toBe(true);
    expect(pack.routes[0].underground).toBe(true); // the plane's records are untouched
    expect(pack.cells.routes[1]).toBeDefined(); // the link map is untouched
  });

  it("risk mode restores the classifications and prunes the dropped burg's highway", async () => {
    globalThis.TIME = false;
    globalThis.INFO = false;
    options.app = { heightmapEditor: { allowErosion: false } } as unknown as typeof options.app;
    await import("../generators/routes-generator"); // real Routes: the removal prune runs for real
    await import("../generators/burgs-generator"); // real Burgs.remove is the path's removal hook

    // A five-cell land world: burg 1 (underground) on cell 0, burg 2 (subterranean) on cell 2 and
    // burg 3 (underground) on cell 4, with a hand highway over cells 2-3-4 between burg 2 and 3.
    const cells = {
      i: [0, 1, 2, 3, 4],
      g: [0, 1, 2, 3, 4],
      h: new Uint8Array([26, 28, 24, 25, 27]),
      p: [
        [0, 0],
        [10, 0],
        [30, 0],
        [40, 0],
        [50, 0]
      ] as Point[],
      f: new Uint8Array([1, 1, 1, 1, 1]),
      biome: new Uint8Array([1, 1, 1, 1, 1]),
      culture: new Uint16Array(5),
      pop: new Float32Array(5),
      routes: { 0: { 1: 0 }, 1: { 0: 0, 2: 0 }, 2: { 1: 0, 3: 1 }, 3: { 2: 1, 4: 1 }, 4: { 3: 1 } },
      s: new Uint16Array(5),
      state: new Uint16Array(5),
      province: new Uint16Array(5),
      religion: new Uint16Array(5),
      good: new Uint16Array(5),
      r: new Uint16Array(5),
      conf: new Uint8Array(5),
      fl: new Uint16Array(5),
      burg: new Uint16Array([1, 0, 2, 0, 3])
    } as unknown as Record<string, unknown>;
    const burgs = [
      { i: 0 } as unknown as Burg,
      { i: 1, cell: 0, x: 0, y: 0, feature: 1, capital: 0, underground: true } as unknown as Burg,
      { i: 2, cell: 2, x: 30, y: 0, feature: 1, capital: 0, subterranean: true } as unknown as Burg,
      { i: 3, cell: 4, x: 50, y: 0, feature: 1, capital: 0, underground: true } as unknown as Burg
    ];
    vi.stubGlobal("pack", {
      cells,
      burgs,
      routes: [
        {
          i: 1,
          group: "roads",
          feature: 1,
          underground: true,
          points: [
            [30, 0, 2],
            [40, 0, 3],
            [50, 0, 4]
          ]
        }
      ],
      states: [],
      provinces: [],
      cultures: [],
      zones: [],
      goods: []
    });
    vi.stubGlobal("grid", {
      cells: {
        i: [0, 1, 2, 3, 4],
        h: new Uint8Array([26, 28, 24, 25, 27]),
        p: cells.p,
        temp: new Int8Array([15, 15, 15, 15, 15]),
        prec: new Uint8Array([5, 5, 5, 5, 5])
      }
    });
    // the heavy generation stack is stubbed as json: the behaviour under test is the restore's own
    // burg handling and the prune it triggers through Burgs.remove
    vi.stubGlobal("Temperature", { generate: () => {} });
    vi.stubGlobal("Precipitation", { generate: () => {} });
    vi.stubGlobal("Features", {
      markupGrid: () => {},
      markupPack: () => {},
      captureUserData: () => [],
      restoreUserData: () => {}
    });
    vi.stubGlobal("States", {
      getPoles: () => {},
      findNeighbors: () => {},
      collectStatistics: () => {},
      collectTaxes: () => {}
    });
    vi.stubGlobal("Goods", { generate: () => {} });
    vi.stubGlobal("Markets", { generate: () => [] });
    vi.stubGlobal("Production", { produce: () => {} });
    vi.stubGlobal("Ice", { generate: () => {} });
    // Pack.generate re-graph boundary: the edit shrank the landmass to two cells, so burg 3 finds
    // no available land cell and the path takes the removal branch with the real prune
    vi.stubGlobal("Pack", {
      generate: () => {
        const pack = globalThis.pack as unknown as {
          cells: Record<string, unknown>;
          vertices?: unknown;
        };
        pack.cells = {
          i: [0, 1],
          g: [0, 1],
          h: new Uint8Array([26, 28]),
          p: [
            [0, 0],
            [10, 0]
          ] as Point[],
          f: new Uint8Array([1, 1]),
          biome: new Uint8Array([1, 1]),
          burg: new Uint16Array([0, 1]),
          routes: {}
        };
        pack.vertices = {}; // the real GraphOverride.restore reads this and no-ops on empty overrides
      }
    });

    restoreRiskedData();

    // classifications ride on the burg records: never stripped
    expect(burgs[1].underground).toBe(true);
    expect(burgs[2].subterranean).toBe(true);
    // the two burgs that found a cell are repointed and the reverse link follows them
    expect(burgs[1].cell).toBe(0);
    expect(burgs[2].cell).toBe(1);
    expect(pack.cells.burg[1]).toBe(2);
    // the third burg found no land cell: it is removed through Burgs.remove, whose prune drops
    // the underground highway that ended at the burg's old cell (4)
    expect(burgs[3].removed).toBe(true);
    expect((globalThis.pack.routes as unknown[]).some(route => (route as { i: number }).i === 1)).toBe(false);
  });
});
