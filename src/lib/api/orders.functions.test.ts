import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the orders server fns (list + status transition + the
// invoice PDF download). Same stubbing approach as catalog.functions.test.ts:
// createServerFn is stubbed so the raw handler runs, the _client.* helpers are
// mocked (NOT a live Django), and we assert the right URL / body reach the
// client and the unwrapped envelope data flows back through the RPC boundary.

const apiGet = vi.fn();
const apiPost = vi.fn();

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
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiUpload: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

type Fn = (a: { data: unknown }) => Promise<unknown>;

describe("listOrders server fn", () => {
  it("GETs the orders endpoint with the store/page filters and returns the unwrapped page", async () => {
    const page = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: "o_4501",
          order_number: "MX-4501",
          customer_name: "Layla Haddad",
          customer_phone: "+961 70 123 456",
          store: "str_7",
          store_name: "Beirut Pantry",
          items_count: 4,
          subtotal: "70.00",
          tax: "7.70",
          delivery_fees: "8.00",
          total: "85.70",
          payment_type: "CC",
          order_status: "PENDING",
          transfer_status: "PENDING",
          courier: 1,
          courier_name: "Beirut Express",
          has_coupon: true,
          created_at: "2026-05-28T14:02:00Z",
          delivered_at: null,
        },
      ],
    };
    apiGet.mockResolvedValueOnce(page);

    const { listOrders } = await import("./orders.functions");
    const result = await (listOrders as unknown as Fn)({
      data: { store_id: "str_7", page_size: 200 },
    });

    expect(apiGet).toHaveBeenCalledTimes(1);
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/v1/orders/");
    expect(url).toContain("store_id=str_7");
    expect(url).toContain("page_size=200");
    expect(result).toEqual(page);
  });

  it("omits a null store_id (cross-store list) from the query string", async () => {
    apiGet.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    const { listOrders } = await import("./orders.functions");
    await (listOrders as unknown as Fn)({ data: { store_id: null } });
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).not.toContain("store_id");
  });
});

describe("transitionOrderStatus server fn", () => {
  it("POSTs the target status to the order status endpoint and returns the refreshed detail", async () => {
    const detail = { id: "o_4501", order_status: "READY", allowed_transitions: ["SHIPPED"] };
    apiPost.mockResolvedValueOnce(detail);

    const { transitionOrderStatus } = await import("./orders.functions");
    const result = await (transitionOrderStatus as unknown as Fn)({
      data: { id: "o_4501", status: "READY" },
    });

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/orders/o_4501/status/");
    expect(apiPost.mock.calls[0][1]).toEqual({ status: "READY" });
    expect(result).toEqual(detail);
  });
});

describe("appendTracking server fn", () => {
  it("POSTs details (+ optional courier_id) to the tracking endpoint", async () => {
    apiPost.mockResolvedValueOnce({ id: 9, sequence: 2, details: "Picked up", timestamp: null });
    const { appendTracking } = await import("./orders.functions");
    await (appendTracking as unknown as Fn)({
      data: { id: "o_4501", details: "Picked up", courier_id: 1 },
    });
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/orders/o_4501/tracking/");
    expect(apiPost.mock.calls[0][1]).toEqual({ details: "Picked up", courier_id: 1 });
  });
});
