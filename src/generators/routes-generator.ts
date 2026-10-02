import Alea from "alea";
import { curveCatmullRom, line } from "d3";
import Delaunator from "delaunator";
import { distanceSquared, findPath, getAdjective, isLand, ra, rn, round, rw } from "../utils";
import { meander } from "../utils/pathUtils";
import { getClassification, hasBelowLevelPresence, hasGroundLevelPresence } from "./burg-classification";
import type { Burg } from "./burgs-generator";
import type { Label } from "./labels-generator";
import { isLegitimateBoundary, type Plane } from "./plane-integrity";
import type { River } from "./river-generator";
import type { Point } from "./voronoi";

const ROUTES_SHARP_ANGLE = 135;
const ROUTES_VERY_SHARP_ANGLE = 115;

/** Which burgs a pass may anchor at and price as burgs: the plane's endpoint-eligibility rule */
const planePresence: Record<Plane, (burg: Burg) => boolean> = {
  surface: hasGroundLevelPresence,
  underground: hasBelowLevelPresence
};

export const MIN_PASSABLE_SEA_TEMP = -4;
const RIVER_TYPE_MODIFIER = 1.5;
/** how much dearer a tunnel step is on a surface route cell (the penalty decays over the next cells) */
const SURFACE_SEPARATION = 2;
/** beyond this many cells from a surface route a tunnel step pays nothing extra */
const SURFACE_SEPARATION_RANGE = 4;
/** How much dearer a tunnel step off a burg cell is than on one: the pull toward the settlements it serves */
const UNDERGROUND_BURG_ATTRACTION = 2;
/**
 * The shortcut layer's threshold: the surface path between two burgs must be at least this many times
 * their straight-line distance before a tunnel is owed. The water census measured land fallbacks of
 * 1.01-6.70 with 26 of 53 crossings above 1.0, so 1.5 selects the crossings that are expensive
 * rather than merely present.
 */
export const UNDERGROUND_SHORTCUT_RATIO = 1.5;
const ROUTE_TYPE_MODIFIERS: Record<string, number> = {
  "-1": 1, // coastline
  "-2": 1.8, // sea
  "-3": 4, // open sea
  "-4": 6, // ocean
  default: 8 // far ocean
};

export const UNNAMED_ROUTE = "Unnamed route segment";

// name generator data
const models: Record<string, Record<string, number>> = {
  roads: {
    burg_suffix: 3,
    prefix_suffix: 6,
    the_descriptor_prefix_suffix: 2,
    the_descriptor_burg_suffix: 1
  },
  trails: { burg_suffix: 8, prefix_suffix: 1, the_descriptor_burg_suffix: 1 },
  searoutes: {
    burg_suffix: 4,
    prefix_suffix: 2,
    the_descriptor_prefix_suffix: 1
  }
};

const prefixes: string[] = [
  "King",
  "Queen",
  "Military",
  "Old",
  "New",
  "Ancient",
  "Royal",
  "Imperial",
  "Great",
  "Grand",
  "High",
  "Silver",
  "Dragon",
  "Shadow",
  "Star",
  "Mystic",
  "Whisper",
  "Eagle",
  "Golden",
  "Crystal",
  "Enchanted",
  "Frost",
  "Moon",
  "Sun",
  "Thunder",
  "Phoenix",
  "Sapphire",
  "Celestial",
  "Wandering",
  "Echo",
  "Twilight",
  "Crimson",
  "Serpent",
  "Iron",
  "Forest",
  "Flower",
  "Whispering",
  "Eternal",
  "Frozen",
  "Rain",
  "Luminous",
  "Stardust",
  "Arcane",
  "Glimmering",
  "Jade",
  "Ember",
  "Azure",
  "Gilded",
  "Divine",
  "Shadowed",
  "Cursed",
  "Moonlit",
  "Sable",
  "Everlasting",
  "Amber",
  "Nightshade",
  "Wraith",
  "Scarlet",
  "Platinum",
  "Whirlwind",
  "Obsidian",
  "Ethereal",
  "Ghost",
  "Spike",
  "Dusk",
  "Raven",
  "Spectral",
  "Burning",
  "Verdant",
  "Copper",
  "Velvet",
  "Falcon",
  "Enigma",
  "Glowing",
  "Silvered",
  "Molten",
  "Radiant",
  "Astral",
  "Wild",
  "Flame",
  "Amethyst",
  "Aurora",
  "Shadowy",
  "Solar",
  "Lunar",
  "Whisperwind",
  "Fading",
  "Titan",
  "Dawn",
  "Crystalline",
  "Jeweled",
  "Sylvan",
  "Twisted",
  "Ebon",
  "Thorn",
  "Cerulean",
  "Halcyon",
  "Infernal",
  "Storm",
  "Eldritch",
  "Sapphire",
  "Crimson",
  "Tranquil",
  "Paved"
];

const descriptors = [
  "Great",
  "Shrouded",
  "Sacred",
  "Fabled",
  "Frosty",
  "Winding",
  "Echoing",
  "Serpentine",
  "Breezy",
  "Misty",
  "Rustic",
  "Silent",
  "Cobbled",
  "Cracked",
  "Shaky",
  "Obscure"
];

const suffixes: Record<string, Record<string, number>> = {
  roads: { road: 7, route: 3, way: 2, highway: 1 },
  trails: { trail: 4, path: 1, track: 1, pass: 1 },
  searoutes: { route: 5, lane: 2, passage: 1, "water way": 1 }
};

export interface Route {
  i: number;
  name?: string;
  group: string;
  feature: number;
  points: number[][]; // [x, y, cellId]. TODO: type properly
  cells?: number[];
  merged?: boolean;
  length?: number;
  lock?: boolean;
  label?: Label;
  note?: string;
  underground?: boolean; // presentation only: generated underground, traversed exactly as any other route
  repaired?: boolean; // added by the service pass, so a map that needed many repairs is visible
}

type RiverEdge = { riverId: number; fromIndex: number };

type RiverRun = {
  startIdx: number; // first route-cell index of the run
  endIdx: number; // last route-cell index of the run (shared with the next run at confluences)
  riverId: number;
  direction: 1 | -1; // +1 if the route runs downstream (source->mouth), -1 if upstream
  firstCanonicalIndexInRiver: number; // river.cells index of the run's source-most cell
};

// ---------------------------------------------------------------- pair selection

/**
 * The selection layers, in admission order: a pair keeps the first layer that admitted it. The long
 * link layer is deferred: on the eight-seed protocol its two pairs per seed cost seventeen records,
 * because a long path is cut into stretches wherever it meets the existing network.
 */
export const UNDERGROUND_PAIR_LAYERS = ["backbone", "shortcut"] as const;
export type UndergroundPairLayer = (typeof UNDERGROUND_PAIR_LAYERS)[number];

/** One admitted pair of burg cells, with the landmass it belongs to and the layer that justified it */
export type UndergroundPair = { start: number; end: number; feature: number; layer: UndergroundPairLayer };

/** The surface path between two burg cells in map units, or null when no land surface route connects them */
export type SurfacePathMeasure = (start: number, end: number) => number | null;

// Urquhart graph is obtained by removing the longest edge from each triangle in the Delaunay triangulation
// this gives us an aproximation of a desired road network, i.e. connections between burgs
// code from https://observablehq.com/@mbostock/urquhart-graph
function urquhartEdges(points: Point[]) {
  if (points.length < 2) return []; // No connection for less than 2 points
  if (points.length === 2) return [[0, 1]]; // Direct connection for exactly two points

  const score = (p0: number, p1: number) => distanceSquared(points[p0], points[p1]);

  const { halfedges, triangles } = Delaunator.from(points);
  const n = triangles.length;

  const removed = new Uint8Array(n);
  const edges: Array<[number, number]> = [];

  for (let e = 0; e < n; e += 3) {
    const p0 = triangles[e],
      p1 = triangles[e + 1],
      p2 = triangles[e + 2];

    const p01 = score(p0, p1),
      p12 = score(p1, p2),
      p20 = score(p2, p0);

    removed[
      p20 > p01 && p20 > p12
        ? Math.max(e + 2, halfedges[e + 2])
        : p12 > p01 && p12 > p20
          ? Math.max(e + 1, halfedges[e + 1])
          : Math.max(e, halfedges[e])
    ] = 1;
  }

  for (let e = 0; e < n; ++e) {
    if (e > halfedges[e] && !removed[e]) {
      const t0 = triangles[e];
      const t1 = triangles[e % 3 === 2 ? e - 2 : e + 1];
      edges.push([t0, t1]);
    }
  }

  return edges;
}

/** Kruskal's minimum spanning tree over the burg positions: the backbone's shape */
function mstEdges(points: Point[]): Array<[number, number]> {
  const candidates: Array<[number, number, number]> = [];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) candidates.push([i, j, distanceSquared(points[i], points[j])]);
  candidates.sort((a, b) => a[2] - b[2]);

  const parent = Array.from({ length: points.length }, (_, index) => index);
  const find = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };

  const edges: Array<[number, number]> = [];
  for (const [i, j] of candidates) {
    const a = find(i);
    const b = find(j);
    if (a === b) continue;
    parent[a] = b;
    edges.push([i, j]);
  }
  return edges;
}

const isDeepBurg = (burg: Burg) => getClassification(burg) === "underground";

/**
 * Layer 1: the backbone. The tree over every below-level burg is cut down to the tree that carries the
 * fully subterranean burgs: an edge between two dual-identity burgs goes, then a dual-identity leaf
 * goes too, because its surface route already connects it. A dual-identity burg that carries the path
 * between two backbone burgs stays, so the tree passes through it rather than around it. Where the
 * pruning splits the subterranean set, its components are rejoined by their closest allowed pair.
 */
function backboneEdges(burgs: ReadonlyArray<Burg>): Array<[number, number]> {
  const points = burgs.map(burg => [burg.x, burg.y] as Point);
  const deep = burgs.map(isDeepBurg);
  const parent = Array.from({ length: burgs.length }, (_, index) => index);
  const find = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootA] = rootB;
  };

  let edges = mstEdges(points).filter(([a, b]) => deep[a] || deep[b]); // an edge serving two served burgs is not owed

  for (;;) {
    const degree = new Map<number, number>();
    for (const [a, b] of edges) {
      degree.set(a, (degree.get(a) ?? 0) + 1);
      degree.set(b, (degree.get(b) ?? 0) + 1);
    }

    let removed = false;
    edges = edges.filter(([a, b]) => {
      const leaf = !deep[a] && (degree.get(a) ?? 0) === 1 ? a : !deep[b] && (degree.get(b) ?? 0) === 1 ? b : -1;
      if (leaf < 0) return true;
      const neighbour = leaf === a ? b : a;
      if (deep[neighbour] && (degree.get(neighbour) ?? 0) === 1) return true; // the deep burg's only support
      removed = true;
      return false;
    });
    if (!removed) break;
  }

  for (const [a, b] of edges) union(a, b);

  for (;;) {
    const components = new Set(deep.flatMap((isDeep, index) => (isDeep ? [find(index)] : [])));
    if (components.size < 2) break;

    let best: { a: number; b: number; distance: number } | undefined;
    for (let a = 0; a < burgs.length; a++) {
      if (!components.has(find(a))) continue;
      for (let b = a + 1; b < burgs.length; b++) {
        if (!components.has(find(b)) || find(a) === find(b)) continue;
        if (!deep[a] && !deep[b]) continue;
        const distance = distanceSquared(points[a], points[b]);
        if (!best || distance < best.distance) best = { a, b, distance };
      }
    }
    if (!best) break;
    union(best.a, best.b);
    edges.push([best.a, best.b]);
  }

  return edges;
}

/**
 * The surface path between two burg cells through the generated surface records, in map units, or null
 * when no land route connects them. Each burg is anchored to the surface route cell nearest it (by cell
 * hops, then by distance), and the path is the shortest route between the two anchors. Sea routes are
 * not a land path, so they do not stand in for one.
 */
export function createSurfacePathMeasure(routes: readonly Route[], map: typeof pack = pack): SurfacePathMeasure {
  const links = new Map<number, Array<[number, number]>>();
  const surface = new Set<number>();
  const connect = (from: number, to: number, weight: number) => {
    const list = links.get(from);
    if (list) list.push([to, weight]);
    else links.set(from, [[to, weight]]);
  };

  for (const route of routes) {
    if (route.underground || route.group === "searoutes" || !route.points?.length) continue;
    for (let index = 0; index < route.points.length - 1; index++) {
      const [x, y, cell] = route.points[index];
      const [nextX, nextY, nextCell] = route.points[index + 1];
      if (cell === nextCell) continue;
      const weight = Math.sqrt((nextX - x) ** 2 + (nextY - y) ** 2);
      connect(cell, nextCell, weight);
      connect(nextCell, cell, weight);
    }
    for (const point of route.points) surface.add(point[2]);
  }

  if (!surface.size) return () => null;

  const { c, p } = map.cells;
  const anchors = new Map<number, number | null>();
  const anchorOf = (cell: number): number | null => {
    const cached = anchors.get(cell);
    if (cached !== undefined) return cached;

    // the nearest surface cell by cell hops, then by distance: a burg may sit far from any road, and
    // walking to the road is not what the ratio prices
    let best: number | null = null;
    let bestDistance = Infinity;
    const seen = new Set([cell]);
    let frontier = [cell];

    while (frontier.length && best === null) {
      const next: number[] = [];
      for (const candidate of frontier) {
        if (surface.has(candidate)) {
          const [x, y] = p[candidate];
          const distance = (x - p[cell][0]) ** 2 + (y - p[cell][1]) ** 2;
          if (distance < bestDistance) {
            best = candidate;
            bestDistance = distance;
          }
          continue;
        }
        for (const neighbour of c[candidate] ?? []) {
          if (seen.has(neighbour)) continue;
          seen.add(neighbour);
          next.push(neighbour);
        }
      }
      frontier = best === null ? next : [];
    }

    anchors.set(cell, best);
    return best;
  };

  const paths = new Map<number, Map<number, number>>();
  const measureFrom = (anchor: number): Map<number, number> => {
    const cached = paths.get(anchor);
    if (cached) return cached;

    const found = new Map<number, number>([[anchor, 0]]);
    const heap: Array<[number, number]> = [[anchor, 0]];
    const push = (cell: number, distance: number) => {
      heap.push([cell, distance]);
      let index = heap.length - 1;
      while (index > 0) {
        const parentIndex = (index - 1) >> 1;
        if (heap[parentIndex][1] <= heap[index][1]) break;
        [heap[parentIndex], heap[index]] = [heap[index], heap[parentIndex]];
        index = parentIndex;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop() as [number, number];
      if (heap.length) {
        heap[0] = last;
        let index = 0;
        for (;;) {
          const left = index * 2 + 1;
          const right = left + 1;
          let smallest = index;
          if (left < heap.length && heap[left][1] < heap[smallest][1]) smallest = left;
          if (right < heap.length && heap[right][1] < heap[smallest][1]) smallest = right;
          if (smallest === index) break;
          [heap[smallest], heap[index]] = [heap[index], heap[smallest]];
          index = smallest;
        }
      }
      return top;
    };

    while (heap.length) {
      const [cell, distance] = pop();
      if (distance > (found.get(cell) ?? Infinity)) continue;
      for (const [next, weight] of links.get(cell) ?? []) {
        const candidate = distance + weight;
        if (candidate >= (found.get(next) ?? Infinity)) continue;
        found.set(next, candidate);
        push(next, candidate);
      }
    }

    paths.set(anchor, found);
    return found;
  };

  return (start, end) => {
    const from = anchorOf(start);
    const to = anchorOf(end);
    if (from === null || to === null) return null;
    return measureFrom(from).get(to) ?? null;
  };
}

/**
 * The pair policy, applied in order over the burgs of each landmass: the backbone tree over the fully
 * subterranean burgs, then the shortcuts where overland travel is expensive. The cost model is
 * untouched — this decides only which pairs are routed. A pair admitted by both layers is recorded
 * once, under the first layer that admitted it.
 */
export function selectUndergroundPairs(
  burgs: readonly Burg[],
  measureSurfacePath: SurfacePathMeasure = () => null,
  layers: readonly UndergroundPairLayer[] = UNDERGROUND_PAIR_LAYERS
): UndergroundPair[] {
  const byFeature = new Map<number, Array<Burg & { feature: number }>>();
  for (const burg of burgs) {
    if (!burg?.i || burg.removed || burg.feature === undefined || !hasBelowLevelPresence(burg)) continue;
    const list = byFeature.get(burg.feature);
    if (list) list.push(burg as Burg & { feature: number });
    else byFeature.set(burg.feature, [burg as Burg & { feature: number }]);
  }
  const features = [...byFeature.entries()].sort((a, b) => a[0] - b[0]);

  const admitted = new Map<string, UndergroundPair>();
  const admit = (start: number, end: number, feature: number, layer: UndergroundPairLayer) => {
    if (start === end) return;
    const key = start < end ? `${start}-${end}` : `${end}-${start}`;
    if (admitted.has(key)) return;
    admitted.set(key, { start, end, feature, layer });
  };
  const pointsOf = (featureBurgs: ReadonlyArray<Burg>) => featureBurgs.map(burg => [burg.x, burg.y] as Point);

  for (const layer of layers) {
    if (layer === "backbone") {
      for (const [feature, featureBurgs] of features)
        for (const [a, b] of backboneEdges(featureBurgs))
          admit(featureBurgs[a].cell, featureBurgs[b].cell, feature, layer);
      continue;
    }

    if (layer === "shortcut") {
      for (const [feature, featureBurgs] of features) {
        const points = pointsOf(featureBurgs);
        for (const [a, b] of urquhartEdges(points)) {
          const direct = Math.sqrt(distanceSquared(points[a], points[b]));
          const surface = measureSurfacePath(featureBurgs[a].cell, featureBurgs[b].cell);
          if (surface === null || surface >= UNDERGROUND_SHORTCUT_RATIO * direct)
            admit(featureBurgs[a].cell, featureBurgs[b].cell, feature, layer);
        }
      }
    }
  }

  return [...admitted.values()];
}

class RoutesModule {
  private connections: Map<string, boolean> = new Map();
  /** cell pairs of the underground network: the only source of the tunnel discount */
  private undergroundConnections: Set<string> = new Set();
  /** distance from the surface network per cell, built by the underground pass; absent means "no penalty" */
  private surfaceDistances: Uint8Array | undefined;
  private riverEdges: Map<number, Map<number, RiverEdge>> = new Map();
  private riversById: Map<number, River> = new Map();
  private riverGeometryCache: Map<number, { points: Point[]; anchorIndices: number[] }> = new Map();
  /** `[from, to]` of every land step the surface pass emitted, cleared on each generate */
  surfaceSteps: [number, number][] = [];

  regenerate(): void {
    const lockedRoutes = pack.routes.filter(route => route.lock).map((route, index) => ({ ...route, i: index }));
    this.generate(lockedRoutes, Math.random());
  }

  generate(lockedRoutes: Route[] = [], randomSeed?: number) {
    Math.random = Alea(randomSeed ?? options.map.seed);
    this.connections = new Map();
    this.undergroundConnections = new Set();
    this.surfaceSteps = [];
    this.buildRiverEdges();

    for (const route of lockedRoutes) {
      const cells = route.points.map(point => point[2]);
      this.addConnections(cells);
      if (route.underground) this.rememberEdges(this.undergroundConnections, cells); // a pinned tunnel keeps its attractive force
    }

    pack.routes = this.createRoutesData(lockedRoutes);
    if (options.generation.underground) this.generateUndergroundHighways(pack.routes);
    this.pruneUndergroundHighways(); // a locked highway may have lost the burg it ended at
    if (options.generation.underground) this.repairUndergroundHighways();
    pack.cells.routes = this.buildLinks(pack.routes);
  }

  /** `isEligible` is what keeps the two planes apart: surface routes see ground-level presence only */
  private sortBurgsByFeature(burgs: Burg[], isEligible: (burg: Burg) => boolean = hasGroundLevelPresence) {
    const burgsByFeature: Record<number, Burg[]> = {};
    const capitalsByFeature: Record<number, Burg[]> = {};
    const portsByFeature: Record<number, Burg[]> = {};

    const addBurg = (collection: Record<number, Burg[]>, feature: number, burg: Burg) => {
      if (!collection[feature]) collection[feature] = [];
      collection[feature].push(burg);
    };

    for (const burg of burgs) {
      if (burg.i && !burg.removed && isEligible(burg)) {
        const { feature, capital, port } = burg;
        if (feature === undefined) continue;
        addBurg(burgsByFeature, feature, burg);
        if (capital) addBurg(capitalsByFeature, feature, burg);
        if (port) addBurg(portsByFeature, port, burg);
      }
    }

    return { burgsByFeature, capitalsByFeature, portsByFeature };
  }

  // Urquhart graph is obtained by removing the longest edge from each triangle in the Delaunay triangulation
  // this gives us an aproximation of a desired road network, i.e. connections between burgs
  // code from https://observablehq.com/@mbostock/urquhart-graph
  private calculateUrquhartEdges(points: Point[]) {
    return urquhartEdges(points);
  }

  /**
   * The surface land path cost. Its burg term is plane-governed: a burg of the surface pass's own
   * plane discounts the step, a below-level burg is priced exactly as a plain cell. Every other term
   * is untouched.
   */
  getLandPathCost(
    current: number,
    next: number,
    hasPresence: (cellId: number) => boolean = this.presenceIn("surface")
  ) {
    if (pack.cells.h[next] < 20) return Infinity; // ignore water cells

    const habitability = pack.biomes[pack.cells.biome[next]].habitability;
    if (!habitability) return Infinity; // inhabitable cells are not passable (e.g. glacier)

    const distanceCost = distanceSquared(pack.cells.p[current], pack.cells.p[next]);
    const habitabilityModifier = 1 + Math.max(100 - habitability, 0) / 1000; // [1, 1.1];
    const heightModifier = 1 + Math.max(pack.cells.h[next] - 25, 25) / 25; // [1, 3];
    const connectionModifier = this.connections.has(`${current}-${next}`) ? 0.5 : 1;
    const burgModifier = hasPresence(next) ? 1 : 3;

    const pathCost = distanceCost * habitabilityModifier * heightModifier * connectionModifier * burgModifier;
    return pathCost;
  }

  getWaterPathCost(current: number, next: number) {
    const { h, r, p, t, g } = pack.cells;
    const connectionModifier = this.connections.has(`${current}-${next}`) ? 0.5 : 1;

    if (h[next] >= 20) {
      // land cell: only navigable via a river, and only along the actual river course
      if (!Rivers.isNavigable(next)) return Infinity;
      if (!this.riverEdges.get(current)?.has(next)) return Infinity;
      return distanceSquared(p[current], p[next]) * RIVER_TYPE_MODIFIER * connectionModifier;
    }

    // leaving a land cell into water
    if (h[current] >= 20) {
      if (r[current]) {
        // river-land cell: must follow the river's recorded outlet
        if (!this.riverEdges.get(current)?.has(next)) return Infinity;
      } else {
        // coastal port cell: must leave through its haven, the water cell the burg was shifted
        // towards — otherwise the rendered route cuts across the land to reach the burg
        const haven = pack.cells.haven?.[current];
        if (haven && haven !== next) return Infinity;
      }
    }
    if (grid.cells.temp[g[next]] < MIN_PASSABLE_SEA_TEMP) return Infinity;

    const distanceCost = distanceSquared(p[current], p[next]);
    const typeModifier = ROUTE_TYPE_MODIFIERS[t[next]] || ROUTE_TYPE_MODIFIERS.default;
    return distanceCost * typeModifier * connectionModifier;
  }

  /**
   * Tunnelling: a bore's rules are its own. Water is passable only within the coast-indenting bound
   * and is priced by its depth through the height term, so a shallow bay costs less than a deep one;
   * high ground is cheaper than lowland, so a range is crossed rather than skirted; surface corridors
   * are avoided, and the discount is drawn from the underground network alone. The burg attraction is
   * weaker here than in the land cost and plane-aware: only a burg the network can serve is a cheaper
   * cell, a surface-only one prices as plain. The pair's landmass is enforced by createUndergroundCost.
   * What the ground above the bore is like — its biome's habitability, the climate over its water — is
   * not read: those are statements about the surface, and the land cost is where they belong.
   */
  getUndergroundPathCost(current: number, next: number) {
    const { h, p, t } = pack.cells;

    if (h[next] < 20 && t[next] < -2) return Infinity; // the crossing bound: only water indenting the coast is diggable

    const distanceCost = distanceSquared(p[current], p[next]);
    const heightModifier = 1 + Math.max(50 - h[next], 0) / 50; // [1, 2]: boring under a mountain beats lowland, deeper water costs dearer
    const connectionModifier = this.undergroundConnections.has(`${current}-${next}`) ? 0.5 : 1;
    const burgId = pack.cells.burg[next];
    const burg = burgId ? pack.burgs[burgId] : undefined;
    const burgModifier = burg && !burg.removed && hasBelowLevelPresence(burg) ? 1 : UNDERGROUND_BURG_ATTRACTION;

    return distanceCost * heightModifier * connectionModifier * burgModifier * this.surfaceSeparation(next);
  }

  /**
   * The per-pair tunnel cost: the pair's landmass closed over, so a crossing may run under the bay
   * but never lands on a foreign shore. Water steps are bound-governed and feature-blind; the
   * pricing itself is getUndergroundPathCost.
   */
  createUndergroundCost(feature: number) {
    return (current: number, next: number) => {
      if (pack.cells.h[next] >= 20 && pack.cells.f[next] !== feature) return Infinity;
      return this.getUndergroundPathCost(current, next);
    };
  }

  /** A tunnel step pays for running on or beside a surface route; beyond the range it costs nothing extra */
  private surfaceSeparation(cell: number): number {
    const distances = this.surfaceDistances;
    if (!distances) return 1;

    const distance = distances[cell];
    return distance >= SURFACE_SEPARATION_RANGE ? 1 : 1 + SURFACE_SEPARATION / (1 + distance);
  }

  /** BFS distance from the surface routes, capped: the corridor a tunnel is asked to keep clear of */
  private buildSurfaceDistances(routes: Route[]): Uint8Array {
    const { c, i } = pack.cells;
    const distances = new Uint8Array(i.length).fill(SURFACE_SEPARATION_RANGE);
    const queue: number[] = [];

    const seed = (cell: number) => {
      if (distances[cell] === 0) return;
      distances[cell] = 0;
      queue.push(cell);
    };

    // surface routes only: the underground network never repels itself
    for (const route of routes) {
      if (route.underground) continue;
      for (const point of route.points) seed(point[2]);
    }

    for (let head = 0; head < queue.length; head++) {
      const cell = queue[head];
      if (distances[cell] >= SURFACE_SEPARATION_RANGE - 1) continue;
      for (const next of c[cell] ?? []) {
        if (distances[next] > distances[cell] + 1) {
          distances[next] = distances[cell] + 1;
          queue.push(next);
        }
      }
    }

    return distances;
  }

  private createCostEvaluator({ isWater }: { isWater: boolean }) {
    return isWater ? this.getWaterPathCost.bind(this) : this.getLandPathCost.bind(this);
  }

  /**
   * Splits a path into the stretches that are not already covered, so no step is ever drawn twice. A
   * stretch boundary may only fall on a cell with no burg or with a burg of its own plane: where it
   * would fall on a mismatched one, it steps further into the already-covered stretch, which
   * duplicates that step instead of dropping a cell of the path.
   */
  private getSegments(pathCells: number[], plane: Plane, isCovered: (from: number, to: number) => boolean) {
    const segments: number[][] = [];
    let segment: number[] = [];
    let seededFromCovered = false; // the segment's first cell was taken over from the covered stretch
    let endResolved = false; // the previous segment already reached one cell past its covered edge

    /** Walk a boundary into the covered stretch until it lands on a legitimate cell */
    const resolve = (index: number, step: number, limit: number) => {
      while (index !== limit && !isLegitimateBoundary(pack, pathCells[index], plane)) {
        if (!isCovered(pathCells[index], pathCells[index + step])) break;
        index += step;
      }
      return index;
    };

    for (let i = 0; i < pathCells.length; i++) {
      if (!segment.length && !seededFromCovered && i > 0 && isCovered(pathCells[i - 1], pathCells[i])) {
        segment.push(pathCells[i - 1]);
      }

      const nextCellId = pathCells[i + 1];
      const isLastStep = nextCellId === undefined;

      if (isLastStep || isCovered(pathCells[i], nextCellId)) {
        const start = seededFromCovered || !segment.length ? 0 : resolve(i - segment.length, -1, 0);
        const end = isLastStep || endResolved ? i : resolve(i, 1, pathCells.length - 1);
        segments.push(pathCells.slice(start, end + 1));

        segment = [];
        seededFromCovered = isLastStep;
        endResolved = isLastStep;
        continue;
      }

      segment.push(pathCells[i]);
      seededFromCovered = false;
    }

    return segments.filter(cells => cells.length > 1);
  }

  /** Stretches of an underground path that are not already part of the underground network */
  private getUndergroundSegments(pathCells: number[], edges: Set<string>): number[][] {
    return this.getSegments(pathCells, "underground", (from, to) => edges.has(`${from}-${to}`));
  }

  private getRouteSegments(pathCells: number[]) {
    return this.getSegments(
      pathCells,
      "surface",
      (from, to) => this.connections.has(`${from}-${to}`) || this.connections.has(`${to}-${from}`)
    );
  }

  /** A water route may only reach its destination cell from a legitimate approach */
  private createWaterExitCheck(exit: number) {
    return (next: number, current?: number) => {
      if (next !== exit) return false;
      if (current === undefined) return true;
      // river port: approach along the river course
      if (this.riverEdges.get(current)?.has(next)) return true;
      // coastal port: approach only over water, through the haven the burg was shifted towards
      if (pack.cells.h[current] >= 20) return false;
      const haven = pack.cells.haven?.[exit];
      return !haven || current === haven;
    };
  }

  private findPathSegments({ isWater, start, exit }: { isWater: boolean; start: number; exit: number }) {
    const getCost = this.createCostEvaluator({ isWater });
    const isExit = isWater ? this.createWaterExitCheck(exit) : (next: number) => next === exit;
    const pathCells = findPath(start, isExit, getCost, pack);
    if (!pathCells) return [];
    const segments = this.getRouteSegments(pathCells);
    if (!isWater) this.rememberSurfaceSteps(segments);
    return segments;
  }

  /** Every land step the surface pass drew, so a boundary resolution can be told from a dropped cell */
  private rememberSurfaceSteps(segments: number[][]) {
    for (const segment of segments) {
      for (let i = 0; i < segment.length - 1; i++) this.surfaceSteps.push([segment[i], segment[i + 1]]);
    }
  }

  /**
   * Cell chain of a sea route between two cells, or null if they are not connected by water.
   * Follows the same rules as generated searoutes: ports are left and entered through their
   * haven, navigable rivers are passable, colder seas are not, and existing routes are cheap.
   */
  findWaterPath(start: number, exit: number): number[] | null {
    return findPath(start, this.createWaterExitCheck(exit), this.getWaterPathCost.bind(this), pack);
  }

  /** Sea route geometry for a cell chain: burg positions at ports, meandering along river runs */
  getWaterPoints(cells: number[]): [number, number, number][] {
    // only the chain's own cells are read, so this skips preparePointsArray's whole-map allocation
    return this.addMeandering(
      cells,
      cells.map(cellId => this.getCellAnchor(cellId, this.presenceIn("surface")))
    );
  }

  private generateMainRoads() {
    TIME && console.time("generateMainRoads");
    const { capitalsByFeature } = this.sortBurgsByFeature(pack.burgs);
    const mainRoads: Route[] = [];

    for (const [key, featureCapitals] of Object.entries(capitalsByFeature)) {
      const points = featureCapitals.map(burg => [burg.x, burg.y] as Point);
      const urquhartEdges = this.calculateUrquhartEdges(points);
      urquhartEdges.forEach(([fromId, toId]) => {
        const start = featureCapitals[fromId].cell;
        const exit = featureCapitals[toId].cell;

        const segments = this.findPathSegments({ isWater: false, start, exit });
        for (const segment of segments) {
          this.addConnections(segment);
          mainRoads.push({ feature: Number(key), cells: segment } as Route);
        }
      });
    }

    TIME && console.timeEnd("generateMainRoads");
    return mainRoads;
  }

  private addConnections(segment: number[]) {
    for (let i = 0; i < segment.length; i++) {
      const cellId = segment[i];
      const nextCellId = segment[i + 1];
      if (nextCellId) {
        this.connections.set(`${cellId}-${nextCellId}`, true);
        this.connections.set(`${nextCellId}-${cellId}`, true);
      }
    }
  }

  /** both directions of every step of a cell chain, in the given edge set */
  private rememberEdges(edges: Set<string>, cells: number[]) {
    for (let i = 0; i < cells.length - 1; i++) {
      edges.add(`${cells[i]}-${cells[i + 1]}`);
      edges.add(`${cells[i + 1]}-${cells[i]}`);
    }
  }

  private generateTrails() {
    TIME && console.time("generateTrails");
    const { burgsByFeature } = this.sortBurgsByFeature(pack.burgs);
    const trails: Route[] = [];

    for (const [key, featureBurgs] of Object.entries(burgsByFeature)) {
      const points = featureBurgs.map(burg => [burg.x, burg.y] as Point);
      const urquhartEdges = this.calculateUrquhartEdges(points);
      urquhartEdges.forEach(([fromId, toId]) => {
        const start = featureBurgs[fromId].cell;
        const exit = featureBurgs[toId].cell;

        const segments = this.findPathSegments({ isWater: false, start, exit });
        for (const segment of segments) {
          this.addConnections(segment);
          trails.push({ feature: Number(key), cells: segment } as Route);
        }
      });
    }

    TIME && console.timeEnd("generateTrails");
    return trails;
  }

  private generateSeaRoutes() {
    TIME && console.time("generateSeaRoutes");
    const { portsByFeature } = this.sortBurgsByFeature(pack.burgs);
    const seaRoutes: Route[] = [];

    for (const [featureId, featurePorts] of Object.entries(portsByFeature)) {
      const points = featurePorts.map(burg => [burg.x, burg.y] as Point);
      const urquhartEdges = this.calculateUrquhartEdges(points);

      urquhartEdges.forEach(([fromId, toId]) => {
        const start = featurePorts[fromId].cell;
        const exit = featurePorts[toId].cell;
        const segments = this.findPathSegments({ isWater: true, start, exit });
        for (const segment of segments) {
          this.addConnections(segment);
          seaRoutes.push({ feature: Number(featureId), cells: segment } as Route);
        }
      });
    }

    TIME && console.timeEnd("generateSeaRoutes");
    return seaRoutes;
  }

  /**
   * The underground network: the pairs the three-layer policy admits, drawn with the same pathfinding
   * the surface routes use. It runs after them, so it can only add: the surface network never sees it,
   * and every highway keeps the `roads` group.
   */
  private generateUndergroundHighways(routes: Route[]): void {
    TIME && console.time("generateUndergroundHighways");
    const highways: Route[] = [];

    // built before any tunnel exists, so a tunnel never seeds the corridor it is routed against
    this.surfaceDistances = this.buildSurfaceDistances(routes);

    // de-duplication set, local on purpose: a surface route does not stand in for a tunnel, so only
    // the underground network merges with itself
    const undergroundEdges = new Set<string>();
    for (const route of routes) {
      if (!route.underground) continue;
      this.rememberEdges(
        undergroundEdges,
        route.points.map(point => point[2])
      );
    }

    // the surface records are read before the tunnels are drawn, so the shortcut layer measures the
    // overland network the player would travel, not one a tunnel has already shortened
    const pairs = selectUndergroundPairs(pack.burgs, createSurfacePathMeasure(routes, pack));
    for (const { start, end, feature } of pairs) {
      const pathCells = findPath(start, next => next === end, this.createUndergroundCost(feature), pack);
      if (!pathCells) continue;

      for (const segment of this.getUndergroundSegments(pathCells, undergroundEdges)) {
        this.rememberEdges(undergroundEdges, segment);
        this.rememberEdges(this.undergroundConnections, segment);
        highways.push({ feature, cells: segment } as Route);
      }
    }

    const hasPresence = this.presenceIn("underground");
    const pointsArray = this.preparePointsArray(hasPresence);
    for (const { feature, cells, merged } of this.mergeRoutes(highways)) {
      if (merged) continue;
      const points = this.getPoints("roads", cells!, pointsArray, hasPresence);
      const name = this.generateName({ group: "roads", points, underground: true });
      routes.push({ i: routes.length, group: "roads", name, feature, points, underground: true });
    }

    TIME && console.timeEnd("generateUndergroundHighways");
  }

  /**
   * Drops underground highways that no longer end at a burg with below-level presence, so one never
   * outlives its endpoint. A path that joins the existing network ends at the junction cell rather
   * than at a burg; it only stays while a surviving highway still runs through it, so removing one
   * highway re-evaluates the spurs that hung on it. Pass the cells of burgs that were just removed
   * to prune without consulting the burg set, which a partially rebuilt map cannot answer.
   */
  pruneUndergroundHighways(removedCells?: Iterable<number>): number {
    const removed = removedCells ? new Set(removedCells) : undefined;
    const stale = new Set<Route>();

    /** Whether one end of a record is a legitimate end: a below-level burg, or a junction */
    const isTerminal = (route: Route, cellId: number | undefined, coverage: Map<number, number>): boolean => {
      if (cellId === undefined || removed?.has(cellId)) return false;

      const burgId = pack.cells.burg[cellId];
      const burg = burgId ? pack.burgs[burgId] : undefined;
      if (burg) return !burg.removed && hasBelowLevelPresence(burg);

      // a junction is a cell another surviving highway runs through, so this record's own cells
      // cannot be what makes it one
      return (coverage.get(cellId) ?? 0) - route.points.filter(point => point[2] === cellId).length > 0;
    };

    const collectStale = (): Route[] => {
      const kept = pack.routes.filter(route => route.underground && !stale.has(route));
      const coverage = new Map<number, number>(); // cell -> highways of the surviving network through it
      for (const route of kept) {
        for (const point of route.points) coverage.set(point[2], (coverage.get(point[2]) ?? 0) + 1);
      }

      return kept.filter(
        route =>
          !isTerminal(route, route.points[0]?.[2], coverage) && !isTerminal(route, route.points.at(-1)?.[2], coverage)
      );
    };

    let found = collectStale();
    while (found.length > 0) {
      for (const route of found) stale.add(route);
      found = collectStale();
    }

    for (const route of stale) this.remove(route);
    return stale.size;
  }

  /**
   * The service guarantee: a fully subterranean burg that shares its landmass with another below-level
   * burg ends the generation on the underground network. Pruning and merging cannot promise that on
   * their own, so a burg left out is pathed to the nearest connected peer and the stretch is appended.
   * A dual-identity burg already reaches the surface network, so it is never owed a repair, and a burg
   * alone on its landmass has no peer, is left unconnected, and gets nothing else.
   */
  repairUndergroundHighways(): number {
    const { burgs } = pack;
    const served = new Set<number>();
    for (const route of pack.routes) {
      if (!route.underground) continue;
      for (const point of route.points) served.add(point[2]);
    }

    const belowLevel = burgs.filter((burg): burg is Burg & { feature: number } =>
      Boolean(burg?.i && !burg.removed && hasBelowLevelPresence(burg) && burg.feature !== undefined)
    );
    const peers = new Map<number, Burg[]>();
    for (const burg of belowLevel) {
      const list = peers.get(burg.feature);
      if (list) list.push(burg);
      else peers.set(burg.feature, [burg]);
    }

    const orphans = belowLevel.filter(
      burg => isDeepBurg(burg) && !served.has(burg.cell) && (peers.get(burg.feature)?.length ?? 0) > 1
    );
    if (!orphans.length) return 0;

    const hasPresence = this.presenceIn("underground");
    const pointsArray = this.preparePointsArray(hasPresence);
    let repairs = 0;

    for (const burg of orphans) {
      const targets = new Set(
        peers
          .get(burg.feature)!
          .filter(peer => peer !== burg && served.has(peer.cell))
          .map(peer => peer.cell)
      );
      if (!targets.size) continue;

      const pathCells = findPath(
        burg.cell,
        cellId => targets.has(cellId),
        this.createUndergroundCost(burg.feature),
        pack
      );
      if (!pathCells || pathCells.length < 2) continue;

      const points = this.getPoints("roads", pathCells, pointsArray, hasPresence);
      const name = this.generateName({ group: "roads", points, underground: true });
      pack.routes.push({
        i: pack.routes.length,
        group: "roads",
        name,
        feature: burg.feature,
        points,
        underground: true,
        repaired: true
      });
      this.rememberEdges(this.undergroundConnections, pathCells);
      for (const cell of pathCells) served.add(cell);
      repairs++;
    }

    return repairs;
  }

  /** The pass's plane as a cell predicate: whether the cell carries a burg the pass can anchor at */
  private presenceIn(plane: Plane): (cellId: number) => boolean {
    const burgOf = planePresence[plane];
    return (cellId: number) => {
      const burgId = pack.cells.burg[cellId];
      if (!burgId) return false;
      const burg = pack.burgs[burgId];
      return Boolean(burg && !burg.removed && burgOf(burg));
    };
  }

  private preparePointsArray(hasPresence: (cellId: number) => boolean): Point[] {
    return pack.cells.p.map((_point, cellId) => this.getCellAnchor(cellId, hasPresence));
  }

  /** The point a route passes through in a cell: the burg's position only for a burg of the pass's plane, the cell centre otherwise */
  private getCellAnchor(cellId: number, hasPresence: (cellId: number) => boolean): Point {
    const burg = hasPresence(cellId) ? pack.burgs[pack.cells.burg[cellId]] : undefined;
    if (burg) return [burg.x, burg.y];
    const [x, y] = pack.cells.p[cellId];
    return [x, y];
  }

  // Group consecutive route cells that follow a single river in one direction into maximal runs.
  // A run ends at a confluence (riverId change) or when the route leaves the river course; the
  // confluence cell is shared as the last cell of one run and the first of the next.
  private findRiverRuns(cells: number[]): RiverRun[] {
    const runs: RiverRun[] = [];

    let k = 0;
    while (k < cells.length - 1) {
      const edge = this.riverEdges.get(cells[k])?.get(cells[k + 1]);
      const reverseEdge = edge ? this.riverEdges.get(cells[k + 1])?.get(cells[k]) : undefined;
      if (!edge || !reverseEdge) {
        k++;
        continue;
      }

      const direction: 1 | -1 = reverseEdge.fromIndex === edge.fromIndex + 1 ? 1 : -1;
      const { riverId } = edge;
      let endIdx = k + 1;
      let prevToIndex = reverseEdge.fromIndex;

      // Extend the run while each step stays on the same river, contiguous and same-direction.
      while (endIdx + 1 < cells.length) {
        const ahead = this.riverEdges.get(cells[endIdx])?.get(cells[endIdx + 1]);
        if (!ahead || ahead.riverId !== riverId || ahead.fromIndex !== prevToIndex) break;
        const aheadReverse = this.riverEdges.get(cells[endIdx + 1])?.get(cells[endIdx]);
        if (!aheadReverse || aheadReverse.fromIndex - ahead.fromIndex !== direction) break;
        prevToIndex = aheadReverse.fromIndex;
        endIdx++;
      }

      const firstCanonicalIndexInRiver = direction === 1 ? edge.fromIndex : prevToIndex;
      runs.push({ startIdx: k, endIdx, riverId, direction, firstCanonicalIndexInRiver });
      k = endIdx;
    }

    return runs;
  }

  private getRiverGeometry(river: River): { points: Point[]; anchorIndices: number[] } {
    const cached = this.riverGeometryCache.get(river.i);
    if (cached) return cached;

    const { h, p } = pack.cells;
    const geometry = meander(river.cells, p, {
      anchors: river.points ?? undefined,
      meandering: 0.5,
      startStep: h[river.cells[0]] < 20 ? 1 : 10,
      isWaterCell: river.cells.map(c => c !== -1 && h[c] < 20),
      bounds: { width: options.map.graph.width, height: options.map.graph.height }
    });

    this.riverGeometryCache.set(river.i, geometry);
    return geometry;
  }

  private emitRiverRun(run: RiverRun, cells: number[], result: [number, number, number][]): void {
    const runCells = cells.slice(run.startIdx, run.endIdx + 1);
    const river = this.riversById.get(run.riverId);
    if (!river) return;

    const { points, anchorIndices } = this.getRiverGeometry(river);

    const lo = run.firstCanonicalIndexInRiver;
    const hi = lo + runCells.length - 1;
    const startPoint = anchorIndices[lo];
    const endPoint = anchorIndices[hi];
    let slicePoints: Point[] = points.slice(startPoint, endPoint + 1).map(point => [point[0], point[1]]);
    let sliceAnchorIndices = anchorIndices.slice(lo, hi + 1).map(idx => idx - startPoint);

    // Reverse for upstream routes so the output runs in route order.
    if (run.direction === -1) {
      const total = slicePoints.length;
      slicePoints = slicePoints.slice().reverse();
      sliceAnchorIndices = sliceAnchorIndices
        .slice()
        .reverse()
        .map(idx => total - 1 - idx);
    }

    let nextAnchorPtr = 0;
    let currentCellId = runCells[0];
    const skipFirst = result.length > 0 && result[result.length - 1][2] === runCells[0];
    for (let pk = 0; pk < slicePoints.length; pk++) {
      if (nextAnchorPtr < sliceAnchorIndices.length && sliceAnchorIndices[nextAnchorPtr] === pk) {
        currentCellId = runCells[nextAnchorPtr];
        nextAnchorPtr++;
      }
      if (pk === 0 && skipFirst) continue;
      result.push([slicePoints[pk][0], slicePoints[pk][1], currentCellId]);
    }
  }

  addMeandering(cells: number[], anchors: Point[]): [number, number, number][] {
    const runs = this.findRiverRuns(cells);
    const result: [number, number, number][] = [];
    let runPtr = 0;
    let i = 0;

    while (i < cells.length) {
      if (runPtr < runs.length && runs[runPtr].startIdx === i) {
        const run = runs[runPtr++];
        this.emitRiverRun(run, cells, result);
        i = run.endIdx; // the run's last cell may start the next run (confluence)
      } else {
        const alreadyEmitted = result.length > 0 && result[result.length - 1][2] === cells[i];
        if (!alreadyEmitted) result.push([anchors[i][0], anchors[i][1], cells[i]]);
        i++;
      }
    }

    return result;
  }

  /**
   * Route geometry for a cell chain of one pass. Every read is plane-governed: burgs of the pass's
   * own plane anchor the chain at their position, other planes' burgs price and smooth as plain cells.
   */
  private getPoints(group: string, cells: number[], points: Point[], hasPresence: (cellId: number) => boolean) {
    if (group === "searoutes") {
      const anchors = cells.map(cellId => points[cellId]);
      return this.addMeandering(cells, anchors);
    }

    // resolve sharp angles; a burg of the pass's own plane stays anchored, a foreign one is smoothable
    const data = cells.map(cellId => [...points[cellId], cellId]);
    for (let i = 1; i < cells.length - 1; i++) {
      const cellId = cells[i];
      if (hasPresence(cellId)) continue;

      const [prevX, prevY] = data[i - 1];
      const [currX, currY] = data[i];
      const [nextX, nextY] = data[i + 1];

      const dAx = prevX - currX;
      const dAy = prevY - currY;
      const dBx = nextX - currX;
      const dBy = nextY - currY;
      const angle = Math.abs((Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy) * 180) / Math.PI);

      if (angle < ROUTES_SHARP_ANGLE) {
        const middleX = (prevX + nextX) / 2;
        const middleY = (prevY + nextY) / 2;
        let newX: number, newY: number;

        if (angle < ROUTES_VERY_SHARP_ANGLE) {
          newX = rn((currX + middleX * 2) / 3, 2);
          newY = rn((currY + middleY * 2) / 3, 2);
        } else {
          newX = rn((currX + middleX) / 2, 2);
          newY = rn((currY + middleY) / 2, 2);
        }

        if (Pack.findCell(newX, newY) === cellId) {
          data[i] = [newX, newY, cellId];
          points[cellId] = [data[i][0], data[i][1]]; // change cell coordinate for all routes
        }
      }
    }

    return data; // [[x, y, cell], [x, y, cell]];
  }

  // merge routes so that the last cell of one route is the first cell of the next route
  private mergeRoutes(routes: Route[]): Route[] {
    let routesMerged = 0;

    for (let i = 0; i < routes.length; i++) {
      const thisRoute = routes[i];
      if (thisRoute.merged) continue;

      for (let j = i + 1; j < routes.length; j++) {
        const nextRoute = routes[j];
        if (nextRoute.merged) continue;

        if (nextRoute.cells!.at(0) === thisRoute.cells!.at(-1)) {
          routesMerged++;
          thisRoute.cells = thisRoute.cells!.concat(nextRoute.cells!.slice(1));
          nextRoute.merged = true;
        }
      }
    }

    return routesMerged > 1 ? this.mergeRoutes(routes) : routes;
  }

  private createRoutesData(routes: Route[]) {
    const seaRoutes = this.generateSeaRoutes();
    const mainRoads = this.generateMainRoads();
    const trails = this.generateTrails();
    const hasPresence = this.presenceIn("surface");
    const pointsArray = this.preparePointsArray(hasPresence);

    for (const { feature, cells, merged } of this.mergeRoutes(mainRoads)) {
      if (merged) continue;
      const points = this.getPoints("roads", cells!, pointsArray, hasPresence);
      const name = this.generateName({ group: "roads", points });
      routes.push({ i: routes.length, group: "roads", name, feature, points });
    }

    for (const { feature, cells, merged } of this.mergeRoutes(trails)) {
      if (merged) continue;
      const points = this.getPoints("trails", cells!, pointsArray, hasPresence);
      const name = this.generateName({ group: "trails", points });
      routes.push({ i: routes.length, group: "trails", name, feature, points });
    }

    for (const { feature, cells, merged } of this.mergeRoutes(seaRoutes)) {
      if (merged) continue;
      const points = this.getPoints("searoutes", cells!, pointsArray, hasPresence);
      const name = this.generateName({ group: "searoutes", points });
      routes.push({ i: routes.length, group: "searoutes", name, feature, points });
    }

    return routes;
  }

  // direction-aware river graph derived from pack.rivers
  private buildRiverEdges() {
    this.riverEdges = new Map();
    this.riversById = new Map();
    this.riverGeometryCache = new Map();
    for (const river of pack.rivers) {
      this.riversById.set(river.i, river);
      if (!river.cells || river.cells.length < 2) continue;
      for (let i = 0; i < river.cells.length - 1; i++) {
        const a = river.cells[i];
        const b = river.cells[i + 1];
        if (a < 0 || b < 0) continue;
        if (!this.riverEdges.has(a)) this.riverEdges.set(a, new Map());
        if (!this.riverEdges.has(b)) this.riverEdges.set(b, new Map());
        this.riverEdges.get(a)!.set(b, { riverId: river.i, fromIndex: i });
        this.riverEdges.get(b)!.set(a, { riverId: river.i, fromIndex: i + 1 });
      }
    }
  }

  /** custom route groups (old maps, the route groups editor) can miss a style entry - without
   * one the style editor's edits are DOM-only and presets drop the group */
  ensureRouteGroupStyles(): void {
    const { groups } = styles.routes;
    const template = groups.roads || Object.values(groups)[0];
    if (!template) return;
    // presets are also applied on initial page load, before any map (and its routes) exists
    for (const group of new Set((pack.routes ?? []).map(route => route.group))) {
      if (!groups[group]) groups[group] = structuredClone(template);
    }
  }

  buildLinks(routes: Route[]): Record<number, Record<number, number>> {
    const links: Record<number, Record<number, number>> = {};

    for (const { points, i: routeId } of routes) {
      const cells = points.map(p => p[2]);

      for (let i = 0; i < cells.length - 1; i++) {
        const cellId = cells[i];
        const nextCellId = cells[i + 1];

        if (cellId !== nextCellId) {
          if (!links[cellId]) links[cellId] = {};
          links[cellId][nextCellId] = routeId;

          if (!links[nextCellId]) links[nextCellId] = {};
          links[nextCellId][cellId] = routeId;
        }
      }
    }

    return links;
  }

  // utility functions
  isConnected(cellId: number): boolean {
    const routes = pack.cells.routes;
    return routes[cellId] && Object.keys(routes[cellId]).length > 0;
  }

  getNextId() {
    return pack.routes.length ? Math.max(...pack.routes.map(r => r.i)) + 1 : 0;
  }

  // connect cell with routes system by land
  connect(cellId: number): Route | undefined {
    const getCost = this.createCostEvaluator({ isWater: false });
    const isExit = (c: number) => isLand(c, pack) && this.isConnected(c);
    const pathCells = findPath(cellId, isExit, getCost, pack);
    if (!pathCells) return;

    const hasPresence = this.presenceIn("surface");
    const pointsArray = this.preparePointsArray(hasPresence);
    const points = this.getPoints("trails", pathCells, pointsArray, hasPresence);
    const feature = pack.cells.f[cellId];
    const routeId = this.getNextId();
    const newRoute = { i: routeId, group: "trails", feature, points };
    pack.routes.push(newRoute as Route);

    const addConnection = (from: number, to: number, routeId: number) => {
      const routes = pack.cells.routes;

      if (!routes[from]) routes[from] = {};
      routes[from][to] = routeId;

      if (!routes[to]) routes[to] = {};
      routes[to][from] = routeId;
    };

    for (let i = 0; i < pathCells.length; i++) {
      const currentCell = pathCells[i];
      const nextCellId = pathCells[i + 1];
      if (nextCellId) addConnection(currentCell, nextCellId, routeId);
    }

    return newRoute as Route;
  }

  areConnected(from: number, to: number): boolean {
    const routeId = pack.cells.routes[from]?.[to];
    return routeId !== undefined;
  }

  getRoute(from: number, to: number) {
    const routeId = pack.cells.routes[from]?.[to];
    if (routeId === undefined) return null;

    const route = pack.routes.find(route => route.i === routeId);
    if (!route) return null;

    return route;
  }

  hasRoad(cellId: number): boolean {
    const connections = pack.cells.routes[cellId];
    if (!connections) return false;

    return Object.values(connections).some(routeId => {
      const route = pack.routes.find(route => route.i === routeId);
      if (!route) return false;
      return route.group === "roads";
    });
  }

  isCrossroad(cellId: number): boolean {
    const connections = pack.cells.routes[cellId];
    if (!connections) return false;
    if (Object.keys(connections).length > 3) return true;
    const roadConnections = Object.values(connections).filter(routeId => {
      const route = pack.routes.find(route => route.i === routeId);
      return route?.group === "roads";
    });
    return roadConnections.length > 2;
  }

  remove(route: Route) {
    const routes = pack.cells.routes;

    // a fresh generation prunes before the links are built, so there may be no index to clean
    if (routes) {
      for (const point of route.points) {
        const from = point[2];
        if (!routes[from]) continue;

        for (const [to, routeId] of Object.entries(routes[from])) {
          if (routeId === route.i) {
            const toCell = parseInt(to, 10);
            delete routes[from][toCell];
            if (routes[toCell]) delete routes[toCell][from];
          }
        }
      }
    }

    pack.routes = pack.routes.filter(r => r.i !== route.i);
  }

  getConnectivityRate(cellId: number): number {
    const connections = pack.cells.routes[cellId];
    if (!connections) return 0;

    const connectivityRateMap: Record<string, number> = {
      roads: 0.2,
      trails: 0.1,
      searoutes: 0.2,
      default: 0.1
    };

    const connectivity = Object.values(connections).reduce((acc, routeId) => {
      const route = pack.routes.find(route => route.i === routeId);
      if (!route) return acc;
      const rate = connectivityRateMap[route.group] || connectivityRateMap.default;
      return acc + rate;
    }, 0.8);

    return connectivity;
  }

  /**
   * A route name derives only from burgs the record's plane can see: the anchor scan skips any cell
   * whose burg lacks presence in the record's plane, exactly as if the cell had no burg.
   */
  generateName({
    group,
    points,
    underground = false
  }: {
    group: string;
    points: number[][];
    underground?: boolean;
  }): string | undefined {
    if (points.length < 4) return undefined;
    const hasPresence = this.presenceIn(underground ? "underground" : "surface");

    function getBurgName() {
      const priority = [points.at(-1), points.at(0), points.slice(1, -1).reverse()];
      for (const [_x, _y, cellId] of priority as [number, number, number][]) {
        if (!hasPresence(cellId)) continue;
        const burgId = pack.cells.burg[cellId];
        if (burgId) return getAdjective(pack.burgs[burgId].name!);
      }
      return null;
    }

    const model = rw(models[group] || models.roads);
    const suffix = rw(suffixes[group] || suffixes.roads);

    const burgName = getBurgName();
    if (burgName) {
      if (model === "burg_suffix") return `${burgName} ${suffix}`;
      if (model === "the_descriptor_burg_suffix") return `The ${ra(descriptors)} ${burgName} ${suffix}`;
    }
    if (model === "the_descriptor_prefix_suffix") return `The ${ra(descriptors)} ${ra(prefixes)} ${suffix}`;
    return `${ra(prefixes)} ${suffix}`; // no burg on the route, fall back to the burg-free model
  }

  private ROUTE_CURVES: Record<string, any> = {
    roads: curveCatmullRom.alpha(0.1),
    trails: curveCatmullRom.alpha(0.1),
    searoutes: curveCatmullRom.alpha(0.5),
    default: curveCatmullRom.alpha(0.1)
  };

  getPath({ group, points }: { group: string; points: number[][] }): string {
    const lineGen = line();
    const curve = this.ROUTE_CURVES[group] || this.ROUTE_CURVES.default;
    lineGen.curve(curve);
    const path = round(lineGen(points.map(p => [p[0], p[1]]))!, 1);
    return path;
  }

  getLength(routeId: number): number {
    const route = pack.routes.find(route => route.i === routeId);
    if (!route) return 0;

    // measured off-DOM: the rendered layer only holds the routes currently in the viewport
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", this.getPath(route));
    return path.getTotalLength();
  }

  // run on map load to restore connections based on routes data
  sync() {
    this.connections = new Map();
    this.buildRiverEdges();
    for (const route of pack.routes) {
      for (let i = 0; i < route.points.length - 1; i++) {
        const cellId = route.points[i][2];
        const nextCellId = route.points[i + 1][2];
        this.connections.set(`${cellId}-${nextCellId}`, true);
        this.connections.set(`${nextCellId}-${cellId}`, true);
      }
    }
  }
}

declare global {
  var Routes: RoutesModule;
}

window.Routes = new RoutesModule();
