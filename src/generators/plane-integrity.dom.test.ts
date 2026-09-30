/**
 * The real-map audit: drives the full generation pipeline in a browser and reports the plane state
 * of each generated map. `*.dom.test.ts` is excluded from `npm run test` and runs under
 * `vitest.browser.config.ts`, which CI invokes for this file.
 */
import { expect, it } from "vitest";
import "@/components/options-model"; // installs the `options` global in browser mode
import { GenerationPipeline } from "./generation-pipeline";
import "./index";
import { auditPlanes, formatPlaneReport, formatPlaneViolations } from "./plane-integrity";

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

/** The archived harness's seed set, so its 2026-09-29 numbers and this run's are comparable */
const SEEDS = ["measure-a", "measure-b", "measure-c", "measure-d", "measure-e", "measure-f", "measure-g", "measure-h"];

it("a clean generated map passes the real-map audit", { timeout: 3_600_000 }, async () => {
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const flag of ["INFO", "TIME", "ERROR", "WARN", "DEBUG"]) globals[flag] = false;
  globals.tip = () => {};
  globals.FlatQueue = FlatQueue;
  (window as unknown as Record<string, unknown>).FlatQueue = FlatQueue;

  const failures: string[] = [];

  for (const seed of SEEDS) {
    globalThis.grid = {} as never;
    globalThis.pack = {} as never;
    options.map.seed = seed;
    options.generation.underground = true;
    options.generation.template = "continents";
    await GenerationPipeline.run({});

    const report = auditPlanes(pack, pack.routes);
    console.log(formatPlaneReport(seed, report));
    failures.push(...formatPlaneViolations(seed, report));
  }

  expect(failures).toEqual([]);
});
