import type { ApiQueryResult, ApiListResult } from "@/hooks/useApiQuery";

/**
 * Narrow a query's rows without destroying its non-happy states.
 *
 * The trap: pages derive `filtered` from `data ?? []`, so spreading
 * `{...query, data: filtered}` hands DataState an empty array while the query
 * is still loading or has errored — and an empty array is a *successful*
 * result. The skeleton and the error state both vanish, replaced by "nothing
 * here", which is a different and wrong claim. Undefined must stay undefined.
 */
export function withRows<T>(query: ApiQueryResult<T[]>, rows: T[]): ApiQueryResult<T[]> {
  return { ...query, data: query.data === undefined ? undefined : rows };
}

/**
 * Adapt a paginated list result to the shape DataState expects.
 *
 * DataState owns the loading/auth/error/empty vocabulary and is keyed off
 * ApiQueryResult; ApiListResult is the same thing plus `meta` and minus
 * `refetch`. Rather than fork DataState, adapt here.
 */
export function listAsQuery<T>(list: ApiListResult<T>): ApiQueryResult<T[]> {
  return { ...list, refetch: (() => Promise.resolve(undefined)) as never };
}
