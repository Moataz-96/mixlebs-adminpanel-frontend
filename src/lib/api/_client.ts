// Single source of truth for talking to the Django admin API.
//
// SERVER-ONLY. Every helper here reads HttpOnly auth cookies and writes the
// Authorization header, so it must run only inside a createServerFn().handler
// body (or another server-only context). It imports config.server.ts and the
// TanStack Start server request/cookie helpers, both of which are tree-shaken
// out of the client bundle when used exclusively from .handler bodies.
//
// JWTs live ONLY in the mxa_access / mxa_refresh HttpOnly cookies set by the
// server. They are never read from or written to JS-accessible storage.

import { getCookie, setCookie } from "@tanstack/react-start/server";

import { getServerConfig } from "../config.server";

// ---------------------------------------------------------------------------
// Cookie names + serialization options
// ---------------------------------------------------------------------------

const ACCESS_COOKIE = "mxa_access";
const REFRESH_COOKIE = "mxa_refresh";

// HttpOnly so the browser never exposes the token to JS. Secure + SameSite=Lax
// per the plan. `secure` is relaxed in dev (http://localhost) so the cookie is
// actually stored when not on HTTPS.
function cookieOptions() {
  const isProd = getServerConfig().nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
}

// ---------------------------------------------------------------------------
// RestResponse envelope + typed error
// ---------------------------------------------------------------------------

// Django wraps every payload in RestResponse(data, error, error_type, status).
interface RestEnvelope<T> {
  data: T | null;
  error: unknown;
  error_type: string | null;
  status: string | number | null;
}

// Field error maps come back as { field: ["msg", ...] } | { field: "msg" }.
export type FieldErrors = Record<string, string[] | string>;

// Thrown on any non-2xx response OR a 2xx envelope that carries an error.
// Callers catch this to map field -> message (e.g. into a form).
export class ApiError extends Error {
  readonly status: number;
  readonly errorType: string | null;
  readonly fieldErrors: FieldErrors | null;
  readonly raw: unknown;

  constructor(args: {
    message: string;
    status: number;
    errorType: string | null;
    fieldErrors: FieldErrors | null;
    raw: unknown;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.errorType = args.errorType;
    this.fieldErrors = args.fieldErrors;
    this.raw = args.raw;
  }
}

// Best-effort extraction of a { field: messages } map from the envelope error.
function extractFieldErrors(error: unknown): FieldErrors | null {
  if (error && typeof error === "object" && !Array.isArray(error)) {
    return error as FieldErrors;
  }
  return null;
}

function extractMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.length > 0) return error;
  if (Array.isArray(error) && error.length > 0 && typeof error[0] === "string") {
    return error[0];
  }
  if (error && typeof error === "object") {
    const first = Object.values(error as Record<string, unknown>)[0];
    if (typeof first === "string") return first;
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Low-level request runner with one-shot 401 refresh + retry
// ---------------------------------------------------------------------------

interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string; // e.g. "/api/admin/v1/health/"
  body?: unknown; // JSON-serialized unless `isMultipart`
  isMultipart?: boolean; // when true, `body` is a FormData instance
}

function buildUrl(path: string): string {
  const base = getServerConfig().djangoBaseUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildHeaders(access: string | undefined, isMultipart: boolean): Headers {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  // For multipart, let fetch set the Content-Type (with boundary) itself.
  if (!isMultipart) headers.set("Content-Type", "application/json");
  if (access) headers.set("Authorization", `Bearer ${access}`);
  return headers;
}

function serializeBody(body: unknown, isMultipart: boolean): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (isMultipart) return body as FormData;
  return JSON.stringify(body);
}

// Attempts a single refresh against the admin refresh endpoint, persists the
// rotated tokens into the HttpOnly cookies, and returns the new access token
// (or null if refresh failed / there was no refresh cookie).
async function tryRefresh(): Promise<string | null> {
  const refresh = getCookie(REFRESH_COOKIE);
  if (!refresh) return null;

  const res = await fetch(buildUrl("/api/admin/v1/auth/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) return null;

  let envelope: RestEnvelope<{ access?: string; refresh?: string }> | null = null;
  try {
    envelope = (await res.json()) as RestEnvelope<{ access?: string; refresh?: string }>;
  } catch {
    return null;
  }

  const newAccess = envelope?.data?.access;
  if (!newAccess) return null;

  setCookie(ACCESS_COOKIE, newAccess, cookieOptions());
  // SimpleJWT may rotate the refresh token; persist it when present.
  if (envelope.data?.refresh) {
    setCookie(REFRESH_COOKIE, envelope.data.refresh, cookieOptions());
  }
  return newAccess;
}

// Parses a fetch Response into unwrapped data or throws ApiError.
async function unwrap<T>(res: Response): Promise<T> {
  let envelope: RestEnvelope<T> | null = null;
  // 204 / empty bodies have nothing to parse.
  const text = await res.text();
  if (text.length > 0) {
    try {
      envelope = JSON.parse(text) as RestEnvelope<T>;
    } catch {
      envelope = null;
    }
  }

  if (!res.ok) {
    const error = envelope?.error ?? null;
    throw new ApiError({
      message: extractMessage(error, `Request failed with status ${res.status}`),
      status: res.status,
      errorType: envelope?.error_type ?? null,
      fieldErrors: extractFieldErrors(error),
      raw: envelope ?? text,
    });
  }

  // 2xx but the envelope still signals a business error.
  if (envelope && envelope.error != null) {
    throw new ApiError({
      message: extractMessage(envelope.error, "Request failed"),
      status: res.status,
      errorType: envelope.error_type ?? null,
      fieldErrors: extractFieldErrors(envelope.error),
      raw: envelope,
    });
  }

  return (envelope ? envelope.data : null) as T;
}

async function request<T>(opts: RequestOptions): Promise<T> {
  const isMultipart = opts.isMultipart ?? false;
  const url = buildUrl(opts.path);
  const serialized = serializeBody(opts.body, isMultipart);

  const send = (access: string | undefined) =>
    fetch(url, {
      method: opts.method,
      headers: buildHeaders(access, isMultipart),
      body: serialized,
    });

  const access = getCookie(ACCESS_COOKIE);
  let res = await send(access);

  // One-shot refresh + retry on 401.
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await send(refreshed);
    }
  }

  return unwrap<T>(res);
}

// ---------------------------------------------------------------------------
// Public helpers — all return the unwrapped `data`
// ---------------------------------------------------------------------------

export function apiGet<T>(path: string): Promise<T> {
  return request<T>({ method: "GET", path });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>({ method: "POST", path, body });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>({ method: "PATCH", path, body });
}

export function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  return request<T>({ method: "DELETE", path, body });
}

export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return request<T>({ method: "POST", path, body: form, isMultipart: true });
}
