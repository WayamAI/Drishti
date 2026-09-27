import type { Tone } from "@/lib/tone";
import type { RiskBand, BaaStatus, Sensitivity } from "@/lib/apiTypes";

/*
 * The risk vocabulary: how bands, BAA states and sensitivities are named,
 * coloured and ordered everywhere in Drishti. Kept out of the component
 * files so those export only components (fast refresh needs that).
 */

/**
 * One band→tone map for the whole app.
 *
 * This existed twice (Risks.tsx and Vendors.tsx) with the same values. Two
 * copies of a colour vocabulary is one rename away from a Vendor EXTREME and
 * a Risk EXTREME being different colours, which would quietly teach the
 * viewer that the bands mean different things on different pages.
 */
export const BAND_TONE: Record<RiskBand, Tone> = {
  EXTREME: "danger",
  CRITICAL: "danger",
  HIGH: "warning",
  MODERATE: "info",
  LOW: "success",
};

/** Worst first — the order every band summary and sort uses. */
export const BAND_ORDER: RiskBand[] = ["EXTREME", "CRITICAL", "HIGH", "MODERATE", "LOW"];

/** Rank for sorting. Higher is worse; unscored returns null so it sinks. */
export const bandRank = (band: RiskBand | null | undefined): number | null =>
  band == null ? null : BAND_ORDER.length - BAND_ORDER.indexOf(band);

export const BAA_TONE: Record<BaaStatus, Tone> = {
  SIGNED: "success",
  PENDING: "warning",
  EXPIRED: "danger",
  MISSING: "danger",
};

export const BAA_LABEL: Record<BaaStatus, string> = {
  SIGNED: "Signed",
  PENDING: "Pending",
  EXPIRED: "Expired",
  MISSING: "Missing",
};

export const SENSITIVITY_TONE: Record<Sensitivity, Tone> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "muted",
};

/**
 * A risk score, formatted for display.
 *
 * The API derives a score as a product of its factors, so it returns a whole
 * number for some rows (64, 80, 100) and a two-decimal float for others
 * (38.4, 11.52). Printed raw, one column reads 100 / 80 / 38.4 / 11.52 —
 * ragged precision that implies the engine is more certain about some rows
 * than others. One decimal at most, trailing zero dropped.
 *
 * Nothing is hidden: the exact value stays on the element as a tooltip. And
 * the band badge beside it always comes from the server, so display rounding
 * can never move a row into a band the API did not put it in.
 */
export const formatScore = (score: number): string => {
  const rounded = Math.round(score * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};
