import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the registerStore server fn (happy path). Same stubbing
// approach as auth.functions.test.ts: createServerFn is stubbed so the raw
// handler runs, _client.apiPost is mocked (NOT a live Django), and
// cookies.server is mocked so we can assert the new STORE user is auto-signed-in
// while the access/refresh tokens are NEVER returned to the client.

const apiPost = vi.fn();
const setAuthCookies = vi.fn();

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
  apiPost: (...a: unknown[]) => apiPost(...a),
  apiGet: vi.fn(),
  apiUpload: vi.fn(),
}));

vi.mock("./cookies.server", () => ({
  setAuthCookies: (...a: unknown[]) => setAuthCookies(...a),
  clearAuthCookies: vi.fn(),
  readRefreshCookie: vi.fn(),
  setAccessCookie: vi.fn(),
  setRefreshCookie: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const PAYLOAD = {
  verification_ticket: "vt_123",
  user: {
    email: "owner@store.com",
    phone: "+96170000000",
    password: "secret123",
    first_name: "Karim",
    last_name: "Haddad",
  },
  shop: { name_en: "Beirut Pantry", name_ar: "بيروت بانتري", default_language: "en" },
  address: {
    location_id: "loc_1",
    latitude: "33.8",
    longitude: "35.5",
    recipient_name: "Karim",
    phone_number: "+96170000000",
    governorate: "Beirut",
    street: "Hamra",
    building: 5,
    floor: 2,
    apartment: 3,
  },
  identity: {
    account_type: "INDIVIDUAL",
    identity: "ID123",
    first_name: "Karim",
    last_name: "Haddad",
    residential_address: "Hamra St",
    country_of_issue: "LB",
    expiration_date: "2030-01-01",
    dob: "1990-01-01",
    identity_front_side_document_id: "asset_front",
    identity_back_side_document_id: "asset_back",
    supporting_document_ids: ["asset_sup1"],
  },
  payment: {
    brand: "Visa",
    holder_name: "KARIM HADDAD",
    exp_month: 12,
    exp_year: 2030,
    token: "tok_abc",
  },
};

describe("registerStore server fn (happy path)", () => {
  it("posts the wizard payload, auto-signs-in, and returns status without tokens", async () => {
    apiPost.mockResolvedValueOnce({
      id: "st_1",
      status: "PENDING_VERIFICATION",
      banner_label_key: "auth.bannerPendingVerification",
      access: "ACCESS_JWT",
      refresh: "REFRESH_JWT",
    });

    const { registerStore } = await import("./stores.functions");
    const result = await (registerStore as unknown as (a: { data: unknown }) => Promise<unknown>)({
      data: PAYLOAD,
    });

    // Posted to the register endpoint with the BE-keyed identity fields.
    const [url, body] = apiPost.mock.calls[0] as [string, { identity: Record<string, unknown> }];
    expect(url).toBe("/api/admin/v1/stores/register/");
    expect(body.identity.identity_front_side_document_id).toBe("asset_front");
    expect(body.identity.identity_back_side_document_id).toBe("asset_back");
    expect(body.identity.supporting_document_ids).toEqual(["asset_sup1"]);

    // New STORE user auto-signed-in via cookies.
    expect(setAuthCookies).toHaveBeenCalledWith("ACCESS_JWT", "REFRESH_JWT");

    // Status returned; tokens stripped.
    expect(result).toEqual({
      id: "st_1",
      status: "PENDING_VERIFICATION",
      banner_label_key: "auth.bannerPendingVerification",
    });
    expect(JSON.stringify(result)).not.toContain("ACCESS_JWT");
    expect(JSON.stringify(result)).not.toContain("REFRESH_JWT");
  });
});
