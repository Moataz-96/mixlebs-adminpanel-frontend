import { useRouterState } from "@tanstack/react-router";

export type PageState = "populated" | "loading" | "empty" | "error" | "forbidden" | "notfound";

const VALID: PageState[] = ["populated", "loading", "empty", "error", "forbidden", "notfound"];

/**
 * Reads the `?state=` query param so every screen can preview its
 * loading / empty / error / forbidden / not-found states in dev without
 * touching real data. Defaults to "populated".
 *
 *   /products?state=empty   /orders/o_1?state=notfound
 */
export function usePageState(): PageState {
  const search = useRouterState({
    select: (r) => r.location.search as Record<string, unknown>,
  });
  const raw = typeof search?.state === "string" ? (search.state as PageState) : "populated";
  return VALID.includes(raw) ? raw : "populated";
}
