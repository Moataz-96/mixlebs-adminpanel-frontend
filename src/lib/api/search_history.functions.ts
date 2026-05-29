// Search history server function (plan §4 Phase 8 / FE §16).
//
// GET /admin/search-history/ (search_history.view, super-admin). PLACEHOLDER:
// no search-history model exists in mixlebs_core (search query strings are not
// persisted), so the endpoint returns an empty paginated envelope
// (required_adminpanel_change.md ENTRY 014). The screen renders an empty state.
// Re-exports the FROZEN UI shape (SearchTerm).

import { createServerFn } from "@tanstack/react-start";

import { apiGet } from "./_client";
import { toClientError } from "./error";

// --------------------------------------------------------------------------- #
// FROZEN UI shape (formerly in mock/admin.ts)
// --------------------------------------------------------------------------- #
export interface SearchTerm {
  id: string;
  query: string;
  count: number;
  unique_users: number;
  avg_results: number;
  last_searched: string;
}

export interface SearchHistoryPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: SearchTerm[];
  detail?: string;
}

export const listSearchHistory = createServerFn({ method: "GET" }).handler(async () => {
  try {
    // ENTRY 014 — returns { count: 0, results: [], detail: "search_history_not_persisted" }.
    return await apiGet<SearchHistoryPage>(`/api/admin/v1/admin/search-history/`);
  } catch (err) {
    throw toClientError(err);
  }
});
