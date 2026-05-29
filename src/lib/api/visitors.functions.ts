// Visitors analytics server functions (plan §4 Phase 8 / FE §16).
//
// GET /admin/visitors/products/ + /admin/visitors/stores/ — read-only
// aggregates (visitors.view), optional store_id filter. Field names mirror
// openapi.json ProductVisitorAgg / StoreVisitorAgg (product_id/store_id,
// total_visits, unique_visitors). The FROZEN UI also renders anonymous /
// last_visit / conversion columns the aggregate has no column for; the mapper
// fills those with neutral placeholders. Re-exports the FROZEN UI shapes
// (ProductVisits, StoreVisits) and BE -> UI mappers.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shapes (openapi.json ProductVisitorAgg / StoreVisitorAgg)
// --------------------------------------------------------------------------- #
export interface ProductVisitorAgg {
  product_id: number;
  total_visits: number;
  unique_visitors: number;
}
export interface StoreVisitorAgg {
  store_id: number;
  total_visits: number;
  unique_visitors: number;
}

// --------------------------------------------------------------------------- #
// FROZEN UI shapes (formerly in mock/admin.ts)
// --------------------------------------------------------------------------- #
export interface ProductVisits {
  id: string;
  product: string;
  total_visits: number;
  unique_users: number;
  anonymous: number;
  last_visit: string;
  conversion: number;
}
export interface StoreVisits {
  id: string;
  store: string;
  total_visits: number;
  unique_users: number;
  anonymous: number;
  last_visit: string;
  subscriber_conversion: number;
}

export function toProductVisits(p: ProductVisitorAgg): ProductVisits {
  return {
    id: String(p.product_id),
    product: `#${p.product_id}`,
    total_visits: p.total_visits,
    unique_users: p.unique_visitors,
    anonymous: Math.max(0, p.total_visits - p.unique_visitors),
    last_visit: "—",
    conversion: 0,
  };
}

export function toStoreVisits(s: StoreVisitorAgg): StoreVisits {
  return {
    id: String(s.store_id),
    store: `#${s.store_id}`,
    total_visits: s.total_visits,
    unique_users: s.unique_visitors,
    anonymous: Math.max(0, s.total_visits - s.unique_visitors),
    last_visit: "—",
    subscriber_conversion: 0,
  };
}

// --------------------------------------------------------------------------- #
// Server fns
// --------------------------------------------------------------------------- #
const storeFilter = z.object({ store_id: z.number().optional() }).optional();

export const listProductVisitors = createServerFn({ method: "GET" })
  .inputValidator(storeFilter)
  .handler(async ({ data }) => {
    try {
      const sp = new URLSearchParams();
      if (data?.store_id) sp.set("store_id", String(data.store_id));
      sp.set("page_size", "200");
      return await apiGet<Page<ProductVisitorAgg>>(
        `/api/admin/v1/admin/visitors/products/?${sp.toString()}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const listStoreVisitors = createServerFn({ method: "GET" })
  .inputValidator(storeFilter)
  .handler(async ({ data }) => {
    try {
      const sp = new URLSearchParams();
      if (data?.store_id) sp.set("store_id", String(data.store_id));
      sp.set("page_size", "200");
      return await apiGet<Page<StoreVisitorAgg>>(
        `/api/admin/v1/admin/visitors/stores/?${sp.toString()}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
