import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/AppIcon";
import { DomainIcon, type DomainIconName } from "@/components/DomainIcon";
import { Drishti3DIcon } from "@/components/Drishti3DIcon";
import { DOMAIN_TO_3D, type Icon3DName } from "@/lib/icons3d";
import { Badge, Btn, Select } from "@/components/ui-bits";
import type { IconName } from "@/lib/icons";
import type { Tone } from "@/lib/tone";
import type { RiskBand } from "@/lib/apiTypes";
import { formatScore } from "@/lib/risk";

/**
 * Composite patterns built from ui-bits primitives.
 *
 * ui-bits owns the atoms (Btn, Badge, Card, Input). This file owns the
 * recurring *arrangements* — the page header every screen starts with, the
 * metric tile the dashboard repeats. The risk vocabulary those use lives in
 * src/lib/risk.ts, so this file exports only components. Split so ui-bits stays a primitives file rather than growing into a
 * dumping ground.
 */

/* ------------------------------------------------------- risk vocabulary */

/** Fill plus the text colour computed for it (each >= 4.5:1, see tokens.css). */
const BAND_FILL_CLASS: Record<RiskBand, string> = {
  EXTREME: "bg-band-badge-extreme text-band-badge-content",
  CRITICAL: "bg-band-badge-critical text-band-badge-content",
  HIGH: "bg-band-badge-high text-band-badge-content",
  MODERATE: "bg-band-badge-moderate text-band-badge-content",
  LOW: "bg-band-badge-low text-band-badge-content",
};

/**
 * A risk band as rendered anywhere in Drishti.
 *
 * `null` means the scoring engine has not run for this record. It renders as
 * "Not scored" rather than borrowing a band, because an unassessed thing is
 * not a safe thing — it is an unknown one.
 */
export const RiskBadge = ({ band, className }: { band: RiskBand | null; className?: string }) =>
  band ? (
    <span
      className={cn(
        // inline-block, not flex: ::first-letter only applies to block
        // containers, and sentence case is done in CSS so the text node stays
        // the API's band for search, copy and assistive tech.
        "inline-block max-w-full truncate rounded-full px-2.5 py-0.5 align-middle text-caption font-medium lowercase dark:ring-1 dark:ring-inset dark:ring-white/15 first-letter:uppercase",
        BAND_FILL_CLASS[band],
        className,
      )}
    >
      {band}
    </span>
  ) : (
    <Badge tone="muted" className={className}>Not scored</Badge>
  );

/** Numeric score, consistently formatted. Em dash when unscored. */
export const RiskScore = ({
  score,
  className = "tabular",
}: {
  score: number | null | undefined;
  className?: string;
}) =>
  score == null
    ? <span className={className}>—</span>
    : <span className={className} title={String(score)}>{formatScore(score)}</span>;

/* ------------------------------------------------------------ page header */

export type Breadcrumb = { label: string; to?: string };

/**
 * The top of every page: what this is, what it is for, and the actions that
 * apply to the whole screen. One component so the vertical rhythm above the
 * first card is identical everywhere.
 *
 * This carries the page's <h1>. The app shell deliberately does not also
 * render one — the title used to appear twice on every screen, once in the
 * top bar and again here, which reads as an unfinished layout rather than as
 * emphasis. The shell keeps the breadcrumb; the page keeps the title.
 */
export const PageHeader = ({
  title, description, actions, meta, icon, mark,
}: {
  title: string;
  description?: string;
  /** Right-aligned controls — refresh, create, export. */
  actions?: ReactNode;
  /** A row of small facts under the description (counts, last-updated). */
  meta?: ReactNode;
  icon?: DomainIconName;
  /**
   * The page's 3D anchor. Defaults to the render of `icon`; pass it only when
   * the page's concept has no domain glyph of its own (Policies).
   */
  mark?: Icon3DName;
}) => {
  const art = mark ?? (icon ? DOMAIN_TO_3D[icon] : undefined);
  const puck = icon ? (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-mark text-brand-mark">
      <DomainIcon name={icon} size={18} />
    </span>
  ) : null;
  return (
    /*
     * Below sm the title and its actions stack instead of sharing a row.
     * Sharing one meant the actions took their content width and the title —
     * which is min-w-0 and truncates — lost whatever was left: "Vendor Risk"
     * rendered as "Ven…" at 390px with Refresh and New vendor beside it.
     */
    /*
     * Chronos in-page header: a full-bleed band under the top bar, closed by a
     * hairline. The negative margins cancel <main>'s padding so the rule runs
     * edge to edge; the page's own spacing resumes below it.
     */
    <div className="-mx-3 -mt-3 flex flex-col gap-3 border-b border-muted px-3 py-4 sm:-mx-5 sm:-mt-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-6 sm:gap-y-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          {/* One 3D anchor per page, as Chronos does; line art if it fails. */}
          {art ? <Drishti3DIcon name={art} size="md" eager fallback={puck} /> : puck}
          <h1 className="font-display text-display-lg text-primary sm:truncate sm:text-display-xl">{title}</h1>
        </div>
        {description && (
          <p className="mt-1 max-w-[70ch] text-body-md text-tertiary">{description}</p>
        )}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">{meta}</div>}
      </div>
      {actions && (
        /*
         * flex-shrink-0 keeps the controls at their natural size when there is
         * room, which is what a desktop header wants. Below sm it has to go:
         * it stopped the row shrinking to the viewport, so the row could never
         * wrap internally and simply overflowed instead — on PHI Flow that put
         * Export entirely off-screen and cut "Rescan" in half at 390px.
         */
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">{actions}</div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------ metric card */

const TONE_FIGURE: Record<Tone, string> = {
  success: "text-feedback-success",
  warning: "text-feedback-warning",
  danger: "text-feedback-error",
  info: "text-feedback-info",
  muted: "text-primary",
};

/**
 * A single headline number.
 *
 * `value` is deliberately typed to accept undefined: a metric whose query has
 * not resolved renders a pulse, never a zero. "0 critical risks" is the most
 * reassuring thing this product can say and it must never be said by accident.
 */
export const MetricCard = ({
  label, value, sub, icon, domainIcon, art, tone = "muted", onClick, loading, emphasis,
}: {
  label: string;
  value: number | string | undefined;
  sub?: ReactNode;
  icon?: IconName;
  domainIcon?: DomainIconName;
  /**
   * A 3D render in place of the line mark. For a page's lead metrics only —
   * the dashboard's headline row — so the art marks what matters most rather
   * than wallpapering every tile.
   */
  art?: Icon3DName;
  tone?: Tone;
  onClick?: () => void;
  loading?: boolean;
  /** Draws the accent rule in the tone colour — for the metrics that matter. */
  emphasis?: boolean;
}) => {
  const Wrapper = onClick ? "button" : "div";
  return (
    /*
     * Chronos KPI tile: quiet uppercase label, the figure in Michroma, one
     * line of context. An emphasised metric colours its figure in the tone —
     * the number itself is the alarm, not a stripe beside it.
     */
    <Wrapper
      onClick={onClick}
      type={onClick ? "button" : undefined}
      data-testid={`metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      className={cn(
        "group relative flex w-full min-w-0 flex-col gap-1.5 overflow-hidden rounded-lg border border-muted bg-container px-4 py-3.5 text-left",
        "transition-colors duration-200",
        onClick && "hover:border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-caption uppercase tracking-[0.08em] text-quaternary">{label}</span>
        {art ? (
          <Drishti3DIcon
            name={art}
            size="md"
            eager
            className="-my-1"
            fallback={domainIcon ? <DomainIcon name={domainIcon} size={15} className="text-brand-mark" /> : null}
          />
        ) : domainIcon ? (
          <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-mark text-brand-mark">
            <DomainIcon name={domainIcon} size={15} />
          </span>
        ) : icon ? (
          <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-action text-icon-tertiary">
            <AppIcon name={icon} size="sm" />
          </span>
        ) : null}
      </div>
      {loading || value === undefined ? (
        <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-raised-2" />
      ) : (
        <span
          className={cn(
            "font-display text-display-xl tabular sm:text-display-2xl",
            emphasis ? TONE_FIGURE[tone] : "text-primary",
          )}
        >
          {value}
        </span>
      )}
      <span className="flex min-h-4 items-center justify-between gap-2">
        {sub ? <span className="truncate text-caption text-tertiary">{sub}</span> : <span />}
        {onClick && (
          <AppIcon
            name="chevronRight"
            size="xs"
            className="shrink-0 text-icon-quaternary opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </span>
    </Wrapper>
  );
};

/* ------------------------------------------------------------------ tabs */

export type TabItem = { id: string; label: string; count?: number };

/**
 * Section tabs for detail views. Roving-tabindex keyboard handling, so arrow
 * keys move between tabs the way a native tablist does.
 */
export const Tabs = ({
  tabs, active, onChange, className,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) => {
  const base = useId();
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex(t => t.id === active);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault(); onChange(tabs[(i + 1) % tabs.length].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault(); onChange(tabs[(i - 1 + tabs.length) % tabs.length].id);
    } else if (e.key === "Home") { e.preventDefault(); onChange(tabs[0].id); }
    else if (e.key === "End") { e.preventDefault(); onChange(tabs[tabs.length - 1].id); }
  };

  return (
    <div role="tablist" aria-label="Sections" onKeyDown={onKeyDown}
         className={cn("flex gap-1 overflow-x-auto border-b border-muted", className)}>
      {tabs.map(t => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            id={`${base}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative whitespace-nowrap px-3 py-2 text-label-md transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-active",
              selected ? "text-primary" : "text-tertiary hover:text-secondary",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("ml-1.5 tabular text-caption", selected ? "text-secondary" : "text-quaternary")}>
                {t.count}
              </span>
            )}
            {selected && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-action-primary" />}
          </button>
        );
      })}
    </div>
  );
};

export const TabPanel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div role="tabpanel" className={cn("pt-4", className)}>{children}</div>
);

/* ------------------------------------------------------------- field rows */

/** Label/value pair, the unit that detail panels are built from. */
export const Field = ({ label, value, className }: { label: string; value: ReactNode; className?: string }) => (
  <div className={cn("flex items-baseline justify-between gap-4 border-b border-muted py-2 last:border-0", className)}>
    <span className="flex-shrink-0 text-body-sm text-tertiary">{label}</span>
    <span className="min-w-0 text-right text-body-sm text-primary">{value}</span>
  </div>
);

/** A titled group of fields. */
export const FieldGroup = ({ title, children }: { title?: string; children: ReactNode }) => (
  <div>
    {title && <div className="mb-1 text-caption uppercase tracking-[0.08em] text-quaternary">{title}</div>}
    <div>{children}</div>
  </div>
);

/* -------------------------------------------------------------- filter bar */

export type FilterOption = { value: string; label: string; count?: number };

/**
 * A labelled row of mutually-exclusive chips. Rendered as a radiogroup so a
 * screen reader announces it as one choice rather than N unrelated buttons.
 */
export const FilterBar = ({
  label, options, value, onChange, className,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) => (
  <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap items-center gap-1.5", className)}>
    {options.map(o => {
      const selected = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-label-sm transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active",
            selected
              ? "border-transparent bg-action-primary text-on-color"
              : "border-muted bg-action text-secondary hover:border-default hover:bg-raised-2 hover:text-primary",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn("tabular text-caption", selected ? "text-on-color/70" : "text-quaternary")}>
              {o.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/* ----------------------------------------------------------- entity avatar */

/**
 * A domain mark in a tinted well. Gives tables and drawers a consistent
 * leading glyph so an asset row is visually an *asset* before it is read.
 */
export const EntityAvatar = ({
  icon, tone = "muted", size = "md",
}: { icon: DomainIconName; tone?: Tone; size?: "sm" | "md" | "lg" }) => {
  const box = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" }[size];
  const glyph = { sm: 14, md: 18, lg: 22 }[size];
  const family = tone === "danger" ? "error" : tone === "muted" ? "neutral" : tone;
  return (
    /*
     * Solid block, white glyph: the solid-* fills are the deep steps chosen
     * for white labels (>= 4.5:1 in both themes), so the mark reads as a
     * definite object rather than a pale tint that fades into the row.
     */
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-lg", box)}
      style={{
        background: `var(--sem-solid-${family})`,
        color: `var(--sem-solid-${family}-content)`,
      }}
    >
      <DomainIcon name={icon} size={glyph} />
    </span>
  );
};

/* ------------------------------------------------------------------ misc */

/** Inline "n of m" bar, for composition breakdowns. */
export const MiniBar = ({ segments }: { segments: Array<{ value: number; tone: Tone; label: string; fill?: string }> }) => {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-raised-2" role="img"
         aria-label={segments.map(s => `${s.label}: ${s.value}`).join(", ")}>
      {segments.filter(s => s.value > 0).map(s => (
        <span
          key={s.label}
          style={{
            width: `${(s.value / total) * 100}%`,
            background: s.fill ?? `var(--sem-feedback-${s.tone === "danger" ? "error" : s.tone === "muted" ? "neutral" : s.tone}-icon)`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Copy-to-clipboard affordance for identifiers. Confirms in place rather than
 * firing a toast — a toast for a copy is noise.
 */
export const CopyValue = ({ value, className }: { value: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        });
      }}
      className={cn("group inline-flex items-center gap-1.5 font-mono text-body-sm text-secondary hover:text-primary", className)}
      aria-label={`Copy ${value}`}
    >
      {value}
      <AppIcon
        name={copied ? "check" : "export"}
        size="xs"
        className={cn("transition-opacity", copied ? "text-feedback-success-icon" : "opacity-0 group-hover:opacity-60")}
      />
    </button>
  );
};

/** Past this many moves, a status footer offers them as a dropdown. */
const STATUS_BUTTONS_MAX = 2;

/**
 * "Change status" for an inspector footer.
 *
 * A row of one button per allowed move wrapped onto two or three lines once a
 * record had four or five moves, and the footer grew into the space the
 * inspector needs for its content. Up to two moves stay as buttons; beyond
 * that the resolving move keeps its button and the rest sit in a dropdown.
 */
export function StatusChanger<S extends string>({
  options,
  labelOf,
  primary,
  disabled,
  onChange,
}: {
  options: readonly S[];
  labelOf: (s: S) => string;
  /** The move worth one click, e.g. RESOLVED. */
  primary?: S;
  disabled?: boolean;
  onChange: (next: S) => void;
}) {
  const [pick, setPick] = useState<S | "">("");
  const quick = primary && options.includes(primary) ? primary : undefined;
  const rest = options.filter(o => o !== quick);

  return (
    <div className="w-full">
      <div className="mb-1.5 text-caption text-tertiary">Change status</div>
      {options.length <= STATUS_BUTTONS_MAX ? (
        <div className="flex flex-wrap gap-2">
          {options.map(next => (
            <Btn key={next} variant={next === quick ? "primary" : "outline"} disabled={disabled} onClick={() => onChange(next)}>
              {labelOf(next)}
            </Btn>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {quick && (
            <Btn variant="primary" disabled={disabled} onClick={() => onChange(quick)}>
              {labelOf(quick)}
            </Btn>
          )}
          <Select
            value={pick}
            onChange={e => setPick(e.target.value as S | "")}
            aria-label="Move to status"
            className="min-w-0 flex-1"
          >
            <option value="">Move to…</option>
            {rest.map(o => <option key={o} value={o}>{labelOf(o)}</option>)}
          </Select>
          <Btn
            variant="outline"
            disabled={disabled || pick === ""}
            onClick={() => { if (pick) { onChange(pick); setPick(""); } }}
          >
            Update
          </Btn>
        </div>
      )}
    </div>
  );
}
