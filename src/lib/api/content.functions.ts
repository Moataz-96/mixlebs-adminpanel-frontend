// Content / Resources server functions (plan §4 Phase 8 / FE §13.1, §13.2).
//
// GET/POST /resources/, GET/PATCH/DELETE /resources/{id}/. Gated by
// resources.view (read) / resources.update (write). Field names mirror
// openapi.json Resource (section free string, content_type QA|ARTICLE, audience
// string[], translations with language_code). This module also re-exports the
// FROZEN UI-facing types the §13 routes render (ResourceEntry with `section` as
// FAQ|Privacy Policy|Terms|Article, `audiences`, `published`, `translations`
// keyed by `lang`) plus a mapper from the BE row to that shape — so the routes'
// JSX stays byte-identical and only the data source changes.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shapes (openapi.json Resource / ResourceTranslation)
// --------------------------------------------------------------------------- #
export interface ResourceTranslationRow {
  id: number;
  language_id: number;
  language_code: string;
  title: string;
  content: string;
}

export interface Resource {
  id: number;
  slug: string;
  section: string;
  content_type: "QA" | "ARTICLE";
  order: number;
  audience: string[];
  translations: ResourceTranslationRow[];
  created_at: string;
  updated_at: string;
}

// --------------------------------------------------------------------------- #
// FROZEN UI shape (formerly in mock/content.ts)
// --------------------------------------------------------------------------- #
export type ResourceSection = "FAQ" | "Privacy Policy" | "Terms" | "Article";
export type ResourceContentType = "QA" | "Article";
export type ResourceAudience = "CUSTOMER" | "STORE" | "STAFF";

export interface ResourceTranslation {
  lang: "en" | "ar";
  title: string;
  content: string;
}
export interface ResourceEntry {
  id: string;
  slug: string;
  section: ResourceSection;
  content_type: ResourceContentType;
  order: number;
  audiences: ResourceAudience[];
  published: boolean;
  updated_at: string;
  translations: ResourceTranslation[];
}

// The BE stores `section` as a free string; the UI groups by these tabs. Map
// known sections to the UI labels and fall back to "Article" for anything else.
function toUiSection(section: string): ResourceSection {
  const s = section.toLowerCase();
  if (s === "faq") return "FAQ";
  if (s.includes("privacy")) return "Privacy Policy";
  if (s.includes("terms")) return "Terms";
  return "Article";
}

/** Map a BE Resource row to the FROZEN UI ResourceEntry the §13 routes render. */
export function toResourceEntry(r: Resource): ResourceEntry {
  return {
    id: String(r.id),
    slug: r.slug,
    section: toUiSection(r.section),
    content_type: r.content_type === "QA" ? "QA" : "Article",
    order: r.order,
    audiences: (r.audience ?? []) as ResourceAudience[],
    // The BE has no publish flag (resources are live once created); a row with
    // at least one translation renders as published.
    published: (r.translations?.length ?? 0) > 0,
    updated_at: (r.updated_at ?? "").slice(0, 10),
    translations: (r.translations ?? [])
      .filter((t) => t.language_code === "en" || t.language_code === "ar")
      .map((t) => ({ lang: t.language_code as "en" | "ar", title: t.title, content: t.content })),
  };
}

// --------------------------------------------------------------------------- #
// Server fns
// --------------------------------------------------------------------------- #
const listInput = z
  .object({
    section: z.string().optional(),
    content_type: z.string().optional(),
    q: z.string().optional(),
  })
  .optional();

function listQuery(data: z.infer<typeof listInput>): string {
  const sp = new URLSearchParams();
  if (data?.section) sp.set("section", data.section);
  if (data?.content_type) sp.set("content_type", data.content_type);
  if (data?.q) sp.set("q", data.q);
  sp.set("page_size", "200");
  return `?${sp.toString()}`;
}

export const listResources = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<Resource>>(`/api/admin/v1/resources/${listQuery(data)}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getResource = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Resource>(`/api/admin/v1/resources/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

const translationWrite = z.object({
  language_code: z.string(),
  title: z.string(),
  content: z.string(),
});

const resourceWrite = z.object({
  slug: z.string().optional(),
  section: z.string(),
  content_type: z.enum(["QA", "ARTICLE"]),
  order: z.number().optional(),
  audience: z.array(z.string()).optional(),
  translations: z.array(translationWrite),
});

export const createResource = createServerFn({ method: "POST" })
  .inputValidator(resourceWrite)
  .handler(async ({ data }) => {
    try {
      return await apiPost<Resource>(`/api/admin/v1/resources/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

const resourcePatch = z.object({
  id: z.number(),
  body: resourceWrite.partial(),
});

export const updateResource = createServerFn({ method: "POST" })
  .inputValidator(resourcePatch)
  .handler(async ({ data }) => {
    try {
      return await apiPatch<Resource>(`/api/admin/v1/resources/${data.id}/`, data.body);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteResource = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/resources/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });
