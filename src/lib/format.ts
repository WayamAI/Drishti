/**
 * The one locale Drishti formats in.
 *
 * Every number and date used to go through `toLocaleString()` with no
 * argument, which means the *viewer's* locale: an analyst on an en-IN machine
 * read 412,000 PHI records as "4,12,000" and dates day-first, while the
 * colleague they were comparing notes with saw something else. A compliance
 * figure has to read the same for everyone looking at it, so the locale is
 * fixed here rather than inherited from the browser.
 */
export const LOCALE = "en-US";

/** Grouped integer or decimal, e.g. 4,539,000. */
export const formatNumber = (n: number): string => n.toLocaleString(LOCALE);

/** Short calendar date, e.g. "Sep 27, 2026". */
export const DATE_OPTIONS: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };

/** Date and minute, e.g. "Sep 27, 2026, 12:18 PM" — the same date style as DATE_OPTIONS. */
export const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = { ...DATE_OPTIONS, hour: "numeric", minute: "2-digit" };
