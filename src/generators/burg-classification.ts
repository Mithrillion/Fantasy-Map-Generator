// How a burg relates to the surface: above ground, both planes at once, or below ground only.
// Both flags are optional, so an absent value means a surface burg - every map saved before the
// feature, and every map generated without underground generation enabled.
import type { Burg } from "./burgs-generator";

export type BurgClassification = "subterranean" | "underground";

/** Below-level presence belongs to either classification; the constant list keeps call sites honest */
export const BELOW_LEVEL_CLASSIFICATIONS: readonly BurgClassification[] = ["subterranean", "underground"];

/**
 * The classification a burg record carries, or null for a surface burg. A record carrying both
 * flags is resolved to the fully subterranean one: a burg is never classified twice.
 */
export const getClassification = (burg: Burg): BurgClassification | null =>
  burg.underground ? "underground" : burg.subterranean ? "subterranean" : null;

/** Below-level presence: the burg may be an endpoint of an underground highway */
export const hasBelowLevelPresence = (burg: Burg): boolean => Boolean(burg.underground || burg.subterranean);

/** Ground-level presence: the burg may be an endpoint of a surface route, and draws a port anchor */
export const hasGroundLevelPresence = (burg: Burg): boolean => !burg.underground;

/** Drop the losing flag, so a stored record carrying both is repaired rather than counted twice */
export function normalizeClassification(burg: Burg): BurgClassification | null {
  const classification = getClassification(burg);
  if (classification !== "underground") delete burg.underground;
  if (classification !== "subterranean") delete burg.subterranean;
  return classification;
}
