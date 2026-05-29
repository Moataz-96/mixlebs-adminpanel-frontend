// Notifications server functions (plan §4 Phase 8 / FE §13.5).
//
// GET /notifications/ (own inbox, is_opened filter), POST
// /notifications/{id}/mark_read/, POST /notifications/mark_all_read/, GET
// /notifications/unread_count/, POST /notifications/send/ (notifications.send),
// POST /notifications/broadcast/ (notifications.send_broadcast). Field names
// mirror openapi.json UserNotification. Re-exports the FROZEN UI inbox shape
// (NotifItem) the §13.5 route renders, plus a BE -> UI mapper.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shape (openapi.json UserNotification)
// --------------------------------------------------------------------------- #
export interface UserNotification {
  id: number;
  type: string;
  title: string;
  content: string;
  link: string | null;
  is_opened: boolean;
  timestamp: string;
}

// --------------------------------------------------------------------------- #
// FROZEN UI shape (formerly in mock/content.ts)
// --------------------------------------------------------------------------- #
export type NotifType = "order" | "return" | "store" | "promo" | "system";
export type SentStatus = "SENT" | "PENDING" | "FAILED";
export type CommChannel = "NOTIFICATION" | "EMAIL" | "SMS";
export const COMM_CHANNELS: CommChannel[] = ["NOTIFICATION", "EMAIL", "SMS"];

export interface NotifItem {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  channel: CommChannel;
  sent_status: SentStatus;
  is_opened: boolean;
  created_at: string;
  link?: string;
}

// Map the BE communication `type` enum to one of the five UI buckets.
function toUiType(type: string): NotifType {
  const s = (type || "").toUpperCase();
  if (s.includes("ORDER")) return "order";
  if (s.includes("RETURN")) return "return";
  if (s.includes("STORE") || s.includes("PRODUCT")) return "store";
  if (s.includes("COUPON") || s.includes("PROMO")) return "promo";
  return "system";
}

/** Map a BE UserNotification to the FROZEN UI NotifItem the §13.5 route renders. */
export function toNotifItem(n: UserNotification): NotifItem {
  return {
    id: String(n.id),
    type: toUiType(n.type),
    title: n.title,
    body: n.content,
    // The admin inbox is in-app notifications; delivery is recorded as sent.
    channel: "NOTIFICATION",
    sent_status: "SENT",
    is_opened: n.is_opened,
    created_at: (n.timestamp ?? "").replace("T", " ").slice(0, 16),
    link: n.link ?? undefined,
  };
}

// --------------------------------------------------------------------------- #
// Server fns
// --------------------------------------------------------------------------- #
const listInput = z.object({ is_opened: z.boolean().optional() }).optional();

export const listNotifications = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      const sp = new URLSearchParams();
      if (data?.is_opened !== undefined) sp.set("is_opened", String(data.is_opened));
      sp.set("page_size", "200");
      return await apiGet<Page<UserNotification>>(
        `/api/admin/v1/notifications/?${sp.toString()}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const unreadCount = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<{ unread_count: number }>(`/api/admin/v1/notifications/unread_count/`);
  } catch (err) {
    throw toClientError(err);
  }
});

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<{ id: number; is_opened: boolean }>(
        `/api/admin/v1/notifications/${data.id}/mark_read/`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  try {
    return await apiPost<{ updated: number }>(`/api/admin/v1/notifications/mark_all_read/`);
  } catch (err) {
    throw toClientError(err);
  }
});

const sendInput = z.object({
  user_ids: z.array(z.string()),
  title: z.string(),
  content: z.string(),
  link: z.string().optional(),
  type: z.string().optional(),
});

export const sendNotification = createServerFn({ method: "POST" })
  .inputValidator(sendInput)
  .handler(async ({ data }) => {
    try {
      return await apiPost<{ communication_id: number; sent_to: number }>(
        `/api/admin/v1/notifications/send/`,
        data,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

const broadcastInput = z.object({
  title: z.string(),
  content: z.string(),
  link: z.string().optional(),
  type: z.string().optional(),
});

export const broadcastNotification = createServerFn({ method: "POST" })
  .inputValidator(broadcastInput)
  .handler(async ({ data }) => {
    try {
      return await apiPost<{ communication_id: number; sent_to: number }>(
        `/api/admin/v1/notifications/broadcast/`,
        data,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
