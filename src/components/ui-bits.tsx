import { ReactNode, useEffect } from "react";
import { AppIcon } from "@/components/AppIcon";
import { Drishti3DIcon } from "@/components/Drishti3DIcon";
import type { Icon3DName } from "@/lib/icons3d";
import { IconButton } from "@/components/IconButton";
import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { type Tone, toneVar } from "@/lib/tone";

/**
 * Shared primitives for the application surface.
 *
 * Every colour, size and radius here routes through the semantic token layer
 * (see src/styles/tokens.css + tailwind.config.ts). No raw palette values.
 */

/** Public tone names -> token family. `danger`/`muted` are kept as the app's
 *  established vocabulary; they map onto feedback.error / feedback.neutral. */
const TONE_TEXT: Record<Tone, string> = {
  success: "text-feedback-success",
  warning: "text-feedback-warning",
  danger: "text-feedback-error",
  info: "text-feedback-info",
  muted: "text-feedback-neutral",
};

/** Solid, saturated status fills. Status is read at a glance, so badges use a
 *  bright fill with its own contrast-checked foreground rather than a tint. */
const TONE_BADGE: Record<Tone, string> = {
  success: "bg-solid-success text-on-solid-success",
  warning: "bg-solid-warning text-on-solid-warning",
  danger: "bg-solid-error text-on-solid-error",
  info: "bg-solid-info text-on-solid-info",
  muted: "bg-solid-neutral text-on-solid-neutral",
};

/** The 4-level alert scale, each at full saturation. */
const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-solid-critical text-on-solid-critical",
  HIGH: "bg-solid-high text-on-solid-high",
  MEDIUM: "bg-solid-medium text-on-solid-medium",
  LOW: "bg-solid-low text-on-solid-low",
  INFO: "bg-solid-low text-on-solid-low",
};

const TONE_ICON: Record<Tone, string> = {
  success: "text-feedback-success-icon",
  warning: "text-feedback-warning-icon",
  danger: "text-feedback-error-icon",
  info: "text-feedback-info-icon",
  muted: "text-feedback-neutral-icon",
};

export const Card = ({ className = "", children }: { className?: string; children: ReactNode }) => (
  <div className={cn("bg-container border border-muted rounded-lg", className)}>{children}</div>
);

/** Tinted tag: for attributes and multi-tag cells, where a row of solid fills
 *  would shout. Solid stays for the one status a row is about. */
const TONE_SOFT: Record<Tone, string> = {
  success: "bg-feedback-success-background text-feedback-success",
  warning: "bg-feedback-warning-background text-feedback-warning",
  danger: "bg-feedback-error-background text-feedback-error",
  info: "bg-feedback-info-background text-feedback-info",
  muted: "bg-feedback-neutral-background text-feedback-neutral",
};

export const Badge = ({
  tone = "muted", variant = "solid", sentence = false, children, className = "",
}: {
  tone?: Tone;
  variant?: "solid" | "soft";
  /**
   * Show an API enum ("CRITICAL") in sentence case ("Critical"), matching the
   * band badges. Done in CSS so the text node stays the API's word for copy,
   * search and assistive tech; inline-block because ::first-letter does not
   * apply to flex containers.
   */
  sentence?: boolean;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "max-w-full truncate rounded-full px-2.5 py-0.5 text-caption font-medium",
      sentence ? "inline-block align-middle lowercase first-letter:uppercase" : "inline-flex items-center",
      variant === "soft" ? TONE_SOFT[tone] : TONE_BADGE[tone],
      className,
    )}
  >
    {children}
  </span>
);

/** Status/severity pill. Bright, solid, one fill per severity level. */
export const SeverityBadge = ({ sev }: { sev: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium",
      SEVERITY_BADGE[sev] ?? "bg-solid-neutral text-on-solid-neutral",
    )}
  >
    {sev}
  </span>
);

export { SeverityBadge as StatusBadge };

/** Compact filter pill, muted by default, brighter when selected. Never a blue pill. */
export const FilterChip = ({
  selected = false, onClick, children, className = "", count,
}: { selected?: boolean; onClick?: () => void; children: ReactNode; className?: string; count?: number }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-label-sm transition-colors duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active",
      selected
        ? "border-transparent bg-action-primary text-on-color"
        : "border-muted bg-action text-secondary hover:border-default hover:bg-raised-2 hover:text-primary",
      className,
    )}
  >
    {children}
    {count !== undefined && (
      <span className={cn("tabular text-caption", selected ? "text-on-color/70" : "text-quaternary")}>{count}</span>
    )}
  </button>
);

export function Modal({ open, onClose, title, children, size = "md", dismissOnBackdrop = true }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; size?: "sm" | "md" | "lg" | "xl"; dismissOnBackdrop?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" }[size];
  return (
    // !m-0: overlays render inside space-y-* page wrappers, whose sibling
    // margin would otherwise push a fixed layer 16px down the viewport.
    <div className="fixed inset-0 z-50 !m-0 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => dismissOnBackdrop && onClose()} />
      <div className={cn("relative flex max-h-[88vh] w-full flex-col rounded-lg border border-muted bg-container shadow-panel fade-in", w)}>
        {title && (
          <div className="flex items-center justify-between border-b border-muted px-5 py-4">
            <h3 className="font-display text-display-lg text-primary">{title}</h3>
            <IconButton icon="close" aria-label="Close dialog" size="sm" onClick={onClose} />
          </div>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Side panel. Reads as part of the shell rather than a floating modal:
 * flush to the viewport edge, single hairline stroke, no backdrop blur.
 */
export function SlideOver({ open, onClose, title, children, footer, width = 440 }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 !m-0">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute right-0 top-0 flex h-full max-w-full flex-col border-l border-muted bg-container shadow-panel slide-in-right"
        style={{ width }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-muted px-5">
          <h3 className="min-w-0 truncate font-display text-display-lg text-primary">{title}</h3>
          <IconButton icon="close" aria-label="Close panel" size="sm" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-muted p-4">{footer}</div>}
      </div>
    </div>
  );
}

type BtnVariant = "default" | "primary" | "danger" | "success" | "ghost" | "outline" | "warning" | "inverse";

const BTN_VARIANT: Record<BtnVariant, string> = {
  // Chronos button language: pills. The solid primary is the one action a
  // panel is for; everything else is a quiet bordered pill.
  default: "border border-muted bg-action text-secondary hover:border-default hover:bg-raised-2 hover:text-primary",
  primary: "bg-action-primary text-on-color hover:bg-action-primary-hover",
  inverse: "bg-action-primary text-on-color hover:bg-action-primary-hover",
  danger: "bg-solid-error text-on-solid-error hover:opacity-90",
  success: "bg-solid-success text-on-solid-success hover:opacity-90",
  warning: "bg-solid-warning text-on-solid-warning hover:opacity-90",
  ghost: "text-tertiary hover:bg-action-tertiary-hover hover:text-primary",
  outline: "border border-muted bg-action text-secondary hover:border-default hover:bg-raised-2 hover:text-primary",
};

export const Btn = ({ variant = "default", className = "", children, ...rest }: { variant?: BtnVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-label-sm transition-colors duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active",
      "disabled:cursor-not-allowed disabled:opacity-50",
      BTN_VARIANT[variant],
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

const FIELD =
  "h-8 bg-action border border-muted rounded-full px-3 text-label-sm text-primary placeholder:text-quaternary " +
  "transition-colors duration-200 hover:border-default focus:outline-none focus-visible:border-default focus-visible:ring-2 focus-visible:ring-active";

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn(FIELD, props.className)} />
);

/** Native select with its own chevron, so the arrow sits inside the pill. */
export const Select = ({ children, className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) => {
  const wide = className?.includes("w-full");
  return (
    <span className={cn("relative inline-flex min-w-0", wide && "w-full")}>
      <select {...rest} className={cn(FIELD, "cursor-pointer appearance-none pr-8", className)}>{children}</select>
      <AppIcon
        name="chevronDown"
        size="xs"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-icon-quaternary"
      />
    </span>
  );
};

export const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cn(FIELD, "h-auto w-full rounded-lg py-2 text-body-md", props.className)} />
);

/** Radial progress. Telemetry value set in Michroma with tabular figures. */
export const Gauge = ({ value, size = 120, tone = "info", label }: { value: number; size?: number; tone?: Tone; label?: string }) => {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const isDisplay = size >= 96;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sem-surface-action)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={toneVar(tone)} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Michroma is a wide, square face, it only fits (and only reads as a
            display metric) at larger diameters. Small gauges use Geist. */}
        {isDisplay ? (
          <span className="font-display tabular leading-none text-primary" style={{ fontSize: size * 0.19 }}>
            {value}%
          </span>
        ) : (
          <span className="tabular font-semibold leading-none text-primary" style={{ fontSize: size * 0.28 }}>
            {value}
          </span>
        )}
        {label && <span className="mt-1 text-caption text-tertiary">{label}</span>}
      </div>
    </div>
  );
};

export const KPI = ({ icon, label, value, trend, accent = "info", onClick, loading, stale }: {
  icon: IconName; label: string;
  /** `undefined` renders a dash rather than "undefined" when a fetch fails. */
  value?: string;
  trend?: string; accent?: Tone; onClick?: () => void;
  /** First load: shimmer in place of the figure, same height, no layout jump. */
  loading?: boolean;
  /** Last known figure, backend currently unreachable. */
  stale?: boolean;
}) => (
  <Card
    className={cn(
      "p-4 transition-colors duration-200",
      onClick && "cursor-pointer hover:border-active",
    )}
  >
    <div onClick={onClick}>
      <div className="mb-3 flex items-center justify-between">
        <AppIcon name={icon} size="lg" className={TONE_ICON[accent]} />
        <span className="text-caption font-medium uppercase tracking-[0.08em] text-quaternary">{label}</span>
      </div>
      {loading ? (
        <div
          role="status"
          aria-label={`Loading ${label}`}
          className="h-[--kpi-metric-h] w-24 animate-pulse rounded bg-raised-2"
          style={{ height: "1.9rem" }}
        />
      ) : (
        <div
          className={cn("font-display text-display-metric-sm tabular text-primary", stale && "opacity-60")}
          title={stale ? "Last known value — backend unreachable" : undefined}
        >
          {value ?? "—"}
        </div>
      )}
      {/*
        The trend line holds its place while loading. It used to render only
        once data arrived, so every card in a KPI row lost a line on first
        paint and the grid — plus everything below it — dropped when the fetch
        landed. Reserved for every card, not only the ones that will end up
        with a trend: the row is as tall as its tallest card either way, so
        matching the one that has a trend is what keeps the row still.
      */}
      {loading ? (
        <div role="status" aria-label={`Loading ${label} trend`} className="mt-1 text-caption">
          <span className="inline-block h-3 w-24 animate-pulse rounded bg-raised-2 align-middle" />
        </div>
      ) : (
        trend && <div className={cn("mt-1 text-caption tabular", TONE_TEXT[accent])}>{trend}</div>
      )}
    </div>
  </Card>
);

/**
 * Heading inside a card. Chronos panel vocabulary: a small uppercase caption
 * names the panel, the one-line subtitle says what it is for.
 */
export const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h3 className="text-caption uppercase tracking-[0.08em] text-quaternary">{title}</h3>
      {subtitle && <p className="mt-1 text-body-sm text-tertiary">{subtitle}</p>}
    </div>
    {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
  </div>
);

/* ---------------------------------------------------------------------------
   Data-state primitives

   Every component that will read from the backend needs the same three
   non-happy paths. Defining them once keeps a failed fetch looking like part
   of the product rather than a stack trace, and keeps the skeleton the same
   height as the content it replaces so nothing jumps on load.
   -------------------------------------------------------------------------- */

/** Placeholder occupying the exact footprint of the chart it stands in for. */
export const ChartSkeleton = ({ height = 470, label = "Loading data" }: { height?: number; label?: string }) => (
  <div
    role="status"
    aria-label={label}
    className="flex w-full animate-pulse flex-col justify-center gap-3 rounded-lg p-2"
    style={{ height }}
  >
    {[0.9, 0.6, 0.75, 0.45, 0.8].map((w, i) => (
      <div key={i} className="h-4 rounded bg-raised-2" style={{ width: `${w * 100}%` }} />
    ))}
    <span className="sr-only">{label}</span>
  </div>
);

/**
 * Failed fetch. `error` is inspected rather than printed raw: an unreachable
 * backend and an expired session are different problems for the viewer.
 */
export const ErrorState = ({
  title,
  message,
  onRetry,
  isRetrying,
  height,
  art,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  height?: number;
  /**
   * A 3D mark for an error that is a *state*, not a fault — an expired
   * session happens to everyone and a red warning overstates it. A real
   * failure keeps the red mark, because there the alarm is the point.
   */
  art?: Icon3DName;
}) => {
  const alarm = (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-feedback-error-background">
      <AppIcon name="warning" size="lg" className="text-feedback-error-icon" />
    </span>
  );
  return (
    <div
      role="alert"
      className="flex w-full flex-col items-center justify-center gap-3 rounded-lg p-8 text-center"
      style={height ? { minHeight: height } : undefined}
    >
      {art ? <Drishti3DIcon name={art} size="xl" fallback={alarm} /> : alarm}
      <div>
        <div className="text-heading-sm text-primary">{title ?? "Could not load this data"}</div>
        {message && <p className="mt-1 max-w-md text-body-sm text-tertiary">{message}</p>}
      </div>
      {onRetry && (
        <Btn variant="outline" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "Retrying…" : "Retry"}
        </Btn>
      )}
    </div>
  );
};

/** Request succeeded, there is simply nothing to draw. Not an error. */
export const EmptyState = ({
  icon = "info",
  art,
  title,
  message,
  action,
  height,
}: {
  icon?: IconName;
  /** The page's own 3D mark in its empty condition, e.g. `emptyThreats`. */
  art?: Icon3DName;
  title: string;
  message?: string;
  action?: ReactNode;
  height?: number;
}) => {
  const glyph = (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-action">
      <AppIcon name={icon} size="lg" className="text-icon-tertiary" />
    </span>
  );
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-3 rounded-lg p-8 text-center"
      style={height ? { minHeight: height } : undefined}
    >
      {art ? <Drishti3DIcon name={art} size="xl" fallback={glyph} /> : glyph}
      <div>
        <div className="text-heading-sm text-primary">{title}</div>
        {message && <p className="mt-1 max-w-md text-body-sm text-tertiary">{message}</p>}
      </div>
      {action}
    </div>
  );
};

/**
 * Holds a headline banner's footprint while the data behind it loads.
 *
 * These banners are conditional on their own content — no worst offender, no
 * banner — so on first paint the cards underneath sat about ninety pixels too
 * high and dropped the moment the fetch landed. The jump is small and very
 * visible, because it happens under the viewer's eye mid-sentence.
 *
 * The height is matched by construction rather than by a hardcoded number:
 * the same icon size, the same one-line text box, and a real Btn, all made
 * invisible. A magic height here would drift the first time a banner's
 * padding changed and nobody would notice until it jumped again.
 *
 * Trade-off worth naming: when the data arrives and there is nothing to
 * report, the reserved strip disappears and the page moves up instead. That
 * is the rarer case — a headline banner exists precisely because these
 * screens usually have something wrong to lead with — and an empty bordered
 * strip left permanently in its place would be worse.
 */
export const HeadlineSkeleton = ({ label = "Loading summary" }: { label?: string }) => (
  <div
    role="status"
    aria-label={label}
    className="flex animate-pulse items-center gap-3 rounded-lg border border-muted bg-container p-3"
  >
    <AppIcon name="threats" size="md" className="invisible" />
    <span className="text-body-md">
      <span className="inline-block h-4 w-80 max-w-full rounded bg-raised-2 align-middle" />
    </span>
    <div className="flex-1" />
    <Btn variant="outline" className="invisible" tabIndex={-1} aria-hidden>
      View Details
    </Btn>
    <span className="sr-only">{label}</span>
  </div>
);
