// Admin addresses server functions (plan §4 Phase 7).
//
// CRUD scoped per user/store. STORE users see their own user's addresses;
// STAFF pass user_id or store_id. Gated by addresses.view / addresses.update.
// Field names mirror openapi.json Address / AddressWrite. The list endpoint is
// GET /addresses/ (returns a DRF page); the BE PATCH/DELETE accept {id}.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

export interface AdminAddress {
  id: string;
  user_id: string;
  location: number;
  latitude: string;
  longitude: string;
  recipient_name: string;
  phone_number: string;
  governorate: string;
  area: string;
  postcode: string;
  street: string;
  building: number;
  floor: number;
  apartment: number;
  note: string;
  is_default: boolean;
  source: string;
  created_at: string;
}

const listInput = z
  .object({
    user_id: z.string().optional(),
    store_id: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

function listQuery(data: z.infer<typeof listInput>): string {
  const sp = new URLSearchParams();
  if (data?.user_id) sp.set("user_id", data.user_id);
  if (data?.store_id) sp.set("store_id", data.store_id);
  if (data?.page) sp.set("page", String(data.page));
  if (data?.page_size) sp.set("page_size", String(data.page_size));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export const listAddresses = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<AdminAddress>>(`/api/admin/v1/addresses/${listQuery(data)}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

const addressWrite = z.object({
  location_id: z.number(),
  latitude: z.string(),
  longitude: z.string(),
  recipient_name: z.string(),
  phone_number: z.string(),
  governorate: z.string(),
  area: z.string().optional(),
  postcode: z.string().optional(),
  street: z.string(),
  building: z.number(),
  floor: z.number(),
  apartment: z.number(),
  note: z.string().optional(),
  is_default: z.boolean().optional(),
  // STAFF target selectors (forwarded to the BE scoping helper).
  user_id: z.string().optional(),
  store_id: z.string().optional(),
});

export const createAddress = createServerFn({ method: "POST" })
  .inputValidator(addressWrite)
  .handler(async ({ data }) => {
    try {
      return await apiPost<AdminAddress>(`/api/admin/v1/addresses/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

const addressUpdate = addressWrite.partial().extend({ id: z.string() });

export const updateAddress = createServerFn({ method: "POST" })
  .inputValidator(addressUpdate)
  .handler(async ({ data }) => {
    const { id, ...body } = data;
    try {
      return await apiPatch<AdminAddress>(`/api/admin/v1/addresses/${id}/`, body);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/addresses/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });
