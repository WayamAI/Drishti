import { useLocation, useNavigate } from "react-router-dom";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Badge, Btn, EmptyState, SlideOver } from "@/components/ui-bits";
import { AppIcon } from "@/components/AppIcon";
import { IconButton } from "@/components/IconButton";
import { SidebarItem, type SidebarNavItem } from "@/components/SidebarItem";
import { DomainIcon, type DomainIconName } from "@/components/DomainIcon";
import drishtiLogoLight from "@/assets/brand/drishti-logo-light.svg";
import drishtiLogoDark from "@/assets/brand/drishti-logo-dark.svg";
import drishtiMark from "@/assets/brand/drishti-mark.svg";
import { notify } from "@/lib/notify";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useThreatSummary } from "@/hooks/useThreats";
import { useGlobalSearch, ENTITY_LABEL } from "@/hooks/useGlobalSearch";
import { cn } from "@/lib/utils";

/**
 * Navigation, grouped by the job the user is doing, in the order they do it:
 * see the posture, work what is live, know the estate, decide on risk, prove
 * governance. Every destination is backed by a live endpoint.
 */
type NavGroup = { label: string; items: SidebarNavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", domainIcon: "dashboard", end: true }],
  },
  {
    label: "Monitor",
    items: [
      // Badge is filled in at render from the live threat summary.
      { to: "/threats", label: "Threats", domainIcon: "threat", badgeTone: "danger" },
      { to: "/access", label: "Access & Identity", domainIcon: "identity" },
      { to: "/phi-flow", label: "PHI Flow", domainIcon: "dataFlow" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/assets", label: "Assets", domainIcon: "asset" },
      { to: "/vendors", label: "Vendors", domainIcon: "vendor" },
    ],
  },
  {
    label: "Risk",
    items: [
      { to: "/risks", label: "Risk Register", domainIcon: "risk" },
      { to: "/remediation", label: "Remediation", domainIcon: "remediation" },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "/controls", label: "Controls", domainIcon: "control" },
      { to: "/policies", label: "Policies", domainIcon: "audit" },
      // The audit trail is ADMIN-only server-side; mirror that here so we
      // never offer a door the API will close.
      { to: "/audit", label: "Audit Trail", domainIcon: "audit", requireRole: ["ADMIN"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/import", label: "Data Import", domainIcon: "import", requireRole: ["ADMIN"] },
      { to: "/users", label: "Identities & Members", domainIcon: "identity" },
      { to: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Governance Overview",
  "/assets": "Asset Inventory",
  "/phi-flow": "PHI Data Flow Map",
  "/access": "Access & Identity Review",
  "/vendors": "Vendor Risk",
  "/threats": "Threat & Anomaly Detection",
  "/risks": "Risk Register",
  "/import": "Data Import",
  "/remediation": "Remediation",
  "/controls": "Controls",
  "/policies": "Policies",
  "/audit": "Audit Trail",
  "/users": "Identities & Members",
  "/settings": "Settings",
};

const COLLAPSE_KEY = "drishti-sidebar-collapsed";

type PaletteEntry = {
  id: string;
  kind: "page" | "record";
  icon: DomainIconName | null;
  title: string;
  context: string;
  status?: string | null;
  to: string;
};

export default function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  /*
   * Read from /api/threats/summary, not from a page of threats: the list is
   * paginated, so counting open rows client-side would undercount. Undefined
   * while loading or unreachable, which hides the badge — no number at all
   * beats a stale or invented one.
   */
  const openThreats = useThreatSummary().data?.open;
  const openThreatBadge = openThreats ? String(openThreats) : undefined;

  /* Hide what the router would bounce them from. The API is the real gate. */
  const visibleNav = useMemo(
    () =>
      NAV.map(g => ({
        ...g,
        items: g.items.filter(i => !i.requireRole || i.requireRole.includes(user?.role ?? "")),
      })).filter(g => g.items.length > 0),
    [user?.role],
  );

  /*
   * Where you are in the menu. Looked up in the full NAV, not the role-filtered
   * one, so an admin-only page still names itself if someone lands on it.
   */
  const isActive = (i: SidebarNavItem) => (i.end ? loc.pathname === i.to : loc.pathname.startsWith(i.to));
  const activeGroup = NAV.find(g => g.items.some(isActive));
  const activeItem = activeGroup?.items.find(isActive);

  const [notifOpen, setNotifOpen] = useState(false);

  /* ------------------------------------------------------ refresh */

  /* A real refresh: invalidate every cached query and let the hooks refetch. */
  const inFlight = useIsFetching();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const onLogout = () => {
    logout();
    notify.success("Signed out");
    navigate("/login", { replace: true });
  };

  /* ---------------------------------------------------- rail state */

  // Sidebar collapse persists across reloads, like the theme choice.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored =
        window.localStorage.getItem(COLLAPSE_KEY) ??
        window.localStorage.getItem("medguard-sidebar-collapsed"); // pre-Drishti
      return stored === "true";
    } catch { return false; }
  });
  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { window.localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => { setMobileNavOpen(false); }, [loc.pathname]);
  // The mobile drawer always shows labels, whatever the desktop rail is doing.
  const railCollapsed = collapsed && !mobileNavOpen;

  /* ---------------------------------------------- command palette */

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const search = useGlobalSearch(searchTerm, paletteOpen);

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);
  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setSearchTerm("");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(open => {
          if (!open) window.setTimeout(() => searchInputRef.current?.focus(), 0);
          return !open;
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /*
   * Pages first, then records. Typing "vend" should offer the Vendors page
   * before any vendor named "Vendex" — most palette use is navigation.
   */
  const pageEntries = useMemo<PaletteEntry[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    return visibleNav.flatMap(g =>
      g.items
        .filter(i => {
          if (!q) return true;
          const title = PAGE_TITLES[i.to] ?? i.label;
          return `${i.label} ${title} ${g.label}`.toLowerCase().includes(q);
        })
        .map(i => ({
          id: `page:${i.to}`,
          kind: "page" as const,
          icon: i.domainIcon ?? null,
          title: i.label,
          context: g.label,
          to: i.to,
        })),
    );
  }, [searchTerm, visibleNav]);

  const recordEntries = useMemo<PaletteEntry[]>(
    () =>
      search.flat.map(r => ({
        id: r.id,
        kind: "record" as const,
        icon: r.icon,
        title: r.title,
        context: `${ENTITY_LABEL[r.entity]} · ${r.context}`,
        status: r.status,
        to: r.to,
      })),
    [search.flat],
  );

  const entries = useMemo(
    () => [...pageEntries.slice(0, search.active ? 4 : 14), ...recordEntries],
    [pageEntries, recordEntries, search.active],
  );

  useEffect(() => { setActiveIndex(0); }, [searchTerm]);

  const goTo = useCallback((to: string) => {
    closePalette();
    navigate(to);
  }, [closePalette, navigate]);

  const onPaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); closePalette(); return; }
    if (!entries.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => (i + 1) % entries.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => (i - 1 + entries.length) % entries.length); }
    else if (e.key === "Enter") { e.preventDefault(); goTo(entries[activeIndex].to); }
  };

  /* ----------------------------------------------------------- render */

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const displayName = user?.name ?? "Signed in";
  const initials = displayName.split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase();
  /*
   * The top bar says where you are — the menu label ("Monitor · Threats") —
   * and the page header says what the page is ("Threat & Anomaly
   * Detection"). Printing the page title in both put the same words twice,
   * sixty pixels apart, on every screen. Chronos splits them the same way.
   */
  const crumbLabel = activeItem?.label ?? PAGE_TITLES[loc.pathname] ?? "Drishti";

  return (
    <div className="flex h-screen overflow-hidden bg-page text-secondary">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-action-primary focus:px-3 focus:py-2 focus:text-on-color"
      >
        Skip to content
      </a>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* SIDEBAR — the Chronos rail: 68px of pucks collapsed, 252px expanded. */}
      <aside
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-shrink-0 flex-col border-r border-muted bg-container",
          "transition-[width,transform] duration-200 ease-out lg:static lg:translate-x-0",
          railCollapsed ? "w-[68px]" : "w-[252px]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b border-muted", railCollapsed ? "justify-center" : "justify-between pl-4 pr-3")}>
          {railCollapsed ? (
            <img src={drishtiMark} alt="Drishti" className="h-8 w-8 object-contain" />
          ) : (
            <>
              <img
                src={theme === "dark" ? drishtiLogoDark : drishtiLogoLight}
                alt="Drishti"
                className="h-7 object-contain"
              />
              <IconButton
                icon="collapse"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                size="sm"
                className="hidden lg:inline-flex"
                onClick={toggleCollapsed}
              />
            </>
          )}
        </div>

        <nav className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3", railCollapsed ? "px-[16px]" : "px-3")}>
          {visibleNav.map((group, gi) => (
            <div key={group.label} className={cn(gi > 0 && (railCollapsed ? "mt-2.5 border-t border-muted pt-2.5" : "mt-3"))}>
              {!railCollapsed && (
                <div className="mb-1 px-1 text-caption uppercase tracking-[0.08em] text-quaternary">
                  {group.label}
                </div>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map(item => (
                  <SidebarItem
                    key={item.to}
                    item={item.to === "/threats" ? { ...item, badge: openThreatBadge } : item}
                    collapsed={railCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {railCollapsed ? (
          <div className="flex shrink-0 flex-col items-center gap-1.5 border-t border-muted px-[16px] py-3">
            <RailButton icon="expand" label="Expand sidebar" onClick={toggleCollapsed} className="hidden lg:flex" />
            <RailButton
              icon={theme === "dark" ? "themeLight" : "themeDark"}
              label={theme === "dark" ? "Switch to light" : "Switch to dark"}
              onClick={toggleTheme}
            />
            <div
              className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-action-primary text-label-sm text-on-color"
              title={`${displayName} · ${user?.email ?? ""}`}
            >
              {initials}
            </div>
            <IconButton icon="logout" aria-label="Log out" title="Log out" size="sm" onClick={onLogout} />
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2.5 border-t border-muted px-3 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-action-primary text-label-sm text-on-color">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-label-sm text-primary">{displayName}</div>
              <div className="truncate text-caption font-normal text-tertiary">
                {user?.role ? `${user.role.charAt(0)}${user.role.slice(1).toLowerCase()}` : user?.email ?? ""}
              </div>
            </div>
            <IconButton
              icon={theme === "dark" ? "themeLight" : "themeDark"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              size="sm"
              onClick={toggleTheme}
            />
            <IconButton icon="logout" aria-label="Log out" title="Log out" size="sm" onClick={onLogout} />
          </div>
        )}
      </aside>

      {/* MAIN */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-muted bg-page px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <IconButton
              icon="menu"
              aria-label="Open navigation menu"
              variant="subtle"
              size="sm"
              className="flex-shrink-0 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            />

            {/*
              Where you are, as navigation rather than a heading: the page's
              own <PageHeader> carries the <h1>.
            */}
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-2.5">
                {activeGroup && activeGroup.label !== "Overview" && (
                  <li className="hidden text-caption uppercase tracking-[0.08em] text-quaternary sm:block">
                    {activeGroup.label}
                  </li>
                )}
                <li className="truncate font-display text-display-base text-primary sm:text-display-lg" aria-current="page">
                  {crumbLabel}
                </li>
              </ol>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openPalette}
              aria-label="Search Drishti"
              className="flex h-8 items-center gap-2 rounded-full border border-muted bg-action px-3 text-label-sm text-tertiary outline-none transition-colors duration-200 hover:border-default hover:bg-raised-2 hover:text-secondary focus-visible:ring-2 focus-visible:ring-active"
            >
              <AppIcon name="search" size="xs" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden rounded border border-muted px-1 font-sans text-caption text-quaternary md:inline">
                {isMac ? "⌘" : "Ctrl"}K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => void onRefresh()}
              aria-label="Refresh all data"
              title={inFlight > 0 ? "Fetching live data" : "Live · polling the API. Click to refresh now."}
              className="hidden h-8 items-center gap-1.5 rounded-full border border-muted bg-action px-3 text-label-sm text-tertiary outline-none transition-colors duration-200 hover:border-default hover:bg-raised-2 hover:text-secondary focus-visible:ring-2 focus-visible:ring-active sm:flex"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-feedback-success-icon" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-feedback-success-icon" />
              </span>
              <span className="text-feedback-success">Live</span>
              <AppIcon name="refresh" size="xs" spin={refreshing || inFlight > 0} className="text-icon-quaternary" />
            </button>

            <IconButton
              icon="notification"
              aria-label="Notifications"
              size="sm"
              onClick={() => setNotifOpen(true)}
            />
          </div>
        </header>

        <main id="main" className="relative flex-1 overflow-y-auto overflow-x-hidden bg-page p-3 sm:p-5">
          {children}
        </main>
      </div>

      {/* COMMAND PALETTE — pages and live records, one keyboard path. */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh]" onKeyDown={onPaletteKeyDown}>
          <div className="absolute inset-0 bg-black/40" onClick={closePalette} />
          <div className="fade-in relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-muted bg-container shadow-panel">
            <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-muted px-4">
              <AppIcon name="search" size="sm" className="text-icon-quaternary" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Jump to a page, or search assets, vendors, risks, threats…"
                aria-label="Search pages and records"
                role="combobox"
                aria-expanded
                aria-controls="global-search-results"
                aria-autocomplete="list"
                className="min-w-0 flex-1 bg-transparent text-body-md text-primary outline-none placeholder:text-quaternary"
              />
              <kbd className="rounded border border-muted px-1 text-caption text-quaternary">Esc</kbd>
            </div>

            <div id="global-search-results" role="listbox" aria-label="Search results" className="min-h-0 overflow-y-auto py-1.5">
              {pageEntries.length > 0 && (
                <PaletteSection label={search.active ? "Pages" : "Go to"}>
                  {entries.filter(e => e.kind === "page").map(e => (
                    <PaletteRow key={e.id} entry={e} active={entries.indexOf(e) === activeIndex}
                      onHover={() => setActiveIndex(entries.indexOf(e))} onSelect={() => goTo(e.to)} />
                  ))}
                </PaletteSection>
              )}

              {search.active && (
                search.isLoading ? (
                  <p className="px-4 py-3 text-body-sm text-tertiary">Searching records…</p>
                ) : search.isError ? (
                  <p className="px-4 py-3 text-body-sm text-feedback-error">Record search is unavailable right now.</p>
                ) : recordEntries.length === 0 ? (
                  <p className="px-4 py-3 text-body-sm text-tertiary">No records match “{search.query}”.</p>
                ) : (
                  <PaletteSection label="Records">
                    {entries.filter(e => e.kind === "record").map(e => (
                      <PaletteRow key={e.id} entry={e} active={entries.indexOf(e) === activeIndex}
                        onHover={() => setActiveIndex(entries.indexOf(e))} onSelect={() => goTo(e.to)} />
                    ))}
                  </PaletteSection>
                )
              )}

              {!search.active && searchTerm.trim().length === 1 && pageEntries.length === 0 && (
                <p className="px-4 py-3 text-body-sm text-tertiary">Keep typing to search records.</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-3 border-t border-muted px-4 py-2 text-caption text-quaternary">
              <span><kbd className="font-sans">↑↓</kbd> move</span>
              <span><kbd className="font-sans">↵</kbd> open</span>
              <span className="ml-auto">Searches the live API</span>
            </div>
          </div>
        </div>
      )}

      {/*
        Notifications have no backend. Rather than a fabricated feed with an
        invented unread count, this says so. The contract for a real event
        stream is in FRONTEND_API_CONTRACT.md.
      */}
      <SlideOver open={notifOpen} onClose={() => setNotifOpen(false)} width={380} title="Notifications">
        <EmptyState
          icon="notification"
          title="No notifications"
          message="Drishti will surface new threats, risk-band changes and failed imports here once the events API is connected."
          height={320}
        />
        <div className="mt-2 flex justify-center">
          <Btn variant="outline" onClick={() => { setNotifOpen(false); navigate("/threats"); }}>
            View open threats
          </Btn>
        </div>
      </SlideOver>
    </div>
  );
}

/** A utility control on the collapsed rail, in the same puck language as a nav item. */
function RailButton({
  icon, label, onClick, className,
}: {
  icon: React.ComponentProps<typeof AppIcon>["name"];
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "group flex items-center justify-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-active",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action text-icon-tertiary transition-colors duration-200 group-hover:bg-raised-2 group-hover:text-icon-secondary">
        <AppIcon name={icon} size="md" />
      </span>
    </button>
  );
}

function PaletteSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pb-1">
      <div className="px-4 pb-1 pt-2 text-caption uppercase tracking-[0.08em] text-quaternary">{label}</div>
      {children}
    </div>
  );
}

function PaletteRow({
  entry, active, onHover, onSelect,
}: { entry: PaletteEntry; active: boolean; onHover: () => void; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        "mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
        active ? "bg-action" : "hover:bg-action",
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-action text-icon-tertiary">
        {entry.icon ? <DomainIcon name={entry.icon} size={14} /> : <AppIcon name="settings" size="sm" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-md text-primary">{entry.title}</span>
        <span className="block truncate text-caption font-normal text-tertiary">{entry.context}</span>
      </span>
      {entry.status && <Badge tone="muted">{entry.status}</Badge>}
      {active && <AppIcon name="chevronRight" size="xs" className="text-icon-quaternary" />}
    </button>
  );
}
