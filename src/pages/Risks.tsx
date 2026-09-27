import { BAND_FILL } from "@/lib/tone";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Badge, Btn, SectionHeader, SlideOver } from "@/components/ui-bits";
import { AppIcon } from "@/components/AppIcon";
import { RiskMatrix } from "@/components/RiskMatrix";
import { DataState } from "@/components/DataState";
import { DataTable, type Column } from "@/components/DataTable";
import { listAsQuery } from "@/lib/listQuery";
import {
  PageHeader, MetricCard, RiskBadge, RiskScore, Field, FieldGroup, FilterBar, EntityAvatar, MiniBar,
} from "@/components/ui-patterns";
import { formatScore, BAND_TONE, BAND_ORDER, bandRank } from "@/lib/risk";
import { useRisks, useRiskMatrix } from "@/hooks/useRisks";
import { useListControls } from "@/hooks/useListControls";
import { useRecomputeAssetRisk } from "@/hooks/useMutations";
import { useCanWrite } from "@/hooks/use-auth";
import { describeApiError, toApiError } from "@/lib/apiErrors";
import { notify } from "@/lib/notify";
import type { ApiRisk, RiskBand } from "@/lib/apiTypes";
import { LOCALE, DATE_OPTIONS } from "@/lib/format";

/**
 * Risk register, backed by /api/risks.
 *
 * The API scores each asset on likelihood × impact × exposure × control gap
 * and returns the band it derived. Owner, due date, category and workflow
 * status have no source on the wire yet, so those columns are not rendered —
 * an empty column reads as missing data, which in a compliance tool is worse
 * than an absent one. The remediation workflow that would fill them is
 * specified in FRONTEND_API_CONTRACT.md.
 *
 * Recompute is real: POST /api/risks/:assetId/recompute re-runs the engine
 * server-side and this page renders whatever comes back. The score is never
 * calculated in the browser.
 */

const idOf = (r: ApiRisk) => `R-${String(r.id).padStart(3, "0")}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(LOCALE, DATE_OPTIONS);

export default function Risks() {
  const navigate = useNavigate();
  const canWrite = useCanWrite();

  const [params, setParams] = useSearchParams();
  const openId = params.get("open") ? Number(params.get("open")) : null;

  const controls = useListControls<{ band?: RiskBand }>({ band: undefined });
  const risks = useRisks(controls.params);
  const rows = useMemo(() => risks.data ?? [], [risks.data]);

  /* The matrix plots the whole register, not the page under it. */
  const matrix = useRiskMatrix();
  const matrixRisks = matrix.matrix ?? [];
  const allRows = useMemo(() => matrix.data ?? [], [matrix.data]);

  const raw = useRisks({ pageSize: 200 });
  const rawRows = useMemo(() => raw.data ?? [], [raw.data]);

  const counts = useMemo(() => ({
    total: raw.meta?.total ?? rawRows.length,
    severe: rawRows.filter(r => r.band === "CRITICAL" || r.band === "EXTREME").length,
    high: rawRows.filter(r => r.band === "HIGH").length,
    peak: rawRows.length ? Math.max(...rawRows.map(r => r.score)) : 0,
  }), [rawRows, raw.meta]);

  const bandCounts = useMemo(
    () => Object.fromEntries(BAND_ORDER.map(b => [b, rawRows.filter(r => r.band === b).length])),
    [rawRows],
  );

  const openRisk = (id: number | null) => {
    const next = new URLSearchParams(params);
    if (id === null) next.delete("open");
    else next.set("open", String(id));
    setParams(next, { replace: true });
  };

  const selected = useMemo(
    () => rawRows.find(r => r.id === openId) ?? rows.find(r => r.id === openId) ?? null,
    [rawRows, rows, openId],
  );

  const columns: Column<ApiRisk>[] = [
    {
      id: "id",
      header: "ID",
      width: "w-24",
      sortValue: r => r.id,
      searchValue: r => idOf(r),
      cell: r => <span className="tabular text-tertiary">{idOf(r)}</span>,
    },
    {
      id: "asset",
      header: "Asset",
      sortValue: r => r.assetName,
      searchValue: r => r.assetName,
      cell: r => (
        <div className="flex items-center gap-2.5">
          <EntityAvatar icon="risk" tone="muted" size="sm" />
          <span className="truncate text-body-md text-primary">{r.assetName}</span>
        </div>
      ),
    },
    { id: "L", header: "L", align: "right", hideBelow: "md", sortValue: r => r.likelihood, cell: r => r.likelihood },
    { id: "I", header: "I", align: "right", hideBelow: "md", sortValue: r => r.impact, cell: r => r.impact },
    { id: "exposure", header: "Exposure", align: "right", hideBelow: "lg", sortValue: r => r.exposure, cell: r => r.exposure },
    { id: "controlGap", header: "Control gap", align: "right", hideBelow: "lg", sortValue: r => r.controlGap, cell: r => r.controlGap },
    {
      id: "score",
      header: "Score",
      align: "right",
      sortValue: r => r.score,
      cell: r => <RiskScore score={r.score} className="tabular font-medium text-primary" />,
    },
    {
      id: "band",
      header: "Band",
      sortValue: r => bandRank(r.band),
      cell: r => <RiskBadge band={r.band} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon="risk"
        title="Risk Register"
        description="Every assessed system, worst first. The score weighs likelihood, impact, exposure and control gaps."
        actions={
          <Btn variant="outline" onClick={() => { void risks.refresh(); void matrix.refresh(); }} disabled={risks.isFetching}>
            <AppIcon name="refresh" size="sm" spin={risks.isFetching} />
            Refresh
          </Btn>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Assets scored" art="risk" value={risks.data ? counts.total : undefined} icon="risks" domainIcon="asset" />
        <MetricCard
          label="Critical or extreme" art="kpiCritical"
          value={risks.data ? counts.severe : undefined}
          icon="threats" domainIcon="risk"
          tone="danger"
          emphasis={Boolean(counts.severe)}
        />
        <MetricCard label="High" art="warning" value={risks.data ? counts.high : undefined} icon="activity" domainIcon="risk" tone="warning" />
        <MetricCard label="Highest score" art="chart" value={risks.data ? counts.peak : undefined} icon="chart" domainIcon="risk" />
      </div>

      <Card className="p-4">
        <SectionHeader
          title="Risk Matrix"
          subtitle="Where risk concentrates. Select a square to list its assets, then an asset to open its record."
        />
        <DataState
          query={listAsQuery(matrix)}
          height={420}
          emptyIcon="risks"
          emptyArt="emptyRisks"
          emptyTitle="No scored assets"
          emptyMessage="No risk rows were returned. Import assets and recompute their risk to populate this."
        >
          {() => (
            <RiskMatrix
              risks={matrixRisks}
              layout="side"
              highlightId={openId != null ? `R-${String(openId).padStart(3, "0")}` : null}
              onSelect={id => {
                const numeric = Number(String(id).replace(/^R-0*/, ""));
                if (Number.isFinite(numeric)) openRisk(numeric);
              }}
            />
          )}
        </DataState>
      </Card>

      <Card className="p-4">
        <DataTable
          label="Risk register"
          query={listAsQuery(risks)}
          server={{
            meta: risks.meta,
            page: controls.page,
            onPageChange: controls.setPage,
            pageSize: controls.pageSize,
            onPageSizeChange: controls.setPageSize,
            onSearch: controls.setSearch,
            searchValue: controls.search,
            isPaging: risks.isPaging,
          }}
          columns={columns}
          getRowId={r => r.id}
          onRowClick={r => openRisk(r.id)}
          isRowActive={r => r.id === openId}
          initialSort={{ columnId: "score", direction: "desc" }}
          searchPlaceholder="Search by asset…"
          emptyArt="emptyRisks"
          emptyTitle="No risks recorded"
          emptyMessage="No risk rows were returned by the API."
          toolbar={
            <FilterBar
              label="Filter by band"
              value={controls.filters.band ?? "all"}
              onChange={v => controls.setFilter("band", v === "all" ? undefined : (v as RiskBand))}
              options={[
                { value: "all", label: "All", count: raw.meta?.total ?? rawRows.length },
                ...BAND_ORDER.map(b => ({ value: b, label: b[0] + b.slice(1).toLowerCase(), count: bandCounts[b] ?? 0 })),
              ]}
            />
          }
        />
        <div className="mt-4 border-t border-muted pt-3">
          <MiniBar segments={BAND_ORDER.map(b => ({ value: bandCounts[b] ?? 0, tone: BAND_TONE[b], label: b, fill: BAND_FILL[b] }))} />
        </div>
      </Card>

      <RiskDrawer risk={selected} onClose={() => openRisk(null)} canWrite={canWrite} onOpenAsset={id => navigate(`/assets?open=${id}`)} />
    </div>
  );
}

function RiskDrawer({
  risk, onClose, canWrite, onOpenAsset,
}: {
  risk: ApiRisk | null;
  onClose: () => void;
  canWrite: boolean;
  onOpenAsset: (assetId: number) => void;
}) {
  const recompute = useRecomputeAssetRisk();

  const onRecompute = async () => {
    if (!risk) return;
    try {
      const next = await recompute.mutateAsync(risk.assetId);
      notify.success(`Risk rescored: ${formatScore(next.score)} (${next.band})`);
    } catch (err) {
      notify.error(describeApiError(toApiError(err)).message);
    }
  };

  return (
    <SlideOver
      open={risk !== null}
      onClose={onClose}
      width={460}
      title={risk ? `${idOf(risk)} · ${risk.assetName}` : "Risk"}
      footer={
        risk && canWrite ? (
          <div className="flex w-full items-center gap-2">
            <Btn variant="outline" onClick={() => onOpenAsset(risk.assetId)} className="flex-1">
              Open asset
            </Btn>
            <Btn variant="primary" onClick={() => void onRecompute()} disabled={recompute.isPending} className="flex-1">
              <AppIcon name="refresh" size="sm" spin={recompute.isPending} />
              {recompute.isPending ? "Rescoring…" : "Recompute"}
            </Btn>
          </div>
        ) : undefined
      }
    >
      {risk && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <EntityAvatar icon="risk" tone={BAND_TONE[risk.band]} size="lg" />
            <div>
              <div className="flex items-baseline gap-3">
                <RiskScore score={risk.score} className="font-display text-display-metric tabular text-primary" />
                <RiskBadge band={risk.band} />
              </div>
              <p className="mt-1 text-body-sm text-tertiary">
                Derived from four factors by the API scoring engine.
              </p>
            </div>
          </div>

          <FieldGroup title="Scoring factors">
            <Field label="Likelihood" value={`${risk.likelihood} / 5`} />
            <Field label="Impact" value={`${risk.impact} / 5`} />
            <Field label="Exposure" value={`${risk.exposure} / 5`} />
            <Field label="Control gap" value={`${risk.controlGap} / 5`} />
          </FieldGroup>

          <FieldGroup title="Record">
            <Field label="Risk ID" value={idOf(risk)} />
            <Field label="Asset" value={risk.assetName} />
            <Field label="Last computed" value={fmtDate(risk.computedAt)} />
          </FieldGroup>

          <p className="rounded-lg bg-raised px-3 py-2 text-caption text-tertiary">
            The grid position shows likelihood × impact only. The band also weighs exposure and
            control gap, so a chip's colour will often differ from its cell — that is the engine
            being more precise than two axes can show, not a display error.
          </p>
        </div>
      )}
    </SlideOver>
  );
}
