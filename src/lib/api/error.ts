// Client-safe error helpers. This module imports NOTHING server-only, so it is
// safe to import from route components. The ApiError thrown inside _client.ts
// (server side) does not survive the createServerFn RPC boundary as a class —
// only its `message` is reliably transferred. So each server fn re-throws a
// plain Error whose message is a JSON envelope (see `toClientError`), and the
// client parses it back with `parseServerError`.

export interface ServerErrorInfo {
  message: string;
  errorType: string | null;
  fieldErrors: Record<string, string[] | string> | null;
}

const MARKER = "MXERR:";

/**
 * Build the Error a server fn should throw so the client can recover the
 * error_type / field-error map. Pass the caught ApiError-shaped value.
 */
export function toClientError(err: unknown): Error {
  const info: ServerErrorInfo = {
    message: (err as { message?: string })?.message ?? "Request failed",
    errorType: (err as { errorType?: string | null })?.errorType ?? null,
    fieldErrors: (err as { fieldErrors?: ServerErrorInfo["fieldErrors"] })?.fieldErrors ?? null,
  };
  return new Error(MARKER + JSON.stringify(info));
}

/** Parse an error thrown by a server fn back into structured info. */
export function parseServerError(err: unknown): ServerErrorInfo {
  const raw = (err as { message?: string })?.message ?? "";
  if (raw.startsWith(MARKER)) {
    try {
      return JSON.parse(raw.slice(MARKER.length)) as ServerErrorInfo;
    } catch {
      // fall through
    }
  }
  return { message: raw || "Request failed", errorType: null, fieldErrors: null };
}

/** Convenience: pull the first message for a field from a field-error map. */
export function fieldMessage(
  fieldErrors: ServerErrorInfo["fieldErrors"],
  field: string,
): string | undefined {
  const v = fieldErrors?.[field];
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}
