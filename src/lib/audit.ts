import type { DomainIconName } from "@/components/DomainIcon";
import type { ApiAuditEntry } from "@/lib/apiTypes";
import type { Tone } from "@/lib/tone";

/**
 * How an audit entry is worded and marked, wherever it appears.
 *
 * One vocabulary for the Audit Trail and the dashboard's activity feed, so
 * "Remediation status changed" never reads one way on one screen and another
 * way on the next.
 */

/** Result → tone. Anything that is not an outright success is worth a colour. */
export const auditResultTone = (result: string): Tone =>
  result === "SUCCESS" ? "success"
    : result === "FAILURE" || result === "DENIED" ? "danger"
    : "warning";

export const AUDIT_ACTION_GROUPS: Array<{
  value: string; label: string; icon: DomainIconName; match: (a: string) => boolean;
}> = [
  { value: "all", label: "All activity", icon: "audit", match: () => true },
  { value: "auth", label: "Authentication", icon: "identity",
    match: a => a.startsWith("LOGIN") || a.startsWith("LOGOUT") || a.includes("SESSION") || a.includes("TOKEN") },
  { value: "asset", label: "Assets", icon: "asset", match: a => a.startsWith("ASSET") },
  { value: "risk", label: "Risk", icon: "risk", match: a => a.startsWith("RISK") },
  { value: "vendor", label: "Vendors", icon: "vendor", match: a => a.startsWith("VENDOR") },
  { value: "access", label: "Access", icon: "identity",
    match: a => a.startsWith("ACCESS") || a.startsWith("IDENTITY") },
  { value: "threat", label: "Threats", icon: "threat", match: a => a.startsWith("THREAT") },
  { value: "remediation", label: "Remediation", icon: "remediation", match: a => a.startsWith("REMEDIATION") },
  { value: "control", label: "Controls", icon: "control", match: a => a.startsWith("CONTROL") || a.startsWith("POLICY") },
  { value: "import", label: "Imports", icon: "import", match: a => a.startsWith("IMPORT") },
];

const AUTH = AUDIT_ACTION_GROUPS.find(g => g.value === "auth")!;

/** Sign-ins and token refreshes: real events, but noise in an activity feed. */
export const isAuthAction = (action: string) => AUTH.match(action);

export const auditIconFor = (action: string): DomainIconName =>
  AUDIT_ACTION_GROUPS.find(g => g.value !== "all" && g.match(action))?.icon ?? "audit";

/** RISK_RECOMPUTED -> "Risk recomputed". */
export const humaniseAction = (action: string) =>
  action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, " ");

const sentence = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

/**
 * What the entry is about, in the words the user would use.
 *
 * The backend records the record's own name or title in metadata for most
 * writes; imports record the entity and filename. The bare "Asset #3" is the
 * last resort, not the default — nobody knows their estate by row id.
 */
export function describeAuditSubject(e: ApiAuditEntry): string | null {
  const m = e.metadata ?? {};
  const str = (k: string) => (typeof m[k] === "string" && m[k] ? (m[k] as string) : null);
  const label = str("name") ?? str("title") ?? (e.action.startsWith("IMPORT") ? str("entity") : null);
  const base = label ?? (e.entityType ? `${e.entityType}${e.entityId != null ? ` #${e.entityId}` : ""}` : null);
  const from = str("from"), to = str("to");
  if (base && from && to) return `${base} · ${sentence(from)} → ${sentence(to)}`;
  return base;
}
