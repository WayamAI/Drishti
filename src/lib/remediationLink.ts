import type { RemediationSeverity, RemediationSource } from "@/lib/apiTypes";

/**
 * Hand-off from "something is wrong" to "someone is fixing it".
 *
 * A threat, an access grant or a vendor gap is where a problem is found; the
 * Remediation register is where it gets an owner and a due date. Without this
 * the analyst had to leave the record, open Remediation, and retype which
 * asset or threat they meant — which is how findings end up unlinked, and an
 * unlinked finding cannot be traced back when the auditor asks why it exists.
 *
 * The prefill travels in the URL so the hand-off survives a reload and can be
 * shared. Nothing is created until the user confirms the form.
 */
export type RemediationPrefill = {
  source: RemediationSource;
  title: string;
  description?: string;
  recommendation?: string;
  severity?: RemediationSeverity;
  assetId?: number;
  vendorId?: number;
  threatId?: number;
  /** Human wording for what the finding is linked to, shown in the form. */
  context?: string;
};

const KEYS = ["source", "title", "description", "recommendation", "severity", "context"] as const;
const IDS = ["assetId", "vendorId", "threatId"] as const;

/*
 * Prefill fields travel namespaced — `new.severity`, not `severity`. The
 * Remediation list reads bare `severity` and `status` from the URL as its own
 * filters, so an un-namespaced hand-off silently filtered the list behind the
 * form to one severity, and left it filtered after the form closed.
 */
const P = (k: string) => `new.${k}`;

export function remediationLink(p: RemediationPrefill): string {
  const q = new URLSearchParams({ new: "1" });
  for (const k of KEYS) if (p[k]) q.set(P(k), String(p[k]));
  for (const k of IDS) if (p[k] != null) q.set(P(k), String(p[k]));
  return `/remediation?${q.toString()}`;
}

export function readRemediationPrefill(params: URLSearchParams): RemediationPrefill | null {
  if (params.get("new") !== "1") return null;
  const num = (k: string) => {
    const v = Number(params.get(P(k)));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  return {
    source: (params.get(P("source")) as RemediationSource) || "MANUAL",
    title: params.get(P("title")) ?? "",
    description: params.get(P("description")) ?? undefined,
    recommendation: params.get(P("recommendation")) ?? undefined,
    severity: (params.get(P("severity")) as RemediationSeverity) || undefined,
    assetId: num("assetId"),
    vendorId: num("vendorId"),
    threatId: num("threatId"),
    context: params.get(P("context")) ?? undefined,
  };
}

/** URL params the prefill owns, so the page can clear them on close. */
export const PREFILL_PARAMS = ["new", ...[...KEYS, ...IDS].map(P)];
