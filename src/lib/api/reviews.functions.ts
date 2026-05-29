// Reviews moderation server functions (plan §4 Phase 8 / FE §15).
//
// GET /reviews/product/ + /reviews/store/ (reviews.moderate, store-scoped for
// STORE users), POST /reviews/{product|store}/{id}/hide/ (hide), DELETE same
// (unhide). Hide maps to the SoftDeleteMixin deleted_at column — hidden ==
// soft-deleted (required_adminpanel_change.md ENTRY 010). Negative-review guard:
// a STORE user hiding a review with rate <= 2 gets 403 unless they hold
// reviews.bypass_negative_review_guard — surfaced via the toaster. Field names
// mirror openapi.json ProductReview / StoreReview. Re-exports the FROZEN UI
// shapes (ProductReview, StoreReview) and BE -> UI mappers.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shapes (openapi.json ProductReview / StoreReview)
// --------------------------------------------------------------------------- #
export interface BeProductReview {
  id: number;
  product_id: number;
  store_id: number | null;
  customer_id: number;
  rate: number;
  comment: string;
  is_purchased: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface BeStoreReview {
  id: number;
  store_id: string;
  customer_id: number;
  rate: number;
  comment: string;
  is_hidden: boolean;
  created_at: string;
}

// --------------------------------------------------------------------------- #
// FROZEN UI shapes (formerly in mock/content.ts)
// --------------------------------------------------------------------------- #
export interface ProductReview {
  id: string;
  product: string;
  store: string;
  rating: number;
  comment: string;
  customer: string;
  is_purchased: boolean;
  created_at: string;
  hidden: boolean;
}

export interface StoreReview {
  id: string;
  store: string;
  rating: number;
  comment: string;
  customer: string;
  created_at: string;
  hidden: boolean;
}

/** Map a BE ProductReview to the FROZEN UI ProductReview. BE carries ids, not
 * product / store / customer display names, so those render as labelled ids. */
export function toProductReview(r: BeProductReview): ProductReview {
  return {
    id: String(r.id),
    product: `#${r.product_id}`,
    store: r.store_id != null ? `#${r.store_id}` : "—",
    rating: r.rate,
    comment: r.comment,
    customer: `#${r.customer_id}`,
    is_purchased: r.is_purchased,
    created_at: (r.created_at ?? "").slice(0, 10),
    hidden: r.is_hidden,
  };
}

export function toStoreReview(r: BeStoreReview): StoreReview {
  return {
    id: String(r.id),
    store: `#${r.store_id}`,
    rating: r.rate,
    comment: r.comment,
    customer: `#${r.customer_id}`,
    created_at: (r.created_at ?? "").slice(0, 10),
    hidden: r.is_hidden,
  };
}

// --------------------------------------------------------------------------- #
// Server fns — product reviews
// --------------------------------------------------------------------------- #
const productListInput = z
  .object({
    product_id: z.number().optional(),
    store_id: z.number().optional(),
    hidden: z.boolean().optional(),
  })
  .optional();

export const listProductReviews = createServerFn({ method: "GET" })
  .inputValidator(productListInput)
  .handler(async ({ data }) => {
    try {
      const sp = new URLSearchParams();
      if (data?.product_id) sp.set("product_id", String(data.product_id));
      if (data?.store_id) sp.set("store_id", String(data.store_id));
      if (data?.hidden !== undefined) sp.set("hidden", String(data.hidden));
      sp.set("page_size", "200");
      return await apiGet<Page<BeProductReview>>(`/api/admin/v1/reviews/product/?${sp.toString()}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const hideProductReview = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeProductReview>(`/api/admin/v1/reviews/product/${data.id}/hide/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const unhideProductReview = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<BeProductReview>(`/api/admin/v1/reviews/product/${data.id}/hide/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Server fns — store reviews
// --------------------------------------------------------------------------- #
const storeListInput = z
  .object({ store_id: z.number().optional(), hidden: z.boolean().optional() })
  .optional();

export const listStoreReviews = createServerFn({ method: "GET" })
  .inputValidator(storeListInput)
  .handler(async ({ data }) => {
    try {
      const sp = new URLSearchParams();
      if (data?.store_id) sp.set("store_id", String(data.store_id));
      if (data?.hidden !== undefined) sp.set("hidden", String(data.hidden));
      sp.set("page_size", "200");
      return await apiGet<Page<BeStoreReview>>(`/api/admin/v1/reviews/store/?${sp.toString()}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const hideStoreReview = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeStoreReview>(`/api/admin/v1/reviews/store/${data.id}/hide/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const unhideStoreReview = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<BeStoreReview>(`/api/admin/v1/reviews/store/${data.id}/hide/`);
    } catch (err) {
      throw toClientError(err);
    }
  });
