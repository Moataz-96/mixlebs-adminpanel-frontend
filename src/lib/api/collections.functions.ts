// Collections server functions for Phase 4 (collections CRUD + member-product
// reorder + smart rules). SERVER-ONLY handlers; _client.ts returns the
// unwrapped DRF payload. Field names mirror mixlebs-adminpanel-backend/
// openapi.json exactly (Collection / CollectionProduct / CollectionRule).
//
// scope=store collections require a `store` uuid; scope=global is platform-wide
// and requires the platform permission on the BE. STAFF/ADMIN filter by
// store_id from the topbar picker; STORE users are auto-scoped on the BE.

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

export type CollectionScopeEnum = "global" | "store";
export type CollectionTypeEnum =
  | "manual"
  | "smart"
  | "campaign"
  | "seasonal"
  | "trending"
  | "influencer"
  | "ai"
  | "top_discounts"
  | "home_collection"
  | "marketing";

export interface CollectionItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  collection_type: CollectionTypeEnum;
  scope: CollectionScopeEnum;
  store: string | null;
  display_style: string;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  metadata: Record<string, unknown>;
  products_count: number;
  created_at: string;
  updated_at: string;
}

// FE row shape the §7.5 collection screens consume (was mock/catalog
// CollectionRow). `scope` is uppercased to the panel's PLATFORM|STORE; `store`
// is the store id string (the screens render it as-is) and
// `cached_product_count` mirrors the BE products_count.
export type CollectionScope = "PLATFORM" | "STORE";
export interface CollectionRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  scope: CollectionScope;
  store: string | null;
  collection_type: CollectionTypeEnum;
  display_style: string;
  cached_product_count: number;
  is_active: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export const DISPLAY_STYLES = ["carousel", "grid", "hero", "banner", "list"] as const;

export function mapCollection(c: CollectionItem): CollectionRow {
  return {
    id: String(c.id),
    title: c.title,
    slug: c.slug,
    description: c.description ?? "",
    scope: c.scope === "store" ? "STORE" : "PLATFORM",
    store: c.store ?? null,
    collection_type: c.collection_type,
    display_style: c.display_style ?? "grid",
    cached_product_count: c.products_count ?? 0,
    is_active: c.is_active,
    priority: c.priority ?? 0,
    starts_at: c.starts_at ? c.starts_at.slice(0, 10) : null,
    ends_at: c.ends_at ? c.ends_at.slice(0, 10) : null,
    created_at: c.created_at ? c.created_at.slice(0, 10) : "",
    metadata: c.metadata ?? {},
  };
}

export interface CollectionProductItem {
  id: number;
  product: number;
  collection: number;
  position: number;
  score: number | null;
  pinned: boolean;
}

export interface CollectionRuleItem {
  id: number;
  collection: number;
  rules: Record<string, unknown>;
}

const collectionListInput = z
  .object({
    is_active: z.boolean().optional(),
    q: z.string().optional(),
    scope: z.string().optional(),
    store_id: z.string().nullable().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

export const listCollections = createServerFn({ method: "GET" })
  .inputValidator(collectionListInput)
  .handler(async ({ data }) => {
    try {
      const query = qs({
        is_active: data?.is_active,
        q: data?.q,
        scope: data?.scope,
        store_id: data?.store_id,
        page: data?.page,
        page_size: data?.page_size,
      });
      return await apiGet<Page<CollectionItem>>(`/api/admin/v1/collections/${query}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getCollection = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<CollectionItem>(`/api/admin/v1/collections/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createCollection = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<CollectionItem>(`/api/admin/v1/collections/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateCollection = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<CollectionItem>(`/api/admin/v1/collections/${data.id}/`, data.body);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/collections/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const listCollectionProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<CollectionProductItem> | CollectionProductItem[]>(
        `/api/admin/v1/collections/${data.id}/products/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// Reorder / set members. Body: { items: [{ product, position, pinned?, score? }] }.
export const reorderCollectionProducts = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { id: number; items: Array<Record<string, unknown>> }) => d,
  )
  .handler(async ({ data }) => {
    try {
      return await apiPost<unknown>(`/api/admin/v1/collections/${data.id}/products/`, {
        items: data.items,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getCollectionRules = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<CollectionRuleItem>(`/api/admin/v1/collections/${data.id}/rules/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const setCollectionRules = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; rules: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<CollectionRuleItem>(`/api/admin/v1/collections/${data.id}/rules/`, {
        rules: data.rules,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });
