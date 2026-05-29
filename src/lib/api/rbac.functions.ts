// RBAC server functions for Phase 2 (roles / role-policies / user-policies /
// permissions / permission-resources + user-role attach/detach). Each .handler
// body runs SERVER-ONLY, so the _client.ts helpers and cookie writers are
// tree-shaken from the client bundle.
//
// All five collections are standard DRF CRUD behind the RestResponse envelope
// and are IsSuperAdmin-only on the BE. _client.ts returns the unwrapped `data`,
// so list helpers resolve to a DRF page ({count, next, previous, results}) and
// item helpers resolve to the serialized object. Field names mirror
// mixlebs-adminpanel-backend/openapi.json exactly (see plan §5.5).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet, apiPost, apiPatch, apiDelete } from "./_client";
import { toClientError } from "./error";

// ---------------------------------------------------------------------------
// Shared shapes (hand-typed from openapi.json RBAC schemas).
// ---------------------------------------------------------------------------

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  users: string[]; // CustomUser ids (string PKs)
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePolicy {
  id: number;
  name: string;
  description?: string;
  roles: number[]; // Role ids
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// UserPolicy.type is an integer enum on the BE: POSITIVE=1, NEGATIVE=0.
export type UserPolicyType = 0 | 1;

export interface UserPolicy {
  id: number;
  name: string;
  description?: string;
  type: UserPolicyType;
  users: string[]; // CustomUser ids
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resources: number[]; // PermissionResource ids
  role_policies: number[];
  user_policies: number[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type ResourceMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface PermissionResource {
  id: number;
  name: string;
  app: string;
  view_name: string;
  url: string;
  method: ResourceMethod;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Input validators. Kept permissive on optional fields; the BE is the source of
// truth for required-ness and returns field errors that the form maps back.
// ---------------------------------------------------------------------------

const listInput = z
  .object({ page: z.number().optional(), page_size: z.number().optional() })
  .optional();

function listQuery(data: { page?: number; page_size?: number } | undefined): string {
  const params = new URLSearchParams();
  if (data?.page) params.set("page", String(data.page));
  if (data?.page_size) params.set("page_size", String(data.page_size));
  const q = params.toString();
  return q ? `?${q}` : "";
}

const idInput = z.object({ id: z.union([z.number(), z.string()]) });

const roleWriteSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  is_enabled: z.boolean().optional(),
  users: z.array(z.string()).optional(),
});

const rolePolicyWriteSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  is_enabled: z.boolean().optional(),
  roles: z.array(z.number()).optional(),
});

const userPolicyWriteSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  type: z.union([z.literal(0), z.literal(1)]).optional(),
  is_enabled: z.boolean().optional(),
  users: z.array(z.string()).optional(),
});

const permissionWriteSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  is_enabled: z.boolean().optional(),
  resources: z.array(z.number()).optional(),
  role_policies: z.array(z.number()).optional(),
  user_policies: z.array(z.number()).optional(),
});

const permissionResourceWriteSchema = z.object({
  name: z.string().min(1).max(150),
  app: z.string().min(1).max(100),
  view_name: z.string().min(1).max(150),
  url: z.string().min(1).max(255),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  is_enabled: z.boolean().optional(),
});

// user-roles attach/detach — UserRoleAction { user_id, role_id, action }.
const userRoleSchema = z.object({
  user_id: z.string().min(1),
  role_id: z.number(),
});

// Small helper to standardize the try/catch envelope re-throw.
async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toClientError(err);
  }
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const listRoles = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(({ data }) => run(() => apiGet<Page<Role>>(`/api/admin/v1/roles/${listQuery(data)}`)));

export const getRole = createServerFn({ method: "GET" })
  .inputValidator(idInput)
  .handler(({ data }) => run(() => apiGet<Role>(`/api/admin/v1/roles/${data.id}/`)));

export const createRole = createServerFn({ method: "POST" })
  .inputValidator(roleWriteSchema)
  .handler(({ data }) => run(() => apiPost<Role>("/api/admin/v1/roles/", data)));

export const updateRole = createServerFn({ method: "POST" })
  .inputValidator(idInput.merge(roleWriteSchema.partial()))
  .handler(({ data }) => {
    const { id, ...body } = data;
    return run(() => apiPatch<Role>(`/api/admin/v1/roles/${id}/`, body));
  });

export const deleteRole = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(({ data }) => run(() => apiDelete<null>(`/api/admin/v1/roles/${data.id}/`)));

// ---------------------------------------------------------------------------
// Role policies
// ---------------------------------------------------------------------------

export const listRolePolicies = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(({ data }) =>
    run(() => apiGet<Page<RolePolicy>>(`/api/admin/v1/role-policies/${listQuery(data)}`)),
  );

export const getRolePolicy = createServerFn({ method: "GET" })
  .inputValidator(idInput)
  .handler(({ data }) => run(() => apiGet<RolePolicy>(`/api/admin/v1/role-policies/${data.id}/`)));

export const createRolePolicy = createServerFn({ method: "POST" })
  .inputValidator(rolePolicyWriteSchema)
  .handler(({ data }) => run(() => apiPost<RolePolicy>("/api/admin/v1/role-policies/", data)));

export const updateRolePolicy = createServerFn({ method: "POST" })
  .inputValidator(idInput.merge(rolePolicyWriteSchema.partial()))
  .handler(({ data }) => {
    const { id, ...body } = data;
    return run(() => apiPatch<RolePolicy>(`/api/admin/v1/role-policies/${id}/`, body));
  });

export const deleteRolePolicy = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(({ data }) => run(() => apiDelete<null>(`/api/admin/v1/role-policies/${data.id}/`)));

// ---------------------------------------------------------------------------
// User policies
// ---------------------------------------------------------------------------

export const listUserPolicies = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(({ data }) =>
    run(() => apiGet<Page<UserPolicy>>(`/api/admin/v1/user-policies/${listQuery(data)}`)),
  );

export const getUserPolicy = createServerFn({ method: "GET" })
  .inputValidator(idInput)
  .handler(({ data }) => run(() => apiGet<UserPolicy>(`/api/admin/v1/user-policies/${data.id}/`)));

export const createUserPolicy = createServerFn({ method: "POST" })
  .inputValidator(userPolicyWriteSchema)
  .handler(({ data }) => run(() => apiPost<UserPolicy>("/api/admin/v1/user-policies/", data)));

export const updateUserPolicy = createServerFn({ method: "POST" })
  .inputValidator(idInput.merge(userPolicyWriteSchema.partial()))
  .handler(({ data }) => {
    const { id, ...body } = data;
    return run(() => apiPatch<UserPolicy>(`/api/admin/v1/user-policies/${id}/`, body));
  });

export const deleteUserPolicy = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(({ data }) => run(() => apiDelete<null>(`/api/admin/v1/user-policies/${data.id}/`)));

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export const listPermissions = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(({ data }) =>
    run(() => apiGet<Page<Permission>>(`/api/admin/v1/permissions/${listQuery(data)}`)),
  );

export const getPermission = createServerFn({ method: "GET" })
  .inputValidator(idInput)
  .handler(({ data }) => run(() => apiGet<Permission>(`/api/admin/v1/permissions/${data.id}/`)));

export const createPermission = createServerFn({ method: "POST" })
  .inputValidator(permissionWriteSchema)
  .handler(({ data }) => run(() => apiPost<Permission>("/api/admin/v1/permissions/", data)));

export const updatePermission = createServerFn({ method: "POST" })
  .inputValidator(idInput.merge(permissionWriteSchema.partial()))
  .handler(({ data }) => {
    const { id, ...body } = data;
    return run(() => apiPatch<Permission>(`/api/admin/v1/permissions/${id}/`, body));
  });

export const deletePermission = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(({ data }) => run(() => apiDelete<null>(`/api/admin/v1/permissions/${data.id}/`)));

// ---------------------------------------------------------------------------
// Permission resources
// ---------------------------------------------------------------------------

export const listPermissionResources = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(({ data }) =>
    run(() =>
      apiGet<Page<PermissionResource>>(`/api/admin/v1/permission-resources/${listQuery(data)}`),
    ),
  );

export const getPermissionResource = createServerFn({ method: "GET" })
  .inputValidator(idInput)
  .handler(({ data }) =>
    run(() => apiGet<PermissionResource>(`/api/admin/v1/permission-resources/${data.id}/`)),
  );

export const createPermissionResource = createServerFn({ method: "POST" })
  .inputValidator(permissionResourceWriteSchema)
  .handler(({ data }) =>
    run(() => apiPost<PermissionResource>("/api/admin/v1/permission-resources/", data)),
  );

export const updatePermissionResource = createServerFn({ method: "POST" })
  .inputValidator(idInput.merge(permissionResourceWriteSchema.partial()))
  .handler(({ data }) => {
    const { id, ...body } = data;
    return run(() =>
      apiPatch<PermissionResource>(`/api/admin/v1/permission-resources/${id}/`, body),
    );
  });

export const deletePermissionResource = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(({ data }) =>
    run(() => apiDelete<null>(`/api/admin/v1/permission-resources/${data.id}/`)),
  );

// ---------------------------------------------------------------------------
// User-role attach / detach — POST /api/admin/v1/user-roles/ with
// { user_id, role_id, action: "attach" | "detach" }.
// ---------------------------------------------------------------------------

export const attachUserRole = createServerFn({ method: "POST" })
  .inputValidator(userRoleSchema)
  .handler(({ data }) =>
    run(() =>
      apiPost<{ detail?: string }>("/api/admin/v1/user-roles/", {
        user_id: data.user_id,
        role_id: data.role_id,
        action: "attach",
      }),
    ),
  );

export const detachUserRole = createServerFn({ method: "POST" })
  .inputValidator(userRoleSchema)
  .handler(({ data }) =>
    run(() =>
      apiPost<{ detail?: string }>("/api/admin/v1/user-roles/", {
        user_id: data.user_id,
        role_id: data.role_id,
        action: "detach",
      }),
    ),
  );
