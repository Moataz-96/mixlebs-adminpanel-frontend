import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the RBAC server fns. Same stubbing approach as
// stores.functions.test.ts: createServerFn is stubbed so the raw handler runs,
// the _client.* helpers are mocked (NOT a live Django), and we assert the right
// URL / method / body reach the client and the unwrapped envelope data is
// returned through the createServerFn RPC boundary.

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

describe("listRoles server fn", () => {
  it("GETs the roles collection with paging and returns the unwrapped page", async () => {
    const page = {
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 1, name: "Operations", users: ["u_1"], is_enabled: true },
        { id: 2, name: "Finance", users: [], is_enabled: false },
      ],
    };
    apiGet.mockResolvedValueOnce(page);

    const { listRoles } = await import("./rbac.functions");
    const result = await (listRoles as unknown as Fn)({ data: { page_size: 200 } });

    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet.mock.calls[0][0]).toBe("/api/admin/v1/roles/?page_size=200");
    expect(result).toEqual(page);
  });
});

describe("createRole server fn", () => {
  it("POSTs the new role body to the roles endpoint", async () => {
    const created = { id: 7, name: "Editors", description: "", users: [], is_enabled: true };
    apiPost.mockResolvedValueOnce(created);

    const { createRole } = await import("./rbac.functions");
    const result = await (createRole as unknown as Fn)({
      data: { name: "Editors", description: "", is_enabled: true },
    });

    const [url, body] = apiPost.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe("/api/admin/v1/roles/");
    expect(body).toMatchObject({ name: "Editors", is_enabled: true });
    expect(result).toEqual(created);
  });
});

describe("updateRole server fn", () => {
  it("PATCHes the role detail URL with the id stripped from the body", async () => {
    apiPatch.mockResolvedValueOnce({ id: 3, name: "Ops", is_enabled: false });

    const { updateRole } = await import("./rbac.functions");
    await (updateRole as unknown as Fn)({ data: { id: 3, is_enabled: false } });

    const [url, body] = apiPatch.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe("/api/admin/v1/roles/3/");
    expect(body).toEqual({ is_enabled: false });
    expect(body).not.toHaveProperty("id");
  });
});

describe("attachUserRole / detachUserRole server fns", () => {
  it("POSTs the UserRoleAction body with the correct action", async () => {
    apiPost.mockResolvedValue({ ok: true });
    const mod = await import("./rbac.functions");

    await (mod.attachUserRole as unknown as Fn)({ data: { user_id: "u_9", role_id: 4 } });
    expect(apiPost.mock.calls[0]).toEqual([
      "/api/admin/v1/user-roles/",
      { user_id: "u_9", role_id: 4, action: "attach" },
    ]);

    await (mod.detachUserRole as unknown as Fn)({ data: { user_id: "u_9", role_id: 4 } });
    expect(apiPost.mock.calls[1]).toEqual([
      "/api/admin/v1/user-roles/",
      { user_id: "u_9", role_id: 4, action: "detach" },
    ]);
  });
});

describe("deleteRole server fn", () => {
  it("DELETEs the role detail URL", async () => {
    apiDelete.mockResolvedValueOnce(null);
    const { deleteRole } = await import("./rbac.functions");
    await (deleteRole as unknown as Fn)({ data: { id: 5 } });
    expect(apiDelete.mock.calls[0][0]).toBe("/api/admin/v1/roles/5/");
  });
});
