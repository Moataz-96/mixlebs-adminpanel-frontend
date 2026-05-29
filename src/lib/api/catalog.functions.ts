// Catalog server functions for Phase 4 (products + nested variants/images/
// dimensions/properties/tags/reviews, categories + translations +
// category-properties, properties, property-values, tags, bulk_update).
//
// Each .handler body runs SERVER-ONLY, so the _client.ts helpers (cookie read +
// Bearer attach + envelope unwrap) are tree-shaken from the client bundle.
// _client.ts returns the unwrapped DRF `data`, so list helpers resolve to a
// Page<T> and detail helpers to the item. Field names mirror
// mixlebs-adminpanel-backend/openapi.json exactly (admin-catalog tag). Decimal
// money fields arrive as STRINGS (DRF DecimalField); the screens format them.
//
// STAFF/ADMIN pass store_id (from the topbar store picker) for store scoping;
// STORE users are auto-scoped on the BE and ignore any client store_id.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "./_client";
import { toClientError } from "./error";

// ---------------------------------------------------------------------------
// Shared paging envelope (DRF PageNumberPagination → count/next/previous/results).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Product types (openapi: ProductList / ProductDetail / ProductWrite + nested).
// ---------------------------------------------------------------------------

export interface ProductInfo {
  id: number;
  language: number;
  language_code: string;
  name: string;
  description: string;
}

export interface ProductListItem {
  id: number;
  store_id: string;
  category_id: number;
  status: string;
  list_price: string;
  sold_out: number;
  name: string;
  price_min: string;
  price_max: string;
  max_discount: string;
  stock: string;
  variants_count: string;
  rating_avg: string;
  rating_count: string;
  primary_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductDetail extends ProductListItem {
  translations: ProductInfo[];
  tags: string;
}

export interface VariantAttribute {
  id: number;
  property: number;
  property_key: string;
  value: number;
  value_label: string;
}

export interface Variant {
  id: number;
  product: number;
  model_number: string | null;
  original_price: string;
  price: string;
  discount: string;
  sku: string | null;
  stock: number;
  attributes: VariantAttribute[];
}

export interface ProductImageItem {
  id: number;
  product: number;
  image: number;
  src: string;
  thumbnail: string;
  order: number;
  relaxation: boolean;
  ml_creature_detection: string;
  gt_creature_detection: string;
}

export interface ProductDimension {
  id: number;
  product: number;
  width: string;
  width_unit: string;
  height: string;
  height_unit: string;
  length: string;
  length_unit: string;
  weight: string;
  weight_unit: string;
}

export interface ProductPropertyItem {
  id: number;
  product: number;
  property: number;
  property_key: string;
  value: number;
  value_label: string;
}

export interface ProductTagItem {
  id: number;
  product: number;
  name: string;
  created_at: string;
}

export interface ProductReviewItem {
  id: number;
  product: number;
  customer_id: string;
  // ENTRY 021: reviewer identity resolved from Customer.user (may be null).
  reviewer_name: string | null;
  reviewer_email: string | null;
  rate: number;
  comment: string;
  is_purchased: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// products — list / detail / create / update / delete + bulk_update.
// ---------------------------------------------------------------------------

const productListInput = z
  .object({
    store_id: z.string().nullable().optional(),
    category_id: z.number().optional(),
    status: z.string().optional(),
    q: z.string().optional(),
    ordering: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator(productListInput)
  .handler(async ({ data }) => {
    try {
      const query = qs({
        store_id: data?.store_id,
        category_id: data?.category_id,
        status: data?.status,
        q: data?.q,
        ordering: data?.ordering,
        page: data?.page,
        page_size: data?.page_size,
      });
      return await apiGet<Page<ProductListItem>>(`/api/admin/v1/products/${query}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<ProductDetail>(`/api/admin/v1/products/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<ProductDetail>(`/api/admin/v1/products/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<ProductDetail>(`/api/admin/v1/products/${data.id}/`, data.body);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/products/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// Bulk activate / hide / archive / delete / change-category / add-tag / move-store
// (FE §7.1 bulk bar). Body: { ids: number[], action: string, ...extras }.
export const bulkUpdateProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { ids: Array<number | string>; action: string; [k: string]: unknown }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<unknown>(`/api/admin/v1/products/bulk_update/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// products/{id}/variants — list / create / update / delete.
// ---------------------------------------------------------------------------

export const listVariants = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<Variant> | Variant[]>(
        `/api/admin/v1/products/${data.productId}/variants/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createVariant = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<Variant>(
        `/api/admin/v1/products/${data.productId}/variants/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateVariant = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; id: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<Variant>(
        `/api/admin/v1/products/${data.productId}/variants/${data.id}/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteVariant = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(
        `/api/admin/v1/products/${data.productId}/variants/${data.id}/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// products/{id}/images — list / attach (asset id or multipart) / reorder / delete.
// ---------------------------------------------------------------------------

export const listProductImages = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<ProductImageItem> | ProductImageItem[]>(
        `/api/admin/v1/products/${data.productId}/images/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const attachProductImage = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<ProductImageItem>(
        `/api/admin/v1/products/${data.productId}/images/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateProductImage = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; id: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<ProductImageItem>(
        `/api/admin/v1/products/${data.productId}/images/${data.id}/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteProductImage = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/products/${data.productId}/images/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// products/{id}/dimensions — OneToOne GET + PATCH upsert.
// ---------------------------------------------------------------------------

export const getProductDimensions = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<ProductDimension>(
        `/api/admin/v1/products/${data.productId}/dimensions/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateProductDimensions = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<ProductDimension>(
        `/api/admin/v1/products/${data.productId}/dimensions/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// products/{id}/properties — list / create / delete.
// ---------------------------------------------------------------------------

export const listProductProperties = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<ProductPropertyItem> | ProductPropertyItem[]>(
        `/api/admin/v1/products/${data.productId}/properties/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createProductProperty = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<ProductPropertyItem>(
        `/api/admin/v1/products/${data.productId}/properties/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteProductProperty = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(
        `/api/admin/v1/products/${data.productId}/properties/${data.id}/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// products/{id}/tags — list / create / delete.
// ---------------------------------------------------------------------------

export const listProductTags = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<ProductTagItem> | ProductTagItem[]>(
        `/api/admin/v1/products/${data.productId}/tags/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createProductTag = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<ProductTagItem>(
        `/api/admin/v1/products/${data.productId}/tags/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteProductTag = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: number; id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/products/${data.productId}/tags/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// products/{id}/reviews — list (read-only, moderation lives in P8).
// ---------------------------------------------------------------------------

export const listProductReviews = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<ProductReviewItem> | ProductReviewItem[]>(
        `/api/admin/v1/products/${data.productId}/reviews/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// Categories (tree) + translations + category-properties.
// ---------------------------------------------------------------------------

export interface CategoryTranslation {
  id: number;
  language: number;
  language_code: string;
  name: string;
  description: string;
}

export interface CategoryItem {
  id: number;
  parent: number | null;
  identifier: string;
  icon: number;
  returns: boolean;
  is_published: boolean;
  name: string;
  translations: CategoryTranslation[];
  children_count: string;
  created_at: string;
}

export interface CategoryPropertyItem {
  id: number;
  category: number;
  property: number;
  property_key: string;
  is_required: boolean;
  is_characteristic: boolean;
  characteristic_order: number | null;
}

const categoryListInput = z
  .object({
    parent_id: z.number().optional(),
    q: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

export const listCategories = createServerFn({ method: "GET" })
  .inputValidator(categoryListInput)
  .handler(async ({ data }) => {
    try {
      const query = qs({
        parent_id: data?.parent_id,
        q: data?.q,
        page: data?.page,
        page_size: data?.page_size,
      });
      return await apiGet<Page<CategoryItem>>(`/api/admin/v1/categories/${query}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getCategory = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<CategoryItem>(`/api/admin/v1/categories/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<CategoryItem>(`/api/admin/v1/categories/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<CategoryItem>(`/api/admin/v1/categories/${data.id}/`, data.body);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/categories/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const listCategoryProperties = createServerFn({ method: "GET" })
  .inputValidator((d: { categoryId: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<CategoryPropertyItem> | CategoryPropertyItem[]>(
        `/api/admin/v1/categories/${data.categoryId}/properties/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createCategoryProperty = createServerFn({ method: "POST" })
  .inputValidator((d: { categoryId: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<CategoryPropertyItem>(
        `/api/admin/v1/categories/${data.categoryId}/properties/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteCategoryProperty = createServerFn({ method: "POST" })
  .inputValidator((d: { categoryId: number; id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(
        `/api/admin/v1/categories/${data.categoryId}/properties/${data.id}/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// Properties (admin only) + property-values (store-scoped).
// ---------------------------------------------------------------------------

export interface PropertyKeyTranslation {
  id: number;
  language: number;
  language_code: string;
  key: string;
  description: string;
}

// ENTRY 019: a property's allowed value rows (id + value + owning store).
export interface PropertyValueRef {
  id: number;
  value: string;
  store_id: string | null;
}

export interface PropertyItem {
  id: number;
  key: string;
  placeholder: string | null;
  is_multilingual: boolean;
  is_multi_value: boolean;
  is_attribute: boolean;
  is_modifiable: boolean;
  data_type: string;
  field_type: string;
  translations: PropertyKeyTranslation[];
  // ENTRY 019: value list + product usage count, computed on the BE.
  values: PropertyValueRef[];
  usage_count: number;
  created_at: string;
}

export interface PropertyValueTranslation {
  id: number;
  language: number;
  language_code: string;
  value: string;
}

export interface PropertyValueItem {
  id: number;
  store: string | null;
  // ENTRY 019: owning store's shop_name (null for platform values).
  store_name: string | null;
  property: number;
  property_key: string;
  value: string;
  translations: PropertyValueTranslation[];
}

export const listProperties = createServerFn({ method: "GET" })
  .inputValidator((d?: { page?: number; page_size?: number }) => d)
  .handler(async ({ data }) => {
    try {
      const query = qs({ page: data?.page, page_size: data?.page_size });
      return await apiGet<Page<PropertyItem>>(`/api/admin/v1/properties/${query}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createProperty = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<PropertyItem>(`/api/admin/v1/properties/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateProperty = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<PropertyItem>(`/api/admin/v1/properties/${data.id}/`, data.body);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteProperty = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/properties/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const listPropertyValues = createServerFn({ method: "GET" })
  .inputValidator((d?: { page?: number; page_size?: number }) => d)
  .handler(async ({ data }) => {
    try {
      const query = qs({ page: data?.page, page_size: data?.page_size });
      return await apiGet<Page<PropertyValueItem>>(`/api/admin/v1/property-values/${query}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createPropertyValue = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<PropertyValueItem>(`/api/admin/v1/property-values/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updatePropertyValue = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; body: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<PropertyValueItem>(
        `/api/admin/v1/property-values/${data.id}/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deletePropertyValue = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/property-values/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// Tags — global catalogue (ENTRY 018). /tags/ now aggregates distinct tag NAMES
// with a per-name product_count and (STAFF/admin) the owning store column, plus
// global name CRUD: POST /tags/ (create), PATCH /tags/{name}/ (rename),
// DELETE /tags/{name}/ (delete across every visible ProductTag row). Per-product
// tag CRUD is the nested products/{id}/tags above.
// ---------------------------------------------------------------------------

export interface TagItem {
  name: string;
  product_count: number;
  store_id: string | null;
  store_name: string | null;
  created_at: string | null;
}

export const listTags = createServerFn({ method: "GET" })
  .inputValidator((d?: { page?: number; page_size?: number; q?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const query = qs({ page: data?.page, page_size: data?.page_size, q: data?.q });
      return await apiGet<Page<TagItem> | TagItem[]>(`/api/admin/v1/tags/${query}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const createTag = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<TagItem>(`/api/admin/v1/tags/`, { name: data.name });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const renameTag = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; new_name: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<TagItem>(`/api/admin/v1/tags/${encodeURIComponent(data.name)}/`, {
        new_name: data.new_name,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteTag = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/tags/${encodeURIComponent(data.name)}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// categories/{id}/property-logs — the property-suggestion log (ENTRY 021).
// ---------------------------------------------------------------------------

export interface CategoryPropertyLogItem {
  id: number;
  category: number;
  category_property: number;
  property_key: string;
  user: string | null;
  user_name: string | null;
  user_email: string | null;
  like_status: string;
  created_at: string;
}

export const listCategoryPropertyLogs = createServerFn({ method: "GET" })
  .inputValidator((d: { categoryId: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<CategoryPropertyLogItem> | CategoryPropertyLogItem[]>(
        `/api/admin/v1/categories/${data.categoryId}/property-logs/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
