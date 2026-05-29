// SERVER-ONLY auth-cookie helpers. The .server.ts suffix guarantees Vite/Rollup
// never bundles this (or its @tanstack/react-start/server import) into the
// client. Shared by auth.functions.ts and stores.functions.ts so the
// login/register/logout handlers manage the HttpOnly mxa_access / mxa_refresh
// cookies with the same serialization _client.ts uses.

import { setCookie, deleteCookie, getCookie } from "@tanstack/react-start/server";

import { getServerConfig } from "../config.server";

const ACCESS_COOKIE = "mxa_access";
const REFRESH_COOKIE = "mxa_refresh";

function cookieOptions() {
  const isProd = getServerConfig().nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
}

/** Persist a freshly-issued access/refresh pair into the HttpOnly cookies. */
export function setAuthCookies(access: string, refresh: string) {
  setCookie(ACCESS_COOKIE, access, cookieOptions());
  setCookie(REFRESH_COOKIE, refresh, cookieOptions());
}

/** Set just the access cookie (e.g. after a manual refresh). */
export function setAccessCookie(access: string) {
  setCookie(ACCESS_COOKIE, access, cookieOptions());
}

/** Set just the refresh cookie (when the BE rotates it). */
export function setRefreshCookie(refresh: string) {
  setCookie(REFRESH_COOKIE, refresh, cookieOptions());
}

/** Read the current refresh token (used to revoke on logout). */
export function readRefreshCookie(): string | undefined {
  return getCookie(REFRESH_COOKIE);
}

/** Clear both auth cookies (used by logout). */
export function clearAuthCookies() {
  deleteCookie(ACCESS_COOKIE, cookieOptions());
  deleteCookie(REFRESH_COOKIE, cookieOptions());
}
