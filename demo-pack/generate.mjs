#!/usr/bin/env node
/**
 * Drishti client demo pack — file generator.
 *
 * Writes the CSVs a hospital team would really hand Drishti during one working
 * week, shaped exactly to the backend's import contract
 * (MedGuard_Shield_Backend/src/services/importSpec.ts):
 *
 *   IT hands over a new department's systems      -> assets, PHI types, flows, risks
 *   Procurement's quarterly vendor register        -> vendors
 *   The IAM team's monthly access-review export    -> access grants
 *   Security operations' overnight SIEM export     -> threats
 *   A spreadsheet somebody got wrong               -> vendors, deliberately invalid
 *
 * Every file is additive to the backend's demo tenant ("Drishti Demo
 * Healthcare", `npm run db:seed:demo`): new rows only reference records that
 * either the seed or an earlier file in this pack created, and no row repeats
 * a natural key the seed already holds — import only ever adds.
 *
 * Dates are relative to the day you run this, so the alerts always read as
 * "this week". Regenerate on the morning of a demo:
 *
 *   node demo-pack/generate.mjs
 *
 * No dependencies. Nothing here is real: every system, vendor and event is
 * invented, and there is no patient data of any kind.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "files");

const DAY = 24 * 60 * 60 * 1000;
const iso = d => d.toISOString().slice(0, 10);
const ago = n => iso(new Date(Date.now() - n * DAY));

/** RFC 4180 quoting, CRLF line endings — what Excel writes and the importer reads. */
const cell = v => {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function write(rel, header, rows) {
  const path = join(OUT, rel);
  mkdirSync(dirname(path), { recursive: true });
  const text = [header, ...rows.map(r => header.map(h => r[h]))].map(r => r.map(cell).join(",")).join("\r\n") + "\r\n";
  writeFileSync(path, text, "utf8");
  console.log(`  ${rel.padEnd(58)} ${rows.length} rows`);
}

console.log(`Writing demo files to ${OUT}\n`);

/* ─────────────── Scenario 1 · Oncology goes live (IT → compliance) ─────────────── */

const ONCOLOGY_ASSETS = [
  // The clean one: built to standard, recently assessed.
  { name: "Oncology EHR Module", type: "EHR", phiVolume: 128000, encrypted: true, mfaEnabled: true, lastAssessedAt: ago(7) },
  { name: "Radiation Therapy Planning", type: "OTHER", phiVolume: 41500, encrypted: true, mfaEnabled: false, lastAssessedAt: ago(40) },
  // Medical-device integration: the classic weak link.
  { name: "Infusion Pump Gateway", type: "API", phiVolume: 9800, encrypted: false, mfaEnabled: false, lastAssessedAt: "" },
  // Research copy of treatment data nobody assessed before go-live.
  { name: "Oncology Research Registry", type: "DATABASE", phiVolume: 64000, encrypted: false, mfaEnabled: false, lastAssessedAt: "" },
];
write("1-oncology-go-live/01_assets__it_handover.csv",
  ["name", "type", "phiVolume", "encrypted", "mfaEnabled", "lastAssessedAt"], ONCOLOGY_ASSETS);

write("1-oncology-go-live/02_phi-types__data_classification.csv", ["name", "sensitivity"], [
  { name: "Oncology Treatment Plans", sensitivity: "HIGH" },
  { name: "Medication Administration", sensitivity: "MEDIUM" },
]);

// Flows reference the seed's systems ("Cardiology EHR", "Billing Database",
// "Analytics Warehouse") and PHI types ("Demographics", "Billing & Claims",
// "Clinical Notes") as well as the ones created by files 01 and 02.
write("1-oncology-go-live/03_data-flows__interface_catalogue.csv",
  ["sourceAssetName", "targetAssetName", "phiTypeName", "recordsPerDay", "encrypted"], [
    { sourceAssetName: "Cardiology EHR", targetAssetName: "Oncology EHR Module", phiTypeName: "Demographics", recordsPerDay: 3200, encrypted: true },
    { sourceAssetName: "Oncology EHR Module", targetAssetName: "Radiation Therapy Planning", phiTypeName: "Oncology Treatment Plans", recordsPerDay: 1400, encrypted: true },
    // Three unencrypted flows the go-live introduced, for the PHI Flow banner to find.
    { sourceAssetName: "Infusion Pump Gateway", targetAssetName: "Oncology EHR Module", phiTypeName: "Medication Administration", recordsPerDay: 6800, encrypted: false },
    { sourceAssetName: "Oncology EHR Module", targetAssetName: "Billing Database", phiTypeName: "Billing & Claims", recordsPerDay: 2900, encrypted: false },
    { sourceAssetName: "Oncology EHR Module", targetAssetName: "Oncology Research Registry", phiTypeName: "Clinical Notes", recordsPerDay: 1100, encrypted: false },
    { sourceAssetName: "Oncology Research Registry", targetAssetName: "Analytics Warehouse", phiTypeName: "Oncology Treatment Plans", recordsPerDay: 900, encrypted: true },
  ]);

// Score = L x I x E x C / 625 x 100, banded at 20 / 40 / 60 / 80.
// Chosen so the four new systems land in four different bands.
write("1-oncology-go-live/04_risks__go_live_risk_assessment.csv",
  ["assetName", "likelihood", "impact", "exposure", "controlGap"], [
    { assetName: "Oncology EHR Module", likelihood: 2, impact: 5, exposure: 3, controlGap: 2 },        // 9.6   LOW
    { assetName: "Radiation Therapy Planning", likelihood: 3, impact: 4, exposure: 3, controlGap: 4 }, // 23.04 MODERATE
    { assetName: "Infusion Pump Gateway", likelihood: 4, impact: 4, exposure: 4, controlGap: 4 },      // 40.96 HIGH
    { assetName: "Oncology Research Registry", likelihood: 4, impact: 5, exposure: 5, controlGap: 5 }, // 80    CRITICAL
  ]);

/* ─────────────── Scenario 2 · Quarterly vendor register (procurement) ─────────────── */

write("2-vendor-register-refresh/vendors__q3_procurement_register.csv",
  ["name", "baaStatus", "phiVolume", "lastAssessedAt"], [
    // Oncology's dosing software vendor: live, reaching treatment data, no BAA.
    { name: "Meridose Oncology Software", baaStatus: "MISSING", phiVolume: 128000, lastAssessedAt: "" },
    { name: "ClearVoice Medical Transcription", baaStatus: "PENDING", phiVolume: 46000, lastAssessedAt: ago(35) },
    { name: "Courier Health Records Storage", baaStatus: "EXPIRED", phiVolume: 210000, lastAssessedAt: ago(420) },
    { name: "Stratus Secure Fax", baaStatus: "SIGNED", phiVolume: 8200, lastAssessedAt: ago(60) },
  ]);

/* ─────────────── Scenario 3 · Monthly access review (IAM export) ─────────────── */

// identityName must match a seeded identity's display name exactly. Grants
// are on the new oncology systems, so none repeats a seeded identity+asset.
write("3-monthly-access-review/access-grants__iam_export_oncology.csv",
  ["identityName", "assetName", "level", "grantedAt", "lastUsedAt"], [
    { identityName: "Dr. Lena Ortiz", assetName: "Oncology EHR Module", level: "READ", grantedAt: ago(20), lastUsedAt: ago(1) },       // clean
    { identityName: "Samuel Adeyemi", assetName: "Radiation Therapy Planning", level: "ADMIN", grantedAt: ago(30), lastUsedAt: ago(3) },
    { identityName: "Priya Raman", assetName: "Infusion Pump Gateway", level: "WRITE", grantedAt: ago(200), lastUsedAt: ago(140) },   // stale, no MFA
    { identityName: "Tomas Brandt (contractor)", assetName: "Oncology EHR Module", level: "WRITE", grantedAt: ago(25), lastUsedAt: ago(10) }, // deactivated identity
    { identityName: "svc-analytics-sync", assetName: "Oncology Research Registry", level: "ADMIN", grantedAt: ago(26), lastUsedAt: "" }, // never used
  ]);

/* ─────────────── Scenario 4 · Overnight SIEM alert batch (security operations) ─────────────── */

write("4-siem-alert-batch/threats__siem_overnight_export.csv",
  ["assetName", "severity", "status", "title", "description", "detectedAt", "resolvedAt"], [
    { assetName: "Infusion Pump Gateway", severity: "CRITICAL", status: "OPEN",
      title: "Infusion pump gateway accepting unauthenticated commands",
      description: "The gateway accepted dosing-schedule updates from a workstation that presented no credentials. 38 commands were processed between 01:12 and 01:40.",
      detectedAt: ago(0), resolvedAt: "" },
    { assetName: "Oncology Research Registry", severity: "HIGH", status: "OPEN",
      title: "Registry extract uploaded to personal cloud storage",
      description: "A 1.3 GB extract of the research registry was uploaded to a consumer cloud-storage domain from a research workstation outside the approved data-sharing process.",
      detectedAt: ago(1), resolvedAt: "" },
    { assetName: "Oncology EHR Module", severity: "MEDIUM", status: "INVESTIGATING",
      title: "After-hours chart access across unrelated oncology patients",
      description: "One clinician account opened 64 oncology charts between 23:00 and 02:00 with no scheduled encounters for those patients.",
      detectedAt: ago(2), resolvedAt: "" },
    { assetName: "Claims Gateway", severity: "HIGH", status: "OPEN",
      title: "Claims gateway TLS certificate expired",
      description: "The public certificate on the claims gateway expired; partner submissions are falling back to an unencrypted endpoint.",
      detectedAt: ago(1), resolvedAt: "" },
    { assetName: "Radiation Therapy Planning", severity: "LOW", status: "FALSE_POSITIVE",
      title: "Port scan against the treatment planning server",
      description: "Traced to the scheduled internal vulnerability scanner, which had been moved to a new subnet without updating the allow-list.",
      detectedAt: ago(3), resolvedAt: ago(2) },
  ]);

/* ─────────────── Scenario 5 · The file that should be refused ─────────────── */

// Five different mistakes people really make in spreadsheets. The importer
// must refuse the whole file and name every one — and write nothing.
write("5-rejected-file/vendors__register_with_mistakes.csv",
  ["name", "baaStatus", "phiVolume", "lastAssessedAt"], [
    { name: "Harbor Lab Couriers", baaStatus: "UNSIGNED", phiVolume: 1200, lastAssessedAt: ago(10) },   // not a BAA status
    { name: "Pinecrest Billing Partners", baaStatus: "SIGNED", phiVolume: 5400, lastAssessedAt: "31/08/2026" }, // wrong date format
    { name: "=HYPERLINK(\"http://example.invalid\",\"Click\")", baaStatus: "PENDING", phiVolume: 300, lastAssessedAt: "" }, // formula injection
    { name: "", baaStatus: "SIGNED", phiVolume: 900, lastAssessedAt: ago(5) },                         // missing required name
    { name: "Northgate Claims Services", baaStatus: "SIGNED", phiVolume: 88700, lastAssessedAt: ago(5) }, // already exists
  ]);

console.log("\nDone. Import order and the walkthrough are in demo-pack/README.md.");
