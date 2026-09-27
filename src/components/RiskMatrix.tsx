import { Fragment, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type Band = "low" | "moderate" | "high" | "critical" | "extreme";

export type MatrixRisk = {
  id: string;
  name: string;
  L: number;
  I: number;
  /**
   * The API's band. Authoritative when present: the backend scores on
   * likelihood x impact x exposure x controlGap, which L x I alone cannot
   * reproduce. Absent (e.g. hand-entered rows), we fall back to L x I.
   */
  band?: Band;
  /** The API's 0-100 score, for ranking the list. */
  score?: number;
  cat?: string;
  status?: string;
};

/**
 * Likelihood x Impact matrix.
 *
 * Its job is to show where risk concentrates and get you from a cell to the
 * named assets in it. Two encodings, each with one meaning:
 *
 *   position — likelihood x impact, reinforced by a hue-free grey gradient
 *              toward the top right. Grey, so it never competes with band.
 *   hue      — the asset's scored band, and nothing else. The earlier grid
 *              tinted cells by L x I and chips by the API band, so one colour
 *              meant two things on the same screen.
 *
 * A cell holds a count and one dot per asset, so a crowded cell never
 * overflows. Hovering a cell names its assets; selecting it pins them in the
 * list. With nothing selected the list shows every scored asset, worst first,
 * so names are readable without hovering anything. A band is never shown by
 * colour alone: counts, labels and the list always carry it in text.
 */

const LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
const IMPACT = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

/** Clamp an API-supplied 1-5 axis value onto a 0-based grid index. */
const cellIndex = (v: number) =>
  Number.isFinite(v) ? Math.min(5, Math.max(1, Math.round(v))) - 1 : 0;

/** Standard 5x5 banding on L x I — only for rows the API did not score. */
const bandOf = (score: number): Band =>
  score >= 15 ? "critical" : score >= 10 ? "high" : score >= 5 ? "moderate" : "low";

/** Worst band first: legend order, sort order, and a cell's headline band. */
const ORDER: Band[] = ["extreme", "critical", "high", "moderate", "low"];

const BAND_LABEL: Record<Band, string> = {
  low: "Low", moderate: "Moderate", high: "High", critical: "Critical", extreme: "Extreme",
};

/* One band, one colour, everywhere: the --sem-band-* ramp RiskBadge uses. */
const BAND_FILL: Record<Band, string> = {
  low: "bg-band-low",
  moderate: "bg-band-moderate",
  high: "bg-band-high",
  critical: "bg-band-critical",
  extreme: "bg-band-extreme",
};

const BAND_PILL: Record<Band, string> = {
  low: "bg-band-low text-on-band-low",
  moderate: "bg-band-moderate text-on-band-moderate",
  high: "bg-band-high text-on-band-high",
  critical: "bg-band-critical text-on-band-critical",
  extreme: "bg-band-extreme text-on-band-extreme",
};

/**
 * Positional shade, hue-free: 0 at bottom-left to 1 at top-right, from the
 * L x I product. Drawn as an overlay of the text colour, so it deepens the
 * right way in both themes without a single hard-coded grey.
 */
const positionShade = (l: number, i: number) => ((l + 1) * (i + 1) - 1) / 24;

const MAX_DOTS = 8;

type Cell = { l: number; i: number };

export function RiskMatrix({
  risks,
  onSelect,
  highlightId,
  layout = "side",
  listLimit,
}: {
  risks: MatrixRisk[];
  onSelect: (id: string) => void;
  /** A risk to mark — its cell is selected and its row emphasised. */
  highlightId?: string | null;
  /** "side": list beside the grid on wide screens. "stacked": always below. */
  layout?: "side" | "stacked";
  /** Cap on list rows when nothing is selected (the dashboard's short view). */
  listLimit?: number;
}) {
  const [hover, setHover] = useState<Cell | null>(null);
  const [picked, setPicked] = useState<Cell | null>(null);

  const bandForRisk = (r: MatrixRisk): Band =>
    r.band ?? bandOf((cellIndex(r.L) + 1) * (cellIndex(r.I) + 1));

  /** Worst first: band, then score, then name — a stable, explainable order. */
  const rank = (a: MatrixRisk, b: MatrixRisk) =>
    ORDER.indexOf(bandForRisk(a)) - ORDER.indexOf(bandForRisk(b)) ||
    (b.score ?? -1) - (a.score ?? -1) ||
    a.name.localeCompare(b.name);

  /** grid[likelihood][impact], 0-based, each cell sorted worst first. */
  const grid = useMemo(() => {
    const g: MatrixRisk[][][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => [] as MatrixRisk[]),
    );
    // A non-finite L or I would index with NaN and take the grid down; the
    // clamp parks such rows in the lowest cell instead.
    for (const r of risks) g[cellIndex(r.L)][cellIndex(r.I)].push(r);
    for (const row of g) for (const cell of row) cell.sort(rank);
    return g;
    // rank/bandForRisk are pure functions of the rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risks]);

  const bandCounts = useMemo(() => {
    const c: Record<Band, number> = { low: 0, moderate: 0, high: 0, critical: 0, extreme: 0 };
    for (const r of risks) c[bandForRisk(r)]++;
    return c;
  }, [risks]);

  const highlighted = highlightId ? risks.find(r => r.id === highlightId) : undefined;
  const selected: Cell | null =
    picked ?? (highlighted ? { l: cellIndex(highlighted.L), i: cellIndex(highlighted.I) } : null);

  const listed = useMemo(
    () => (selected ? grid[selected.l][selected.i] : [...risks].sort(rank)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.l, selected?.i, grid, risks],
  );
  const capped = !selected && listLimit ? listed.slice(0, listLimit) : listed;

  const serverScored = risks.some(r => r.band !== undefined);
  const toggle = (c: Cell) =>
    setPicked(p => (p && p.l === c.l && p.i === c.i ? null : c));

  const cellLabel = (l: number, i: number, items: MatrixRisk[]) =>
    `${LIKELIHOOD[l]} likelihood, ${IMPACT[i]} impact: ${items.length} asset${items.length === 1 ? "" : "s"}` +
    (items.length ? `, worst ${BAND_LABEL[bandForRisk(items[0])]}` : "");

  const gridView = (
    <div className="min-w-0 flex-1">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[300px] gap-1.5 sm:gap-2">
          {/* Y axis caption */}
          <div className="flex w-5 items-center justify-center">
            <span
              className="whitespace-nowrap text-caption uppercase tracking-[0.08em] text-quaternary"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Likelihood
            </span>
          </div>

          {/*
            One grid for labels, squares and axis: a flex row sized each
            square to its content, so occupied squares drew wider than empty
            ones and the columns wandered.
          */}
          <div className="grid min-w-0 flex-1 grid-cols-[4.5rem_repeat(5,minmax(0,1fr))] gap-1 sm:grid-cols-[6rem_repeat(5,minmax(0,1fr))] sm:gap-1.5">
            {/* High likelihood at the top — the conventional reading order. */}
            {[4, 3, 2, 1, 0].map(l => (
              <Fragment key={l}>
                <div
                  className={cn(
                    "flex items-center justify-end gap-1.5 pr-1 text-right transition-colors duration-150",
                    hover?.l === l || selected?.l === l ? "text-primary" : "text-tertiary",
                  )}
                >
                  <span className="text-label-sm leading-tight">{LIKELIHOOD[l]}</span>
                  <span className="tabular text-caption text-quaternary">{l + 1}</span>
                </div>

                {[0, 1, 2, 3, 4].map(i => {
                  const items = grid[l][i];
                  const isSel = selected?.l === l && selected?.i === i;
                  const cross = hover && (hover.l === l || hover.i === i);
                  const shade = (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-lg bg-[var(--sem-text-primary)]"
                      style={{ opacity: 0.015 + positionShade(l, i) * 0.07 }}
                    />
                  );

                  if (items.length === 0) {
                    return (
                      <div
                        key={i}
                        onMouseEnter={() => setHover({ l, i })}
                        onMouseLeave={() => setHover(null)}
                        className={cn(
                          "relative min-h-[64px] rounded-lg border border-muted bg-container transition-colors",
                          cross && "border-default",
                        )}
                      >
                        {shade}
                      </div>
                    );
                  }

                  const worst = bandForRisk(items[0]);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={isSel}
                      aria-label={cellLabel(l, i, items)}
                      data-testid={`matrix-cell-${l + 1}-${i + 1}`}
                      onClick={() => toggle({ l, i })}
                      onMouseEnter={() => setHover({ l, i })}
                      onMouseLeave={() => setHover(null)}
                      className={cn(
                        "group relative flex min-h-[64px] min-w-0 flex-col justify-between rounded-lg border bg-container p-2 text-left outline-none transition-[border-color,box-shadow] duration-150",
                        "focus-visible:ring-2 focus-visible:ring-active",
                        isSel ? "border-transparent ring-2 ring-[var(--sem-text-primary)]" : "border-default hover:border-active",
                      )}
                    >
                      {shade}
                      <span className="relative flex items-start justify-between gap-1">
                        <span className="font-display text-display-base tabular leading-none text-primary">
                          {items.length}
                        </span>
                        <span className="sr-only">{BAND_LABEL[worst]}</span>
                      </span>
                      <span className="relative flex flex-wrap gap-1" aria-hidden>
                        {items.slice(0, MAX_DOTS).map(r => (
                          <span
                            key={r.id}
                            data-testid="band-dot"
                            data-band={bandForRisk(r)}
                            className={cn(
                              "h-2.5 w-2.5 rounded-full ring-2 ring-[var(--sem-surface-container)]",
                              BAND_FILL[bandForRisk(r)],
                              highlightId === r.id && "ring-[var(--sem-text-primary)]",
                            )}
                          />
                        ))}
                        {items.length > MAX_DOTS && (
                          <span className="tabular text-caption leading-[10px] text-tertiary">+{items.length - MAX_DOTS}</span>
                        )}
                      </span>

                      {/* Hover names the assets; the list below does the same on click. */}
                      {/*
                        Placed to stay inside the grid's scroll box, which clips
                        overflow: the top two rows open downward, the outer
                        columns anchor inward.
                      */}
                      <span
                        role="tooltip"
                        className={cn(
                          "pointer-events-none invisible absolute z-20 w-56 rounded-lg border border-muted bg-container p-2 opacity-0 shadow-panel transition-opacity duration-150",
                          "group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100",
                          l >= 3 ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]",
                          i === 0 ? "left-0" : i === 4 ? "right-0" : "left-1/2 -translate-x-1/2",
                        )}
                      >
                        <span className="mb-1 block text-caption uppercase tracking-[0.08em] text-quaternary">
                          {LIKELIHOOD[l]} · {IMPACT[i]}
                        </span>
                        {items.slice(0, 5).map(r => (
                          <span key={r.id} className="flex items-center gap-2 py-0.5">
                            <span className={cn("h-2 w-2 shrink-0 rounded-full", BAND_FILL[bandForRisk(r)])} />
                            <span className="min-w-0 flex-1 truncate text-body-sm text-primary">{r.name}</span>
                            <span className="shrink-0 text-caption text-tertiary">{BAND_LABEL[bandForRisk(r)]}</span>
                          </span>
                        ))}
                        {items.length > 5 && (
                          <span className="mt-0.5 block text-caption text-tertiary">and {items.length - 5} more</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </Fragment>
            ))}

            {/* X axis */}
            <div />
            {IMPACT.map((label, i) => (
              <div
                key={label}
                className={cn(
                  "pt-0.5 text-center transition-colors duration-150",
                  hover?.i === i || selected?.i === i ? "text-primary" : "text-tertiary",
                )}
              >
                {/* Words from sm up; on a phone the 1-5 scale carries it and the word stays for AT. */}
                <span className="sr-only sm:not-sr-only sm:text-label-sm sm:leading-tight">{label}</span>
                <span className="tabular text-caption text-quaternary sm:ml-1">{i + 1}</span>
              </div>
            ))}
            <div className="col-span-5 col-start-2 text-center text-caption uppercase tracking-[0.08em] text-quaternary">
              Impact
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const listView = (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-muted",
        layout === "side" ? "lg:w-80 lg:shrink-0" : "",
      )}
    >
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-muted px-3 py-2">
        <div className="min-w-0">
          <p data-testid="matrix-list-title" className="truncate text-label-sm text-primary">
            {selected ? `${LIKELIHOOD[selected.l]} · ${IMPACT[selected.i]}` : "All scored assets"}
          </p>
          <p className="text-caption font-normal text-tertiary">
            {listed.length} asset{listed.length === 1 ? "" : "s"}, worst first
          </p>
        </div>
        {picked && (
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="shrink-0 rounded-full px-2 py-1 text-caption text-tertiary outline-none transition-colors hover:bg-action hover:text-primary focus-visible:ring-2 focus-visible:ring-active"
          >
            Show all
          </button>
        )}
      </div>
      {listed.length === 0 ? (
        <p className="px-3 py-6 text-center text-body-sm text-tertiary">No scored assets yet.</p>
      ) : (
        <ul className={cn("overflow-y-auto p-1.5", layout === "side" && "lg:max-h-[372px]")}>
          {capped.map(r => {
            const b = bandForRisk(r);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelect(r.id)}
                  aria-current={highlightId === r.id ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors",
                    "hover:bg-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-active",
                    highlightId === r.id && "bg-raised",
                    r.status === "Closed" && "opacity-50 line-through",
                  )}
                >
                  <span
                    data-testid="band-pill"
                    data-band={b}
                    className={cn(
                      "w-[4.25rem] shrink-0 rounded-full py-0.5 text-center text-caption font-medium ring-1 ring-inset ring-black/10",
                      BAND_PILL[b],
                    )}
                  >
                    {BAND_LABEL[b]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body-md text-primary">{r.name}</span>
                  {r.score != null && (
                    <span className="shrink-0 tabular text-body-sm text-tertiary" title={String(r.score)}>
                      {Math.round(r.score)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {capped.length < listed.length && (
            <li className="px-2 pt-1 text-caption text-tertiary">
              and {listed.length - capped.length} more — select a square, or open the register
            </li>
          )}
        </ul>
      )}
    </div>
  );

  return (
    <div>
      {/* Legend: the band vocabulary with counts, and what each encoding means. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {ORDER.map(b => (
          <span key={b} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/10", BAND_FILL[b])} />
            <span className="text-label-sm text-secondary">{BAND_LABEL[b]}</span>
            <span className="tabular text-caption text-quaternary">{bandCounts[b]}</span>
          </span>
        ))}
      </div>
      <p className="mb-4 text-caption font-normal text-tertiary">
        Position is likelihood × impact.{" "}
        {serverScored
          ? "Colour is each asset's scored band, which also weighs exposure and control gap, so it can be higher or lower than its square suggests."
          : "Colour is the band from likelihood × impact."}
      </p>

      <div className={cn("flex flex-col gap-4", layout === "side" && "lg:flex-row lg:items-start")}>
        {gridView}
        {listView}
      </div>
    </div>
  );
}

export default RiskMatrix;
