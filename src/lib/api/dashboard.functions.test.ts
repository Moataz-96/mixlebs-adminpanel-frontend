import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the dashboard server fns. Same stubbing approach as
// rbac.functions.test.ts / stores.functions.test.ts: createServerFn is stubbed
// so the raw handler runs, the _client.* helpers are mocked (NOT a live
// Django), and we assert the right URL / query string reach the client and the
// unwrapped envelope data is returned through the createServerFn RPC boundary.

const apiGet = vi.fn();

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
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiUpload: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

type Fn = (a: { data: unknown }) => Promise<unknown>;

describe("getOverview server fn", () => {
  it("GETs the overview endpoint with the date/store/compare query and returns the unwrapped payload", async () => {
    const overview = {
      store_id: "str_7",
      all_stores: false,
      date_from: "2026-05-01T00:00:00Z",
      date_to: "2026-05-29T00:00:00Z",
      revenue_gross: "12486.00",
      revenue_net: "11902.00",
      orders_count: 84,
      average_order_value: "148.64",
      new_customers: 36,
      returning_customers: 58,
      conversion_rate: 0.0342,
      returns_count: 4,
      returns_rate: 0.008,
      abandoned_carts: 42,
      active_products: 1284,
      out_of_stock_products: 22,
      avg_product_rating: 4.6,
      avg_store_rating: 4.8,
      wallet_inflow: "8450.00",
      wallet_outflow: "2120.00",
      coupon_redemptions: 48,
      top_products: [{ product_id: "p_1", units_sold: 120, revenue: "4560.00" }],
      top_categories: [{ category_id: 3, units_sold: 412, revenue: "8240.00" }],
      stock_alerts: [
        { variant_id: 9, product_id: "p_3", sku: "ROS-205", current_stock: 0, threshold: 10 },
      ],
      deltas: {
        revenue_gross: 0.182,
        revenue_net: 0.161,
        orders_count: 0.12,
        average_order_value: 0.034,
        new_customers: -0.04,
        returning_customers: 0.09,
      },
    };
    apiGet.mockResolvedValueOnce(overview);

    const { getOverview } = await import("./dashboard.functions");
    const result = await (getOverview as unknown as Fn)({
      data: {
        date_from: "2026-05-01",
        date_to: "2026-05-29",
        store_id: "str_7",
        compare_to: "prev_period",
      },
    });

    expect(apiGet).toHaveBeenCalledTimes(1);
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/v1/dashboard/overview/");
    expect(url).toContain("date_from=2026-05-01");
    expect(url).toContain("date_to=2026-05-29");
    expect(url).toContain("store_id=str_7");
    expect(url).toContain("compare_to=prev_period");
    expect(result).toEqual(overview);
  });

  it("omits a null store_id (cross-store aggregate) from the query string", async () => {
    apiGet.mockResolvedValueOnce({ all_stores: true });
    const { getOverview } = await import("./dashboard.functions");
    await (getOverview as unknown as Fn)({
      data: { date_from: "2026-05-01", date_to: "2026-05-29", store_id: null },
    });
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).not.toContain("store_id");
  });
});

describe("getTimeseries server fn", () => {
  it("forwards metric + granularity to the timeseries endpoint", async () => {
    apiGet.mockResolvedValueOnce({ metric: "revenue", granularity: "day", series: [] });
    const { getTimeseries } = await import("./dashboard.functions");
    await (getTimeseries as unknown as Fn)({
      data: { metric: "revenue", granularity: "day", date_from: "2026-05-01", date_to: "2026-05-29" },
    });
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/v1/dashboard/timeseries/");
    expect(url).toContain("metric=revenue");
    expect(url).toContain("granularity=day");
  });
});

describe("getFunnel + getWallet server fns", () => {
  it("GET the funnel and wallet endpoints with the date window", async () => {
    apiGet.mockResolvedValueOnce({ visits: 100 });
    const mod = await import("./dashboard.functions");
    await (mod.getFunnel as unknown as Fn)({
      data: { date_from: "2026-05-01", date_to: "2026-05-29" },
    });
    expect(apiGet.mock.calls[0][0]).toContain("/api/admin/v1/dashboard/funnel/");

    apiGet.mockResolvedValueOnce({ wallet_inflow: "1.00", wallet_outflow: "0.00" });
    await (mod.getWallet as unknown as Fn)({
      data: { date_from: "2026-05-01", date_to: "2026-05-29" },
    });
    expect(apiGet.mock.calls[1][0]).toContain("/api/admin/v1/dashboard/wallet/");
  });
});
