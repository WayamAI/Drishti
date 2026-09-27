import { useNavigate } from "react-router-dom";
import { Card, Badge, Btn, SectionHeader } from "@/components/ui-bits";
import { AppIcon } from "@/components/AppIcon";
import { PageHeader, Field, FieldGroup } from "@/components/ui-patterns";
import { useOrganization } from "@/hooks/useGovernance";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { notify } from "@/lib/notify";
import { LOCALE, DATE_OPTIONS } from "@/lib/format";
import { cn } from "@/lib/utils";

const roleLabel = (role?: string | null) =>
  role ? role.charAt(0) + role.slice(1).toLowerCase() : "—";

/**
 * Settings.
 *
 * Deliberately short: the organisation you are in, the account you are
 * signed in with, and the one preference this browser keeps. Everything is
 * either read from the API or a local preference that genuinely persists —
 * no switch here only moves React state and looks like configuration.
 *
 * What left, and why:
 *   - An estate-count KPI row. Assets and vendors are counted on the
 *     dashboard and Identities & Members; on a settings page they were noise.
 *   - The API base URL and a paragraph on token storage. True, but written
 *     for the engineer who built it, not the person who opens this page.
 *   - A theme button labelled with the *current* theme, so "Light" switched
 *     you to dark. A two-option control shows both states and which is on.
 */
export default function Settings() {
  const navigate = useNavigate();
  const org = useOrganization();
  const { user, memberships, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const onSignOut = () => {
    logout();
    notify.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Your organisation, your account, and how Drishti looks in this browser."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionHeader title="Organisation" subtitle="The workspace you are signed in to." />
          <FieldGroup>
            <Field label="Name" value={org.data?.name ?? "…"} />
            <Field label="Workspace ID" value={<span className="font-mono text-body-sm">{org.data?.slug ?? "…"}</span>} />
            <Field
              label="Your role here"
              value={org.data ? <Badge variant="soft" tone="info">{roleLabel(org.data.yourRole)}</Badge> : "…"}
            />
            <Field
              label="Created"
              value={org.data ? new Date(org.data.createdAt).toLocaleDateString(LOCALE, DATE_OPTIONS) : "…"}
            />
          </FieldGroup>
          <p className="mt-3 text-caption font-normal text-tertiary">
            Organisation details can't be changed from Drishti.
          </p>
        </Card>

        <Card className="p-4">
          <SectionHeader
            title="Your account"
            subtitle="Who you are signed in as."
            action={
              <Btn variant="outline" onClick={onSignOut}>
                <AppIcon name="logout" size="sm" />
                Sign out
              </Btn>
            }
          />
          <FieldGroup>
            <Field label="Email" value={user?.email ?? "—"} />
            <Field label="Role" value={roleLabel(user?.role)} />
            <Field
              label={memberships.length === 1 ? "Organisation" : "Organisations"}
              value={memberships.length ? memberships.map(m => m.organizationName).join(", ") : "—"}
            />
          </FieldGroup>
        </Card>
      </div>

      <Card className="p-4">
        <SectionHeader title="Appearance" subtitle="Remembered in this browser only." />
        <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-full border border-muted bg-action p-1">
          {(["light", "dark"] as const).map(t => {
            const on = theme === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTheme(t)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-label-sm outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-active",
                  on ? "bg-container text-primary shadow-sm ring-1 ring-inset ring-[var(--sem-stroke-muted)]" : "text-tertiary hover:text-secondary",
                )}
              >
                <AppIcon name={t === "dark" ? "themeDark" : "themeLight"} size="sm" />
                {t === "dark" ? "Dark" : "Light"}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
