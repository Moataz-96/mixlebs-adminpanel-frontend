// Account (self) server functions (plan §4 Phase 7 / FE §18).
//
// The caller manages their own account — no resource.action gate, only
// IsStaffOrStore on the BE. Surfaces: profile, change_password, preferences,
// notification_prefs (master toggle), devices (list + revoke). Field names
// mirror openapi.json AccountProfile / ChangePassword / Preferences /
// DeviceToken. NOTE: /account/sessions has NO BE endpoint (deferred — see
// required_adminpanel_change.md); that route keeps its static/empty state.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";
import type { AdminDeviceToken } from "./users.functions";

export type { AdminDeviceToken } from "./users.functions";

export interface AccountProfile {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  username: string;
  type: string;
  register_completed: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface AccountPreferences {
  latitude: string | null;
  longitude: string | null;
  location_id: number | null;
  language_id: number | null;
  timezone: string | null;
  theme: "LIGHT" | "DARK" | null;
  notification: boolean;
  filters: Record<string, unknown> | null;
}

// --------------------------------------------------------------------------- #
// Profile
// --------------------------------------------------------------------------- #
export const getProfile = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<AccountProfile>(`/api/admin/v1/account/profile/`);
  } catch (err) {
    throw toClientError(err);
  }
});

const profileUpdate = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().nullable().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator(profileUpdate)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<AccountProfile>(`/api/admin/v1/account/profile/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Change password
// --------------------------------------------------------------------------- #
export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d: { current_password: string; password: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<{ detail: string }>(`/api/admin/v1/account/change_password/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Preferences
// --------------------------------------------------------------------------- #
export const getPreferences = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<AccountPreferences>(`/api/admin/v1/account/preferences/`);
  } catch (err) {
    throw toClientError(err);
  }
});

const prefsUpdate = z.object({
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  location_id: z.number().optional(),
  language_id: z.number().optional(),
  timezone: z.string().optional(),
  theme: z.enum(["LIGHT", "DARK"]).optional(),
  notification: z.boolean().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export const updatePreferences = createServerFn({ method: "POST" })
  .inputValidator(prefsUpdate)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<AccountPreferences>(`/api/admin/v1/account/preferences/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Notification preferences (master toggle)
// --------------------------------------------------------------------------- #
export const getNotificationPrefs = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<{ notification: boolean }>(`/api/admin/v1/account/notification_prefs/`);
  } catch (err) {
    throw toClientError(err);
  }
});

export const updateNotificationPrefs = createServerFn({ method: "POST" })
  .inputValidator((d: { notification: boolean }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<{ notification: boolean }>(
        `/api/admin/v1/account/notification_prefs/`,
        data,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Devices (own)
// --------------------------------------------------------------------------- #
export const listDevices = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<Page<AdminDeviceToken>>(`/api/admin/v1/account/devices/`);
  } catch (err) {
    throw toClientError(err);
  }
});

export const revokeDevice = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/account/devices/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });
