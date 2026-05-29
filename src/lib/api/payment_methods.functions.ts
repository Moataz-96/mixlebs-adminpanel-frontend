// Payment-methods server functions for Phase 6 (FE §9.4–§9.5). List + detail +
// create + update + delete, per-store.
//
// Each .handler body runs SERVER-ONLY; _client.ts returns the unwrapped DRF
// `data`. Field names mirror adminpanel_promotions.serializers PaymentMethod /
// PaymentMethodWrite exactly.
//
// STORE users are auto-scoped on the BE; STAFF/ADMIN pass store_id to scope the
// list and to attach a new method to a store.

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

export type CardBrand = "Visa" | "Mastercard" | "Other";

export interface PaymentMethod {
  id: string;
  brand: CardBrand | null;
  holder_name: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface PaymentMethodWriteInput {
  brand?: CardBrand;
  holder_name: string;
  last4?: string;
  exp_month: number;
  exp_year: number;
  token: string;
  is_default?: boolean;
  store_id?: string | null;
}

function toWriteBody(d: Partial<PaymentMethodWriteInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (d.brand !== undefined) body.brand = d.brand;
  if (d.holder_name !== undefined) body.holder_name = d.holder_name;
  if (d.last4 !== undefined) body.last4 = d.last4;
  if (d.exp_month !== undefined) body.exp_month = d.exp_month;
  if (d.exp_year !== undefined) body.exp_year = d.exp_year;
  if (d.token !== undefined) body.token = d.token;
  if (d.is_default !== undefined) body.is_default = d.is_default;
  if (d.store_id !== undefined && d.store_id !== null) body.store_id = d.store_id;
  return body;
}

// --------------------------------------------------------------------------- //
// listPaymentMethods — GET /api/admin/v1/payment-methods/ (§9.4).
// --------------------------------------------------------------------------- //
export const listPaymentMethods = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        store_id: z.string().nullable().optional(),
        page: z.number().optional(),
        page_size: z.number().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<PaymentMethod>>(
        `/api/admin/v1/payment-methods/${qs({
          store_id: data?.store_id ?? undefined,
          page: data?.page,
          page_size: data?.page_size,
        })}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// getPaymentMethod — GET /api/admin/v1/payment-methods/{id}/ (§9.5).
// --------------------------------------------------------------------------- //
export const getPaymentMethod = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<PaymentMethod>(`/api/admin/v1/payment-methods/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// createPaymentMethod — POST /api/admin/v1/payment-methods/ (§9.5).
// --------------------------------------------------------------------------- //
export const createPaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((d: PaymentMethodWriteInput) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<PaymentMethod>("/api/admin/v1/payment-methods/", toWriteBody(data));
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// updatePaymentMethod — PATCH /api/admin/v1/payment-methods/{id}/ (§9.5).
// Also used to flip is_default ("Set default" row action).
// --------------------------------------------------------------------------- //
export const updatePaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((d: Partial<PaymentMethodWriteInput> & { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      const { id, ...rest } = data;
      return await apiPatch<PaymentMethod>(
        `/api/admin/v1/payment-methods/${id}/`,
        toWriteBody(rest),
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// deletePaymentMethod — DELETE /api/admin/v1/payment-methods/{id}/.
// --------------------------------------------------------------------------- //
export const deletePaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/payment-methods/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });
