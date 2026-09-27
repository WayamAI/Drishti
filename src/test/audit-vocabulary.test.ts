import { describe, expect, it } from "vitest";
import { describeAuditSubject, humaniseAction, isAuthAction, isFeedNoise } from "@/lib/audit";
import { hoursAgoLabel, timeAgo } from "@/lib/dates";
import type { ApiAuditEntry } from "@/lib/apiTypes";

const entry = (over: Partial<ApiAuditEntry>): ApiAuditEntry => ({
  id: 1, action: "ASSET_UPDATED", actor: { id: 1, email: "admin@drishti.ai" },
  entityType: "Asset", entityId: 3, result: "SUCCESS", metadata: null, ip: null,
  createdAt: "2026-09-27T10:00:00.000Z", ...over,
});

describe("audit subjects", () => {
  it("names the record rather than its row id", () => {
    expect(describeAuditSubject(entry({ metadata: { name: "Imaging Archive" } }))).toBe("Imaging Archive");
    expect(describeAuditSubject(entry({ metadata: { title: "Obtain a signed BAA" } }))).toBe("Obtain a signed BAA");
  });

  it("falls back to type and id only when nothing better was recorded", () => {
    expect(describeAuditSubject(entry({}))).toBe("Asset #3");
    expect(describeAuditSubject(entry({ entityType: null, entityId: null }))).toBeNull();
  });

  it("shows a status change as a transition", () => {
    const e = entry({ action: "THREAT_STATUS_CHANGED", metadata: { title: "Pump gateway", from: "OPEN", to: "INVESTIGATING" } });
    expect(describeAuditSubject(e)).toBe("Pump gateway · Open → Investigating");
  });

  it("names what an import wrote, and how much", () => {
    const imp = (metadata: Record<string, unknown>) =>
      describeAuditSubject(entry({ action: "IMPORT_COMPLETED", entityType: "Import", entityId: null, metadata }));
    expect(imp({ entity: "vendors", imported: 4 })).toBe("Vendors · 4 rows");
    expect(imp({ entity: "access-grants", imported: 1 })).toBe("Access grants · 1 row");
    expect(imp({ entity: "phi-types" })).toBe("PHI types");
  });
});

describe("audit actions", () => {
  it("treats sign-ins and token refreshes as authentication", () => {
    for (const a of ["LOGIN", "LOGIN_FAILED", "LOGOUT", "TOKEN_REFRESHED"]) expect(isAuthAction(a)).toBe(true);
    for (const a of ["ASSET_UPDATED", "IMPORT_COMPLETED", "ACCESS_REVOKED"]) expect(isAuthAction(a)).toBe(false);
  });

  it("keeps an import's start out of the feed, but not its outcome", () => {
    expect(isFeedNoise("IMPORT_STARTED")).toBe(true);
    expect(isFeedNoise("IMPORT_COMPLETED")).toBe(false);
    expect(isFeedNoise("IMPORT_FAILED")).toBe(false);
    expect(isFeedNoise("LOGIN")).toBe(true);
  });

  it("reads an action as a sentence", () => {
    expect(humaniseAction("REMEDIATION_STATUS_CHANGED")).toBe("Remediation status changed");
  });
});

describe("relative time", () => {
  it("ages events the way the threat list does", () => {
    expect(hoursAgoLabel(0.4)).toBe("just now");
    expect(hoursAgoLabel(5)).toBe("5h ago");
    expect(hoursAgoLabel(72)).toBe("3d ago");
  });

  it("never reports a future timestamp as negative", () => {
    const now = Date.parse("2026-09-27T10:00:00.000Z");
    expect(timeAgo("2026-09-27T12:00:00.000Z", now)).toBe("just now");
    expect(timeAgo("2026-09-27T07:00:00.000Z", now)).toBe("3h ago");
  });
});
