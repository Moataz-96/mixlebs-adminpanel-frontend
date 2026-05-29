// Orders server functions for Phase 5 (FE §8.1/§8.2). Read-mostly: list +
// detail + two writes (status transition, tracking append).
//
// Each .handler body runs SERVER-ONLY, so the _client.ts helpers (cookie read +
// Bearer attach + envelope unwrap) are tree-shaken from the client bundle.
// _client.ts returns the unwrapped DRF `data`, so listOrders resolves to a
// Page<OrderListItem> and getOrder to an OrderDetail. Field names mirror
// mixlebs-adminpanel-backend openapi.json / adminpanel_orders.serializers
// exactly. Decimal money fields arrive as STRINGS (DRF DecimalField); the
// screens format them.
//
// STAFF/ADMIN pass store_id (topbar store picker) for store scoping; STORE
// users are auto-scoped on the BE and ignore any client store_id.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet, apiPost } from "./_client";
import { toClientError } from "./error";

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// --------------------------------------------------------------------------- //
// Types (adminpanel_orders.serializers OrderList / OrderDetail).
// --------------------------------------------------------------------------- //
export type OrderStatusName =
  | "PENDING"
  | "READY"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "DECLINED"
  | "DELIVERY_ISSUE";

export interface OrderListItem {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  store: string | null;
  store_name: string | null;
  items_count: number;
  subtotal: string | null;
  tax: string | null;
  delivery_fees: string | null;
  total: string | number | null;
  payment_type: string | null;
  order_status: OrderStatusName;
  transfer_status: string | null;
  courier: number | null;
  courier_name: string | null;
  has_coupon: boolean;
  created_at: string | null;
  delivered_at: string | null;
}

export interface OrderItemAttribute {
  property: string | null;
  value: string | null;
}

export interface OrderItem {
  id: number;
  product_variant: number | null;
  model_number: string | null;
  sku: string | null;
  attributes: OrderItemAttribute[];
  image: string | null;
  quantity: number;
  price: string | null;
  discount: string | null;
  line_total: string | number | null;
  is_returned: boolean;
}

export interface OrderTrackingEvent {
  id: number;
  sequence: number;
  details: string;
  timestamp: string | null;
}

export interface OrderCustomerCard {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dob: string | null;
  is_return_blocked: boolean;
}

export interface OrderAddress {
  recipient_name: string | null;
  phone_number: string | null;
  country: string | null;
  city: string | null;
  governorate: string | null;
  area: string | null;
  postcode: string | null;
  street: string | null;
  building: number | null;
  floor: number | null;
  apartment: number | null;
  note: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
}

export interface OrderCourierCard {
  id: number;
  name: string | null;
  eta_days?: number | null;
  base_fee?: string | null;
}

export interface OrderDetail extends OrderListItem {
  serial_number: string | null;
  invoice: number | null;
  coupon_code: string | null;
  items: OrderItem[];
  tracking: OrderTrackingEvent[];
  customer: OrderCustomerCard | null;
  address: OrderAddress | null;
  courier_detail: OrderCourierCard | null;
  allowed_transitions: OrderStatusName[];
}

// --------------------------------------------------------------------------- //
// listOrders — GET /api/admin/v1/orders/ (§8.1).
// --------------------------------------------------------------------------- //
const listInput = z
  .object({
    q: z.string().optional(),
    order_status: z.string().optional(),
    payment_type: z.string().optional(),
    transfer_status: z.string().optional(),
    store_id: z.string().nullable().optional(),
    courier_id: z.union([z.string(), z.number()]).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    min_total: z.union([z.string(), z.number()]).optional(),
    max_total: z.union([z.string(), z.number()]).optional(),
    has_coupon: z.boolean().optional(),
    ordering: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

export const listOrders = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<OrderListItem>>(
        `/api/admin/v1/orders/${qs({
          q: data?.q,
          order_status: data?.order_status,
          payment_type: data?.payment_type,
          transfer_status: data?.transfer_status,
          store_id: data?.store_id ?? undefined,
          courier_id: data?.courier_id,
          date_from: data?.date_from,
          date_to: data?.date_to,
          min_total: data?.min_total,
          max_total: data?.max_total,
          has_coupon: data?.has_coupon,
          ordering: data?.ordering,
          page: data?.page,
          page_size: data?.page_size,
        })}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// getOrder — GET /api/admin/v1/orders/{id}/ (§8.2).
// --------------------------------------------------------------------------- //
export const getOrder = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<OrderDetail>(`/api/admin/v1/orders/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// transitionOrderStatus — POST /api/admin/v1/orders/{id}/status/.
// Body {status}. The BE enforces the legal-transition graph + per-edge perm;
// an illegal/unpermitted move comes back as a 400/403 envelope which surfaces
// via parseServerError in the UI toaster.
// --------------------------------------------------------------------------- //
export const transitionOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: OrderStatusName | string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<OrderDetail>(`/api/admin/v1/orders/${data.id}/status/`, {
        status: data.status,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// appendTracking — POST /api/admin/v1/orders/{id}/tracking/.
// Body {details, courier_id?}.
// --------------------------------------------------------------------------- //
export const appendTracking = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; details: string; courier_id?: string | number | null }) => d)
  .handler(async ({ data }) => {
    try {
      const body: Record<string, unknown> = { details: data.details };
      if (data.courier_id) body.courier_id = data.courier_id;
      return await apiPost<OrderTrackingEvent>(
        `/api/admin/v1/orders/${data.id}/tracking/`,
        body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
