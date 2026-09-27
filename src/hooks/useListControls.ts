import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Page, page-size and search state for a server-paginated list screen.
 *
 * Exists so five list pages do not each re-derive the same two rules, both of
 * which are easy to get wrong in ways that look like data loss:
 *
 *   1. Narrowing the result set returns to page 1. Otherwise a search that
 *      leaves two pages while you are on page 5 renders an empty table, and
 *      an empty table reads as "no records" rather than "wrong page".
 *   2. The search term is debounced before it becomes a query parameter, so
 *      typing eight characters is one request rather than eight.
 */

export type ListControls<F extends Record<string, unknown>> = {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  /** Bound to the input — updates on every keystroke. */
  search: string;
  setSearch: (term: string) => void;
  /** Current filter values. */
  filters: F;
  setFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  /** Ready to spread into a list hook's params. */
  params: F & { page: number; pageSize: number; search?: string };
};

export function useListControls<F extends Record<string, unknown>>(
  initialFilters: F,
  initialPageSize = 25,
  debounceMs = 250,
): ListControls<F> {
  /*
   * Deep links drive the controls: `?search=` and any key the page declared
   * as a filter (`?band=EXTREME`, `?flaggedOnly=true`). This is what lets the
   * dashboard's findings and global search land on the exact rows they
   * describe instead of an unfiltered list.
   *
   * Applied on mount and again whenever the URL names a filter — so a link to
   * the page you are already on (⌘K from inside Risk Register) still lands.
   * A URL that names no filter leaves the controls alone: opening a row adds
   * `?open=`, and that must not wipe the chips the user just picked.
   */
  const location = useLocation();
  const [seed] = useState(() => readUrlSeed(initialFilters, location.search));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [search, setSearchState] = useState(seed.search);
  const [debouncedSearch, setDebouncedSearch] = useState(seed.search.trim());
  const [filters, setFilters] = useState<F>(seed.filters);

  const filterKeys = Object.keys(initialFilters).join(",");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const named = params.has("search") || filterKeys.split(",").some(k => k && params.has(k));
    if (!named) return;
    const next = readUrlSeed(initialFilters, location.search);
    setSearchState(next.search);
    setDebouncedSearch(next.search.trim());
    setFilters(next.filters);
    // initialFilters is a fresh literal each render; its keys are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, filterKeys]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), debounceMs);
    return () => window.clearTimeout(t);
  }, [search, debounceMs]);

  /* Any narrowing goes back to page 1 — see rule 1 above. */
  useEffect(() => { setPage(1); }, [debouncedSearch, filters, pageSize]);

  const setSearch = useCallback((term: string) => setSearchState(term), []);

  const setPageSize = useCallback((size: number) => setPageSizeState(size), []);

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const params = useMemo(
    () => ({
      ...filters,
      page,
      pageSize,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [filters, page, pageSize, debouncedSearch],
  );

  return { page, setPage, pageSize, setPageSize, search, setSearch, filters, setFilter, params };
}

/** Filters and search named in the current URL, limited to the keys a page declared. */
function readUrlSeed<F extends Record<string, unknown>>(initial: F, query: string): { search: string; filters: F } {
  const params = new URLSearchParams(query);
  const filters = { ...initial };
  for (const key of Object.keys(initial)) {
    const raw = params.get(key);
    if (raw == null || raw === "") continue;
    (filters as Record<string, unknown>)[key] = raw === "true" ? true : raw === "false" ? false : raw;
  }
  return { search: params.get("search") ?? "", filters };
}
