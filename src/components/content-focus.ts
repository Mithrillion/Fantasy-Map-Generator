// Content focus: which plane the map shows. A projection of the layer selection, never a stored value.
import { type LayerId, Layers } from "./layers";

export type ContentFocus = "surface" | "underground" | "both";

// the built-in political preset: what the map showed before this feature existed
const SURFACE_LAYERS: LayerId[] = [
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
const UNDERGROUND_LAYERS: LayerId[] = ["undergroundBurgs", "undergroundRoutes"];

export const CONTENT_FOCUS_SETS: Record<ContentFocus, LayerId[]> = {
  surface: SURFACE_LAYERS,
  underground: UNDERGROUND_LAYERS,
  both: [...SURFACE_LAYERS, ...UNDERGROUND_LAYERS]
};

/** The state the active layer selection matches, or null when it matches none of them */
export function getContentFocus(active: readonly string[]): ContentFocus | null {
  const selected = new Set(active);
  const states = Object.keys(CONTENT_FOCUS_SETS) as ContentFocus[];
  return states.find(state => matches(selected, CONTENT_FOCUS_SETS[state])) ?? null;
}

const matches = (selected: Set<string>, layers: LayerId[]): boolean =>
  layers.length === selected.size && layers.every(layer => selected.has(layer));

export function setContentFocus(state: ContentFocus): void {
  Layers.set(CONTENT_FOCUS_SETS[state]);
}
