// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import { setViewportSize, setViewportTransform } from "@/components/viewport";
import type { Route } from "@/generators/routes-generator";
import { ViewportLayers } from "@/renderers/viewport/viewport-renderer";

const mocks = vi.hoisted(() => ({ layers: { routes: true, undergroundRoutes: true } }));
vi.mock("@/components/layers", () => ({ Layers: { isOn: (id: keyof (typeof mocks)["layers"]) => mocks.layers[id] } }));

import "@/generators/styles";
import {
  drawRoutes,
  drawUndergroundRoutes,
  getRouteBox,
  redrawRoute,
  removeRoutes,
  removeUndergroundRoutes,
  setEditedRoute,
  setTempRoute
} from "./draw-routes";

function route(i: number, x: number, group = "roads", underground = false): Route {
  return {
    i,
    group,
    feature: 1,
    underground,
    points: [
      [x, 10, 1],
      [x + 40, 50, 2]
    ]
  };
}

const getPath = vi.fn(({ points }: { points: number[][] }) => `M${points.map(([x, y]) => `${x},${y}`).join("L")}`);

beforeEach(() => {
  mocks.layers.routes = true;
  mocks.layers.undergroundRoutes = true;
  document.body.innerHTML = /* html */ `<svg id="map">
      <g id="routes"><g id="roads"></g><g id="trails"></g><g id="searoutes"></g></g>
      <g id="undergroundRoutes"><g id="tunnels"></g></g>
    </svg>`;
  globalThis.pack = { routes: [route(1, 0), route(2, 500), route(3, 0, "trails")] } as never;
  globalThis.Routes = { getPath } as never;
  getPath.mockClear();
  setViewportSize(100, 100);
  setViewportTransform(1, 0, 0);
  setEditedRoute(null);
  setTempRoute(null);
});

test("routes are materialized into their own group and culled on panning", () => {
  drawRoutes();
  expect(document.querySelector("#roads > #route1")).not.toBeNull();
  expect(document.querySelector("#trails > #route3")).not.toBeNull();
  expect(document.getElementById("route2")).toBeNull();
  expect(document.getElementById("routes")!.getAttribute("fill")).toBe("none");
  expect(document.getElementById("roads")!.dataset.group).toBe("roads");

  const first = document.getElementById("route1");
  ViewportLayers.renderNow();
  expect(document.getElementById("route1")).toBe(first);
  expect(getPath).toHaveBeenCalledTimes(3); // paths are built once, not per frame

  setViewportTransform(1, -500, 0);
  ViewportLayers.renderNow();
  expect(document.getElementById("route1")).toBeNull();
  expect(document.querySelector("#roads > #route2")?.getAttribute("d")).toBe("M500,10L540,50");
  expect(getPath).toHaveBeenCalledTimes(3);
});

test("the edited route stays rendered off-screen and follows a group change", () => {
  drawRoutes();
  setEditedRoute(2);
  expect(document.querySelector("#roads > #route2")).not.toBeNull();

  pack.routes[1].group = "searoutes";
  redrawRoute(pack.routes[1]);
  expect(document.querySelector("#roads > #route2")).toBeNull();
  expect(document.querySelector("#searoutes > #route2")).not.toBeNull();

  setEditedRoute(null);
  ViewportLayers.renderNow();
  expect(document.getElementById("route2")).toBeNull();
});

test("editing a visible route updates its path in place", () => {
  drawRoutes();
  const edited = document.getElementById("route1");
  pack.routes[0].points = [
    [0, 10, 1],
    [30, 30, 2]
  ];
  redrawRoute(pack.routes[0]);
  expect(document.getElementById("route1")).toBe(edited);
  expect(edited?.getAttribute("d")).toBe("M0,10L30,30");
});

test("the creator's temporary route renders in the selected group and never in an export", () => {
  drawRoutes();
  setTempRoute({
    group: "trails",
    points: [
      [0, 0, 1],
      [10, 10, 2]
    ]
  });
  expect(document.querySelector("#trails > #routeTemp")?.getAttribute("d")).toBe("M0,0L10,10");

  const clone = document.getElementById("map")!.cloneNode(true) as SVGSVGElement;
  ViewportLayers.renderTo(clone);
  expect(clone.querySelector("#routeTemp")).toBeNull();
  expect(clone.querySelectorAll("#routes path")).toHaveLength(3);

  setTempRoute(null);
  expect(document.getElementById("routeTemp")).toBeNull();
});

test("redraw picks up new paths and removed routes", () => {
  drawRoutes();
  pack.routes = [pack.routes[0]];
  drawRoutes();
  expect(document.querySelectorAll("#routes path")).toHaveLength(1);
  expect(getRouteBox(3)).toBeNull();

  const box = getRouteBox(1)!;
  expect(box.x).toBe(-0.7); // the course inflated by the group stroke width
  expect(box.width).toBeCloseTo(41.4);
});

test("erasing the layer keeps the groups, which carry the user's styles", () => {
  drawRoutes();
  removeRoutes();
  expect(document.querySelectorAll("#routes path")).toHaveLength(0);
  expect(document.querySelectorAll("#routes > g")).toHaveLength(3);

  ViewportLayers.renderNow();
  expect(document.querySelectorAll("#routes path")).toHaveLength(0); // invalidated: nothing to reconcile against
  drawRoutes();
  expect(document.querySelectorAll("#routes path")).toHaveLength(2);
});

test("viewport rendering leaves a disabled layer empty", () => {
  drawRoutes();
  mocks.layers.routes = false;
  document.getElementById("roads")!.replaceChildren(); // the layer registry erases the content when hidden
  ViewportLayers.renderNow();
  expect(document.getElementById("route1")).toBeNull();

  mocks.layers.routes = true;
  ViewportLayers.renderNow();
  expect(document.getElementById("route1")).not.toBeNull();
});

test("an underground route lands in the tunnels and never in the surface container", () => {
  globalThis.pack = { routes: [route(1, 0), route(4, 0, "roads", true)] } as never;
  drawRoutes();

  const tunnel = document.querySelector<SVGPathElement>("#tunnels > #route4")!;
  expect(tunnel.getAttribute("d")).toBe("M0,10L40,50");
  expect(document.getElementById("undergroundRoutes")!.getAttribute("fill")).toBe("none");
  expect(document.getElementById("tunnels")!.dataset.group).toBe("tunnels");
  expect(document.querySelector("#roads > #route4")).toBeNull();
  // the tunnel keeps its own group for the geometry, which is what the curve is read from
  expect(getPath.mock.calls[1][0]).toMatchObject({ group: "roads", underground: true });

  ViewportLayers.renderNow();
  expect(document.querySelector("#tunnels > #route4")).toBe(tunnel); // built once, culled per plane

  removeUndergroundRoutes();
  expect(document.querySelectorAll("#undergroundRoutes path")).toHaveLength(0);
  expect(document.querySelector("#roads > #route1")).not.toBeNull(); // the shared scene is still valid
  ViewportLayers.renderNow();
  expect(document.querySelector("#tunnels > #route4")).not.toBeNull();
});

test("the underground layer is gated on its own id", () => {
  globalThis.pack = { routes: [route(1, 0), route(4, 0, "roads", true)] } as never;
  mocks.layers.undergroundRoutes = false;
  drawRoutes();
  expect(document.querySelectorAll("#routes path")).toHaveLength(1);
  expect(document.querySelectorAll("#undergroundRoutes path")).toHaveLength(0);

  mocks.layers.undergroundRoutes = true;
  drawUndergroundRoutes();
  expect(document.querySelector("#tunnels > #route4")).not.toBeNull();

  mocks.layers.routes = false;
  drawUndergroundRoutes();
  expect(document.querySelector("#tunnels > #route4")).not.toBeNull(); // the surface gate does not close the tunnels
});

test("the edited route and the creator's draft stay out of the underground container", () => {
  globalThis.pack = { routes: [route(4, 0, "roads", true), route(5, 0, "roads")] } as never;
  drawRoutes();
  setEditedRoute(4);
  setTempRoute({
    group: "roads",
    points: [
      [0, 0, 1],
      [10, 10, 2]
    ]
  });

  expect(document.querySelector("#tunnels > #route4")).not.toBeNull(); // the edited route follows its own plane
  expect(document.querySelector("#routes > #route4")).toBeNull();
  expect(document.querySelector("#tunnels > #routeTemp")).toBeNull();
  expect(document.querySelector("#roads > #routeTemp")).not.toBeNull();
  expect(document.querySelectorAll("#undergroundRoutes path")).toHaveLength(1);
});

test("padding falls back to the route's own group style", () => {
  globalThis.pack = { routes: [route(4, 0, "roads", true), route(5, 0, "ridge", true)] } as never;
  const tunnels = styles.undergroundRoutes.groups.tunnels;
  delete (styles.undergroundRoutes.groups as Record<string, unknown>).tunnels; // a map styled before the tunnels entry
  drawRoutes();
  styles.undergroundRoutes.groups.tunnels = tunnels;

  // the roads entry the tunnel's own group resolves to is 0.7 wide; an unknown group pads by 1
  expect(getRouteBox(4)!.x).toBe(-0.7);
  expect(getRouteBox(5)!.x).toBe(-1);
});

test("the both state draws a tunnel through the crossing cell's centre, not an unconnected surface burg's icon", () => {
  // the tunnel crosses cell 3, where a surface burg sits: generation anchored the recording point at
  // the cell centre, and the renderer draws exactly what was stored, so the icon position reads as unused
  globalThis.pack = {
    routes: [
      route(9, 0, "roads"),
      {
        i: 4,
        group: "roads",
        feature: 1,
        underground: true,
        points: [
          [0, 10, 1],
          [20, 10, 3], // cell centre; the surface burg's icon would sit at [23, 9]
          [40, 50, 2]
        ]
      }
    ]
  } as never;
  drawRoutes();

  expect(document.querySelector("#tunnels > #route4")?.getAttribute("d")).toBe("M0,10L20,10L40,50");
  for (const call of getPath.mock.calls.filter(call => (call[0] as { underground?: boolean }).underground)) {
    for (const point of call[0].points) expect([point[0], point[1]]).not.toEqual([23, 9]);
  }
});
