// Assets server functions for Phase 4 (asset library: list / upload / share /
// delete). SERVER-ONLY handlers; _client.ts returns the unwrapped DRF payload.
// Field names mirror mixlebs-adminpanel-backend/openapi.json (Asset /
// AssetUpload). Uploads reuse the existing storage backend (local in dev, S3 in
// preprod/prod) via apiUpload (multipart). STORE users are auto-scoped on the
// BE; shared assets are visible cross-store.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPost, apiUpload } from "./_client";
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

export interface AssetItem {
  id: number;
  src: string | null;
  title: string | null;
  url: string;
  app_field: string;
  dimensions: string | null;
  usage_count: number;
  is_enhanced: boolean;
  is_shared: boolean;
  content_type: string | null;
  created_at: string;
}

const assetListInput = z
  .object({
    app_field: z.string().optional(),
    is_shared: z.boolean().optional(),
    q: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

export const listAssets = createServerFn({ method: "GET" })
  .inputValidator(assetListInput)
  .handler(async ({ data }) => {
    try {
      const query = qs({
        app_field: data?.app_field,
        is_shared: data?.is_shared,
        q: data?.q,
        page: data?.page,
        page_size: data?.page_size,
      });
      return await apiGet<Page<AssetItem>>(`/api/admin/v1/assets/${query}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getAsset = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<AssetItem>(`/api/admin/v1/assets/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// Multipart upload — `form` carries the `img` file (+ optional app_field /
// is_shared). FormData cannot cross the createServerFn JSON boundary, so the
// uploader passes the raw fields and we rebuild FormData server-side. The route
// instead calls this via the FormData-aware path below.
export const uploadAsset = createServerFn({ method: "POST" })
  .inputValidator((d: { dataUrl: string; filename: string; app_field?: string; is_shared?: boolean }) => d)
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.dataUrl);
      const blob = await res.blob();
      const form = new FormData();
      form.append("img", blob, data.filename);
      if (data.app_field) form.append("app_field", data.app_field);
      if (data.is_shared !== undefined) form.append("is_shared", String(data.is_shared));
      return await apiUpload<AssetItem>(`/api/admin/v1/assets/`, form);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const shareAsset = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<AssetItem>(`/api/admin/v1/assets/${data.id}/share/`, {});
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteAsset = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/assets/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });
