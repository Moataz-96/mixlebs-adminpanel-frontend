import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the coupons server fns (list + create). Same stubbing
// approach as orders.functions.test.ts: createServerFn is stubbed so the raw
// handler runs, the _client.* helpers are mocked (NOT a live Django), and we
// assert the right URL / body reach the client and the unwrapped envelope data
// flows back through the RPC boundary.

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

describe("listCoupons server fn", () => {
  it("GETs the coupons endpoint with the store/page filters and returns the unwrapped page", async () => {
    const page = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 7,
          code: "SAFFRON15",
          scope: "STORE",
          store_id: "str_7",
          store_name: "Beirut Pantry",
          discount_type: "PERCENTAGE",
          discount_value: "15.00",
          capped_at: "25.00",
          min_order_cost: "30.00",
          min_num_items: 1,
          max_uses: 500,
          max_uses_per_user: 1,
          times_used: 84,
          is_valid: true,
          starts_at: "2026-05-01T00:00:00Z",
          expires: "2026-06-30T23:59:00Z",
          eligible_category_ids: null,
          eligible_product_ids: null,
          excluded_product_ids: null,
          new_customers_only: null,
          eligible_payment_types: null,
          created_at: "2026-04-20T09:12:00Z",
          updated_at: null,
        },
      ],
    };
    apiGet.mockResolvedValueOnce(page);

    const { listCoupons } = await import("./coupons.functions");
    const result = await (listCoupons as unknown as Fn)({
      data: { store_id: "str_7", page_size: 200 },
    });

    expect(apiGet).toHaveBeenCalledTimes(1);
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/v1/coupons/");
    expect(url).toContain("store_id=str_7");
    expect(url).toContain("page_size=200");
    expect(result).toEqual(page);
  });

  it("omits a null store_id (cross-store list) from the query string", async () => {
    apiGet.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    const { listCoupons } = await import("./coupons.functions");
    await (listCoupons as unknown as Fn)({ data: { store_id: null } });
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).not.toContain("store_id");
  });
});

describe("createCoupon server fn", () => {
  it("POSTs the coupon write body (decimals stringified) and returns the created coupon", async () => {
    const created = { id: 9, code: "WELCOME10", discount_type: "MONETARY" };
    apiPost.mockResolvedValueOnce(created);

    const { createCoupon } = await import("./coupons.functions");
    const result = await (createCoupon as unknown as Fn)({
      data: {
        code: "WELCOME10",
        scope: "STORE",
        store_id: "str_7",
        discount_type: "MONETARY",
        discount_value: 10,
        min_order_cost: 0,
        min_num_items: 0,
        max_uses: 5000,
        max_uses_per_user: 1,
        is_valid: true,
        expires: "2026-12-31T23:59",
        // ENTRY 008 placeholders — sent but dropped by the BE.
        eligible_payment_types: ["COD", "CC"],
        new_customers_only: true,
      },
    });

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/coupons/");
    const body = apiPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body.code).toBe("WELCOME10");
    expect(body.discount_type).toBe("MONETARY");
    expect(body.discount_value).toBe("10"); // DecimalField -> string
    expect(body.store_id).toBe("str_7");
    expect(body.expires).toBe("2026-12-31T23:59");
    expect(body.eligible_payment_types).toEqual(["COD", "CC"]);
    expect(result).toEqual(created);
  });
});
