import { Layers } from "@/components/layers";
import { hasBelowLevelPresence, hasGroundLevelPresence } from "@/generators/burg-classification";
import type { Burg } from "@/generators/burgs-generator";
import type { Styles } from "@/generators/styles-schema";
import { ViewportLayers, type ViewportRenderContext } from "@/renderers/viewport/viewport-renderer";
import { escapeHtml } from "@/utils/stringUtils";

type PlaneId = "burgIcons" | "undergroundBurgs";
type BurgGroupStyle = Styles["burgIcons"]["burgIcons"]["groups"][string];

interface Plane {
  containers: string[]; // the first one carries the content, so it is the layer's element id
  presence: (burg: Burg) => boolean;
  style: (container: string, group: string) => BurgGroupStyle | undefined;
  id: (i: number, isAnchor: boolean) => string;
}

/** A map may define no `town` group: without a stock style standing in, its groups would render unstyled */
const stockGroup = (groups: Record<string, BurgGroupStyle>) => groups.town || Object.values(groups)[0];

/** Everything that tells the two planes apart: gate, containers, styles, element ids and anchor drawing. */
const planes = {
  burgIcons: {
    containers: ["burgIcons", "anchors"],
    presence: hasGroundLevelPresence,
    style: (container, group) => {
      const icons = container === "anchors" ? styles.burgIcons.anchors : styles.burgIcons.burgIcons;
      return icons.groups[group] || stockGroup(icons.groups);
    },
    id: (i, isAnchor) => `${isAnchor ? "anchor" : "burg"}${i}`
  },
  undergroundBurgs: {
    // no anchors container: an anchor is a surface marker, and a second one would land on the same coordinates
    containers: ["undergroundIcons"],
    presence: hasBelowLevelPresence,
    // the underground groups may be empty: an unknown group falls back to the surface icon styles
    style: (_container, group) =>
      styles.undergroundBurgs.undergroundIcons.groups[group] ||
      styles.burgIcons.burgIcons.groups[group] ||
      stockGroup(styles.burgIcons.burgIcons.groups),
    // a dual-identity burg is drawn in both planes, so the ids must stay unique document-wide
    id: i => `undergroundBurg${i}`
  }
} satisfies Record<PlaneId, Plane>;

const layer = ViewportLayers.register({
  id: "burgIcons",
  render: (context: ViewportRenderContext) => reconcileBurgIcons(context, "burgIcons")
});
const undergroundLayer = ViewportLayers.register({
  id: "undergroundBurgs",
  render: (context: ViewportRenderContext) => reconcileBurgIcons(context, "undergroundBurgs")
});

export const drawBurgIcons = (): void => {
  TIME && console.time("drawBurgIcons");
  layer.render();
  TIME && console.timeEnd("drawBurgIcons");
};

export const drawUndergroundBurgIcons = (): void => {
  undergroundLayer.render();
};

function reconcileBurgIcons({ root, bounds }: ViewportRenderContext, planeId: PlaneId): void {
  if (!Layers.isOn(planeId)) return;

  const plane = planes[planeId];
  const burgsByGroup = new Map<string, Burg[]>();
  for (const burg of pack.burgs) {
    if (!burg.i || burg.removed || !burg.group || !plane.presence(burg)) continue;
    const group = burgsByGroup.get(burg.group);
    if (group) group.push(burg);
    else burgsByGroup.set(burg.group, [burg]);
  }

  const groups = [...options.map.burgs.groups].sort((a, b) => a.order - b.order);
  for (const type of plane.containers) {
    const container = root.querySelector<SVGGElement>(`#${type}`);
    if (!container) continue;
    const isAnchor = type === "anchors";

    const markup: string[] = [];

    for (const { name } of groups) {
      const groupStyle = plane.style(type, name);
      const groupName = escapeHtml(name);
      const icon = escapeHtml(groupStyle?.options.icon || (isAnchor ? "#icon-anchor" : "#icon-circle"));
      const size = groupStyle?.options.size ?? 1;
      const dx = isAnchor ? (groupStyle?.options.dx ?? 0) * size : 0;
      const dy = isAnchor ? (groupStyle?.options.dy ?? 0) * size : 0;
      markup.push(`<g id="${groupName}" data-group="${groupName}"`);
      if (groupStyle) {
        for (const [key, value] of Object.entries(groupStyle.attrs)) {
          if (value !== null && value !== undefined) markup.push(` ${key}="${escapeHtml(String(value))}"`);
        }
        markup.push(` font-size="${groupStyle.options.size}"`);
      }
      markup.push(` data-icon="${icon}"`);
      markup.push(">");

      // Symbols overflow their viewBox; the tallest burg artwork reaches two em above its anchor.
      const padding = 2 * (Math.abs(size) + (groupStyle?.attrs["stroke-width"] ?? 0));
      const { x0, y0, x1, y1 } = bounds;
      for (const { i, x: burgX, y: burgY, port } of burgsByGroup.get(name) || []) {
        if (isAnchor && !port) continue;
        const x = burgX + dx;
        const y = burgY + dy;
        if (x + padding < x0 || x - padding > x1 || y + padding < y0 || y - padding > y1) continue;
        markup.push(`<use id="${plane.id(i, isAnchor)}" data-id="${i}" href="${icon}" x="${x}" y="${y}"/>`);
      }
      markup.push("</g>");
    }

    container.innerHTML = markup.join("");
  }
}
