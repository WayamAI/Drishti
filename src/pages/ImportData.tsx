import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Badge, Btn, Select, SectionHeader, ChartSkeleton } from "@/components/ui-bits";
import { PageHeader } from "@/components/ui-patterns";
import { AppIcon } from "@/components/AppIcon";
import { DataState } from "@/components/DataState";
import { ImportPreviewTable, ImportErrorTable } from "@/components/ImportTables";
import { describeApiError } from "@/lib/apiErrors";
import {
  useImportEntities, useValidateImport, useRunImport, useTemplateDownload,
} from "@/hooks/useImport";
import { IMPORT_ENTITIES, type ImportColumnSpec, type ImportEntity } from "@/lib/apiTypes";

/** Client-side first line of defence. The server enforces the same ceiling. */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Initialisms the server writes in camelCase. Split on the case boundary they
 * would read as "Phi Volume", which is wrong twice over -- it is an initialism,
 * and it is the one in the product's name.
 */
const INITIALISMS = new Set(["phi", "ephi", "mfa", "sso", "id", "ip", "url", "api", "pii", "csv", "baa"]);

/**
 * `column` is the literal CSV header, so it arrives lowercase and camelCased.
 * Presented in title case: this list is read as a description of the file, not
 * copied out of. The exact header stays on the element's `title` for anyone
 * hand-writing a CSV rather than starting from the downloaded template.
 */
const columnLabel = (column: string) =>
  column
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word =>
      INITIALISMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");

/** The wire values are lowercase type names. Spelled out, capitalised. */
const TYPE_LABEL: Record<ImportColumnSpec["type"], string> = {
  string: "String",
  int: "Integer",
  boolean: "Boolean",
  date: "Date",
  enum: "Enum",
};

/**
 * Four record types refer to others by name, and the referenced record must
 * already exist. Shown up front so the order is learned before a file is
 * rejected for it, not after.
 */
const DEPENDS_ON: Partial<Record<ImportEntity, ImportEntity[]>> = {
  "data-flows": ["assets", "phi-types"],
  "access-grants": ["assets"],
  threats: ["assets"],
  risks: ["assets"],
};

/** Where to look at what was just imported. */
const VIEW_ROUTE: Record<ImportEntity, string> = {
  assets: "/assets",
  "phi-types": "/phi-flow",
  "data-flows": "/phi-flow",
  vendors: "/vendors",
  "access-grants": "/access",
  threats: "/threats",
  risks: "/risks",
};

type Stage = "idle" | "validated" | "imported";

export default function ImportData() {
  const entities = useImportEntities();
  const [entity, setEntity] = useState<ImportEntity>("assets");
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const navigate = useNavigate();

  const validate = useValidateImport(entity);
  const commit = useRunImport(entity);
  const template = useTemplateDownload();

  const contract = useMemo(
    () => entities.data?.find(e => e.entity === entity) ?? null,
    [entities.data, entity],
  );

  /** Everything below the picker is about one file; changing entity drops it. */
  const clearFile = () => {
    setFile(null);
    setLocalError(null);
    setStage("idle");
    validate.reset();
    commit.reset();
    if (fileInput.current) fileInput.current.value = "";
  };

  const onEntityChange = (next: ImportEntity) => {
    setEntity(next);
    clearFile();
  };

  const onPick = async (picked: File | null) => {
    setLocalError(null);
    setStage("idle");
    validate.reset();
    commit.reset();

    if (!picked) { setFile(null); return; }
    if (!picked.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setLocalError(`Only .csv files are accepted — "${picked.name}" is not one.`);
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFile(null);
      setLocalError(
        `That file is ${(picked.size / 1024 / 1024).toFixed(1)}MB. The limit is 2MB.`,
      );
      return;
    }

    setFile(picked);
    // Validation is a dry run, so it is safe to fire on selection. The commit
    // never is, and only ever happens from the button below.
    await validate.run(picked);
    setStage("validated");
  };

  const onConfirm = async () => {
    if (!file) return;
    await commit.run(file);
    setStage("imported");
  };

  const report = stage === "imported" ? commit.report : validate.report;
  const blocking = stage === "imported" ? commit.error : validate.error;
  const busy = validate.isPending || commit.isPending;
  const readyToImport = stage === "validated" && report?.valid === true && !busy;
  const imported = stage === "imported" && commit.report?.valid === true;

  const labelOf = (slug: ImportEntity) => entities.data?.find(e => e.entity === slug)?.label ?? slug;
  const prerequisites = DEPENDS_ON[entity] ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        icon="import"
        title="Data Import"
        description="Upload a CSV to add records. Every file is checked before anything is written."
      />

      <Card className="p-4">
        <SectionHeader
          title="What are you importing?"
          subtitle="Pick the record type first — changing it clears any file you have chosen."
        />

        <DataState query={entities} height={120} emptyTitle="No importable entities">
          {() => (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="entity" className="mb-1.5 block text-caption uppercase tracking-[0.08em] text-quaternary">
                  Record type
                </label>
                <Select
                  id="entity"
                  value={entity}
                  onChange={e => onEntityChange(e.target.value as ImportEntity)}
                >
                  {IMPORT_ENTITIES.map(slug => {
                    const label = entities.data?.find(e => e.entity === slug)?.label;
                    return <option key={slug} value={slug}>{label ?? slug}</option>;
                  })}
                </Select>
              </div>

              <Btn
                variant="outline"
                onClick={() => template.download(entity)}
                disabled={template.isDownloading}
              >
                <AppIcon name="download" size="sm" />
                {template.isDownloading ? "Preparing…" : "Download template"}
              </Btn>

              <div className="flex-1" />

              {contract && (
                <p className="text-body-sm text-tertiary">
                  Matched on {contract.naturalKeyLabel}.
                </p>
              )}
            </div>
          )}
        </DataState>

        {prerequisites.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-feedback-info-background px-3 py-2 text-body-sm text-feedback-info">
            <AppIcon name="info" size="sm" className="mt-0.5 shrink-0" />
            <span>
              {labelOf(entity)} refer to {prerequisites.map(labelOf).join(" and ")} by name — import{" "}
              {prerequisites.length === 1 ? "that" : "those"} first, or rows naming a record that does not exist yet
              will be rejected.
            </span>
          </div>
        )}

        {contract && (
          <div className="mt-4 border-t border-muted pt-3">
            <div className="mb-2 text-caption uppercase tracking-[0.08em] text-quaternary">Columns</div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {contract.columns.map(col => (
                <span key={col.column} className="flex items-center gap-1.5 text-body-sm">
                  <span className="text-primary" title={col.column}>{columnLabel(col.column)}</span>
                  <Badge variant="soft" tone={col.required ? "warning" : "muted"}>
                    {col.required ? "Required" : "Optional"}
                  </Badge>
                  <span className="text-tertiary">{TYPE_LABEL[col.type]}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Upload"
          subtitle="The file is checked first. Nothing is written until you confirm."
        />

        {/* Drop zone. The real <input> stays in the tree for keyboard and AT. */}
        <label
          onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            if (!busy) void onPick(e.dataTransfer.files?.[0] ?? null);
          }}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-7 text-center transition-colors",
            "focus-within:ring-2 focus-within:ring-active",
            dragging ? "border-active bg-raised-2" : "border-default bg-raised hover:border-active",
            busy ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".csv"
            aria-label="CSV file"
            disabled={busy}
            onChange={e => void onPick(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-container text-icon-secondary">
            <AppIcon name={file ? "document" : "upload"} size="md" />
          </span>
          {file ? (
            <span className="text-body-md text-primary">{file.name}
              <span className="ml-2 text-body-sm text-tertiary">{(file.size / 1024).toFixed(1)} KB</span>
            </span>
          ) : (
            <span className="text-body-md text-primary">
              Drop a CSV here, or <span className="underline underline-offset-2">choose a file</span>
            </span>
          )}
          <span className="text-caption font-normal text-tertiary">
            {labelOf(entity)} · .csv up to 2MB · checked before anything is written
          </span>
        </label>
        {file && (
          <div className="mt-2 flex justify-end">
            <Btn variant="ghost" onClick={clearFile} disabled={busy}>Clear</Btn>
          </div>
        )}

        {localError && (
          <div role="alert" className="mt-3 rounded-lg border border-feedback-error-stroke bg-feedback-error-background px-3 py-2 text-body-sm text-feedback-error">
            {localError}
          </div>
        )}

        {busy && <div className="mt-4"><ChartSkeleton height={180} label="Checking the file" /></div>}

        {!busy && blocking && (
          <div role="alert" className="mt-3 rounded-lg border border-feedback-error-stroke bg-feedback-error-background px-3 py-2 text-body-sm text-feedback-error">
            <span className="font-semibold">{describeApiError(blocking).title}.</span>{" "}
            {describeApiError(blocking).message}
          </div>
        )}

        {!busy && report && !report.valid && (
          <div className="mt-4 space-y-3">
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-feedback-error-stroke bg-feedback-error-background px-3 py-2 text-body-sm text-feedback-error">
              <AppIcon name="threats" size="sm" />
              <span>
                <span className="font-semibold">
                  {report.errors.length} problem{report.errors.length === 1 ? "" : "s"} found
                </span>{" "}
                across {report.totalRows} row{report.totalRows === 1 ? "" : "s"}. Nothing was imported.
              </span>
            </div>
            <ImportErrorTable errors={report.errors} />
          </div>
        )}

        {!busy && report?.valid && !imported && (
          <div className="mt-4 space-y-3">
            <div role="status" className="flex items-center gap-2 rounded-lg border border-feedback-success-stroke bg-feedback-success-background px-3 py-2 text-body-sm text-feedback-success">
              <AppIcon name="check" size="sm" />
              <span className="font-semibold">
                {report.totalRows} row{report.totalRows === 1 ? "" : "s"} ready to import
              </span>
            </div>
            <ImportPreviewTable rows={report.preview} />
            <div className="flex items-center gap-3">
              <Btn variant="primary" onClick={() => void onConfirm()} disabled={!readyToImport}>
                Confirm Import
              </Btn>
              <span className="text-body-sm text-tertiary">
                Checked only. Nothing has been written yet.
              </span>
            </div>
          </div>
        )}

        {!busy && imported && commit.report && (
          <div className="mt-4 space-y-3">
            <div role="status" className="flex items-center gap-2 rounded-lg border border-feedback-success-stroke bg-feedback-success-background px-3 py-2 text-body-sm text-feedback-success">
              <AppIcon name="check" size="sm" />
              <span>
                {/*
                  "Imported 2 rows into Assets" rather than "Imported 2 Assets
                  rows" — the entity labels are plural nouns ("Assets",
                  "PHI Types", "Access Grants"), so using one as an adjective
                  reads wrong for every entity, not just this one.
                */}
                <span className="font-semibold">
                  Imported {commit.report.imported ?? commit.report.totalRows} row
                  {(commit.report.imported ?? commit.report.totalRows) === 1 ? "" : "s"}
                  {" into "}{contract?.label ?? entity}
                </span>{" "}
                — the dashboard and the other views have been refreshed.
              </span>
            </div>
            <ImportPreviewTable rows={commit.report.preview} />
            <div className="flex flex-wrap items-center gap-2">
              <Btn variant="primary" onClick={() => navigate(VIEW_ROUTE[entity])}>
                View {contract?.label ?? entity}
                <AppIcon name="chevronRight" size="sm" />
              </Btn>
              <Btn variant="outline" onClick={clearFile}>Import another file</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
