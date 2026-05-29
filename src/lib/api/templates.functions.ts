// Communication templates + channels server functions (plan §4 Phase 8 / FE
// §13.3, §13.4).
//
// GET/POST /communications/templates/, GET/PATCH/DELETE
// /communications/templates/{id}/ — super-admin (templates.view / .update).
// GET /communications/channels/ — STATIC channel list; there is no per-channel
// config model, the endpoint returns the fixed CommunicationChannelChoices enum
// (required_adminpanel_change.md ENTRY 013). Field names mirror openapi.json
// Template / TemplateTranslation. Re-exports the FROZEN UI shapes (CommTemplate,
// ChannelSetting) and the picker constants the §13.3/§13.4 routes render.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shapes (openapi.json Template / TemplateTranslation)
// --------------------------------------------------------------------------- #
export interface TemplateTranslationRow {
  id: number;
  language_id: number;
  language_code: string;
  title: string;
  content: string;
}

export interface Template {
  id: number;
  type: string;
  channel: "NOTIFICATION" | "EMAIL" | "SMS";
  is_enabled: boolean;
  translations: TemplateTranslationRow[];
}

// --------------------------------------------------------------------------- #
// FROZEN UI shapes (formerly in mock/content.ts)
// --------------------------------------------------------------------------- #
export type CommChannel = "NOTIFICATION" | "EMAIL" | "SMS";
export type CommType = string;

export interface TemplateTranslation {
  lang: "en" | "ar";
  title: string;
  content: string;
}
export interface CommTemplate {
  id: string;
  type: CommType;
  channel: CommChannel;
  is_enabled: boolean;
  translations: TemplateTranslation[];
  last_edited: string;
}

export interface ChannelSetting {
  key: CommChannel;
  provider: string;
  sender: string;
  enabled: boolean;
  daily_quota: number;
  throttle_per_min: number;
}

// CommunicationTypeChoices (openapi.json TypeD85Enum) — the type picker options.
export const COMM_TYPES: CommType[] = [
  "NEW_PRODUCT_ADDED",
  "NEW_COUPON_ADDED",
  "ORDER_STATUS_CHANGED",
  "EMAIL_ACTIVATION",
  "PHONE_VERIFICATION",
];
export const COMM_CHANNELS: CommChannel[] = ["NOTIFICATION", "EMAIL", "SMS"];

// Placeholder tokens the variable picker offers (FE-only label list).
export const COMM_PLACEHOLDERS = [
  "customer_name",
  "order_id",
  "order_total",
  "store_name",
  "tracking_url",
  "reset_link",
  "verification_code",
  "support_email",
];

/** Map a BE Template to the FROZEN UI CommTemplate the §13.3 route renders. */
export function toCommTemplate(tp: Template): CommTemplate {
  return {
    id: String(tp.id),
    type: tp.type,
    channel: tp.channel,
    is_enabled: tp.is_enabled,
    translations: (tp.translations ?? [])
      .filter((t) => t.language_code === "en" || t.language_code === "ar")
      .map((t) => ({ lang: t.language_code as "en" | "ar", title: t.title, content: t.content })),
    last_edited: "",
  };
}

// --------------------------------------------------------------------------- #
// Server fns — templates
// --------------------------------------------------------------------------- #
const listInput = z
  .object({ type: z.string().optional(), channel: z.string().optional() })
  .optional();

export const listTemplates = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      const sp = new URLSearchParams();
      if (data?.type) sp.set("type", data.type);
      if (data?.channel) sp.set("channel", data.channel);
      sp.set("page_size", "200");
      return await apiGet<Page<Template>>(
        `/api/admin/v1/communications/templates/?${sp.toString()}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getTemplate = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Template>(`/api/admin/v1/communications/templates/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

const translationWrite = z.object({
  language_code: z.string(),
  title: z.string(),
  content: z.string(),
});

const templateWrite = z.object({
  type: z.string(),
  channel: z.enum(["NOTIFICATION", "EMAIL", "SMS"]),
  is_enabled: z.boolean().optional(),
  translations: z.array(translationWrite).optional(),
});

export const createTemplate = createServerFn({ method: "POST" })
  .inputValidator(templateWrite)
  .handler(async ({ data }) => {
    try {
      return await apiPost<Template>(`/api/admin/v1/communications/templates/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

const templatePatch = z.object({ id: z.number(), body: templateWrite.partial() });

export const updateTemplate = createServerFn({ method: "POST" })
  .inputValidator(templatePatch)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<Template>(
        `/api/admin/v1/communications/templates/${data.id}/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/communications/templates/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Server fns — channels (STATIC; ENTRY 013)
// --------------------------------------------------------------------------- #
export interface ChannelRow {
  name: CommChannel;
  relation: string | null;
}

export const listChannels = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<{ channels: ChannelRow[] }>(`/api/admin/v1/communications/channels/`);
  } catch (err) {
    throw toClientError(err);
  }
});

/**
 * Map the static channel enum the BE returns into the FROZEN UI ChannelSetting
 * shape. The per-channel provider/sender/quota fields have no backing model
 * (ENTRY 013) so they render as blank, editable affordances.
 */
export function toChannelSetting(c: ChannelRow): ChannelSetting {
  return {
    key: c.name,
    provider: "",
    sender: "",
    enabled: true,
    daily_quota: 0,
    throttle_per_min: 0,
  };
}
