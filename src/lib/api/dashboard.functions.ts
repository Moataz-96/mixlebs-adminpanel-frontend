// Dashboard server functions for Phase 3 (overview / timeseries / funnel /
// wallet). Each .handler body runs SERVER-ONLY, so the _client.ts helpers and
// cookie writers are tree-shaken from the client bundle. _client.ts returns the
// unwrapped `data`, so each helper resolves to the serialized payload below.
//
// Field names mirror mixlebs-adminpanel-backend/openapi.json exactly
// (Overview / Timeseries / Funnel / Wallet schemas — see plan §5.5). Decimal
// money fields arrive as STRINGS (DRF DecimalField); the dashboard formats them.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet } from "./_client";
import { toClientError } from "./error";

// ---------------------------------------------------------------------------
// Response shapes (hand-typed from the openapi.json dashboard schemas).
// ---------------------------------------------------------------------------

export interface TopProduct {
  product_id: string;
  product_name: string;
  sku: string;
  units_sold: number;
  revenue: string; // decimal string
  conversion_rate: number; // orders-with-product ÷ product visits
}

export interface TopCategory {
  category_id: number | null;
  category_name: string;
  units_sold: number;
  revenue: string; // decimal string
}

export interface StockAlert {
  variant_id: number;
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  threshold: number;
  last_sold_at: string | null; // ISO datetime, null if never sold
}

export interface RecentOrder {
  order_id: string;
  order_number: string;
  customer: string;
  total: string; // decimal string
  status: string;
  created_at: string; // ISO datetime
}

export interface PendingReturn {
  return_id: string;
  return_number: string;
  order_number: string;
  item: string;
  reason: string;
  requested_at: string; // ISO datetime
}

export interface TopCourier {
  courier_id: string;
  name: string;
  eta: number; // eta_days
  base_fee: string; // decimal string
  success_rate: number | null; // delivered ÷ orders, null if no orders
}

export interface DashboardAttention {
  pending_returns_count: number;
  low_stock_count: number;
  support_awaiting_count: number;
  identity_review_pending_count?: number; // present only for reviewers
}

export interface OverviewDelta {
  revenue_gross: number | null;
  revenue_net: number | null;
  orders_count: number | null;
  average_order_value: number | null;
  new_customers: number | null;
  returning_customers: number | null;
}

export interface OverviewPayload {
  store_id: string | null;
  all_stores: boolean;
  date_from: string;
  date_to: string;
  revenue_gross: string;
  revenue_net: string;
  orders_count: number;
  average_order_value: string;
  new_customers: number;
  returning_customers: number;
  conversion_rate: number;
  returns_count: number;
  returns_rate: number;
  abandoned_carts: number;
  active_products: number;
  out_of_stock_products: number;
  avg_product_rating: number | null;
  avg_store_rating: number | null;
  wallet_inflow: string;
  wallet_outflow: string;
  wallet_balance: string;
  wallet_currency: string;
  coupon_redemptions: number;
  top_products: TopProduct[];
  top_categories: TopCategory[];
  stock_alerts: StockAlert[];
  recent_orders: RecentOrder[];
  pending_returns: PendingReturn[];
  top_couriers: TopCourier[];
  attention: DashboardAttention;
  deltas: OverviewDelta | null;
}

export interface TimeseriesPoint {
  bucket: string;
  value: string; // decimal string
}

export interface TimeseriesPayload {
  metric: string;
  granularity: string;
  store_id: string | null;
  all_stores: boolean;
  series: TimeseriesPoint[];
}

export interface FunnelPayload {
  store_id: string | null;
  all_stores: boolean;
  visits: number;
  product_views: number;
  adds_to_cart: number;
  checkouts: number;
  orders: number;
}

export interface WalletPayload {
  store_id: string | null;
  all_stores: boolean;
  wallet_inflow: string;
  wallet_outflow: string;
  wallet_balance: string;
  wallet_currency: string;
}

// ---------------------------------------------------------------------------
// Shared query input. `store_id` omitted/null => cross-store aggregate (needs
// dashboard.view_all_stores on the BE). date_from/date_to are ISO date strings.
// ---------------------------------------------------------------------------

const rangeInput = z
  .object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    store_id: z.string().nullable().optional(),
  })
  .optional();

const overviewInput = z
  .object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    store_id: z.string().nullable().optional(),
    compare_to: z.string().optional(), // e.g. "prev_period" | "prev_year"
  })
  .optional();

const timeseriesInput = z
  .object({
    metric: z.string().optional(), // revenue | orders | visitors
    granularity: z.string().optional(), // day | week | month
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    store_id: z.string().nullable().optional(),
  })
  .optional();

function buildQuery(params: Record<string, string | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

// ---------------------------------------------------------------------------
// overview — every KPI card, the top-products / top-categories / stock-alerts
// tables, and the period deltas.
// ---------------------------------------------------------------------------

export const getOverview = createServerFn({ method: "GET" })
  .inputValidator(overviewInput)
  .handler(async ({ data }) => {
    try {
      const q = buildQuery({
        date_from: data?.date_from,
        date_to: data?.date_to,
        store_id: data?.store_id,
        compare_to: data?.compare_to,
      });
      return await apiGet<OverviewPayload>(`/api/admin/v1/dashboard/overview/${q}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// timeseries — the revenue / orders charts. `metric` + `granularity` drive it.
// ---------------------------------------------------------------------------

export const getTimeseries = createServerFn({ method: "GET" })
  .inputValidator(timeseriesInput)
  .handler(async ({ data }) => {
    try {
      const q = buildQuery({
        metric: data?.metric,
        granularity: data?.granularity,
        date_from: data?.date_from,
        date_to: data?.date_to,
        store_id: data?.store_id,
      });
      return await apiGet<TimeseriesPayload>(`/api/admin/v1/dashboard/timeseries/${q}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// funnel — visits → product_views → adds_to_cart → checkouts → orders.
// ---------------------------------------------------------------------------

export const getFunnel = createServerFn({ method: "GET" })
  .inputValidator(rangeInput)
  .handler(async ({ data }) => {
    try {
      const q = buildQuery({
        date_from: data?.date_from,
        date_to: data?.date_to,
        store_id: data?.store_id,
      });
      return await apiGet<FunnelPayload>(`/api/admin/v1/dashboard/funnel/${q}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// wallet — period inflow / outflow for the right-rail wallet card.
// ---------------------------------------------------------------------------

export const getWallet = createServerFn({ method: "GET" })
  .inputValidator(rangeInput)
  .handler(async ({ data }) => {
    try {
      const q = buildQuery({
        date_from: data?.date_from,
        date_to: data?.date_to,
        store_id: data?.store_id,
      });
      return await apiGet<WalletPayload>(`/api/admin/v1/dashboard/wallet/${q}`);
    } catch (err) {
      throw toClientError(err);
    }
  });
