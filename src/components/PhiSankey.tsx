import { useMemo, useState } from "react";
import { LOCALE } from "@/lib/format";

/**
 * PHI flow, drawn as a volume-weighted Sankey.
 *
 * The previous view was a node-and-arrow tree: every box was the same size and
 * every connector the same width, so it showed topology and nothing else. The
 * legend even claimed "line thickness proportional to data volume" while all
 * lines were identical.
 *
 * Here geometry carries the data. Node height and ribbon thickness are both
 * proportional to PHI records/day, so the two facts that matter read instantly:
 * where the volume concentrates, and which of those heavy paths is unencrypted.
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

export type FlowLink = { from: string; to: string; value: number; tone: FlowTone };

const TONE_STROKE: Record<FlowTone, string> = {
  ok: "var(--sem-severity-low)",
  warn: "var(--sem-severity-high)",
  violation: "var(--sem-severity-critical)",
};

const STAGE_LABELS = ["Ingress", "Core system", "Downstream systems", "External recipients"];

// Geometry. Cards are wide enough to hold a label; the gutters hold the ribbons.
const CARD_W = 152;
const GUTTER = 96;
/* How far the map may shrink to fit before it scrolls instead. Below this
   the 11.5px labels drop under ~9.5px and stop being comfortably legible. */
const MIN_SCALE = 0.82;
const H = 470;
const NODE_GAP = 14;
const TOP = 26;

export function PhiSankey({
  nodes,
  links,
  onSelect,
}: {
  nodes: FlowNode[];
  links: FlowLink[];
  onSelect: (id: string) => void;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const layout = useMemo(() => {
    /* Real data arrives over the wire, so a stage may be absent, fractional or
       NaN. Geometry maths on a NaN silently poisons every downstream value and
       takes the whole chart out, so inputs are coerced to a sane integer here
       rather than trusted. */
    const stageOf = (n: FlowNode) =>
      Number.isFinite(n.stage) ? Math.max(0, Math.round(n.stage)) : 0;
    const valueOf = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);

    const stages = nodes.length ? Math.max(...nodes.map(stageOf)) + 1 : 0;
    const byStage: FlowNode[][] = Array.from({ length: stages }, () => []);
    nodes.forEach(n => byStage[stageOf(n)].push(n));

    // A node is as tall as the larger of what flows in and what flows out.
    const throughput = (id: string) => {
      const inSum = links.filter(l => l.to === id).reduce((a, l) => a + valueOf(l.value), 0);
      const outSum = links.filter(l => l.from === id).reduce((a, l) => a + valueOf(l.value), 0);
      return Math.max(inSum, outSum, 1);
    };

    // One scale across every column, otherwise thickness isn't comparable.
    const stageTotals = byStage.map(col => col.reduce((a, n) => a + throughput(n.id), 0));
    const busiest = stageTotals.length ? Math.max(...stageTotals) : 0;
    const busiestIdx = Math.max(0, stageTotals.indexOf(busiest));
    const gapsInBusiest = Math.max(0, (byStage[busiestIdx]?.length ?? 1) - 1) * NODE_GAP;
    const scale = busiest > 0 ? (H - gapsInBusiest) / busiest : 0;

    const MIN_H = 26; // keeps a one-line label readable in the smallest node
    const box: Record<string, { x: number; y: number; w: number; h: number; node: FlowNode }> = {};

    byStage.forEach((col, s) => {
      const heights = col.map(n => Math.max(MIN_H, throughput(n.id) * scale));
      const total = heights.reduce((a, b) => a + b, 0) + (col.length - 1) * NODE_GAP;
      let y = TOP + (H - total) / 2;
      col.forEach((n, idx) => {
        box[n.id] = { x: s * (CARD_W + GUTTER), y, w: CARD_W, h: heights[idx], node: n };
        y += heights[idx] + NODE_GAP;
      });
    });

    // Stack ribbons along each node's edge in a stable order.
    const outCursor: Record<string, number> = {};
    const inCursor: Record<string, number> = {};
    const ribbons = links.map(l => {
      const a = box[l.from], b = box[l.to];
      if (!a || !b) return null;

      const aOut = links.filter(x => x.from === l.from).reduce((s, x) => s + x.value, 0);
      const bIn = links.filter(x => x.to === l.to).reduce((s, x) => s + x.value, 0);
      const aThick = (l.value / aOut) * a.h;
      const bThick = (l.value / bIn) * b.h;

      const ay = a.y + (outCursor[l.from] ?? 0);
      const by = b.y + (inCursor[l.to] ?? 0);
      outCursor[l.from] = (outCursor[l.from] ?? 0) + aThick;
      inCursor[l.to] = (inCursor[l.to] ?? 0) + bThick;

      const x0 = a.x + a.w, x1 = b.x;
      const c0 = x0 + (x1 - x0) * 0.5, c1 = x1 - (x1 - x0) * 0.5;
      const d = [
        `M${x0},${ay}`,
        `C${c0},${ay} ${c1},${by} ${x1},${by}`,
        `L${x1},${by + bThick}`,
        `C${c1},${by + bThick} ${c0},${ay + aThick} ${x0},${ay + aThick}`,
        "Z",
      ].join(" ");
      return { ...l, d };
    }).filter(Boolean) as (FlowLink & { d: string })[];

    const width = stages * CARD_W + (stages - 1) * GUTTER;
    return { box, ribbons, width, stages };
  }, [nodes, links]);

  const dim = (id: string, from?: string, to?: string) =>
    hoverId !== null && hoverId !== id && hoverId !== from && hoverId !== to;

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${H + TOP + 34}`}
      /*
       * Scale down a little to fit, never a lot. With w-full alone the
       * viewBox shrank the map to the container, so at 390px the diagram
       * rendered at about a third and every label came out under 4px. At
       * 1:1 only, a five-stage estate clipped behind a scrollbar on an
       * ordinary desktop. MIN_SCALE is the compromise; past it, the wrapper
       * scrolls.
       */
      style={{ minWidth: Math.round(layout.width * MIN_SCALE) }}
      className="h-[540px] w-full"
      role="img"
      aria-label="PHI data flow, sized by daily record volume"
    >
      {/* stage captions */}
      {Array.from({ length: layout.stages }, (_, s) => STAGE_LABELS[s] ?? "Onward recipients").map((label, s) => (
        <text
          key={s}
          x={s * (CARD_W + GUTTER)}
          y={12}
          fill="var(--sem-text-quaternary)"
          fontSize="10"
          fontWeight="500"
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {label}
        </text>
      ))}

      {/* ribbons under the cards */}
      <g>
        {layout.ribbons.map((r, i) => (
          <path
            key={i}
            d={r.d}
            fill={TONE_STROKE[r.tone]}
            opacity={dim("", r.from, r.to) ? 0.12 : r.tone === "violation" ? 0.5 : 0.34}
            style={{ transition: "opacity 200ms" }}
          >
            <title>{`${r.value.toLocaleString(LOCALE)} PHI records/day`}</title>
          </path>
        ))}
      </g>

      {/* nodes */}
      {Object.values(layout.box).map(({ x, y, w, h, node }) => {
        const stroke = TONE_STROKE[node.status];
        const faded = dim(node.id, undefined, undefined) &&
          !layout.ribbons.some(r => (r.from === hoverId && r.to === node.id) || (r.to === hoverId && r.from === node.id));
        return (
          <g
            key={node.id}
            transform={`translate(${x},${y})`}
            className="cursor-pointer"
            onClick={() => onSelect(node.id)}
            onMouseEnter={() => setHoverId(node.id)}
            onMouseLeave={() => setHoverId(null)}
            opacity={faded ? 0.35 : 1}
            style={{ transition: "opacity 200ms" }}
          >
            <rect
              width={w} height={h} rx="6"
              fill="var(--sem-surface-raised-x2)"
              stroke={stroke}
              strokeWidth={node.status === "violation" ? 1.75 : 1}
            />
            {/* status spine: a solid edge reads at any node height */}
            <rect width="3" height={h} rx="1.5" fill={stroke} />

            <text x="11" y={h >= 40 ? 16 : h / 2 + 4} fill="var(--sem-text-primary)" fontSize="11.5" fontWeight="600">
              {fitLabel(node.name, w - 20)}
            </text>
            {h >= 40 ? (
              <text x="11" y="30" fill="var(--sem-text-tertiary)" fontSize="10">
                {(Number.isFinite(node.records) ? node.records : 0).toLocaleString(LOCALE)} rec/day
              </text>
            ) : fitsBeside(node.name, recordsLabel(node.records), w) ? (
              /* Too short for a second line: fold the volume onto the label row,
                 but only when it will not collide with the name. */
              <text x={w - 9} y={h / 2 + 4} textAnchor="end" fill="var(--sem-text-tertiary)" fontSize="9.5">
                {recordsLabel(node.records)}
              </text>
            ) : null}
            {h >= 58 && (
              <text
                x="11" y="45"
                fill={node.encryption === "AES-256" ? "var(--sem-feedback-success-icon)" : "var(--sem-severity-critical)"}
                fontSize="9.5" fontWeight="600"
              >
                {node.encryption === "AES-256" ? "AES-256" : "UNENCRYPTED"}
              </text>
            )}
            <title>{`${node.name} · ${(Number.isFinite(node.records) ? node.records : 0).toLocaleString(LOCALE)} PHI records/day · ${node.encryption}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

/* SVG text does not ellipsise, so labels are fitted by estimate. Geist at
   11.5px averages ~6.3px per character in the bold weight used here. */
const NAME_CHAR_W = 6.3;
const COUNT_CHAR_W = 5.4;

const recordsLabel = (records: number) => (Number.isFinite(records) ? records : 0).toLocaleString(LOCALE);

function fitLabel(name: string, maxWidth: number): string {
  const max = Math.floor(maxWidth / NAME_CHAR_W);
  return name.length <= max ? name : `${name.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function fitsBeside(name: string, count: string, cardWidth: number): boolean {
  return 11 + name.length * NAME_CHAR_W + 10 + count.length * COUNT_CHAR_W + 9 <= cardWidth;
}

export default PhiSankey;
