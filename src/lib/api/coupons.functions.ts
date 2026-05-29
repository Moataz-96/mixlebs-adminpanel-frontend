// Coupons server functions for Phase 6 (FE §9.1–§9.3). List + detail + create +
// update + delete + redemptions.
//
// Each .handler body runs SERVER-ONLY, so the _client.ts helpers (cookie read +
// Bearer attach + envelope unwrap) are tree-shaken from the client bundle.
// _client.ts returns the unwrapped DRF `data`. Field names mirror
// mixlebs-adminpanel-backend openapi.json / adminpanel_promotions.serializers
// exactly. Decimal money fields arrive/leave as STRINGS (DRF DecimalField).
//
// IMPORTANT (plan ENTRY 008): the BE Coupon model persists ONLY
//   {code, discount_type, discount_value, capped_at, min_order_cost,
//    min_num_items, max_uses, max_uses_per_user, is_valid, expires}.
// The eligibility fields (eligible_category_ids / eligible_product_ids /
// excluded_product_ids / new_customers_only / eligible_payment_types) and
// starts_at are ACCEPTED-but-DROPPED placeholders. We still send them so the FE
// stays forward-compatible if the BE adds storage, but they will not round-trip.
//
// scope is derived on the BE from the owner; PLATFORM scope requires
// coupons.create_platform. STORE users are auto-scoped; STAFF/ADMIN pass
// store_id (for STORE-scoped coupons).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost } from "./_client";
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
// Types (adminpanel_promotions.serializers Coupon / CouponWrite).
// --------------------------------------------------------------------------- //
export type DiscountType = "MONETARY" | "PERCENTAGE";
export type CouponScope = "PLATFORM" | "STORE";
export type PaymentType = "COD" | "CC" | "QR" | "NS";

export interface Coupon {
  id: number;
  code: string;
  scope: CouponScope;
  store_id: string | null;
  store_name: string | null;
  discount_type: DiscountType;
  discount_value: string | null;
  capped_at: string | null;
  min_order_cost: string | null;
  min_num_items: number;
  max_uses: number;
  max_uses_per_user: number;
  times_used: number;
  is_valid: boolean;
  starts_at: string | null;
  expires: string | null;
  // Accepted-but-dropped placeholders (ENTRY 008); read-only echoes.
  eligible_category_ids: string | null;
  eligible_product_ids: string | null;
  excluded_product_ids: string | null;
  new_customers_only: string | boolean | null;
  eligible_payment_types: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CouponRedemption {
  id: number;
  code: string;
  user_email: string | null;
  user_phone: string | null;
  created_at: string | null;
}

// Write payload (CouponWrite). The placeholder fields are sent but dropped BE-side.
export interface CouponWriteInput {
  code: string;
  scope?: CouponScope;
  store_id?: string | null;
  discount_type: DiscountType;
  discount_value?: string | number;
  capped_at?: string | number | null;
  min_order_cost?: string | number;
  min_num_items?: number;
  max_uses?: number;
  max_uses_per_user?: number;
  is_valid?: boolean;
  starts_at?: string | null;
  expires: string;
  eligible_category_ids?: string[];
  eligible_product_ids?: string[];
  excluded_product_ids?: string[];
  new_customers_only?: boolean;
  eligible_payment_types?: string[];
}

function toWriteBody(d: CouponWriteInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    code: d.code,
    discount_type: d.discount_type,
    expires: d.expires,
  };
  if (d.scope !== undefined) body.scope = d.scope;
  if (d.store_id !== undefined && d.store_id !== null) body.store_id = d.store_id;
  if (d.discount_value !== undefined) body.discount_value = String(d.discount_value);
  if (d.capped_at !== undefined && d.capped_at !== null && d.capped_at !== "")
    body.capped_at = String(d.capped_at);
  if (d.min_order_cost !== undefined) body.min_order_cost = String(d.min_order_cost);
  if (d.min_num_items !== undefined) body.min_num_items = d.min_num_items;
  if (d.max_uses !== undefined) body.max_uses = d.max_uses;
  if (d.max_uses_per_user !== undefined) body.max_uses_per_user = d.max_uses_per_user;
  if (d.is_valid !== undefined) body.is_valid = d.is_valid;
  if (d.starts_at !== undefined && d.starts_at !== null) body.starts_at = d.starts_at;
  // ENTRY 008 placeholders — accepted-but-dropped on the BE.
  if (d.eligible_category_ids !== undefined) body.eligible_category_ids = d.eligible_category_ids;
  if (d.eligible_product_ids !== undefined) body.eligible_product_ids = d.eligible_product_ids;
  if (d.excluded_product_ids !== undefined) body.excluded_product_ids = d.excluded_product_ids;
  if (d.new_customers_only !== undefined) body.new_customers_only = d.new_customers_only;
  if (d.eligible_payment_types !== undefined) body.eligible_payment_types = d.eligible_payment_types;
  return body;
}

// --------------------------------------------------------------------------- //
// listCoupons — GET /api/admin/v1/coupons/ (§9.1).
// --------------------------------------------------------------------------- //
const listInput = z
  .object({
    q: z.string().optional(),
    discount_type: z.string().optional(),
    is_valid: z.boolean().optional(),
    scope: z.string().optional(),
    store_id: z.string().nullable().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    ordering: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

export const listCoupons = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<Coupon>>(
        `/api/admin/v1/coupons/${qs({
          q: data?.q,
          discount_type: data?.discount_type,
          is_valid: data?.is_valid,
          scope: data?.scope,
          store_id: data?.store_id ?? undefined,
          date_from: data?.date_from,
          date_to: data?.date_to,
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
// getCoupon — GET /api/admin/v1/coupons/{id}/ (§9.2).
// --------------------------------------------------------------------------- //
export const getCoupon = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string | number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Coupon>(`/api/admin/v1/coupons/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// createCoupon — POST /api/admin/v1/coupons/ (§9.2).
// --------------------------------------------------------------------------- //
export const createCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: CouponWriteInput) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<Coupon>("/api/admin/v1/coupons/", toWriteBody(data));
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// updateCoupon — PATCH /api/admin/v1/coupons/{id}/ (§9.2).
// --------------------------------------------------------------------------- //
export const updateCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: CouponWriteInput & { id: string | number }) => d)
  .handler(async ({ data }) => {
    try {
      const { id, ...rest } = data;
      return await apiPatch<Coupon>(`/api/admin/v1/coupons/${id}/`, toWriteBody(rest));
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// deleteCoupon — DELETE /api/admin/v1/coupons/{id}/. Soft delete / invalidate.
// --------------------------------------------------------------------------- //
export const deleteCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string | number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/coupons/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// listRedemptions — GET /api/admin/v1/coupons/{id}/redemptions/ (§9.3).
// --------------------------------------------------------------------------- //
export const listRedemptions = createServerFn({ method: "GET" })
  .inputValidator(
    (d: { id: string | number; store_id?: string | null; page?: number; page_size?: number }) => d,
  )
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<CouponRedemption>>(
        `/api/admin/v1/coupons/${data.id}/redemptions/${qs({
          store_id: data.store_id ?? undefined,
          page: data.page,
          page_size: data.page_size,
        })}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
