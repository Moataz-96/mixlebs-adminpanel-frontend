// Direct messages (chat) server functions (plan §4 Phase 8 / FE §14.1, §14.2).
//
// GET /chat/ (the caller's conversations), GET/POST /chat/{user_id}/ (read /
// send a thread with one partner), PATCH/DELETE /chat/messages/{id}/ (edit /
// delete one of the caller's own sent messages). No RBAC gate beyond auth — a
// user may always read/send their own DMs (mirrors the mobile contract; the FE
// only surfaces chat for store users with an open thread). Field names mirror
// openapi.json ConversationSummary / DirectMessage. Re-exports the FROZEN UI
// shapes (DmThread, DmMessage) and BE -> UI mappers.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shapes (openapi.json ConversationSummary / DirectMessage)
// --------------------------------------------------------------------------- #
export interface ConversationSummary {
  user_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface DirectMessage {
  id: number;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// --------------------------------------------------------------------------- #
// FROZEN UI shapes (formerly in mock/content.ts)
// --------------------------------------------------------------------------- #
export interface DmThread {
  user_id: string;
  name: string;
  initials: string;
  online: boolean;
  last: string;
  unread: number;
  activity: string;
}
export interface DmMessage {
  id: string;
  own: boolean;
  body: string;
  at: string;
  read: boolean;
  edited?: boolean;
}

function shortId(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 6);
}

/**
 * Map a BE ConversationSummary to the FROZEN UI DmThread. The BE has no
 * display-name / presence model for the partner, so the name falls back to a
 * short id and presence renders offline.
 */
export function toDmThread(c: ConversationSummary): DmThread {
  const id = shortId(c.user_id);
  return {
    user_id: c.user_id,
    name: id,
    initials: id.slice(0, 2).toUpperCase(),
    online: false,
    last: c.last_message,
    unread: c.unread_count,
    activity: (c.last_message_at ?? "").replace("T", " ").slice(0, 16),
  };
}

/** Map a BE DirectMessage to the FROZEN UI DmMessage. `own` = not from partner. */
export function toDmMessage(m: DirectMessage, partnerId: string): DmMessage {
  return {
    id: String(m.id),
    own: m.sender_id !== partnerId,
    body: m.message,
    at: (m.created_at ?? "").replace("T", " ").slice(11, 16),
    read: m.is_read,
  };
}

// --------------------------------------------------------------------------- #
// Server fns
// --------------------------------------------------------------------------- #
export const listConversations = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<ConversationSummary[]>(`/api/admin/v1/chat/`);
  } catch (err) {
    throw toClientError(err);
  }
});

export const getThread = createServerFn({ method: "GET" })
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<DirectMessage>>(
        `/api/admin/v1/chat/${data.user_id}/?page_size=200`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

const sendInput = z.object({
  user_id: z.string(),
  receiver_id: z.string(),
  message: z.string(),
});

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator(sendInput)
  .handler(async ({ data }) => {
    try {
      return await apiPost<DirectMessage>(`/api/admin/v1/chat/${data.user_id}/`, {
        receiver_id: data.receiver_id,
        message: data.message,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const editMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; message: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<DirectMessage>(`/api/admin/v1/chat/messages/${data.id}/`, {
        message: data.message,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/chat/messages/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });
