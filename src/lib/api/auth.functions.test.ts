import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the login server fn (happy path) + its error mapping.
// We stub createServerFn so `.handler(fn)` hands back the raw handler, letting
// us drive the real handler logic with a mocked _client (NOT a live Django).
// All token I/O goes through the mocked cookies.server, so we can assert the
// handler writes the auth cookies and returns ONLY {user, store}.

const apiPost = vi.fn();
const apiGet = vi.fn();
const setAuthCookies = vi.fn();
const clearAuthCookies = vi.fn();
const readRefreshCookie = vi.fn();

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
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiUpload: vi.fn(),
}));

vi.mock("./cookies.server", () => ({
  setAuthCookies: (...a: unknown[]) => setAuthCookies(...a),
  clearAuthCookies: (...a: unknown[]) => clearAuthCookies(...a),
  readRefreshCookie: (...a: unknown[]) => readRefreshCookie(...a),
  setAccessCookie: vi.fn(),
  setRefreshCookie: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login server fn (happy path)", () => {
  it("posts credentials, sets auth cookies, and returns only {user, store}", async () => {
    apiPost.mockResolvedValueOnce({
      access: "ACCESS_JWT",
      refresh: "REFRESH_JWT",
      user: { id: "u1", type: "STAFF", email: "staff@mixlebs.com" },
      store: null,
    });

    const { login } = await import("./auth.functions");
    const result = await (login as unknown as (a: { data: unknown }) => Promise<unknown>)({
      data: { identifier: "staff@mixlebs.com", password: "secret123", remember_me: true },
    });

    // Hit the correct endpoint with the credentials.
    expect(apiPost).toHaveBeenCalledWith("/api/admin/v1/auth/login/", {
      identifier: "staff@mixlebs.com",
      password: "secret123",
      remember_me: true,
    });
    // Cookies written server-side from the token pair.
    expect(setAuthCookies).toHaveBeenCalledWith("ACCESS_JWT", "REFRESH_JWT");
    // Tokens NEVER returned to the client.
    expect(result).toEqual({
      user: { id: "u1", type: "STAFF", email: "staff@mixlebs.com" },
      store: null,
    });
    expect(JSON.stringify(result)).not.toContain("ACCESS_JWT");
    expect(JSON.stringify(result)).not.toContain("REFRESH_JWT");
  });

  it("maps a 403 user_not_allowed ApiError into a parseable client error", async () => {
    // Reject EVERY call so the single invocation below throws.
    apiPost.mockRejectedValue({
      message: "Customers cannot access the admin panel",
      errorType: "user_not_allowed",
      fieldErrors: null,
    });

    const { login } = await import("./auth.functions");
    const { parseServerError } = await import("./error");

    let caught: unknown;
    try {
      await (login as unknown as (a: { data: unknown }) => Promise<unknown>)({
        data: { identifier: "buyer@x.com", password: "secret123" },
      });
    } catch (err) {
      caught = err;
    }

    // The thrown error round-trips through parseServerError on the client side.
    expect(caught).toBeDefined();
    const info = parseServerError(caught);
    expect(info.errorType).toBe("user_not_allowed");
    // setAuthCookies must NOT run on a failed login.
    expect(setAuthCookies).not.toHaveBeenCalled();
  });
});
