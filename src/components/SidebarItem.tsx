import { NavLink } from "react-router-dom";
import { AppIcon } from "@/components/AppIcon";
import { DomainIcon, type DomainIconName } from "@/components/DomainIcon";
import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  to: string;
  label: string;
  /** Interface glyph, for destinations with no domain noun of their own. */
  icon?: IconName;
  /**
   * The domain mark for this concept.
   *
   * Preferred over `icon`: the sidebar used to draw Assets with Lucide's
   * Database while the table beneath it drew the custom asset mark. Two
   * glyphs for one concept reads as sloppiness rather than as a system.
   */
  domainIcon?: DomainIconName;
  end?: boolean;
  badge?: string;
  badgeTone?: "danger" | "warning";
  /**
   * Roles allowed to see this destination. Absent means everyone signed in.
   * Mirrors ProtectedRoute's own gate so the sidebar never offers a door the
   * router will bounce them from.
   */
  requireRole?: readonly string[];
}

/**
 * A single sidebar destination.
 *
 * The full state matrix lives here so inactive -> hover -> active reads
 * identically for every item:
 *   inactive  surface.action slot  + icon.tertiary
 *   hover     surface.raised slot  + icon.secondary
 *   active    action-surface.primary (light) + icon.on-color (near-black)
 *
 * When `collapsed`, the label is removed from the layout and moved onto the
 * native tooltip, and any badge shrinks to a dot on the icon slot.
 */
export function SidebarItem({ item, collapsed = false }: { item: SidebarNavItem; collapsed?: boolean }) {
  const showBadge = item.badge !== undefined;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={item.label}
      // The label is only worth a tooltip when the sidebar has hidden it.
      title={collapsed ? item.label : undefined}
      /*
       * Chronos rail: the puck carries the state. Active is a solid puck and a
       * primary label; there is no row fill, so the rail stays quiet and the
       * one dark circle is the only thing that says "you are here".
       */
      className={cn(
        "group relative flex items-center rounded-full outline-none transition-colors duration-200",
        "focus-visible:ring-2 focus-visible:ring-active",
        collapsed ? "justify-center" : "w-full gap-3 pr-2",
      )}
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
              isActive
                ? "bg-action-primary text-icon-on-color"
                : "bg-action text-icon-tertiary group-hover:bg-raised-2 group-hover:text-icon-secondary",
            )}
          >
            {item.domainIcon
              ? <DomainIcon name={item.domainIcon} size={17} />
              : item.icon
                ? <AppIcon name={item.icon} size="md" />
                : null}

            {/* Collapsed: the count has nowhere to sit, so it becomes a dot. */}
            {collapsed && showBadge && (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-container",
                  item.badgeTone === "danger" ? "bg-severity-critical" : "bg-severity-high",
                )}
              />
            )}

          </span>

          {!collapsed && (
            <>
              <span
                className={cn(
                  "flex-1 truncate text-label-sm transition-colors duration-200",
                  isActive ? "text-primary" : "text-tertiary group-hover:text-secondary",
                )}
              >
                {item.label}
              </span>

              {showBadge && (
                <span
                  className={cn(
                    "tabular min-w-5 rounded-full px-1.5 py-0.5 text-center text-caption font-medium",
                    item.badgeTone === "danger" ? "bg-solid-error text-on-solid-error" : "bg-solid-warning text-on-solid-warning",
                  )}
                >
                  {item.badge}
                </span>
              )}

            </>
          )}
        </>
      )}
    </NavLink>
  );
}

export default SidebarItem;
