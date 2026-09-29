// A classification rides inside the record it belongs to, so it needs no slot of its own: the save
// array keeps the slots it has (burgs at 15, routes at 37 - see save.ts and load.ts), and a flag
// written by save is read back identically by load.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getClassification, hasBelowLevelPresence, hasGroundLevelPresence } from "@/generators/burg-classification";
import type { Burg } from "@/generators/burgs-generator";

const BURGS_SLOT = 15;
const ROUTES_SLOT = 37;

function loadSlot(data: string[], slot: number) {
  return JSON.parse(data[slot]);
}

describe("underground records in the save format", () => {
  it("round-trips classifications and underground highways through the slots that already exist", () => {
    const data = readFileSync("tests/fixtures/1.139.4.map", "utf8").split("\r\n");
    const slots = data.length;
    const burgs = loadSlot(data, BURGS_SLOT);
    const routes = loadSlot(data, ROUTES_SLOT);

    const dualIdentity = burgs.find((burg: { i: number }) => burg.i === 1);
    const subterranean = burgs.find((burg: { i: number }) => burg.i === 2);
    dualIdentity.subterranean = true;
    subterranean.underground = true;

    const undergroundHighway = {
      i: routes.length,
      group: "roads",
      feature: routes[0].feature,
      points: routes[0].points.map((point: number[]) => [...point]),
      underground: true
    };
    routes.push(undergroundHighway);

    // what save.ts writes
    data[BURGS_SLOT] = JSON.stringify(burgs);
    data[ROUTES_SLOT] = JSON.stringify(routes);

    // what load.ts reads back
    const loadedBurgs = loadSlot(data, BURGS_SLOT);
    const loadedRoutes = loadSlot(data, ROUTES_SLOT);
    const loadedDual = loadedBurgs.find((burg: { i: number }) => burg.i === 1);
    const loadedSubterranean = loadedBurgs.find((burg: { i: number }) => burg.i === 2);

    expect(data.length).toBe(slots); // no new record was appended for the feature
    expect(loadedBurgs).toEqual(burgs);
    expect(loadedRoutes).toEqual(routes);
    expect(getClassification(loadedDual)).toBe("subterranean");
    expect(getClassification(loadedSubterranean)).toBe("underground");
    expect(hasBelowLevelPresence(loadedDual)).toBe(true);
    expect(hasGroundLevelPresence(loadedDual)).toBe(true); // dual identity keeps its ground-level presence
    expect(hasGroundLevelPresence(loadedSubterranean)).toBe(false);
    expect(loadedRoutes.filter((route: { underground?: boolean }) => route.underground)).toEqual([undergroundHighway]);
  });

  it("reads an absent marker as a surface route and an absent classification as a surface burg", () => {
    const data = readFileSync("tests/fixtures/1.139.4.map", "utf8").split("\r\n");
    const burgs = loadSlot(data, BURGS_SLOT);
    const routes = loadSlot(data, ROUTES_SLOT);

    expect(burgs.filter((burg: Burg) => burg.i).every((burg: Burg) => getClassification(burg) === null)).toBe(true);
    expect(routes.every((route: { underground?: boolean }) => !route.underground)).toBe(true);
  });
});
