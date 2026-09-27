import { useEffect, useMemo, useRef, useState } from "react";
import { LOCALE } from "@/lib/format";

/**
 * PHI flow, drawn as a volume-weighted Sankey.
 *
 * Geometry carries the data: a system is a bar whose height is its daily PHI
 * throughput, and a ribbon is exactly as thick as the records it moves — the
 * same thickness at both ends, on one scale for the whole map. Colour says
 * whether that movement is encrypted.
 *
 * What changed from the card layout, and why:
 *   - Systems were 152px cards whose height tracked volume, so the busiest
 *     systems became tall empty boxes and a column of small systems ran off
 *     the top and bottom of the chart. Bars with the label beside them keep
 *     the volume encoding without the dead space, and the scale is solved per
 *     column so every system fits.
 *   - A ribbon's thickness was its share of each node's edge, so one flow
 *     could be thick at one end and thin at the other. It is now its volume.
 *   - Systems were placed in API order, so ribbons crossed needlessly. Each
 *     column is ordered by where its flows come from and go to.
 *   - Hover had only a native tooltip, and a flow could not be selected.
 *     Hovering a system or a ribbon now isolates it and names it; clicking a
 *     ribbon opens that flow.
 */

export type FlowTone = "ok" | "warn" | "violation";

export type FlowNode = {
  id: string;
  name: string;
  /** Column index, left to right: source -> core -> system -> external. */
  stage: number;
  status: FlowTone;
  records: number;
  encryption: "AES-256" | "Unencrypted";
};

export type FlowLink = {
  from: string;
  to: string;
  value: number;
  tone: FlowTone;
  /** PHI category this movement carries, when the API names one. */
  phiType?: string;
  /** Position of the source record in the API response. */
  index?: number;
};

const TONE_FILL: Record<FlowTone, string> = {
  ok: "var(--sem-severity-low)",
  warn: "var(--sem-severity-high)",
  violation: "var(--sem-severity-critical)",
};

const TONE_LABEL: Record<FlowTone, string> = {
  ok: "Encrypted in transit",
  warn: "Needs review",
  violation: "Unencrypted in transit",
};

const STAGE_LABELS = ["Ingress", "Core system", "Downstream systems", "External recipients"];

const NODE_W = 10;
/** Vertical room one system needs for its two-line label. */
const MIN_SLOT = 34;
const NODE_GAP = 10;
const TOP = 30;
const BOTTOM = 8;
/** Room right of the last column for its labels. */
const LABEL_TAIL = 176;
const MIN_GUTTER = 168;
const LABEL_PAD = 8;

type Box = { x: number; y: number; h: number; slotY: number; slot: number; node: FlowNode };
type Ribbon = FlowLink & { i: number; d: string; thick: number };
type Hover = { kind: "node"; id: string } | { kind: "link"; i: number } | null;

const finite = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);
const fmt = (n: number) => finite(n).toLocaleString(LOCALE);

/** Container width, so the map fills the card instead of floating in it. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function PhiSankey({
  nodes,
  links,
  onSelect,
  onSelectLink,
  activeNodeId,
  activeLinkIndex,
}: {
  nodes: FlowNode[];
  links: FlowLink[];
  onSelect: (id: string) => void;
  /** Called with the link's position in `links`. */
  onSelectLink?: (i: number) => void;
  /** Kept highlighted while its inspector is open. */
  activeNodeId?: string | null;
  activeLinkIndex?: number | null;
}) {
  const [wrapRef, containerW] = useWidth<HTMLDivElement>(960);
  const [hover, setHover] = useState<Hover>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  const layout = useMemo(() => {
    /* Real data arrives over the wire, so a stage may be absent, fractional or
       NaN. A NaN poisons every coordinate downstream, so inputs are coerced
       here rather than trusted. */
    const stageOf = (n: FlowNode) => (Number.isFinite(n.stage) ? Math.max(0, Math.round(n.stage)) : 0);
    const known = new Set(nodes.map(n => n.id));
    const live = links
      .map((l, i) => ({ ...l, value: finite(l.value), i }))
      .filter(l => known.has(l.from) && known.has(l.to));

    const inSum: Record<string, number> = {};
    const outSum: Record<string, number> = {};
    live.forEach(l => {
      outSum[l.from] = (outSum[l.from] ?? 0) + l.value;
      inSum[l.to] = (inSum[l.to] ?? 0) + l.value;
    });
    const through = (id: string) => Math.max(inSum[id] ?? 0, outSum[id] ?? 0);

    const stages = nodes.length ? Math.max(...nodes.map(stageOf)) + 1 : 0;
    const cols: FlowNode[][] = Array.from({ length: stages }, () => []);
    nodes.forEach(n => cols[stageOf(n)].push(n));

    const busiestCount = Math.max(1, ...cols.map(c => c.length));
    const H = Math.min(640, Math.max(360, Math.round(busiestCount * (MIN_SLOT + NODE_GAP) * 1.35)));

    /* One scale for the whole map, so thickness is comparable everywhere.
       Solved per column: small systems take a fixed slot for their label, the
       rest share what is left in proportion to volume; the tightest column
       sets the scale, so no column can overflow. */
    const colScale = (col: FlowNode[]) => {
      const gaps = Math.max(0, col.length - 1) * NODE_GAP;
      let small = new Set<string>();
      let s = Infinity;
      for (let pass = 0; pass < 6; pass++) {
        const big = col.filter(n => !small.has(n.id));
        const bigSum = big.reduce((a, n) => a + through(n.id), 0);
        s = bigSum > 0 ? (H - gaps - small.size * MIN_SLOT) / bigSum : Infinity;
        const next = new Set(col.filter(n => through(n.id) * s < MIN_SLOT).map(n => n.id));
        if (next.size === small.size) break;
        small = next;
      }
      return s;
    };
    const scales = cols.map(colScale).filter(s => Number.isFinite(s) && s > 0);
    const peak = Math.max(1, ...nodes.map(n => through(n.id)));
    const scale = scales.length ? Math.min(...scales) : MIN_SLOT / peak;

    const gutter = stages > 1
      ? Math.max(MIN_GUTTER, (containerW - LABEL_TAIL - stages * NODE_W) / (stages - 1))
      : MIN_GUTTER;
    const colX = (s: number) => s * (NODE_W + gutter);

    const box: Record<string, Box> = {};
    const place = () => {
      cols.forEach((col, s) => {
        const slots = col.map(n => Math.max(MIN_SLOT, through(n.id) * scale));
        const total = slots.reduce((a, b) => a + b, 0) + Math.max(0, col.length - 1) * NODE_GAP;
        let y = TOP + Math.max(0, (H - total) / 2);
        col.forEach((n, k) => {
          const h = Math.max(2, through(n.id) * scale);
          box[n.id] = { x: colX(s), slotY: y, slot: slots[k], y: y + (slots[k] - h) / 2, h, node: n };
          y += slots[k] + NODE_GAP;
        });
      });
    };
    const mid = (id: string) => box[id].y + box[id].h / 2;

    /* Order each column by the weighted position of what it connects to — a
       few sweeps of the barycentre heuristic, which removes most crossings.
       Systems with no neighbours on the swept side keep their place. */
    const sweep = (dir: "down" | "up") => {
      const order = dir === "down" ? cols.map((_, s) => s).slice(1) : cols.map((_, s) => s).reverse().slice(1);
      for (const s of order) {
        const bary = (n: FlowNode) => {
          const rel = live.filter(l => (dir === "down" ? l.to === n.id : l.from === n.id));
          const w = rel.reduce((a, l) => a + l.value, 0);
          if (!w) return mid(n.id);
          return rel.reduce((a, l) => a + mid(dir === "down" ? l.from : l.to) * l.value, 0) / w;
        };
        const keyed = cols[s].map(n => ({ n, k: bary(n) }));
        keyed.sort((a, b) => a.k - b.k);
        cols[s] = keyed.map(x => x.n);
        place();
      }
    };
    place();
    sweep("down"); sweep("up"); sweep("down");

    // Stack ribbons on each bar in the order their far ends sit, centred.
    const outs: Record<string, typeof live> = {};
    const ins: Record<string, typeof live> = {};
    live.forEach(l => { (outs[l.from] ??= []).push(l); (ins[l.to] ??= []).push(l); });
    const thick = (v: number) => Math.max(1.5, v * scale);
    const outY: Record<number, number> = {};
    const inY: Record<number, number> = {};
    for (const [id, list] of Object.entries(outs)) {
      list.sort((a, b) => mid(a.to) - mid(b.to));
      const sum = list.reduce((a, l) => a + thick(l.value), 0);
      let y = box[id].y + Math.max(0, (box[id].h - sum) / 2);
      list.forEach(l => { outY[l.i] = y; y += thick(l.value); });
    }
    for (const [id, list] of Object.entries(ins)) {
      list.sort((a, b) => mid(a.from) - mid(b.from));
      const sum = list.reduce((a, l) => a + thick(l.value), 0);
      let y = box[id].y + Math.max(0, (box[id].h - sum) / 2);
      list.forEach(l => { inY[l.i] = y; y += thick(l.value); });
    }

    const ribbons: Ribbon[] = live.map(l => {
      const t = thick(l.value);
      const x0 = box[l.from].x + NODE_W, x1 = box[l.to].x;
      const ay = outY[l.i], by = inY[l.i];
      const c = (x1 - x0) * 0.5;
      const d = `M${x0},${ay} C${x0 + c},${ay} ${x1 - c},${by} ${x1},${by} L${x1},${by + t} C${x1 - c},${by + t} ${x0 + c},${ay + t} ${x0},${ay + t} Z`;
      return { ...l, d, thick: t };
    });
    // Violations draw last so a leak is never hidden under a compliant flow.
    const rank: Record<FlowTone, number> = { ok: 0, warn: 1, violation: 2 };
    ribbons.sort((a, b) => rank[a.tone] - rank[b.tone]);

    const width = stages ? colX(stages - 1) + NODE_W + LABEL_TAIL : 0;
    return { box, ribbons, width, height: TOP + H + BOTTOM, stages, gutter, colX, inSum, outSum };
  }, [nodes, links, containerW]);

  /* What is lit: the hovered thing, else whatever the inspector has open. */
  const focus: Hover =
    hover ??
    (activeLinkIndex != null ? { kind: "link", i: activeLinkIndex }
      : activeNodeId ? { kind: "node", id: activeNodeId } : null);
  const litLink = (r: Ribbon) =>
    !focus || (focus.kind === "link" ? focus.i === r.i : r.from === focus.id || r.to === focus.id);
  const litNode = (id: string) => {
    if (!focus) return true;
    if (focus.kind === "node") return focus.id === id || layout.ribbons.some(r => litLink(r) && (r.from === id || r.to === id));
    const r = layout.ribbons.find(x => x.i === focus.i);
    return !!r && (r.from === id || r.to === id);
  };

  const labelMax = Math.min(layout.gutter, LABEL_TAIL) - LABEL_PAD * 2;
  const move = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setTip({ x: e.clientX - rect.left + (wrapRef.current?.scrollLeft ?? 0), y: e.clientY - rect.top });
  };
  const leave = () => { setHover(null); setTip(null); };

  const tipBody = (() => {
    if (!hover || !tip) return null;
    if (hover.kind === "link") {
      const r = layout.ribbons.find(x => x.i === hover.i);
      if (!r) return null;
      return (
        <>
          <p className="font-semibold text-primary">
            {layout.box[r.from]?.node.name} → {layout.box[r.to]?.node.name}
          </p>
          {r.phiType && <p className="text-tertiary">{r.phiType}</p>}
          <p className="tabular text-secondary">{fmt(r.value)} records / day</p>
          <p className="flex items-center gap-1.5 text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ background: TONE_FILL[r.tone] }} />
            {TONE_LABEL[r.tone]}
          </p>
          <p className="mt-1 text-quaternary">Click to inspect this flow</p>
        </>
      );
    }
    const b = layout.box[hover.id];
    if (!b) return null;
    const touching = layout.ribbons.filter(r => r.from === hover.id || r.to === hover.id);
    const bad = touching.filter(r => r.tone === "violation").length;
    return (
      <>
        <p className="font-semibold text-primary">{b.node.name}</p>
        <p className="tabular text-secondary">
          In {fmt(layout.inSum[hover.id] ?? 0)} · Out {fmt(layout.outSum[hover.id] ?? 0)} / day
        </p>
        <p className="text-secondary">
          {touching.length} flow{touching.length === 1 ? "" : "s"}
          {bad ? <span className="text-feedback-error"> · {bad} unencrypted</span> : null}
        </p>
        <p className="mt-1 text-quaternary">Click for this system's detail</p>
      </>
    );
  })();

  return (
    <div ref={wrapRef} className="relative w-full" onMouseLeave={leave}>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
        className="block max-w-none"
        role="img"
        aria-label="PHI data flow, sized by daily record volume"
      >
        {/* stage captions */}
        {Array.from({ length: layout.stages }, (_, s) => STAGE_LABELS[s] ?? "Onward recipients").map((label, s) => (
          <text
            key={s}
            x={layout.colX(s)}
            y={12}
            fill="var(--sem-text-quaternary)"
            fontSize="10"
            fontWeight="500"
            style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            {label}
          </text>
        ))}

        {/* ribbons under the bars */}
        <g>
          {layout.ribbons.map(r => {
            const on = litLink(r);
            const hot = focus?.kind === "link" && focus.i === r.i;
            return (
              <path
                key={r.i}
                d={r.d}
                fill={TONE_FILL[r.tone]}
                opacity={!on ? 0.07 : hot ? 0.72 : focus ? 0.55 : r.tone === "ok" ? 0.26 : 0.4}
                className={onSelectLink ? "cursor-pointer outline-none" : undefined}
                style={{ transition: "opacity 160ms" }}
                tabIndex={onSelectLink ? 0 : undefined}
                role={onSelectLink ? "button" : undefined}
                aria-label={`${layout.box[r.from]?.node.name} to ${layout.box[r.to]?.node.name}${r.phiType ? `, ${r.phiType}` : ""}: ${fmt(r.value)} records a day, ${TONE_LABEL[r.tone].toLowerCase()}`}
                onMouseEnter={() => setHover({ kind: "link", i: r.i })}
                onMouseMove={move}
                onFocus={() => setHover({ kind: "link", i: r.i })}
                onBlur={leave}
                onClick={() => onSelectLink?.(r.i)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectLink?.(r.i); } }}
              >
                <title>{`${fmt(r.value)} PHI records/day`}</title>
              </path>
            );
          })}
        </g>

        {/* systems: a bar, and its label beside it */}
        {Object.values(layout.box).map(({ x, y, h, slotY, slot, node }) => {
          const on = litNode(node.id);
          const cy = slotY + slot / 2;
          const unencrypted = node.encryption !== "AES-256";
          return (
            <g
              key={node.id}
              className="cursor-pointer outline-none"
              tabIndex={0}
              role="button"
              aria-label={`${node.name}, ${fmt(node.records)} records a day${unencrypted ? ", unencrypted" : ""}`}
              opacity={on ? 1 : 0.3}
              style={{ transition: "opacity 160ms" }}
              onClick={() => onSelect(node.id)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node.id); } }}
              onMouseEnter={() => setHover({ kind: "node", id: node.id })}
              onMouseMove={move}
              onFocus={() => setHover({ kind: "node", id: node.id })}
              onBlur={leave}
            >
              <title>{`${node.name} · ${fmt(node.records)} PHI records/day · ${node.encryption}`}</title>
              <rect x={x} y={y} width={NODE_W} height={h} rx="2" fill={TONE_FILL[node.status]} />
              {/* generous hit area: the bar alone is too thin to aim at */}
              <rect x={x - 4} y={slotY} width={NODE_W + LABEL_PAD + labelMax} height={slot} fill="transparent" />
              <g
                style={{ paintOrder: "stroke" }}
                stroke="var(--sem-surface-container)"
                strokeWidth="3"
                strokeOpacity={0.85}
                strokeLinejoin="round"
                pointerEvents="none"
              >
                <text x={x + NODE_W + LABEL_PAD} y={cy - 2} fill="var(--sem-text-primary)" fontSize="12" fontWeight="600">
                  {fitLabel(node.name, labelMax)}
                </text>
                <text x={x + NODE_W + LABEL_PAD} y={cy + 12} fontSize="10.5">
                  <tspan fill="var(--sem-text-tertiary)">{fmt(node.records)}/day</tspan>
                  {unencrypted && (
                    <tspan fill="var(--sem-severity-critical)" fontWeight="600"> · Unencrypted</tspan>
                  )}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {tipBody && tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-max max-w-[260px] rounded-lg border border-muted bg-container px-3 py-2 text-caption shadow-lg"
          style={{
            left: Math.min(tip.x + 14, Math.max(0, layout.width - 270)),
            top: tip.y + 16,
          }}
        >
          {tipBody}
        </div>
      )}
    </div>
  );
}

/* SVG text does not ellipsise, so labels are fitted by estimate. Geist at
   12px averages ~6.6px per character in the bold weight used here. */
const NAME_CHAR_W = 6.6;

function fitLabel(name: string, maxWidth: number): string {
  const max = Math.max(4, Math.floor(maxWidth / NAME_CHAR_W));
  return name.length <= max ? name : `${name.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export default PhiSankey;
