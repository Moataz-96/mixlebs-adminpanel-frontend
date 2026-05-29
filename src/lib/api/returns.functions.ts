// Returns server functions for Phase 5 (FE §8.3/§8.4). Read-mostly: list +
// detail + three writes (approve, reject, generic transition).
//
// Each .handler body runs SERVER-ONLY. _client.ts returns the unwrapped DRF
// `data`, so listReturns resolves to a Page<ReturnListItem> and getReturn to a
// ReturnDetail. Field names mirror adminpanel_orders.serializers
// (ReturnList / ReturnDetail) exactly. Decimal money fields arrive as STRINGS.
//
// STAFF/ADMIN pass store_id for store scoping; STORE users are auto-scoped on
// the BE (Return -> order_item -> order -> store).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet, apiPost } from "./_client";
import { toClientError } from "./error";
import type {
  OrderItem,
  OrderCustomerCard,
  OrderTrackingEvent,
  Page,
} from "./orders.functions";

export type { Page } from "./orders.functions";

export type ReturnStatusName =
  | "PENDING"
  | "CHECKING"
  | "APPROVED"
  | "RETURNED"
  | "DECLINED"
  | "DELIVERY_ISSUE"
  | "BLOCKED";

export interface ReturnListItem {
  id: string;
  return_number: string;
  order_id: string | null;
  order_number: string | null;
  item_name: string | null;
  quantity: number;
  reason_choice: string | null;
  return_status: ReturnStatusName;
  courier: number | null;
  courier_name: string | null;
  subtotal: string | null;
  handling_fees: string | null;
  customer_name: string;
  created_at: string | null;
}

export interface ReturnAttachment {
  id: number;
  image: string | null;
}

export interface ReturnDetail extends ReturnListItem {
  reason_description: string | null;
  invoice: number | null;
  item: OrderItem | null;
  attachments: ReturnAttachment[];
  tracking: OrderTrackingEvent[];
  customer: OrderCustomerCard | null;
  allowed_transitions: ReturnStatusName[];
}

// --------------------------------------------------------------------------- //
// listReturns — GET /api/admin/v1/returns/ (§8.3).
// --------------------------------------------------------------------------- //
function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const listInput = z
  .object({
    q: z.string().optional(),
    return_status: z.string().optional(),
    reason_choice: z.string().optional(),
    courier_id: z.union([z.string(), z.number()]).optional(),
    store_id: z.string().nullable().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

export const listReturns = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<ReturnListItem>>(
        `/api/admin/v1/returns/${qs({
          q: data?.q,
          return_status: data?.return_status,
          reason_choice: data?.reason_choice,
          courier_id: data?.courier_id,
          store_id: data?.store_id ?? undefined,
          date_from: data?.date_from,
          date_to: data?.date_to,
          page: data?.page,
          page_size: data?.page_size,
        })}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// getReturn — GET /api/admin/v1/returns/{id}/ (§8.4).
// --------------------------------------------------------------------------- //
export const getReturn = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<ReturnDetail>(`/api/admin/v1/returns/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// approveReturn / rejectReturn — POST /returns/{id}/approve|reject/.
// transitionReturn — POST /returns/{id}/transition/ {status}.
// The BE validates the legal graph + per-edge perm; illegal/unpermitted moves
// surface as 400/403 envelopes -> parseServerError -> toaster.
// --------------------------------------------------------------------------- //
export const approveReturn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<ReturnDetail>(`/api/admin/v1/returns/${data.id}/approve/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const rejectReturn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<ReturnDetail>(`/api/admin/v1/returns/${data.id}/reject/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const transitionReturn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: ReturnStatusName | string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<ReturnDetail>(`/api/admin/v1/returns/${data.id}/transition/`, {
        status: data.status,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });
