import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Badge, Btn, SlideOver, Select } from "@/components/ui-bits";
import { AppIcon } from "@/components/AppIcon";
import { PhiSankey, type FlowNode, type FlowLink } from "@/components/PhiSankey";
import { DataState } from "@/components/DataState";
import { listAsQuery } from "@/lib/listQuery";
import { PageHeader, Field, FieldGroup, EntityAvatar, MetricCard } from "@/components/ui-patterns";
import { useDataFlows, useRawDataFlows } from "@/hooks/useDataFlows";
import { notify } from "@/lib/notify";
import { LOCALE } from "@/lib/format";
import { remediationLink } from "@/lib/remediationLink";
import type { ApiDataFlow, RemediationSeverity } from "@/lib/apiTypes";

type Selection = { kind: "node"; id: string } | { kind: "flow"; index: number } | null;

const TONE_BADGE = { ok: "success", warn: "warning", violation: "danger" } as const;
const TONE_WORD = { ok: "Compliant", warn: "Warning", violation: "Violation" } as const;

/** Past this many rows an inspector list turns into a dropdown. */
const INSPECTOR_LIST_MAX = 5;

const SEVERITY_FOR: Record<NonNullable<ApiDataFlow["sensitivity"]>, RemediationSeverity> = {
  CRITICAL: "CRITICAL", HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW",
};

const fmt = (n: number) => n.toLocaleString(LOCALE);

/**
 * PHI flow map — where patient data actually moves.
 *
 * Removed in the Drishti pass: a four-step "Remediation Workflow" that set a
 * local boolean, recoloured the ribbons, dropped the violation count to zero
 * and announced "Violation resolved, encryption applied." Nothing was ever
 * written; a refresh brought the violation straight back. Claiming a security
 * remediation that did not happen is the most damaging thing this product
 * could do, so it is gone until POST /api/dataflows/:id/remediate exists
 * (specified in FRONTEND_API_CONTRACT.md).
 *
 * The node drawer also carried invented facts — a fixed "Name, DOB, SSN,
 * Diagnosis" data-type list, "Users with access: 47", "Last audit: Apr 22
 * 2025", "RBAC ✓" and a compliance check that was a two-second timer. The
 * drawer now shows only what /api/dataflows actually returns.
 */
export default function PhiFlow() {
  const navigate = useNavigate();
  const flows = useDataFlows();
  const rawFlows = useRawDataFlows();
  const chartRef = useRef<HTMLDivElement>(null);

  const [sel, setSel] = useState<Selection>(null);
  const openNode = useCallback((id: string) => setSel({ kind: "node", id }), []);
  const openFlow = useCallback((index: number) => setSel({ kind: "flow", index }), []);
  const [filter, setFilter] = useState("all");
  const [phiType, setPhiType] = useState("all");

  const nodes = useMemo(() => flows.graph?.nodes ?? [], [flows.graph]);
  const links = useMemo(() => flows.graph?.links ?? [], [flows.graph]);

  const onScan = () => {
    void Promise.all([flows.refresh(), rawFlows.refresh()]).then(() =>
      notify.success("Flow map refreshed from the API"),
    );
  };

  /** PHI categories present in the live data — not a fixed list. */
  const phiTypes = useMemo(() => {
    const set = new Set((rawFlows.data ?? []).map(f => f.phiType));
    return Array.from(set).sort();
  }, [rawFlows.data]);

  /** Edge keys that carry the selected PHI type, when one is chosen. */
  const phiTypeEdgeKeys = useMemo(() => {
    if (phiType === "all") return null;
    return new Set(
      (rawFlows.data ?? [])
        .filter(f => f.phiType === phiType)
        .map(f => `${f.source}→${f.target}`),
    );
  }, [rawFlows.data, phiType]);

  const filteredEdges = useMemo(() => {
    let out: FlowLink[] = links;
    if (filter === "violations") out = out.filter(e => e.tone === "violation");
    else if (filter === "high") out = out.filter(e => e.value > 50_000);
    if (phiTypeEdgeKeys) {
      const nameFor = (id: string) => nodes.find(n => n.id === id)?.name ?? id;
      out = out.filter(e => phiTypeEdgeKeys.has(`${nameFor(e.from)}→${nameFor(e.to)}`));
    }
    return out;
  }, [links, filter, phiTypeEdgeKeys, nodes]);

  /** Only draw nodes the current filter still connects. */
  const visibleNodes = useMemo(() => {
    if (filter === "all" && phiType === "all") return nodes;
    const keep = new Set(filteredEdges.flatMap(e => [e.from, e.to]));
    return nodes.filter(n => keep.has(n.id));
  }, [nodes, filter, phiType, filteredEdges]);

  /** Summary is derived from the same records the chart draws, never restated. */
  const summary = useMemo(() => {
    const violations = links.filter(e => e.tone === "violation");
    return {
      total: links.length,
      compliant: links.filter(e => e.tone === "ok").length,
      violations: violations.length,
      warnings: links.filter(e => e.tone === "warn").length,
      inTransit: links.reduce((sum, e) => sum + e.value, 0),
      firstViolation: violations[0] ?? null,
    };
  }, [links]);

  const nameOf = useCallback(
    (id: string) => nodes.find(n => n.id === id)?.name ?? id,
    [nodes],
  );

  const exposureScore = useMemo(() => {
    if (!summary.total) return 0;
    const risky = links.filter(e => e.tone !== "ok").reduce((s, e) => s + e.value, 0);
    return Math.round((risky / Math.max(1, summary.inTransit)) * 100);
  }, [links, summary]);

  /**
   * Real export: serialise the rendered SVG and hand it to the browser as a
   * download. The old button toasted "Flow map exported as PNG" and produced
   * no file. SVG rather than PNG because it needs no canvas rasterisation
   * step and stays sharp at any size.
   */
  const onExport = useCallback(() => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) { notify.error("Nothing to export yet — the map is still loading."); return; }
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `drishti-phi-flow-${new Date().toISOString().slice(0, 10)}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    notify.success("Flow map downloaded");
  }, []);

  const records = useMemo(() => flows.data ?? [], [flows.data]);
  const selectedNode = sel?.kind === "node" ? nodes.find(n => n.id === sel.id) ?? null : null;
  const selectedFlow = sel?.kind === "flow" ? records[sel.index] ?? null : null;
  const selectedTone = sel?.kind === "flow" ? links[sel.index]?.tone ?? "ok" : "ok";

  /** Every flow in or out of the open system, worst and busiest first. */
  const nodeFlows = useMemo(() => {
    if (!selectedNode) return [];
    const rank = { violation: 0, warn: 1, ok: 2 } as const;
    return records
      .map((f, index) => ({ f, index, tone: links[index]?.tone ?? "ok" }))
      .filter(({ f }) => f.source === selectedNode.name || f.target === selectedNode.name)
      .sort((a, b) => rank[a.tone] - rank[b.tone] || b.f.recordsPerDay - a.f.recordsPerDay);
  }, [selectedNode, records, links]);

  const flowLabel = (f: ApiDataFlow) => `${f.source} → ${f.target}`;

  /** Hand-off for an unencrypted flow: the gap is a missing transit control. */
  const flowRemediation = (f: ApiDataFlow) =>
    remediationLink({
      source: "CONTROL",
      title: `Encrypt ${f.phiType} in transit: ${f.source} → ${f.target}`,
      description: `${fmt(f.recordsPerDay)} ${f.phiType} records a day move from ${f.source} to ${f.target} without encryption.`,
      recommendation: "Enforce TLS 1.2+ on the connection (or encrypt the payload), then rescan the flow map to confirm.",
      severity: f.sensitivity ? SEVERITY_FOR[f.sensitivity] : "HIGH",
      assetId: f.sourceAssetId,
      context: `PHI flow ${f.source} → ${f.target} (${f.phiType})`,
    });

  const activeLinkIndex = sel?.kind === "flow" ? filteredEdges.findIndex(e => e.index === sel.index) : -1;

  return (
    <div className="space-y-4">
      <PageHeader
        icon="dataFlow"
        title="PHI Data Flow Map"
        description="Every mapped movement of PHI between systems, sized by daily volume and coloured by encryption status."
        meta={
          <>
            <Badge tone={exposureScore >= 50 ? "danger" : exposureScore >= 25 ? "warning" : "success"}>
              PHI Exposure Score: {exposureScore} / 100
            </Badge>
            <span className="text-caption text-tertiary">{summary.total} flows monitored</span>
          </>
        }
        actions={
          <>
            <Select value={phiType} onChange={e => setPhiType(e.target.value)} aria-label="Filter by PHI type">
              <option value="all">All PHI types</option>
              {phiTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter flows">
              <option value="all">All flows</option>
              <option value="violations">Only violations</option>
              <option value="high">High volume</option>
            </Select>
            <Btn variant="outline" onClick={onScan} disabled={flows.isFetching}>
              <AppIcon name="refresh" size="sm" spin={flows.isFetching} />
              Rescan
            </Btn>
            <Btn variant="outline" onClick={onExport}>
              <AppIcon name="download" size="sm" />
              Export
            </Btn>
          </>
        }
      />

      {summary.firstViolation && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-feedback-error-stroke bg-feedback-error-background p-3">
          <AppIcon name="threats" size="md" className="text-feedback-error" />
          <span className="text-body-md text-primary">
            <span className="font-semibold">
              {summary.violations} active violation{summary.violations === 1 ? "" : "s"}:
            </span>{" "}
            unencrypted PHI on {nameOf(summary.firstViolation.from)} → {nameOf(summary.firstViolation.to)}.
          </span>
          <div className="flex-1" />
          <Btn
            variant="outline"
            onClick={() => summary.firstViolation?.index != null && openFlow(summary.firstViolation.index)}
          >
            Inspect flow
          </Btn>
          {filter !== "violations" && summary.violations > 1 && (
            <Btn variant="outline" onClick={() => setFilter("violations")}>
              Show all {summary.violations}
            </Btn>
          )}
        </div>
      )}

      {/*
        The summary reads as a KPI row above the map rather than a column
        beside it: beside it, the map lost 300px and the last stage was
        clipped behind a scrollbar at ordinary desktop widths.
      */}
      <section aria-label="Flow summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Flows mapped" art="dataFlow" value={flows.data ? summary.total : undefined} sub={`${summary.compliant} compliant`} icon="phiFlow" domainIcon="dataFlow" />
        <MetricCard
          label="Violations" art="kpiUnencrypted"
          value={flows.data ? summary.violations : undefined}
          sub="unencrypted PHI in transit"
          icon="unlocked" domainIcon="control"
          tone="danger"
          emphasis={summary.violations > 0}
          onClick={summary.violations > 0 ? () => setFilter("violations") : undefined}
        />
        <MetricCard
          label="Warnings" art="warning"
          value={flows.data ? summary.warnings : undefined}
          sub="flows needing review"
          icon="warning" domainIcon="risk"
          tone="warning"
          emphasis={summary.warnings > 0}
        />
        <MetricCard
          label="PHI in transit today" art="phi"
          value={flows.data ? summary.inTransit.toLocaleString(LOCALE) : undefined}
          sub="records across all flows"
          icon="record" domainIcon="phi"
        />
      </section>

      <Card className="min-w-0 p-4">
        <DataState
          query={listAsQuery(flows)}
          height={496}
          emptyArt="emptyPhiFlow"
          emptyTitle="No PHI flows recorded"
          emptyMessage="The API returned no data flows. If the backend was just set up, run the seed script."
        >
          {() => (
            <div className="relative w-full overflow-x-auto" ref={chartRef}>
              {filteredEdges.length === 0 ? (
                <p className="py-16 text-center text-body-sm text-tertiary">
                  No flows match the current filters.
                </p>
              ) : (
                <PhiSankey
                  nodes={visibleNodes}
                  links={filteredEdges}
                  onSelect={openNode}
                  onSelectLink={i => { const idx = filteredEdges[i]?.index; if (idx != null) openFlow(idx); }}
                  activeNodeId={selectedNode?.id ?? null}
                  activeLinkIndex={activeLinkIndex >= 0 ? activeLinkIndex : null}
                />
              )}
            </div>
          )}
        </DataState>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-muted pt-3 text-caption text-tertiary">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-severity-low" /> Encrypted</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-severity-high" /> Needs review</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-severity-critical" /> Unencrypted</span>
          <span className="sm:ml-auto">Bar height and ribbon width are PHI records a day. Click a system or a ribbon to inspect it.</span>
        </div>
      </Card>

      {/* System inspector — only fields the API actually returns. */}
      <SlideOver open={!!selectedNode} onClose={() => setSel(null)} title={selectedNode?.name} width={400}>
        {selectedNode && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <EntityAvatar icon="asset" tone={TONE_BADGE[selectedNode.status]} size="lg" />
              <div>
                <Badge tone={TONE_BADGE[selectedNode.status]}>{TONE_WORD[selectedNode.status]}</Badge>
                <p className="mt-1.5 text-body-sm text-tertiary">{fmt(selectedNode.records)} PHI records a day</p>
              </div>
            </div>

            <FieldGroup>
              <Field label="Records / day" value={fmt(selectedNode.records)} />
              <Field
                label="Encryption"
                value={
                  selectedNode.encryption === "AES-256"
                    ? <Badge tone="success">AES-256</Badge>
                    : <Badge tone="danger">Unencrypted</Badge>
                }
              />
            </FieldGroup>

            <FieldGroup title={`Flows through this system (${nodeFlows.length})`}>
              {nodeFlows.length === 0 ? (
                <p className="py-2 text-body-sm text-quaternary">No flow records reference this system.</p>
              ) : nodeFlows.length > INSPECTOR_LIST_MAX ? (
                /* A long list pushes the actions below the fold; past a handful
                   of flows the inspector offers them as a dropdown instead. */
                <div className="py-2">
                  <Select
                    value=""
                    onChange={e => e.target.value !== "" && openFlow(Number(e.target.value))}
                    aria-label="Open a flow through this system"
                    className="w-full"
                  >
                    <option value="">
                      Choose a flow… ({nodeFlows.filter(x => x.tone === "violation").length} unencrypted)
                    </option>
                    {nodeFlows.map(({ f, index, tone }) => (
                      <option key={index} value={index}>
                        {tone === "violation" ? "⚠ " : ""}{flowLabel(f)} · {f.phiType} · {fmt(f.recordsPerDay)}/day
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--sem-stroke-muted)]">
                  {nodeFlows.map(({ f, index, tone }) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => openFlow(index)}
                        className="flex w-full items-center gap-2 py-2 text-left outline-none hover:bg-action focus-visible:ring-2 focus-visible:ring-active"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm text-primary">{flowLabel(f)}</span>
                          <span className="block text-caption text-tertiary">{f.phiType} · {fmt(f.recordsPerDay)}/day</span>
                        </span>
                        {tone !== "ok" && <Badge tone={TONE_BADGE[tone]}>{tone === "violation" ? "Unencrypted" : "Review"}</Badge>}
                        <AppIcon name="chevronRight" size="sm" className="text-quaternary" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </FieldGroup>

            <div className="grid gap-2">
              <Btn variant="outline" className="w-full" onClick={() => navigate(`/assets?search=${encodeURIComponent(selectedNode.name)}`)}>
                Open asset
              </Btn>
              <Btn variant="outline" className="w-full" onClick={() => navigate(`/access?search=${encodeURIComponent(selectedNode.name)}`)}>
                Review who can reach this
              </Btn>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Flow inspector — one PHI movement, and the way to get it fixed. */}
      <SlideOver
        open={!!selectedFlow}
        onClose={() => setSel(null)}
        title={selectedFlow ? `${selectedFlow.phiType} flow` : undefined}
        width={400}
        footer={
          selectedFlow && selectedTone !== "ok" ? (
            <Btn variant="primary" className="w-full" onClick={() => navigate(flowRemediation(selectedFlow))}>
              Raise remediation
            </Btn>
          ) : undefined
        }
      >
        {selectedFlow && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <EntityAvatar icon="dataFlow" tone={TONE_BADGE[selectedTone]} size="lg" />
              <div>
                <Badge tone={TONE_BADGE[selectedTone]}>{TONE_WORD[selectedTone]}</Badge>
                <p className="mt-1.5 text-body-sm text-tertiary">
                  {selectedTone === "violation"
                    ? "PHI leaves this system unencrypted."
                    : selectedTone === "warn" ? "This flow needs review." : "Encrypted in transit."}
                </p>
              </div>
            </div>

            <FieldGroup>
              <Field label="From" value={<button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => openNode(nodes.find(n => n.name === selectedFlow.source)?.id ?? "")}>{selectedFlow.source}</button>} />
              <Field label="To" value={<button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => openNode(nodes.find(n => n.name === selectedFlow.target)?.id ?? "")}>{selectedFlow.target}</button>} />
              <Field label="PHI category" value={selectedFlow.phiType} />
              {selectedFlow.sensitivity && (
                <Field label="Sensitivity" value={selectedFlow.sensitivity.charAt(0) + selectedFlow.sensitivity.slice(1).toLowerCase()} />
              )}
              <Field label="Records / day" value={fmt(selectedFlow.recordsPerDay)} />
              <Field
                label="Encryption"
                value={selectedFlow.encrypted ? <Badge tone="success">Encrypted</Badge> : <Badge tone="danger">Unencrypted</Badge>}
              />
            </FieldGroup>

            {selectedTone !== "ok" && (
              <p className="rounded-lg bg-raised px-3 py-2 text-caption text-tertiary">
                Raising a remediation opens the form pre-filled with this flow, linked to {selectedFlow.source}.
                Nothing is created until you confirm it.
              </p>
            )}

            <Btn
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/assets?search=${encodeURIComponent(selectedFlow.source)}`)}
            >
              Open {selectedFlow.source}
            </Btn>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
