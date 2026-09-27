import { useMemo, useState } from "react";
import { Card, Badge, Btn, SlideOver } from "@/components/ui-bits";
import { AppIcon } from "@/components/AppIcon";
import { DataTable, listAsQuery, type Column } from "@/components/DataTable";
import { PageHeader, Field, FieldGroup, FilterBar, EntityAvatar } from "@/components/ui-patterns";
import { useAudit } from "@/hooks/useGovernance";
import { useListControls } from "@/hooks/useListControls";
import type { ApiAuditEntry } from "@/lib/apiTypes";
import { LOCALE, DATETIME_OPTIONS } from "@/lib/format";
import {
  AUDIT_ACTION_GROUPS as ACTION_GROUPS, auditIconFor as iconFor, auditResultTone as resultTone,
  humaniseAction as humanise, describeAuditSubject,
} from "@/lib/audit";

/**
 * Audit trail — who did what, to what, when, and with what result.
 *
 * Replaces a page that rendered twenty fabricated log rows from a fixture.
 * This one is the real thing: GET /api/audit, ADMIN-only, newest first, and
 * strictly read-only. There is no write path in the API and there is none
 * here — a trail you can add entries to is not a trail.
 *
 * Every mutation elsewhere in the app invalidates this query, so an action
 * taken in another tab shows up here without a manual refresh.
 */

const fmtWhen = (iso: string) => new Date(iso).toLocaleString(LOCALE, DATETIME_OPTIONS);

export default function AuditPage() {
  const [group, setGroup] = useState("all");
  const controls = useListControls<Record<string, never>>({});
  const entries = useAudit(controls.params);
  const [selected, setSelected] = useState<ApiAuditEntry | null>(null);

  const rows = useMemo(() => entries.data ?? [], [entries.data]);

  /*
   * Grouping is applied client-side over the page, and the UI says so.
   * The API filters by exact `action`, not by family, so a family filter
   * would need one request per member — this narrows what is on screen and
   * does not pretend to have searched the whole trail.
   */
  const shown = useMemo(() => {
    const g = ACTION_GROUPS.find(x => x.value === group);
    return g && g.value !== "all" ? rows.filter(r => g.match(r.action)) : rows;
  }, [rows, group]);

  const columns: Column<ApiAuditEntry>[] = [
    {
      id: "when",
      header: "When",
      width: "w-44",
      sortValue: e => -new Date(e.createdAt).getTime(),
      cell: e => <span className="tabular text-tertiary">{fmtWhen(e.createdAt)}</span>,
    },
    {
      id: "actor",
      header: "Actor",
      hideBelow: "sm",
      sortValue: e => e.actor?.email ?? null,
      cell: e => e.actor
        ? <span className="truncate text-body-sm text-primary">{e.actor.email}</span>
        : <span className="text-tertiary">System</span>,
    },
    {
      id: "action",
      header: "Action",
      sortValue: e => e.action,
      cell: e => (
        <div className="flex items-center gap-2.5">
          <EntityAvatar icon={iconFor(e.action)} tone="muted" size="sm" />
          <span className="truncate text-body-md text-primary">{humanise(e.action)}</span>
        </div>
      ),
    },
    {
      id: "entity",
      header: "Subject",
      hideBelow: "md",
      sortValue: e => describeAuditSubject(e),
      cell: e => {
        const subject = describeAuditSubject(e);
        return subject
          ? <span className="truncate text-body-sm text-secondary" title={e.entityType ? `${e.entityType} #${e.entityId}` : undefined}>{subject}</span>
          : <span className="text-tertiary">—</span>;
      },
    },
    {
      id: "result",
      header: "Result",
      sortValue: e => e.result,
      cell: e => <Badge tone={resultTone(e.result)}>{e.result}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon="audit"
        title="Audit Trail"
        description="Every recorded action across the organisation, newest first. Read-only by design."
        actions={
          <Btn variant="outline" onClick={() => void entries.refresh()} disabled={entries.isFetching}>
            <AppIcon name="refresh" size="sm" spin={entries.isFetching} />
            Refresh
          </Btn>
        }
        meta={
          entries.meta
            ? <span className="text-caption text-tertiary">
                {entries.meta.total.toLocaleString(LOCALE)} recorded events
              </span>
            : undefined
        }
      />

      <Card className="p-4">
        <DataTable
          label="Audit trail"
          query={listAsQuery({ ...entries, data: entries.data ? shown : undefined })}
          server={{
            meta: entries.meta,
            page: controls.page,
            onPageChange: controls.setPage,
            pageSize: controls.pageSize,
            onPageSizeChange: controls.setPageSize,
            isPaging: entries.isPaging,
          }}
          columns={columns}
          getRowId={e => e.id}
          onRowClick={e => setSelected(e)}
          isRowActive={e => e.id === selected?.id}
          emptyIcon="audit"
          emptyArt="emptyAudit"
          emptyTitle="No recorded activity"
          emptyMessage="Nothing has been recorded against this organisation yet."
          noMatchTitle="Nothing on this page"
          toolbar={
            <FilterBar
              label="Filter by activity"
              value={group}
              onChange={setGroup}
              options={ACTION_GROUPS.map(g => ({ value: g.value, label: g.label }))}
            />
          }
        />
        {group !== "all" && (
          <p className="mt-2 text-caption text-tertiary">
            Narrowing this page only — the API filters by exact action, so use
            paging to move through the whole trail.
          </p>
        )}
      </Card>

      <SlideOver
        open={selected !== null}
        onClose={() => setSelected(null)}
        width={460}
        title={selected ? humanise(selected.action) : "Event"}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <EntityAvatar icon={iconFor(selected.action)} tone={resultTone(selected.result)} size="lg" />
              <div>
                <Badge tone={resultTone(selected.result)}>{selected.result}</Badge>
                <p className="mt-1.5 text-body-sm text-tertiary">{fmtWhen(selected.createdAt)}</p>
              </div>
            </div>

            <FieldGroup title="Event">
              <Field label="Action" value={<span className="font-mono text-body-sm">{selected.action}</span>} />
              <Field label="Actor" value={selected.actor?.email ?? "System"} />
              <Field
                label="Subject"
                value={selected.entityType ? `${selected.entityType} #${selected.entityId}` : "—"}
              />
              <Field label="Result" value={selected.result} />
              <Field label="Source IP" value={selected.ip ?? "—"} />
              <Field label="Recorded" value={fmtWhen(selected.createdAt)} />
            </FieldGroup>

            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <FieldGroup title="Details">
                {/*
                  Rendered as JSON rather than parsed into prose: the shape
                  varies by action, and inventing a sentence per action is how
                  a log starts saying things the record does not.
                  Credentials and patient identifiers are stripped server-side
                  before storage.
                */}
                <pre className="overflow-x-auto rounded-lg border border-muted bg-raised p-2.5 text-caption text-secondary">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </FieldGroup>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
