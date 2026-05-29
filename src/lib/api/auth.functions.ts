// Auth server functions for Phase 1 (login / logout / refresh / me /
// forgot-password / reset-password). Each .handler body runs SERVER-ONLY, so
// the _client.ts helpers and the cookie writers are tree-shaken from the client
// bundle.
//
// JWT tokens live ONLY in the mxa_access / mxa_refresh HttpOnly cookies. The
// login/logout handlers manage those cookies with the SAME serialization
// _client.ts uses (HttpOnly + SameSite=Lax, Secure in production). Tokens are
// NEVER returned to the client or written to JS-accessible storage.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet, apiPost } from "./_client";
import { toClientError } from "./error";

// ---------------------------------------------------------------------------
// Response shapes (hand-typed from the BE contract — see plan §5.5).
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  type: "ADMIN" | "STAFF" | "STORE" | "CUSTOMER";
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  [k: string]: unknown;
}

export interface AuthStore {
  id: string;
  shop_name?: string | null;
  status?: string | null;
  banner_label_key?: string | null;
  [k: string]: unknown;
}

interface LoginPayload {
  access: string;
  refresh: string;
  user: AuthUser;
  store?: AuthStore | null;
}

export interface MePayload {
  user: AuthUser;
  store?: AuthStore | null;
  roles: string[];
  permissions: string[];
}

// ---------------------------------------------------------------------------
// login — writes the cookies server-side, returns ONLY {user, store}.
// ---------------------------------------------------------------------------

export const login = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      identifier: z.string().min(1),
      password: z.string().min(1),
      remember_me: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { setAuthCookies } = await import("./cookies.server");
    try {
      const payload = await apiPost<LoginPayload>("/api/admin/v1/auth/login/", data);
      setAuthCookies(payload.access, payload.refresh);
      // Never hand the tokens back to the browser.
      return { user: payload.user, store: payload.store ?? null };
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// logout — best-effort revoke on the BE, then always clear the cookies.
// ---------------------------------------------------------------------------

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { readRefreshCookie, clearAuthCookies } = await import("./cookies.server");
  try {
    // Pass the refresh from the cookie explicitly so the BE can blacklist it.
    const refresh = readRefreshCookie();
    if (refresh) {
      await apiPost<{ detail: string }>("/api/admin/v1/auth/logout/", { refresh });
    }
  } catch {
    // Swallow — logout must clear the local session regardless of BE outcome.
  } finally {
    clearAuthCookies();
  }
  return { ok: true };
});

// ---------------------------------------------------------------------------
// refresh — exposed for completeness; _client.ts already auto-refreshes on 401.
// ---------------------------------------------------------------------------

export const refresh = createServerFn({ method: "POST" }).handler(async () => {
  const { readRefreshCookie, setAccessCookie, setRefreshCookie } = await import("./cookies.server");
  const refreshToken = readRefreshCookie();
  if (!refreshToken) return { ok: false };
  const data = await apiPost<{ access: string; refresh?: string }>("/api/admin/v1/auth/refresh/", {
    refresh: refreshToken,
  });
  setAccessCookie(data.access);
  if (data.refresh) setRefreshCookie(data.refresh);
  return { ok: true };
});

// ---------------------------------------------------------------------------
// me — drives the auth state. Throws ApiError (401) when not signed in.
// ---------------------------------------------------------------------------

export const me = createServerFn({ method: "GET" }).handler(async () => {
  return apiGet<MePayload>("/api/admin/v1/auth/me/");
});

// ---------------------------------------------------------------------------
// forgot / reset password.
// ---------------------------------------------------------------------------

export const forgotPassword = createServerFn({ method: "POST" })
  .inputValidator(z.object({ identifier: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      return await apiPost<{ detail: string }>("/api/admin/v1/auth/forgot_password/", data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator(z.object({ key: z.string().min(1), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      return await apiPost<{ detail: string }>(
        `/api/admin/v1/auth/reset_password/${encodeURIComponent(data.key)}/`,
        { password: data.password },
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
