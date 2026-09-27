/**
 * Relative-day wording.
 *
 * Five call sites across Access and Vendors each interpolated
 * `${days} days ago` directly, which printed "1 days ago" for anything used
 * or assessed yesterday — visible on the Access review for three of its nine
 * grants. The plural is only part of it: "0 days ago" is not how anyone says
 * "today" either.
 *
 * Kept deliberately small. This is wording for a day count the API has
 * already computed, not a general-purpose relative-time library, and it must
 * never be used to derive a day count of its own — the server owns that.
 */

/** "today" / "yesterday" / "3 days ago". Safe to embed mid-sentence. */
export const daysAgo = (days: number): string =>
  days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;

/** The same wording, capitalised for a standalone table cell or field. */
export const daysAgoLabel = (days: number): string => {
  const phrase = daysAgo(days);
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
};

/**
 * Compact age for events: "just now", "5h ago", "3d ago". The wording the
 * threat list already used, shared so every feed ages events the same way.
 */
export const hoursAgoLabel = (hours: number): string =>
  hours < 1 ? "just now"
    : hours < 48 ? `${Math.round(hours)}h ago`
    : `${Math.round(hours / 24)}d ago`;

/** The same, from an ISO timestamp. */
export const timeAgo = (iso: string, now: number = Date.now()): string =>
  hoursAgoLabel(Math.max(0, now - Date.parse(iso)) / 3_600_000);
