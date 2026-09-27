import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Btn, SectionHeader, ChartSkeleton, EmptyState, ErrorState } from "@/components/ui-bits";
import { AppIcon } from "@/components/AppIcon";
import { EntityAvatar } from "@/components/ui-patterns";
import { useAudit } from "@/hooks/useGovernance";
import {
  auditIconFor, auditResultTone, describeAuditSubject, humaniseAction, isFeedNoise,
} from "@/lib/audit";
import { timeAgo } from "@/lib/dates";

/** How many changes the card shows. */
const SHOWN = 7;
/**
 * How many entries to read to find them. The API filters by exact action
 * only, so sign-ins are dropped here rather than server-side; reading a few
 * pages' worth means a burst of logins cannot empty the feed.
 */
const READ = 40;

/**
 * The work, as it happens: the latest changes across the estate.
 *
 * Replaces a feed that animated fixture rows with invented timestamps. This
 * one is GET /api/audit — the same trail an auditor reads — so every line is
 * something a named person actually did. Sign-ins are left to the Audit
 * Trail: real events, but noise here.
 *
 * ADMIN-only, because the endpoint is. The caller decides whether to render
 * it; `enabled` guarantees no request is ever sent for anyone else.
 */
export function RecentActivity({ enabled = true }: { enabled?: boolean }) {
  const navigate = useNavigate();
  const audit = useAudit({ pageSize: READ }, { enabled });

  const changes = useMemo(
    () => (audit.data ?? []).filter(e => !isFeedNoise(e.action)).slice(0, SHOWN),
    [audit.data],
  );

  return (
    <Card className="flex flex-col p-4">
      <SectionHeader
        title="Recent activity"
        subtitle="The latest changes across the estate, from the audit trail."
        action={
          <Btn variant="ghost" onClick={() => navigate("/audit")}>
            Audit trail
            <AppIcon name="chevronRight" size="sm" />
          </Btn>
        }
      />
      {audit.isLoading ? (
        <ChartSkeleton height={280} label="Loading recent activity" />
      ) : audit.isError ? (
        <ErrorState title="Activity is unavailable" message="The audit trail could not be read." onRetry={() => void audit.refresh()} />
      ) : changes.length === 0 ? (
        <EmptyState
          icon="history"
          title="No changes yet"
          message="Imports, reviews, status changes and new findings will appear here as they happen."
        />
      ) : (
        <ol className="flex flex-col">
          {changes.map((e, i) => {
            const subject = describeAuditSubject(e);
            return (
              <li key={e.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                {/* Timeline spine between events, stopping at the last. */}
                {i < changes.length - 1 && (
                  <span aria-hidden className="absolute bottom-0 left-[13px] top-8 w-px bg-[var(--sem-stroke-muted)]" />
                )}
                <EntityAvatar icon={auditIconFor(e.action)} tone={auditResultTone(e.result)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-body-md text-primary">{humaniseAction(e.action)}</span>
                    <time dateTime={e.createdAt} className="shrink-0 tabular text-caption font-normal text-quaternary">
                      {timeAgo(e.createdAt)}
                    </time>
                  </div>
                  {subject && <p className="truncate text-body-sm text-secondary" title={subject}>{subject}</p>}
                  <p className="truncate text-caption font-normal text-tertiary">
                    {e.actor ? e.actor.email : "System"}
                    {e.result !== "SUCCESS" && <span className="text-feedback-error"> · {e.result.toLowerCase()}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
