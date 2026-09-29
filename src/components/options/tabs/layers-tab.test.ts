// @vitest-environment jsdom
// The tab is a projection of the layer registry: these pin the two underground toggles and the
// three-state content focus control to what the registry and the layer sets actually hold.
import { beforeEach, expect, test, vi } from "vitest";
import { setViewportSize, setViewportTransform } from "@/components/viewport";

// jQuery is a page global the tab only reaches for when the layer list is dragged
vi.stubGlobal("$", () => ({ sortable: () => undefined }));

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = /* html */ `<svg id="map"><g id="viewbox"></g></svg>
    <div id="options"><div id="layersContent"></div></div>`;
  globalThis.pack = { burgs: [], routes: [], cells: { routes: {} } } as never;
  options.map.burgs.groups = [];
  setViewportSize(100, 100);
  setViewportTransform(1, 0, 0);
});

const renderedLayers = () =>
  Array.from(document.querySelectorAll<HTMLElement>("#mapLayers li"), item => item.dataset.layer);
const focusButtons = () => Array.from(document.querySelectorAll<HTMLButtonElement>("#contentFocus button"));
const pressed = () => focusButtons().find(button => button.classList.contains("pressed"))?.dataset.focus ?? null;

test("both underground layers get a toggle button, next to the surface layer they belong with", async () => {
  const { LAYER_TOGGLES } = await import("./layers-tab");

  expect(LAYER_TOGGLES.has("undergroundRoutes")).toBe(true);
  expect(LAYER_TOGGLES.has("undergroundBurgs")).toBe(true);

  const layers = renderedLayers();
  expect(layers[layers.indexOf("routes") + 1]).toBe("undergroundRoutes");
  expect(layers[layers.indexOf("burgIcons") + 1]).toBe("undergroundBurgs");
});

test("the content focus control offers the three states and reports the one the layers match", async () => {
  const { Layers } = await import("@/components/layers");
  const { CONTENT_FOCUS_SETS } = await import("@/components/content-focus");
  await import("./layers-tab");
  Layers.init(); // the registry creates its groups; the app does this on load

  expect(focusButtons().map(button => button.dataset.focus)).toEqual(["surface", "underground", "both"]);

  // restore applies a selection without drawing it, which is what a stored map state does on load
  for (const state of ["underground", "both", "surface"] as const) {
    Layers.restore({ order: Layers.state.order, active: CONTENT_FOCUS_SETS[state] });
    expect(pressed()).toBe(state);
  }

  // a manual layer toggle leaves the selection matching no state, so no button is pressed
  Layers.restore({ order: Layers.state.order, active: CONTENT_FOCUS_SETS.both });
  Layers.hide("undergroundRoutes");
  expect(pressed()).toBeNull();
});

test("clicking a focus button writes the layer set it stands for", async () => {
  const { Layers } = await import("@/components/layers");
  const { CONTENT_FOCUS_SETS } = await import("@/components/content-focus");
  await import("./layers-tab");
  Layers.init(); // the registry creates its groups; the app does this on load

  document.getElementById("contentFocusUnderground")!.click();

  expect([...Layers.state.active].sort()).toEqual([...CONTENT_FOCUS_SETS.underground].sort());
  expect(pressed()).toBe("underground");
});
