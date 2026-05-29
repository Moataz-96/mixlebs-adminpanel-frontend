// Admin users server functions (plan §4 Phase 7 / FE §11).
//
// GET/POST /users/, GET/PATCH /users/{id}/, POST /users/{id}/reset_password/,
// POST/DELETE /users/{id}/roles/, GET /users/{id}/devices/. All gated by the
// matching users.* resource.action on the BE; STAFF-only (IsStaffUser). Each
// .handler runs SERVER-ONLY and returns the unwrapped DRF envelope. Field names
// mirror openapi.json (AdminUser / StaffCreate / PatchedUserUpdate /
// RoleAssignment / DeviceToken).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

export type AdminUserType = "STAFF" | "STORE" | "CUSTOMER";

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  username: string;
  type: AdminUserType;
  is_active: boolean;
  is_superuser: boolean;
  register_completed: boolean;
  password_reset_version: number;
  date_joined: string;
  last_login: string | null;
  roles: string[];
}

export interface AdminDeviceToken {
  id: number;
  token: string;
  device_type: string | null;
  endpoint_arn: string;
  is_valid: boolean;
}

const listInput = z
  .object({
    q: z.string().optional(),
    type: z.string().optional(),
    is_active: z.boolean().optional(),
    register_completed: z.boolean().optional(),
    role_id: z.number().optional(),
    ordering: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

function listQuery(data: z.infer<typeof listInput>): string {
  const sp = new URLSearchParams();
  if (data?.q) sp.set("q", data.q);
  if (data?.type) sp.set("type", data.type);
  if (data?.is_active !== undefined) sp.set("is_active", String(data.is_active));
  if (data?.register_completed !== undefined)
    sp.set("register_completed", String(data.register_completed));
  if (data?.role_id) sp.set("role_id", String(data.role_id));
  if (data?.ordering) sp.set("ordering", data.ordering);
  if (data?.page) sp.set("page", String(data.page));
  if (data?.page_size) sp.set("page_size", String(data.page_size));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export const listUsers = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<AdminUser>>(`/api/admin/v1/users/${listQuery(data)}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getUser = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<AdminUser>(`/api/admin/v1/users/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

const userUpdateInput = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const updateUser = createServerFn({ method: "POST" })
  .inputValidator(userUpdateInput)
  .handler(async ({ data }) => {
    const { id, ...body } = data;
    try {
      return await apiPatch<AdminUser>(`/api/admin/v1/users/${id}/`, body);
    } catch (err) {
      throw toClientError(err);
    }
  });

const staffCreateInput = z.object({
  email: z.string(),
  phone: z.string().optional(),
  password: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role_ids: z.array(z.number()).optional(),
});

export const createStaff = createServerFn({ method: "POST" })
  .inputValidator(staffCreateInput)
  .handler(async ({ data }) => {
    try {
      return await apiPost<AdminUser>(`/api/admin/v1/users/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<{ detail: string }>(
        `/api/admin/v1/users/${data.id}/reset_password/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const assignRole = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; role_id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<AdminUser>(`/api/admin/v1/users/${data.id}/roles/`, {
        role_id: data.role_id,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const removeRole = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; role_id: number }) => d)
  .handler(async ({ data }) => {
    try {
      // DELETE with a body — _client.apiDelete forwards the body to Django.
      return await apiDelete<AdminUser | null>(`/api/admin/v1/users/${data.id}/roles/`, {
        role_id: data.role_id,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const listUserDevices = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<AdminDeviceToken>>(`/api/admin/v1/users/${data.id}/devices/`);
    } catch (err) {
      throw toClientError(err);
    }
  });
