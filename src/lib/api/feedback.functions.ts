// Feedback server functions (plan §4 Phase 8 / FE §19).
//
// GET /feedback/ (feedback.view, category/rating filters), POST
// /feedback/{id}/respond/ (feedback.respond). AppFeedback has no response column
// so a response is delivered to the submitter as a UserNotification rather than
// persisted (required_adminpanel_change.md ENTRY 011). Field names mirror
// openapi.json AppFeedback. Re-exports the FROZEN UI shapes (AppFeedback,
// FeedbackCategory) and a BE -> UI mapper.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shape (openapi.json AppFeedback)
// --------------------------------------------------------------------------- #
export interface BeAppFeedback {
  id: number;
  user_id: string;
  user_email: string;
  rating: number;
  comment: string;
  category: "GENERAL" | "BUG" | "FEATURE" | "PERFORMANCE" | "OTHER";
  created_at: string;
}

// --------------------------------------------------------------------------- #
// FROZEN UI shape (formerly in mock/admin.ts)
// --------------------------------------------------------------------------- #
export type FeedbackCategory = "GENERAL" | "BUG" | "FEATURE" | "PERFORMANCE" | "OTHER";

export interface AppFeedback {
  id: string;
  created_at: string;
  user_name: string;
  user_email: string;
  rating: number;
  category: FeedbackCategory;
  comment: string;
}

/** Map a BE AppFeedback to the FROZEN UI AppFeedback. The BE exposes the
 * submitter's email but no display name, so the email's local part stands in. */
export function toAppFeedback(f: BeAppFeedback): AppFeedback {
  return {
    id: String(f.id),
    created_at: (f.created_at ?? "").replace("T", " ").slice(0, 16),
    user_name: (f.user_email ?? "").split("@")[0] || `#${f.user_id}`,
    user_email: f.user_email,
    rating: f.rating,
    category: f.category,
    comment: f.comment,
  };
}

// --------------------------------------------------------------------------- #
// Server fns
// --------------------------------------------------------------------------- #
const listInput = z
  .object({ category: z.string().optional(), rating: z.number().optional() })
  .optional();

export const listFeedback = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      const sp = new URLSearchParams();
      if (data?.category) sp.set("category", data.category);
      if (data?.rating) sp.set("rating", String(data.rating));
      sp.set("page_size", "200");
      return await apiGet<Page<BeAppFeedback>>(`/api/admin/v1/feedback/?${sp.toString()}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const respondToFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; message: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<{ feedback_id: number; delivered_to: string; via: string }>(
        `/api/admin/v1/feedback/${data.id}/respond/`,
        { message: data.message },
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
