import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the P7 users server fns (list + create staff). Same
// stubbing approach as coupons/orders: createServerFn is stubbed so the raw
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

describe("listUsers server fn", () => {
  it("GETs the users endpoint with filters and returns the unwrapped page", async () => {
    const page = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: "u_02",
          email: "lara@mixlebs.com",
          phone: "+96170100002",
          first_name: "Lara",
          last_name: "Khoury",
          username: "lara.khoury",
          type: "STAFF",
          is_active: true,
          is_superuser: false,
          register_completed: true,
          password_reset_version: 2,
          date_joined: "2025-01-14T09:00:00Z",
          last_login: "2026-05-29T09:48:00Z",
          roles: ["Operations Manager"],
        },
      ],
    };
    apiGet.mockResolvedValueOnce(page);

    const { listUsers } = await import("./users.functions");
    const result = await (listUsers as unknown as Fn)({
      data: { type: "STAFF", is_active: true, page_size: 200 },
    });

    expect(apiGet).toHaveBeenCalledTimes(1);
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/v1/users/");
    expect(url).toContain("type=STAFF");
    expect(url).toContain("is_active=true");
    expect(url).toContain("page_size=200");
    expect(result).toEqual(page);
  });
});

describe("createStaff server fn", () => {
  it("POSTs the staff body (incl. role_ids) and returns the created user", async () => {
    const created = {
      id: "u_99",
      email: "new@mixlebs.com",
      first_name: "New",
      last_name: "Staff",
      type: "STAFF",
      roles: ["Support Agent"],
    };
    apiPost.mockResolvedValueOnce(created);

    const { createStaff } = await import("./users.functions");
    const result = await (createStaff as unknown as Fn)({
      data: {
        email: "new@mixlebs.com",
        phone: "+96170100099",
        password: "Sup3rSecret!",
        first_name: "New",
        last_name: "Staff",
        role_ids: [3, 7],
      },
    });

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/users/");
    const body = apiPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body.email).toBe("new@mixlebs.com");
    expect(body.password).toBe("Sup3rSecret!");
    expect(body.role_ids).toEqual([3, 7]);
    expect(result).toEqual(created);
  });
});

describe("assignRole / removeRole server fns", () => {
  it("POSTs role_id to the user roles endpoint", async () => {
    apiPost.mockResolvedValueOnce({ id: "u_02", roles: ["Finance"] });
    const { assignRole } = await import("./users.functions");
    await (assignRole as unknown as Fn)({ data: { id: "u_02", role_id: 5 } });
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/users/u_02/roles/");
    expect(apiPost.mock.calls[0][1]).toEqual({ role_id: 5 });
  });

  it("DELETEs with role_id body to detach a role", async () => {
    apiDelete.mockResolvedValueOnce(null);
    const { removeRole } = await import("./users.functions");
    await (removeRole as unknown as Fn)({ data: { id: "u_02", role_id: 5 } });
    expect(apiDelete.mock.calls[0][0]).toBe("/api/admin/v1/users/u_02/roles/");
    expect(apiDelete.mock.calls[0][1]).toEqual({ role_id: 5 });
  });
});
