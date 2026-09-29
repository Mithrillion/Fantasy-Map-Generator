// @vitest-environment jsdom
// The focus is a projection of the layer selection: these tests pin the canonical sets and the derivation.
import { beforeEach, expect, test, vi } from "vitest";
import { CONTENT_FOCUS_SETS, type ContentFocus, getContentFocus, setContentFocus } from "./content-focus";

const mocks = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("@/components/layers", () => ({ Layers: { set: mocks.set } }));

const EXPECTED_SURFACE = [
  "borders",
  "burgIcons",
  "ice",
  "labels",
  "lakes",
  "rivers",
  "routes",
  "scaleBar",
  "states",
  "vignette"
];
const EXPECTED_UNDERGROUND = ["undergroundBurgs", "undergroundRoutes"];

beforeEach(() => mocks.set.mockClear());

test("the underground set is the two new layers and nothing else", () => {
  expect([...CONTENT_FOCUS_SETS.underground].sort()).toEqual(EXPECTED_UNDERGROUND);
});

test("the surface set is the built-in political preset", () => {
  // the same layers as DEFAULT_PRESETS.political in layers-presets, kept here so the set cannot drift unnoticed
  expect([...CONTENT_FOCUS_SETS.surface].sort()).toEqual(EXPECTED_SURFACE);
  expect(CONTENT_FOCUS_SETS.surface.some(layer => layer.startsWith("underground"))).toBe(false);
});

test("the both set is the surface set plus the underground one", () => {
  expect([...CONTENT_FOCUS_SETS.both].sort()).toEqual([...EXPECTED_SURFACE, ...EXPECTED_UNDERGROUND].sort());
});

test("each state is derived from the selection that defines it", () => {
  for (const state of Object.keys(CONTENT_FOCUS_SETS) as ContentFocus[]) {
    expect(getContentFocus(CONTENT_FOCUS_SETS[state]), state).toBe(state);
  }
});

test("a selection matching no state reports nothing", () => {
  expect(getContentFocus([])).toBeNull();
  expect(getContentFocus(["roads"])).toBeNull();
  // the both set without one of its layers: closer to "both" than to anything else, but still not it
  expect(getContentFocus(CONTENT_FOCUS_SETS.both.filter(layer => layer !== "undergroundRoutes"))).toBeNull();
  // a superset: a manual toggle adds a layer the state does not define
  expect(getContentFocus([...CONTENT_FOCUS_SETS.surface, "provinces"])).toBeNull();
  // the same layers plus an unknown id, which a selection can carry
  expect(getContentFocus([...CONTENT_FOCUS_SETS.underground, "gone"])).toBeNull();
});

test("the selection is a set: order does not matter and a repeat names nothing new", () => {
  expect(getContentFocus([...CONTENT_FOCUS_SETS.surface].reverse())).toBe("surface");
  expect(getContentFocus([...CONTENT_FOCUS_SETS.underground, "undergroundBurgs"])).toBe("underground");
  expect(getContentFocus([...CONTENT_FOCUS_SETS.surface, "routes"])).toBe("surface");
});

test("setting a state selects exactly its layer set", () => {
  setContentFocus("underground");
  expect(mocks.set).toHaveBeenCalledWith(CONTENT_FOCUS_SETS.underground);

  setContentFocus("both");
  expect(mocks.set).toHaveBeenLastCalledWith(CONTENT_FOCUS_SETS.both);
  expect(mocks.set).toHaveBeenCalledTimes(2);
});
