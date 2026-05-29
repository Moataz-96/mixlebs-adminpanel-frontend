// Options server functions (plan §4 Phase 8 / FE §17).
//
// GET/POST /admin/options/, GET/PATCH/DELETE /admin/options/{id}/. Reads gated
// by options.view; writes are super-admin (options.update). Field names mirror
// openapi.json Option / OptionTranslation. The FROZEN UI renders name_en /
// name_ar columns, so the mapper extracts the en/ar translation rows and the
// write builds a translations[] payload from them. Re-exports the FROZEN UI
// shape (AdminOption) and a BE -> UI mapper.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shapes (openapi.json Option / OptionTranslation)
// --------------------------------------------------------------------------- #
export interface OptionTranslationRow {
  id: number;
  language_code: string;
  name: string;
  description: string;
}
export interface BeOption {
  id: number;
  event: string;
  identifier: string;
  translations: OptionTranslationRow[];
  created_at: string;
  updated_at: string;
}

// --------------------------------------------------------------------------- #
// FROZEN UI shape (formerly in mock/admin.ts)
// --------------------------------------------------------------------------- #
export interface AdminOption {
  id: string;
  event: string;
  identifier: string;
  name_en: string;
  name_ar: string;
}

export function toAdminOption(o: BeOption): AdminOption {
  const en = o.translations?.find((t) => t.language_code === "en");
  const ar = o.translations?.find((t) => t.language_code === "ar");
  return {
    id: String(o.id),
    event: o.event,
    identifier: o.identifier,
    name_en: en?.name ?? "",
    name_ar: ar?.name ?? "",
  };
}

// Build the BE translations[] payload from the FROZEN UI name_en / name_ar form.
function toTranslations(nameEn: string, nameAr: string): OptionTranslationRow[] | undefined {
  const rows: { language_code: string; name: string; description?: string }[] = [];
  if (nameEn) rows.push({ language_code: "en", name: nameEn });
  if (nameAr) rows.push({ language_code: "ar", name: nameAr });
  return rows.length ? (rows as OptionTranslationRow[]) : undefined;
}

// --------------------------------------------------------------------------- #
// Server fns
// --------------------------------------------------------------------------- #
const listInput = z.object({ event: z.string().optional() }).optional();

export const listOptions = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      const sp = new URLSearchParams();
      if (data?.event) sp.set("event", data.event);
      sp.set("page_size", "200");
      return await apiGet<Page<BeOption>>(`/api/admin/v1/admin/options/?${sp.toString()}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

const optionWrite = z.object({
  event: z.string(),
  identifier: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
});

export const createOption = createServerFn({ method: "POST" })
  .inputValidator(optionWrite)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeOption>(`/api/admin/v1/admin/options/`, {
        event: data.event,
        identifier: data.identifier,
        translations: toTranslations(data.name_en, data.name_ar),
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateOption = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number(), body: optionWrite }))
  .handler(async ({ data }) => {
    try {
      return await apiPatch<BeOption>(`/api/admin/v1/admin/options/${data.id}/`, {
        event: data.body.event,
        identifier: data.body.identifier,
        translations: toTranslations(data.body.name_en, data.body.name_ar),
      });
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteOption = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/admin/options/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });
