import { describe, expect, it } from "vitest";
import {
  getClassification,
  hasBelowLevelPresence,
  hasGroundLevelPresence,
  normalizeClassification
} from "./burg-classification";
import type { Burg } from "./burgs-generator";

const burg = (flags: Partial<Burg> = {}): Burg => ({ cell: 1, x: 0, y: 0, i: 1, ...flags });

describe("burg classification", () => {
  it.each([
    ["a surface burg", {}, null, false, true],
    ["a dual-identity burg", { subterranean: true }, "subterranean", true, true],
    ["a fully subterranean burg", { underground: true }, "underground", true, false],
    ["a record carrying both flags", { subterranean: true, underground: true }, "underground", true, false]
  ])("resolves %s", (_case, flags, classification, belowLevel, groundLevel) => {
    const record = burg(flags as Partial<Burg>);

    expect(getClassification(record)).toBe(classification);
    expect(hasBelowLevelPresence(record)).toBe(belowLevel);
    expect(hasGroundLevelPresence(record)).toBe(groundLevel);
  });

  it("repairs a record carrying both classifications to exactly one burg", () => {
    const record = burg({ subterranean: true, underground: true });
    const burgs = [0, record];

    expect(normalizeClassification(record)).toBe("underground");
    expect(getClassification(record)).toBe("underground");
    expect(record.subterranean).toBeUndefined();
    expect(hasBelowLevelPresence(record)).toBe(true);
    expect(hasGroundLevelPresence(record)).toBe(false);
    expect(burgs.filter(Boolean)).toHaveLength(1); // one settlement, classified once
  });

  it("leaves an unclassified record untouched", () => {
    const record = burg();

    expect(normalizeClassification(record)).toBeNull();
    expect(Object.keys(record)).toEqual(["cell", "x", "y", "i"]);
  });
});
