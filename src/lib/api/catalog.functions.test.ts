import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the catalog server fns (products list + create + bulk).
// Same stubbing approach as dashboard.functions.test.ts: createServerFn is
// stubbed so the raw handler runs, the _client.* helpers are mocked (NOT a live
// Django), and we assert the right URL / body reach the client and the
// unwrapped envelope data is returned through the createServerFn RPC boundary.

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiDelete = vi.fn();

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      inputValidator: () => builder,
      handler: (fn: unknown) => fn,
    };
    return builder;
  },
}));

vi.mock("./_client", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
  apiPatch: (...a: unknown[]) => apiPatch(...a),
  apiDelete: (...a: unknown[]) => apiDelete(...a),
  apiUpload: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

type Fn = (a: { data: unknown }) => Promise<unknown>;

describe("listProducts server fn", () => {
  it("GETs the products endpoint with the store/page filters and returns the unwrapped page", async () => {
    const page = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 7,
          store_id: "str_7",
          category_id: 3,
          status: "AVAILABLE",
          list_price: "38.00",
          sold_out: 312,
          name: "Saffron Threads",
          price_min: "22.00",
          price_max: "38.00",
          max_discount: "0.00",
          stock: "124",
          variants_count: "3",
          rating_avg: "4.8",
          rating_count: "96",
          primary_image: "https://cdn/x.jpg",
          created_at: "2026-01-12T00:00:00Z",
          updated_at: "2026-05-21T00:00:00Z",
        },
      ],
    };
    apiGet.mockResolvedValueOnce(page);

    const { listProducts } = await import("./catalog.functions");
    const result = await (listProducts as unknown as Fn)({
      data: { store_id: "str_7", page_size: 200 },
    });

    expect(apiGet).toHaveBeenCalledTimes(1);
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/v1/products/");
    expect(url).toContain("store_id=str_7");
    expect(url).toContain("page_size=200");
    expect(result).toEqual(page);
  });

  it("omits a null store_id (cross-store list) from the query string", async () => {
    apiGet.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    const { listProducts } = await import("./catalog.functions");
    await (listProducts as unknown as Fn)({ data: { store_id: null } });
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).not.toContain("store_id");
  });
});

describe("createProduct server fn", () => {
  it("POSTs the product body to the products endpoint and returns the created detail", async () => {
    const created = { id: 99, name: "New", category_id: 3, status: "TEMPORARY" };
    apiPost.mockResolvedValueOnce(created);

    const { createProduct } = await import("./catalog.functions");
    const body = {
      store: "str_7",
      category: 3,
      status: "TEMPORARY",
      list_price: "10.00",
      translations: [{ language_code: "en", name: "New", description: "" }],
    };
    const result = await (createProduct as unknown as Fn)({ data: body });

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/products/");
    expect(apiPost.mock.calls[0][1]).toEqual(body);
    expect(result).toEqual(created);
  });
});

describe("bulkUpdateProducts server fn", () => {
  it("POSTs ids + action to the bulk_update endpoint", async () => {
    apiPost.mockResolvedValueOnce({ updated: 3 });
    const { bulkUpdateProducts } = await import("./catalog.functions");
    await (bulkUpdateProducts as unknown as Fn)({
      data: { ids: [1, 2, 3], action: "activate" },
    });
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/products/bulk_update/");
    expect(apiPost.mock.calls[0][1]).toEqual({ ids: [1, 2, 3], action: "activate" });
  });
});

describe("listCategories + listTags server fns", () => {
  it("GET the categories and tags endpoints", async () => {
    apiGet.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    const mod = await import("./catalog.functions");
    await (mod.listCategories as unknown as Fn)({ data: { page_size: 200 } });
    expect(apiGet.mock.calls[0][0]).toContain("/api/admin/v1/categories/");

    apiGet.mockResolvedValueOnce([]);
    await (mod.listTags as unknown as Fn)({ data: {} });
    expect(apiGet.mock.calls[1][0]).toContain("/api/admin/v1/tags/");
  });
});

describe("global tag CRUD server fns (ENTRY 018)", () => {
  it("POSTs a new tag name, PATCHes a rename, and DELETEs by name", async () => {
    const mod = await import("./catalog.functions");

    apiPost.mockResolvedValueOnce({ name: "sale", product_count: 0 });
    await (mod.createTag as unknown as Fn)({ data: { name: "sale" } });
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/tags/");
    expect(apiPost.mock.calls[0][1]).toEqual({ name: "sale" });

    apiPatch.mockResolvedValueOnce({ name: "promo", product_count: 2 });
    await (mod.renameTag as unknown as Fn)({ data: { name: "sale", new_name: "promo" } });
    expect(apiPatch.mock.calls[0][0]).toBe("/api/admin/v1/tags/sale/");
    expect(apiPatch.mock.calls[0][1]).toEqual({ new_name: "promo" });

    apiDelete.mockResolvedValueOnce(null);
    await (mod.deleteTag as unknown as Fn)({ data: { name: "promo" } });
    expect(apiDelete.mock.calls[0][0]).toBe("/api/admin/v1/tags/promo/");
  });
});

describe("listCategoryPropertyLogs server fn (ENTRY 021)", () => {
  it("GETs the category property-logs endpoint", async () => {
    apiGet.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    const mod = await import("./catalog.functions");
    await (mod.listCategoryPropertyLogs as unknown as Fn)({ data: { categoryId: 5 } });
    expect(apiGet.mock.calls[0][0]).toBe("/api/admin/v1/categories/5/property-logs/");
  });
});
