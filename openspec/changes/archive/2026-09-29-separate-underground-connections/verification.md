# Verification: separate-underground-connections

Task 3.3's deliverable: the measured effect of removing the tunnel road bias, recorded as the
baseline the follow-up endpoint/geometry work is judged against. Recorded 2026-09-29. The
"before" numbers come from the clean tree at commit `00ae0ff1` (the change's planning commit);
the "after" numbers from the working tree implementing tasks 1.1–2.3.

## Checks run

| Check | Result |
|---|---|
| `npx vitest run generators services/io` | 32 files, 380 tests, all passing (pre-change baseline on the same command: 32 files, 375 tests — the 5 new are this change's tests) |
| `npx tsc` | clean |
| `npx biome check src/generators/routes-generator.ts src/generators/underground-highways.test.ts` | clean |
| Discriminating power | "prices a tunnel step the same whether or not a surface route covers it" and "leaves the land and water costs unaware of the underground network" fail against the pre-change generator and pass after it; the two network-side assertions pass on both and were mutation-checked instead — dropping the locked-route seed fails the discount assertion, dropping the segment recording fails the "records a generated segment" assertion |

## Scenario coverage

| # | Scenario | How checked |
|---|----------|-------------|
| 1 | A surface route does not make a tunnel cheaper | `underground-highways.test.ts` → "prices a tunnel step the same whether or not a surface route covers it" (asserts the shared map really covers the step, then asserts the price is unchanged) |
| 2 | Surface routes are not made cheaper by underground highways | `underground-highways.test.ts` → "generates the surface network as if the plane were off" (surface routes byte-identical with the option on and off); "leaves the land and water costs unaware of the underground network" (a step the highway covers prices the same land/water cost with the plane on and off); "leaves the surface routes byte-identical when the option is off"; ordering: the underground pass runs after `createRoutesData` and nothing before it reads the underground network |
| 3 | An underground highway is cheaper alongside the underground network | `underground-highways.test.ts` → "discounts a tunnel step that is part of the underground network" (pinned highway seeds the set) and "records a generated segment in the underground network, not the shared map" (a generated step prices at half) |
| 4 | The underground network still merges with itself | `underground-highways.test.ts` → "merges a tunnel into the pinned network instead of duplicating its stretch" (no step of the network appears in two routes, and the generated route joins the pinned one at its junction cell) |
| 5 | Traversal is unchanged | `underground-highways.test.ts` → "wires the highways into the shared cell network, where a land journey may follow them", "leaves a water-domain journey governed by the existing land and water rules", "makes a fully subterranean burg a reachable destination", "is not branched on by the traversal code"; plus the water-cost census under "One caveat" below |

## Measurement: what removing the bias changed

### Method

The full generation pipeline is run headlessly on three seeds (`measure-a/b/c`) with the
`continents` template and `options.generation.underground = true`. Per map:

- **Overlap**: `|underground cells ∩ surface cells| / |underground cells|`, cells taken from
  `pack.routes` points (`underground` flag vs not).
- **Mean pair distance**: Dijkstra over the generated cell network `pack.cells.routes` (edge
  weight = distance between cell centres), averaged over every pair of burgs with below-level
  presence that is reachable at all; unreachable pairs are counted separately and excluded from
  the mean.
- **Network size**: underground route count, distinct underground cells, total underground length.

Run under `vitest.browser.config.ts` (the generation pipeline needs a real DOM/canvas). This
sandbox needs `CHROMIUM_PATH=/usr/bin/chromium`: Playwright's bundled chromium crashes on launch
here, the system one works.

### Results

| seed | below-level burgs | underground routes | underground cells | shared with surface | overlap share | underground length (total / mean) | mean pair distance | unreachable pairs |
|------|------|------|------|------|------|------|------|------|
| measure-a before | 88 | 45 | 487 | 439 | 90.1% | 4480 / 100 | 547 | 87 |
| measure-a after | 88 | 41 | 432 | 312 | **72.2%** | 3868 / 94 | 544 | 87 |
| measure-b before | 80 | 34 | 342 | 301 | 88.0% | 3042 / 89 | 551 | 79 |
| measure-b after | 80 | 36 | 363 | 262 | **72.2%** | 3333 / 93 | 541 | 234 |
| measure-c before | 82 | 39 | 457 | 412 | 90.2% | 4365 / 112 | 487 | 240 |
| measure-c after | 82 | 45 | 473 | 336 | **71.0%** | 4383 / 97 | 470 | 81 |
| **mean, before** | 83.3 | 39.3 | 428.7 | 384.0 | **89.4%** | — | **528.3** | 406 total |
| **mean, after** | 83.3 | 40.7 | 422.7 | 303.3 | **71.8%** | — | **518.3** | 402 total |

Below-level burg counts are identical before and after, which confirms the change touches route
generation only and not the classification that picks the endpoints.

### Reading the numbers

- **The bias is gone, and the overlap fell with it: 89.4% → 71.8%** (−17.6 points, consistent
  across all three seeds). A tunnel is no longer rewarded for following a road, so about a fifth
  of the shared cells stopped being shared.
- **Mean pair distance improved slightly: 528.3 → 518.3** (−1.9%). The underground network still
  serves the same burgs; removing the road-following detours shortened it per map.
- **Reachability is a wash: 406 → 402 unreachable pairs**, but per map it moves both ways
  (measure-b 79 → 234, measure-c 240 → 81). This is network geometry changing, not a systematic
  loss; with 80–88 endpoints per map the metric is noisy and should not be read per seed.
- **The residual 71.8% is the expected known limitation, not a failure.** The distance-squared
  term still dominates both cost functions, and the Urquhart topology draws tunnels between the
  same neighbouring burgs the surface network already connects, so the shortest path between two
  neighbours largely coincides with the road between them whatever the discount.

### One caveat the requirement's traversal half needs

Land journeys, marker placement and connectivity read `pack.cells.routes`, which is rebuilt from
`pack.routes` and is untouched; nothing branches on the underground record. The water-domain cost
(`getWaterPathCost` via `Routes.findWaterPath`, called by journeys after generation) is the one
reader of the shared `connections` map that still runs after the underground pass. Underground
highways are land routes, so they cannot be water-path steps — except where a tunnel step happens
to lie on a navigable river course. The census found 3, 0 and 7 such steps per map (of roughly
360–470 underground cells) that no surface route also covers: those steps lose a 0.5 discount
they used to receive, which can only re-price a water path, never disconnect one. Land
traversal — the only domain that traverses an underground highway — is unaffected by
construction.

`Routes.sync()` (map load) is deliberately unchanged: it restores the shared map from the saved
routes as before. The underground set is rebuilt on the next generation, and
`getUndergroundPathCost` is only ever called from the underground pass, which resets and re-seeds
it, so no stale-state path exists.

## What the follow-up work should be

**Endpoint selection first, tunnel geometry second.** The overlap numbers say the remaining
coincidence is a topology problem: the pass connects neighbouring burgs with the same Urquhart
edges the surface network uses, so the paths are near-identical regardless of cost shaping.
Selecting different endpoint pairs is the lever that changes which cells a tunnel occupies.
Geometry (curvature, depth) changes the drawing, not the occupied cells, and would barely move
this metric — worth doing for looks after the topology work.

## Reproducing the measurement

The harness was temporary and is not kept in `src/`. Save the file below as
`src/generators/underground-measure.dom.test.ts` (a `.dom.test.ts` so the node config ignores it,
and the browser config picks it up) and run:

```
CHROMIUM_PATH=/usr/bin/chromium npx vitest run --config vitest.browser.config.ts generators/underground-measure.dom.test.ts
```

For the "before" column, run the same file on a checkout of `00ae0ff1` (the primary metrics below
are unaffected by the census fields, which were added for the caveat above). To compare a
follow-up change, re-run it and diff against the table.

```ts
import { it } from "vitest";
import "@/components/options-model"; // installs the `options` global in browser mode
import { hasBelowLevelPresence } from "./burg-classification";
import "./index";
import { GenerationPipeline } from "./generation-pipeline";

type MeasuredRoute = { underground?: boolean; points: number[][] };

const SEEDS = ["measure-a", "measure-b", "measure-c"];

/** the app loads public/libs/flatqueue.js as a plain script; browser-mode tests do not */
class FlatQueue {
  private ids: number[] = [];
  private values: number[] = [];

  get length() {
    return this.ids.length;
  }

  push(id: number, value: number = id) {
    this.ids.push(id);
    this.values.push(value);
    let index = this.ids.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.values[parent] <= this.values[index]) break;
      this.swap(index, parent);
      index = parent;
    }
  }

  pop() {
    if (!this.ids.length) return undefined;
    const id = this.ids[0];
    const lastId = this.ids.pop() as number;
    const lastValue = this.values.pop() as number;
    if (this.ids.length) {
      this.ids[0] = lastId;
      this.values[0] = lastValue;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.values.length && this.values[left] < this.values[smallest]) smallest = left;
        if (right < this.values.length && this.values[right] < this.values[smallest]) smallest = right;
        if (smallest === index) break;
        this.swap(index, smallest);
        index = smallest;
      }
    }
    return id;
  }

  peekValue() {
    return this.values[0];
  }

  private swap(a: number, b: number) {
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
    [this.values[a], this.values[b]] = [this.values[b], this.values[a]];
  }
}

function routeLength(route: MeasuredRoute): number {
  let total = 0;
  for (let i = 0; i < route.points.length - 1; i++) {
    const [x1, y1] = route.points[i];
    const [x2, y2] = route.points[i + 1];
    total += Math.hypot(x2 - x1, y2 - y1);
  }
  return total;
}

function shortestPathLengths(from: number): Map<number, number> {
  const links = pack.cells.routes as unknown as Record<number, Record<number, number>>;
  const distances = new Map<number, number>([[from, 0]]);
  const settled = new Set<number>();
  const queue: Array<[number, number]> = [[0, from]]; // [distance, cell]

  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [distance, cell] = queue.shift()!;
    if (settled.has(cell)) continue;
    settled.add(cell);

    for (const next of Object.keys(links[cell] ?? {}).map(Number)) {
      if (settled.has(next)) continue;
      const [x1, y1] = pack.cells.p[cell];
      const [x2, y2] = pack.cells.p[next];
      const candidate = distance + Math.hypot(x2 - x1, y2 - y1);
      if (candidate < (distances.get(next) ?? Infinity)) {
        distances.set(next, candidate);
        queue.push([candidate, next]);
      }
    }
  }

  return distances;
}

function measure(seed: string) {
  const routes = pack.routes as unknown as MeasuredRoute[];
  const underground = routes.filter(route => route.underground);
  const surface = routes.filter(route => !route.underground);

  const cellsOf = (list: MeasuredRoute[]) => new Set(list.flatMap(route => route.points.map(point => point[2])));
  const undergroundCells = cellsOf(underground);
  const surfaceCells = cellsOf(surface);
  const sharedCells = [...undergroundCells].filter(cell => surfaceCells.has(cell));

  const burgs = pack.burgs.filter(burg => burg?.i && !burg.removed && hasBelowLevelPresence(burg));
  const pairDistances: number[] = [];
  let unreachablePairs = 0;

  for (let i = 0; i < burgs.length; i++) {
    const distances = shortestPathLengths(burgs[i].cell);
    for (let j = i + 1; j < burgs.length; j++) {
      const distance = distances.get(burgs[j].cell);
      if (distance === undefined) unreachablePairs++;
      else pairDistances.push(distance);
    }
  }

  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  const lengths = underground.map(routeLength);

  // the water cost still reads the shared map: bound the tunnel steps that could reach it (navigable river courses)
  const surfacePairs = new Set<string>();
  for (const route of surface) {
    for (let i = 0; i < route.points.length - 1; i++) {
      surfacePairs.add(`${route.points[i][2]}-${route.points[i + 1][2]}`);
      surfacePairs.add(`${route.points[i + 1][2]}-${route.points[i][2]}`);
    }
  }
  const isNavigable = (cell: number) => (globalThis as any).Rivers.isNavigable(cell);
  let riverSteps = 0;
  let riverStepsWithoutSurfaceRoute = 0;
  for (const route of underground) {
    for (let i = 0; i < route.points.length - 1; i++) {
      const [a, b] = [route.points[i][2], route.points[i + 1][2]];
      if (!isNavigable(a) || !isNavigable(b)) continue;
      riverSteps++;
      if (!surfacePairs.has(`${a}-${b}`)) riverStepsWithoutSurfaceRoute++;
    }
  }

  return {
    seed,
    cells: pack.cells.i.length,
    burgs: pack.burgs.length - 1,
    belowLevelBurgs: burgs.length,
    surfaceRoutes: surface.length,
    undergroundRoutes: underground.length,
    undergroundRouteCells: undergroundCells.size,
    undergroundCellShareOnSurface: undergroundCells.size ? sharedCells.length / undergroundCells.size : 0,
    sharedCells: sharedCells.length,
    undergroundLengthTotal: Math.round(lengths.reduce((a, b) => a + b, 0)),
    undergroundLengthMean: Math.round(mean(lengths)),
    undergroundLengthMax: Math.round(Math.max(0, ...lengths)),
    pairs: pairDistances.length,
    unreachablePairs,
    meanPairDistance: Math.round(mean(pairDistances)),
    maxPairDistance: Math.round(Math.max(0, ...pairDistances)),
    riverSteps,
    riverStepsWithoutSurfaceRoute
  };
}

it("measures the underground network on generated maps", { timeout: 1_800_000 }, async () => {
  const rows: ReturnType<typeof measure>[] = [];
  // test-setup.ts is node-only; browser mode needs the logging flags and the boot-time globals
  for (const flag of ["INFO", "TIME", "ERROR", "WARN", "DEBUG"]) globalThis[flag] = false;
  globalThis.tip = () => {};
  globalThis.FlatQueue = FlatQueue as never;
  // the app installs these at boot; generation assigns them
  globalThis.grid = {} as never;
  globalThis.pack = {} as never;

  for (const seed of SEEDS) {
    options.map.seed = seed;
    options.generation.underground = true;
    options.generation.template = "continents"; // procedural heightmap: no image asset in browser mode
    try {
      await GenerationPipeline.run({});
    } catch (error) {
      console.log(`pipeline stopped: ${(error as Error).message}`);
    }
    rows.push(measure(seed));
  }

  for (const row of rows) console.log(JSON.stringify(row));
  console.log(`AGGREGATE ${JSON.stringify({
    seeds: rows.length,
    meanCellShareOnSurface: rows.reduce((a, r) => a + r.undergroundCellShareOnSurface, 0) / rows.length,
    meanPairDistance: rows.reduce((a, r) => a + r.meanPairDistance, 0) / rows.length,
    unreachablePairs: rows.reduce((a, r) => a + r.unreachablePairs, 0),
    undergroundRoutes: rows.reduce((a, r) => a + r.undergroundRoutes, 0)
  })}`);
});
```
