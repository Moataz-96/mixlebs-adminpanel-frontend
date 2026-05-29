import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the P7 admin-stores detail server fns (getStore +
// transition + identity review). createServerFn stubbed; _client.* mocked.

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

describe("getStore server fn", () => {
  it("GETs the store detail and returns the unwrapped record incl. identity_summary", async () => {
    const detail = {
      id: "str_03",
      user_id: "u_05",
      owner_email: "owner@tripolispices.lb",
      shop_name: "Tripoli Spices",
      status: "PENDING_VERIFICATION",
      banner_label_key: "store.banner.pending_verification",
      account_type: "INDIVIDUAL",
      rank: 3,
      order_online: false,
      returns: false,
      chat: false,
      asset_sharing: false,
      categories: [1, 2],
      info: { en: { id: 1, language_code: "en", name: "Tripoli Spices", about: "Spices", features: "", target_audience: "", selling_promotions: "" } },
      working_days: [{ id: 1, day: "MON", start_time: "09:00:00", end_time: "18:00:00" }],
      identity_summary: { has_identity: true, account_type: "INDIVIDUAL", documents_count: 2, submitted_at: "2025-04-21T10:00:00Z" },
      legal_transitions: ["VERIFIED", "UNVERIFIED", "BLOCKED"],
    };
    apiGet.mockResolvedValueOnce(detail);

    const { getStore } = await import("./stores.admin.functions");
    const result = await (getStore as unknown as Fn)({ data: { id: "str_03" } });

    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet.mock.calls[0][0]).toBe("/api/admin/v1/stores/str_03/");
    expect(result).toEqual(detail);
  });
});

describe("reviewIdentity server fn", () => {
  it("POSTs the approve decision to the identity review endpoint", async () => {
    apiPost.mockResolvedValueOnce({ id: "str_03", status: "VERIFIED" });
    const { reviewIdentity } = await import("./stores.admin.functions");
    await (reviewIdentity as unknown as Fn)({ data: { id: "str_03", decision: "approve" } });
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/stores/str_03/identity/review/");
    expect(apiPost.mock.calls[0][1]).toEqual({ decision: "approve", reason: "" });
  });

  it("POSTs reject with the required reason", async () => {
    apiPost.mockResolvedValueOnce({ id: "str_03", status: "UNVERIFIED" });
    const { reviewIdentity } = await import("./stores.admin.functions");
    await (reviewIdentity as unknown as Fn)({
      data: { id: "str_03", decision: "reject", reason: "Blurry document" },
    });
    expect(apiPost.mock.calls[0][1]).toEqual({ decision: "reject", reason: "Blurry document" });
  });
});

describe("transitionStoreStatus server fn", () => {
  it("POSTs the target status to transition_status", async () => {
    apiPost.mockResolvedValueOnce({ id: "str_03", status: "BLOCKED" });
    const { transitionStoreStatus } = await import("./stores.admin.functions");
    await (transitionStoreStatus as unknown as Fn)({
      data: { id: "str_03", status: "BLOCKED", reason: "abuse" },
    });
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/stores/str_03/transition_status/");
    expect(apiPost.mock.calls[0][1]).toEqual({ status: "BLOCKED", reason: "abuse" });
  });
});
