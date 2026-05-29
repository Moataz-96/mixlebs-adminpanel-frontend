// Support sessions (staff inbox) server functions (plan §4 Phase 8 / FE §14.3,
// §14.4).
//
// GET /support/ (filter=unassigned|mine|open|closed), GET /support/{id}/
// (session + messages), POST /support/{id}/pickup/ (chat.support_pickup), POST
// /support/{id}/message/ (chat.support_message), POST /support/{id}/close/
// (chat.support_close), POST /support/{id}/transfer/ (chat.support_pickup).
// Field names mirror openapi.json SupportSession / SessionMessage. Re-exports
// the FROZEN UI shapes (SupportSession, SessionMessage) and BE -> UI mappers.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shapes (openapi.json SupportSession / SessionMessage)
// --------------------------------------------------------------------------- #
export interface BeSupportSession {
  id: number;
  customer_id: string | null;
  staff_id: string | null;
  status: "OPEN" | "ASSIGNED" | "AWAITING_FEEDBACK" | "CLOSED";
  rating: number | null;
  feedback_comment: string | null;
  started_at: string;
  opened_at: string | null;
  closed_at: string | null;
}

export interface BeSessionMessage {
  id: number;
  session_id: number;
  author_id: string | null;
  sender_role: "CUSTOMER" | "STAFF" | "SYSTEM";
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SessionDetail {
  session: BeSupportSession;
  messages: BeSessionMessage[];
}

// --------------------------------------------------------------------------- #
// FROZEN UI shapes (formerly in mock/content.ts)
// --------------------------------------------------------------------------- #
export type SupportStatus = "OPEN" | "ASSIGNED" | "AWAITING_FEEDBACK" | "CLOSED";
export type SenderRole = "CUSTOMER" | "STAFF" | "SYSTEM";

export interface SessionMessage {
  id: string;
  sender_role: SenderRole;
  message: string;
  type: "text" | "image" | "system";
  is_read: boolean;
  at: string;
}
export interface SupportSession {
  id: string;
  customer: string;
  phone: string;
  email: string;
  last: string;
  status: SupportStatus;
  assigned_to: string | null;
  started_at: string;
  opened_at: string | null;
  awaiting_since: string | null;
  closed_at: string | null;
  waiting: string;
  rating: number | null;
  feedback: string | null;
  messages: SessionMessage[];
}

function shortId(id: string | null): string {
  return id ? id.replace(/-/g, "").slice(0, 6) : "";
}

/**
 * Map a BE SupportSession to the FROZEN UI SupportSession. The BE does not carry
 * customer display name / phone / email or a per-tab "mine" flag, so the name
 * falls back to a short id; pass `mine=true` when the row came from the
 * filter=mine query so the "mine" tab matches its `assigned_to === "me"` rule.
 */
export function toSupportSession(
  s: BeSupportSession,
  messages: BeSessionMessage[] = [],
  mine = false,
): SupportSession {
  const assigned = s.staff_id ? (mine ? "me" : shortId(s.staff_id)) : null;
  const uiMessages = messages.map(toSessionMessage);
  const last = uiMessages.length ? uiMessages[uiMessages.length - 1].message : "";
  return {
    id: String(s.id),
    customer: shortId(s.customer_id),
    phone: "",
    email: "",
    last,
    status: s.status,
    assigned_to: assigned,
    started_at: (s.started_at ?? "").replace("T", " ").slice(0, 16),
    opened_at: s.opened_at ? s.opened_at.replace("T", " ").slice(0, 16) : null,
    awaiting_since: null,
    closed_at: s.closed_at ? s.closed_at.replace("T", " ").slice(0, 16) : null,
    waiting: "—",
    rating: s.rating,
    feedback: s.feedback_comment,
    messages: uiMessages,
  };
}

export function toSessionMessage(m: BeSessionMessage): SessionMessage {
  return {
    id: String(m.id),
    sender_role: m.sender_role,
    message: m.message,
    type: m.sender_role === "SYSTEM" ? "system" : "text",
    is_read: m.is_read,
    at: (m.created_at ?? "").replace("T", " ").slice(11, 16),
  };
}

// --------------------------------------------------------------------------- #
// Server fns
// --------------------------------------------------------------------------- #
const listInput = z
  .object({ filter: z.enum(["unassigned", "mine", "open", "closed"]).optional() })
  .optional();

export const listSupportSessions = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      const sp = new URLSearchParams();
      if (data?.filter) sp.set("filter", data.filter);
      sp.set("page_size", "200");
      return await apiGet<Page<BeSupportSession>>(`/api/admin/v1/support/?${sp.toString()}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getSupportSession = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<SessionDetail>(`/api/admin/v1/support/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const pickupSession = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeSupportSession>(`/api/admin/v1/support/${data.id}/pickup/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const sendSessionMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; message: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeSessionMessage>(`/api/admin/v1/support/${data.id}/message/`, {
        message: data.message,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const closeSession = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeSupportSession>(`/api/admin/v1/support/${data.id}/close/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const transferSession = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; staff_id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeSupportSession>(`/api/admin/v1/support/${data.id}/transfer/`, {
        staff_id: data.staff_id,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });
