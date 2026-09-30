import { describe, expect, test } from "vitest";
import type { Burg } from "@/generators/burgs-generator";
import { auditPlanes } from "@/generators/plane-integrity";
import type { Route } from "@/generators/routes-generator";
import { canJoinRoutes, mergeRoutePoints, splitRouteRecord } from "./route-editor";

const points = (...cellIds: number[]): number[][] => cellIds.map(cellId => [cellId * 10, cellId * 20, cellId]);
const ids = (routePoints: number[][]): number[] => routePoints.map(point => point[2]);

const route = (i: number, cells: number[], underground = false): Route =>
  ({
    i,
    group: "roads",
    feature: 1,
    points: points(...cells),
    ...(underground ? { underground: true } : {})
  }) as Route;

describe("route editor merging", () => {
  test.each([
    { name: "current end to joined start", current: [1, 2, 3], joined: [3, 4, 5], expected: [1, 2, 3, 4, 5] },
    { name: "joined end to current start", current: [3, 4, 5], joined: [1, 2, 3], expected: [1, 2, 3, 4, 5] },
    { name: "two starts", current: [3, 2, 1], joined: [3, 4, 5], expected: [1, 2, 3, 4, 5] },
    { name: "two ends", current: [1, 2, 3], joined: [5, 4, 3], expected: [1, 2, 3, 4, 5] }
  ])("merges routes connected at $name without duplicating the shared point", ({ current, joined, expected }) => {
    expect(ids(mergeRoutePoints(points(...current), points(...joined))!)).toEqual(expected);
  });

  test("does not mutate either route while reversing their traversal direction", () => {
    const current = points(3, 2, 1);
    const joined = points(3, 4, 5);
    const originalCurrent = structuredClone(current);
    const originalJoined = structuredClone(joined);

    mergeRoutePoints(current, joined);

    expect(current).toEqual(originalCurrent);
    expect(joined).toEqual(originalJoined);
  });

  test("rejects routes without a shared endpoint", () => {
    expect(mergeRoutePoints(points(1, 2, 3), points(4, 5, 6))).toBeNull();
  });

  test("rejects empty routes", () => {
    expect(mergeRoutePoints([], points(1, 2))).toBeNull();
    expect(mergeRoutePoints(points(1, 2), [])).toBeNull();
    expect(mergeRoutePoints([], [])).toBeNull();
  });
});

describe("route editor planes", () => {
  let nextId = 1;
  const withNextId = () => {
    (globalThis as unknown as { Routes: { getNextId: () => number } }).Routes = { getNextId: () => nextId++ };
    return nextId;
  };

  test("splitting an underground highway keeps both halves underground", () => {
    nextId = 10;
    withNextId();
    const tunnel = route(1, [1, 2, 3, 4, 5], true);

    const half = splitRouteRecord(tunnel, 2);

    expect(tunnel.underground).toBe(true);
    expect(half.underground).toBe(true);
    expect(half.i).not.toBe(tunnel.i);
    // the halves meet at the split cell and their concatenation is the original point list
    expect(ids(tunnel.points)).toEqual([1, 2, 3]);
    expect(ids(half.points)).toEqual([3, 4, 5]);
    expect(ids([...tunnel.points, ...half.points.slice(1)])).toEqual([1, 2, 3, 4, 5]);
  });

  test("splitting a surface route keeps both halves on the surface", () => {
    nextId = 20;
    withNextId();
    const surface = route(1, [1, 2, 3, 4]);

    const half = splitRouteRecord(surface, 2);

    expect(surface.underground).toBeUndefined();
    expect(half.underground).toBeUndefined();
  });

  test("refuses a join across planes", () => {
    const surface = route(1, [1, 2, 3]);
    const tunnel = route(2, [3, 4, 5], true);

    expect(canJoinRoutes(surface, tunnel)).toBe(false);
    expect(canJoinRoutes(tunnel, surface)).toBe(false);
    // the same-plane pairs the geometry allows are still accepted
    expect(canJoinRoutes(surface, route(3, [3, 4, 5]))).toBe(true);
    expect(canJoinRoutes(tunnel, route(4, [3, 4, 5], true))).toBe(true);
    // and a cross-plane pair that does not even meet is refused for the same reason
    expect(canJoinRoutes(surface, route(5, [7, 8, 9], true))).toBe(false);
  });

  test("no edit sequence leaves a below-level burg a surface endpoint", () => {
    const map = mapWithTunnel();
    const routes = map.routes;

    // the sequence the editor offers: split a tunnel, try to join each half with a surface route,
    // split a surface route, join two same-plane records
    nextId = 100;
    withNextId();
    const tunnel = routes[0];
    const tunnelHalf = splitRouteRecord(tunnel, 1);
    routes.push(tunnelHalf);
    const shaft = routes[1];
    expect(canJoinRoutes(shaft, tunnel)).toBe(false);
    expect(canJoinRoutes(shaft, tunnelHalf)).toBe(false);
    const shaftHalf = splitRouteRecord(shaft, 1);
    routes.push(shaftHalf);
    expect(canJoinRoutes(tunnel, tunnelHalf)).toBe(true);

    const report = auditPlanes(map, routes);

    expect(report.violations.filter(violation => violation.rule === "boundary")).toEqual([]);
    // every record still carries the plane of the record it came from
    expect(tunnel.underground).toBe(true);
    expect(tunnelHalf.underground).toBe(true);
    expect(shaft.underground).toBeUndefined();
    expect(shaftHalf.underground).toBeUndefined();
  });
});

/** A pack the audit can read: one below-level burg with a tunnel, one surface burg with a road */
function mapWithTunnel(): typeof pack & { routes: Route[] } {
  const CELL_COUNT = 6;
  const burgs = [
    0 as unknown as Burg,
    { i: 1, cell: 1, x: 10, y: 20, feature: 1, name: "Deephold", capital: 0, underground: true } as Burg,
    { i: 2, cell: 3, x: 30, y: 20, feature: 1, name: "Rockmarch", capital: 0, subterranean: true } as Burg,
    { i: 3, cell: 5, x: 50, y: 20, feature: 1, name: "Surfacetown", capital: 0 } as Burg
  ];
  const burgOfCell = new Uint16Array(CELL_COUNT);
  for (const burg of burgs) if (burg?.i) burgOfCell[burg.cell] = burg.i;

  const map = {
    cells: {
      i: Array.from({ length: CELL_COUNT }, (_, cell) => cell),
      p: Array.from({ length: CELL_COUNT }, (_, cell) => [cell * 10, cell * 20] as [number, number]),
      c: Array.from({ length: CELL_COUNT }, () => [] as number[]),
      h: new Uint8Array(CELL_COUNT).fill(30),
      f: new Uint8Array(CELL_COUNT).fill(1),
      burg: burgOfCell
    },
    burgs,
    features: [0, { i: 1 }],
    rivers: [],
    routes: [route(1, [1, 2, 3], true), route(2, [3, 4, 5])]
  } as unknown as typeof pack & { routes: Route[] };

  return map;
}
