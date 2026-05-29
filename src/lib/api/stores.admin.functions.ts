// Minimal admin stores-list server function used by the topbar / dashboard
// store-picker (plan §5.5 step 1). P7 Wire owns the full stores screens
// (detail / identity review / transitions); this file is intentionally limited
// to the paginated list the picker consumes. Each .handler body runs
// SERVER-ONLY; _client.ts returns the unwrapped DRF page.
//
// GET /api/admin/v1/stores/ is gated by stores.view and IsStaffOrStore on the
// BE — STAFF/ADMIN get every store (paginated); a STORE user gets only their
// own store (BE store-scopes the queryset). Field names mirror the openapi.json
// StoreList schema exactly.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet } from "./_client";
import { toClientError } from "./error";

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// StoreStatusEnum (openapi Status062Enum).
export type AdminStoreStatus =
  | "UNVERIFIED"
  | "PENDING_VERIFICATION"
  | "PENDING_PAYMENT"
  | "VERIFIED"
  | "BLOCKED";

export type AdminStoreAccountType = "INDIVIDUAL" | "COMPANY";

export interface AdminStoreListItem {
  id: string;
  user_id: string;
  shop_name: string;
  status: AdminStoreStatus;
  account_type: AdminStoreAccountType;
  rank: number;
  order_online: boolean;
  returns: boolean;
  chat: boolean;
  asset_sharing: boolean;
}

const listInput = z
  .object({
    q: z.string().optional(),
    status: z.string().optional(),
    account_type: z.string().optional(),
    store_id: z.string().optional(),
    ordering: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

function listQuery(data: z.infer<typeof listInput>): string {
  const sp = new URLSearchParams();
  if (data?.q) sp.set("q", data.q);
  if (data?.status) sp.set("status", data.status);
  if (data?.account_type) sp.set("account_type", data.account_type);
  if (data?.store_id) sp.set("store_id", data.store_id);
  if (data?.ordering) sp.set("ordering", data.ordering);
  if (data?.page) sp.set("page", String(data.page));
  if (data?.page_size) sp.set("page_size", String(data.page_size));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export const listStores = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<AdminStoreListItem>>(`/api/admin/v1/stores/${listQuery(data)}`);
    } catch (err) {
      throw toClientError(err);
    }
  });
