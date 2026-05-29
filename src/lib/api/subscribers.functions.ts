// Admin subscribers server function (plan §4 Phase 7 / FE §11.6).
//
// GET /subscribers/ — store subscribers; STORE users auto-scoped to own store,
// STAFF may pass store_id. Gated by subscribers.view. Field names mirror
// openapi.json Subscriber.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

export interface AdminSubscriber {
  id: number;
  store_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  recieve_notifications: boolean;
  recieve_emails: boolean;
  recieve_sms: boolean;
  subscribed_at: string;
}

const listInput = z
  .object({
    store_id: z.string().nullable().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

function listQuery(data: z.infer<typeof listInput>): string {
  const sp = new URLSearchParams();
  if (data?.store_id) sp.set("store_id", data.store_id);
  if (data?.page) sp.set("page", String(data.page));
  if (data?.page_size) sp.set("page_size", String(data.page_size));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export const listSubscribers = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<AdminSubscriber>>(`/api/admin/v1/subscribers/${listQuery(data)}`);
    } catch (err) {
      throw toClientError(err);
    }
  });
