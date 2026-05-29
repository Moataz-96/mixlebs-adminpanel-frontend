// Couriers server functions for Phase 6 (FE §9.7–§9.8). List + detail + create +
// update + delete, plus nested delivery-areas (list / add / remove).
//
// Each .handler body runs SERVER-ONLY; _client.ts returns the unwrapped DRF
// `data`. Field names mirror adminpanel_promotions.serializers Courier /
// CourierWrite / DeliveryArea exactly. base_fee is a STRING (DRF DecimalField).
//
// couriers.view is read-only (STORE/STAFF need it for tracking pickers);
// couriers.update is admin-only and gates every write (enforced BE-side).

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

export interface Courier {
  id: string;
  name: string;
  rank: number | null;
  eta_days: number | null;
  base_fee: string | null;
  logo: string | null;
  region_id: number | null;
  locations: string | number[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CourierWriteInput {
  name: string;
  rank?: number;
  eta_days?: number;
  base_fee?: string | number;
  logo?: string;
  region_id?: number | null;
  location_ids?: number[];
}

export interface DeliveryArea {
  id: number;
  location_id: number;
  is_default: boolean;
  created_at: string | null;
}

// ENTRY 024a: region-scoped Location lookup for the editor's Location picker
// (the courier `location_ids` M2M + DeliveryArea.location FK point at these).
export interface CourierLocation {
  id: number;
  country_id: number;
  city_id: number;
  country_name: string | null;
  city_name: string | null;
  region_id: number | null;
  is_enabled: boolean;
}

function toWriteBody(d: Partial<CourierWriteInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (d.name !== undefined) body.name = d.name;
  if (d.rank !== undefined) body.rank = d.rank;
  if (d.eta_days !== undefined) body.eta_days = d.eta_days;
  if (d.base_fee !== undefined) body.base_fee = String(d.base_fee);
  if (d.logo !== undefined) body.logo = d.logo;
  if (d.region_id !== undefined && d.region_id !== null) body.region_id = d.region_id;
  if (d.location_ids !== undefined) body.location_ids = d.location_ids;
  return body;
}

// --------------------------------------------------------------------------- //
// listCouriers — GET /api/admin/v1/couriers/ (§9.7).
// --------------------------------------------------------------------------- //
export const listCouriers = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        q: z.string().optional(),
        page: z.number().optional(),
        page_size: z.number().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<Courier>>(
        `/api/admin/v1/couriers/${qs({
          q: data?.q,
          page: data?.page,
          page_size: data?.page_size,
        })}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// getCourier — GET /api/admin/v1/couriers/{id}/ (§9.8).
// --------------------------------------------------------------------------- //
export const getCourier = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Courier>(`/api/admin/v1/couriers/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// createCourier — POST /api/admin/v1/couriers/ (§9.8).
// --------------------------------------------------------------------------- //
export const createCourier = createServerFn({ method: "POST" })
  .inputValidator((d: CourierWriteInput) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<Courier>("/api/admin/v1/couriers/", toWriteBody(data));
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// updateCourier — PATCH /api/admin/v1/couriers/{id}/ (§9.8).
// --------------------------------------------------------------------------- //
export const updateCourier = createServerFn({ method: "POST" })
  .inputValidator((d: Partial<CourierWriteInput> & { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      const { id, ...rest } = data;
      return await apiPatch<Courier>(`/api/admin/v1/couriers/${id}/`, toWriteBody(rest));
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// deleteCourier — DELETE /api/admin/v1/couriers/{id}/.
// --------------------------------------------------------------------------- //
export const deleteCourier = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/couriers/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// listDeliveryAreas — GET /api/admin/v1/couriers/{id}/delivery-areas/ (§9.8).
// --------------------------------------------------------------------------- //
export const listDeliveryAreas = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string; page?: number; page_size?: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<DeliveryArea>>(
        `/api/admin/v1/couriers/${data.id}/delivery-areas/${qs({
          page: data.page,
          page_size: data.page_size,
        })}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// addDeliveryArea — POST /api/admin/v1/couriers/{id}/delivery-areas/.
// Body {location_id, is_default?}.
// --------------------------------------------------------------------------- //
export const addDeliveryArea = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; location_id: number; is_default?: boolean }) => d)
  .handler(async ({ data }) => {
    try {
      const body: Record<string, unknown> = { location_id: data.location_id };
      if (data.is_default !== undefined) body.is_default = data.is_default;
      return await apiPost<DeliveryArea>(
        `/api/admin/v1/couriers/${data.id}/delivery-areas/`,
        body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// setDefaultDeliveryArea — PATCH /couriers/{id}/delivery-areas/{area_id}/ (024b).
// Marks an area as the default (clears other defaults BE-side).
// --------------------------------------------------------------------------- //
export const setDefaultDeliveryArea = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; area_id: number | string; is_default?: boolean }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<DeliveryArea>(
        `/api/admin/v1/couriers/${data.id}/delivery-areas/${data.area_id}/`,
        { is_default: data.is_default ?? true },
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// removeDeliveryArea — DELETE /couriers/{id}/delivery-areas/{area_id}/.
// --------------------------------------------------------------------------- //
export const removeDeliveryArea = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; area_id: number | string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(
        `/api/admin/v1/couriers/${data.id}/delivery-areas/${data.area_id}/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// listCourierLocations — GET /couriers/locations/ (ENTRY 024a). Region-scoped
// Location lookup for the editor's Location / delivery-area pickers.
// --------------------------------------------------------------------------- //
export const listCourierLocations = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({ q: z.string().optional(), page_size: z.number().optional() })
      .optional(),
  )
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<CourierLocation>>(
        `/api/admin/v1/couriers/locations/${qs({
          q: data?.q,
          page_size: data?.page_size,
        })}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
