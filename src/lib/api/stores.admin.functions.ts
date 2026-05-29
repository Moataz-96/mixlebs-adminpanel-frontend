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

import { apiGet, apiPatch, apiPost } from "./_client";
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
  // ENTRY 025 derived columns (annotated on the BE; no N+1).
  vendor_name: string | null;
  products_count: number;
  orders_count: number;
  created_at: string | null;
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

// --------------------------------------------------------------------------- #
// Store detail (6-tab screen): GET / PATCH / transition / identity review /
// replace_document. Field names mirror openapi.json StoreDetail / StoreIdentityFull.
// --------------------------------------------------------------------------- #

export interface StoreInfoLocale {
  id: number;
  language_code: string;
  name: string;
  about: string;
  features: string;
  target_audience: string;
  selling_promotions: string;
}

export interface StoreWorkingDay {
  id?: number;
  day: string; // DayEnum name
  start_time: string; // "HH:MM[:SS]"
  end_time: string;
}

export interface StoreIdentitySummary {
  has_identity: boolean;
  account_type: AdminStoreAccountType | null;
  documents_count: number;
  submitted_at: string | null;
}

export interface AdminStoreDetail {
  id: string;
  user_id: string;
  owner_email: string | null;
  shop_name: string;
  status: AdminStoreStatus;
  banner_label_key: string;
  account_type: AdminStoreAccountType;
  rank: number;
  order_online: boolean;
  returns: boolean;
  chat: boolean;
  asset_sharing: boolean;
  categories: number[];
  // ENTRY 025 derived columns.
  vendor_name: string | null;
  products_count: number;
  orders_count: number;
  created_at: string | null;
  info: Record<string, StoreInfoLocale>;
  working_days: StoreWorkingDay[];
  identity_summary: StoreIdentitySummary;
  legal_transitions: AdminStoreStatus[];
}

export interface StoreIdentityFull {
  id: number;
  identity: string | null;
  first_name: string;
  middle_name: string;
  last_name: string;
  business_name: string;
  business_license_number: string;
  residential_address: string;
  country_of_issue: string;
  expiration_date: string | null;
  dob: string | null;
  front_document_id: number | null;
  back_document_id: number | null;
  supporting_document_ids: number[];
}

export const getStore = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<AdminStoreDetail>(`/api/admin/v1/stores/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

const storeUpdateInput = z.object({
  id: z.string(),
  shop_name: z.string().optional(),
  rank: z.number().optional(),
  account_type: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
  order_online: z.boolean().optional(),
  returns: z.boolean().optional(),
  chat: z.boolean().optional(),
  asset_sharing: z.boolean().optional(),
  working_days: z
    .array(
      z.object({
        day: z.string(),
        start_time: z.string(),
        end_time: z.string(),
      }),
    )
    .optional(),
  // ENTRY 026 — per-locale StoreInfo translation upserts. Each row keys an
  // existing (store, language) row by language_code; text fields are partial.
  info: z
    .array(
      z.object({
        language_code: z.string(),
        name: z.string().optional(),
        about: z.string().optional(),
        features: z.string().optional(),
        target_audience: z.string().optional(),
        selling_promotions: z.string().optional(),
      }),
    )
    .optional(),
});

export const updateStore = createServerFn({ method: "POST" })
  .inputValidator(storeUpdateInput)
  .handler(async ({ data }) => {
    const { id, ...body } = data;
    try {
      return await apiPatch<AdminStoreDetail>(`/api/admin/v1/stores/${id}/`, body);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const transitionStoreStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: AdminStoreStatus; reason?: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<AdminStoreDetail>(
        `/api/admin/v1/stores/${data.id}/transition_status/`,
        { status: data.status, reason: data.reason ?? "" },
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getStoreIdentity = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<StoreIdentityFull>(`/api/admin/v1/stores/${data.id}/identity/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const reviewIdentity = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; decision: "approve" | "reject"; reason?: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<AdminStoreDetail>(`/api/admin/v1/stores/${data.id}/identity/review/`, {
        decision: data.decision,
        reason: data.reason ?? "",
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const replaceDocument = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; asset_id: number; side: "front" | "back" | "supporting" }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<StoreIdentityFull>(
        `/api/admin/v1/stores/${data.id}/identity/replace_document/`,
        { asset_id: data.asset_id, side: data.side },
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
