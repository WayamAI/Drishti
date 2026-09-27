/**
 * Tone vocabulary, the bridge between domain meaning and feedback tokens.
 *
 * Lives outside the component layer so it can be imported anywhere (charts,
 * SVG fills, inline styles) without dragging components along.
 */

/** The app's established tone names. `danger`/`muted` map onto the token
 *  layer's feedback.error / feedback.neutral families. */
import type { ControlStatus, RiskBand } from "@/lib/apiTypes";

export type Tone = "success" | "warning" | "danger" | "info" | "muted";

const FAMILY: Record<Tone, string> = {
  success: "success",
  warning: "warning",
  danger: "error",
  info: "info",
  muted: "neutral",
};

/** A tone's icon colour as a CSS value, for SVG fills, charts and inline styles. */
export const toneVar = (tone: Tone) => `var(--sem-feedback-${FAMILY[tone]}-icon)`;

/** 0-100 score where higher is better (compliance, health). */
export const scoreTone = (score: number): Tone =>
  score >= 90 ? "success" : score >= 80 ? "warning" : "danger";

/** 0-100 value where higher is worse (risk). */
export const riskTone = (risk: number): Tone =>
  risk >= 70 ? "danger" : risk >= 40 ? "warning" : "success";

/**
 * The fill a band is drawn in. Separate from BAND_TONE because five bands
 * need five colours — tone has only three that mean "bad", which is how
 * EXTREME and CRITICAL ended up indistinguishable.
 */
export const BAND_FILL: Record<RiskBand, string> = {
  EXTREME: "var(--sem-band-extreme)",
  CRITICAL: "var(--sem-band-critical)",
  HIGH: "var(--sem-band-high)",
  MODERATE: "var(--sem-band-moderate)",
  LOW: "var(--sem-band-low)",
};

/** Control implementation status, worded and coloured once for every screen that shows it. */
export const CONTROL_STATUS_TONE: Record<ControlStatus, Tone> = {
  IMPLEMENTED: "success",
  PARTIAL: "warning",
  PLANNED: "info",
  NOT_IMPLEMENTED: "danger",
};

export const CONTROL_STATUS_LABEL: Record<ControlStatus, string> = {
  IMPLEMENTED: "Implemented",
  PARTIAL: "Partial",
  PLANNED: "Planned",
  NOT_IMPLEMENTED: "Not implemented",
};
